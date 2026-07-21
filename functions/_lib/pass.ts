import { type Env } from "./common";
import { SEATS } from "./visit";

// 입장 문장 = 예약 확인. 프런트가 아니라 여기서 판정한다 —
// 프런트에서만 보면 /api/ask가 그대로 열려 있고, 누구나 API를 직접 부를 수 있다.
//
// 문장은 이제 phrases 테이블이 정본이다. 사람마다 다른 문장을 건네고,
// 어떤 건 1회권 어떤 건 10회권으로 준다 — 그러려면 문장이 행이어야 센다.
//
// ⚠️ 이 레포는 public이다. ENTRY_PHRASE 시크릿은 비상용 만능열쇠로만 남긴다
//    (설정돼 있을 때만 작동하고, 횟수를 세지 않는다).
//      npx wrangler pages secret put ENTRY_PHRASE --project-name manri-library

// 공백은 무시한다. "감성찾아삽만리에서 보고 왔어요" · "감성찾아삽만리 추천이요" 모두 통과.
export const squeeze = (s: string) => s.replace(/\s+/g, "");

export interface PhraseRow {
  id: number;
  phrase: string;
  match_key: string;
  label: string | null;
  max_uses: number | null;
  active: number;
  expires_at: string | null;
  kind: string; // 'seat' | 'admin'
}

export type PhraseVerdict =
  | { ok: true; row: PhraseRow | null; used: number } // row=null → 비상 만능열쇠
  | { ok: false; row: PhraseRow | null; reason: "no_match" | "inactive" | "expired" | "exhausted" };

// 들려준 말에서 예약 문장을 찾아내고, 아직 쓸 수 있는지까지 본다.
// 긴 문장부터 대조한다 — 한 문장이 다른 문장에 포함될 수 있으므로.
//
// 자리 문장은 부분일치다 ("…에서 보고 왔어요"까지 통과).
// 관리자 문장만은 완전일치다 — 세 자리가 아닌 문이 실수로 열리면 안 되기 때문이다.
// (첫 관리자 문장이 '만리서재'인데, 이건 이 서재의 이름 그 자체다.
//  부분일치로 두면 "만리서재에서 왔어요" 같은 평범한 인사가 관리자실을 연다.)
export async function resolvePhrase(env: Env, said: string): Promise<PhraseVerdict> {
  const heard = squeeze(said);

  let rows: PhraseRow[] = [];
  try {
    const r = await env.DB.prepare(
      `SELECT id, phrase, match_key, label, max_uses, active, expires_at, kind
         FROM phrases ORDER BY length(match_key) DESC`,
    ).all<PhraseRow>();
    rows = r.results ?? [];
  } catch {
    rows = [];
  }

  const matches = (p: PhraseRow) =>
    p.match_key.length > 0 &&
    (p.kind === "admin" ? heard === p.match_key : heard.includes(p.match_key));

  const row = rows.find(matches) ?? null;

  if (!row) {
    // 비상 만능열쇠 — 시크릿이 설정돼 있을 때만. 횟수를 세지 않는다.
    const master = squeeze(env.ENTRY_PHRASE || "");
    if (master.length > 0 && heard.includes(master)) return { ok: true, row: null, used: 0 };
    return { ok: false, row: null, reason: "no_match" };
  }

  if (!row.active) return { ok: false, row, reason: "inactive" };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, row, reason: "expired" };
  }

  // 쓴 횟수는 로그에서 센다 — 별도 카운터를 두면 언젠가 어긋난다.
  const used = await countUses(env, row.id);
  if (row.max_uses !== null && used >= row.max_uses) {
    return { ok: false, row, reason: "exhausted" };
  }
  return { ok: true, row, used };
}

export async function countUses(env: Env, phraseId: number): Promise<number> {
  try {
    const r = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM phrase_uses WHERE phrase_id = ? AND ok = 1",
    )
      .bind(phraseId)
      .first<{ n: number }>();
    return r?.n ?? 0;
  } catch {
    return 0;
  }
}

// 문 앞에서 일어난 일을 남긴다. 거절도 남긴다 — 소진·만료를 나중에 봐야 하므로.
// 문장을 지워도 로그는 남아야 해서 문장 원문을 함께 적는다.
export async function logPhraseUse(
  env: Env,
  fields: {
    phraseId: number | null;
    phrase: string;
    said: string;
    uuid: string | null;
    seat: string | null;
    ok: boolean;
  },
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO phrase_uses (phrase_id, phrase, said, uuid, seat, at, ok)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        fields.phraseId,
        fields.phrase,
        fields.said.slice(0, 200),
        fields.uuid,
        fields.seat,
        new Date().toISOString(),
        fields.ok ? 1 : 0,
      )
      .run();
  } catch {
    // 로그가 끊겨도 문은 열린다.
  }
}

// 예약제 규칙을 그대로 말한다 — 거짓말하지 않는다("자리가 없습니다" 금지).
export const NOT_RESERVED_MESSAGE =
  "만리서재는 예약으로 운영됩니다. 예약하는 곳은 따로 있고, 필요한 때가 오면 스스로 찾게 되실 겁니다.";

// 예약은 있었으나 지금은 열리지 않는 경우. 없는 척하지 않고 사정을 그대로 말한다.
export const REFUSAL_MESSAGE: Record<string, string> = {
  no_match: NOT_RESERVED_MESSAGE,
  inactive: "이 예약은 지금 열려 있지 않습니다.",
  expired: "이 예약의 기한이 지났습니다.",
  exhausted: "이 문장으로 앉으실 수 있는 횟수를 다 쓰셨습니다.",
};

const SEAT_KEYS = Object.keys(SEATS);

export const randomSeat = (): string =>
  SEAT_KEYS[Math.floor(Math.random() * SEAT_KEYS.length)];

// ── 예약 티켓 ────────────────────────────────────────────────────────────────
// 티켓은 좌석 문자열이 아니라 '그때의 서재'를 통째로 찍어둔 기록이다.
// 게놈이 v2·v3가 되어도 예전 예약이 어떤 서재에서 열렸는지 다시 읽을 수 있어야 한다.
export const TICKET_VERSION = 1;

export interface Ticket {
  ticketVersion: number;
  seat: string;
  issuedAt: string;
  expiresAt: string;
  entryPhrase: string;        // 사용자가 실제로 들려준 문장 (어디서 왔는지의 단서)
  genomeEdition: string;
  engineVersion: string;
  promptVersion: string;
  conversationVersion: string;
  visualVersion: string;
}

const PASS_TTL_SECONDS = 60 * 60 * 3; // 한 자리의 시간 — 3시간
const passKey = (uuid: string) => `pass:${uuid}`;

export function buildTicket(env: Env, seat: string, entryPhrase: string): Ticket {
  const now = new Date();
  return {
    ticketVersion: TICKET_VERSION,
    seat,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PASS_TTL_SECONDS * 1000).toISOString(),
    entryPhrase,
    genomeEdition: env.GENOME_EDITION,
    engineVersion: env.ENGINE_VERSION,
    promptVersion: env.PROMPT_VERSION,
    conversationVersion: env.CONVERSATION_VERSION || "conversation-bible-v1",
    visualVersion: env.VISUAL_VERSION || "visual-bible-v1.0",
  };
}

export async function issuePass(env: Env, uuid: string, ticket: Ticket): Promise<void> {
  await env.PENDING.put(passKey(uuid), JSON.stringify(ticket), {
    expirationTtl: PASS_TTL_SECONDS,
  });
}

// 티켓을 읽는다. 없으면 null.
// (구버전 티켓은 좌석 문자열만 저장돼 있었다 — 그 형태도 읽어준다.)
export async function readTicket(env: Env, uuid: string): Promise<Ticket | null> {
  const raw = await env.PENDING.get(passKey(uuid));
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Ticket;
    return parsed && typeof parsed.seat === "string" ? parsed : null;
  } catch {
    // 레거시: 값이 좌석 문자열 그대로였던 티켓
    return SEATS[raw]
      ? { ...buildTicket(env, raw, ""), ticketVersion: 0 }
      : null;
  }
}

// 이 uuid가 실제로 문턱을 넘어 발급된 것이고, 그 좌석이 맞는가.
export async function passValid(env: Env, uuid: string, seat: string): Promise<boolean> {
  const ticket = await readTicket(env, uuid);
  return ticket !== null && ticket.seat === seat;
}

// ── 다른 문 ─────────────────────────────────────────────────────────────────
// 관리자 문장은 페이지를 '보여주는' 게 아니라 열쇠를 발급한다.
// 페이지만 숨기면 /api/admin/*가 그대로 열려 있는 것과 같다.
const KEEPER_TTL_SECONDS = 60 * 60 * 2; // 두 시간이면 충분하다
const keeperKey = (token: string) => `keeper:${token}`;

export async function issueKeeperSession(env: Env, phraseId: number): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  await env.PENDING.put(
    keeperKey(token),
    JSON.stringify({ phraseId, issuedAt: new Date().toISOString() }),
    { expirationTtl: KEEPER_TTL_SECONDS },
  );
  return token;
}

export async function keeperSessionValid(env: Env, token: string): Promise<boolean> {
  if (!token) return false;
  return (await env.PENDING.get(keeperKey(token))) !== null;
}

export async function revokeKeeperSession(env: Env, token: string): Promise<void> {
  await env.PENDING.delete(keeperKey(token));
}
