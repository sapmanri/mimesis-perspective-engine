import { type Env } from "./common";
import { SEATS } from "./visit";

// 입장 문장 = 예약 확인. 프런트가 아니라 여기서 판정한다 —
// 프런트에서만 보면 /api/ask가 그대로 열려 있고, 누구나 API를 직접 부를 수 있다.
//
// ⚠️ 이 레포는 public이다. 아래 기본값은 소스에서 읽힌다.
//    문장을 감추고 싶으면 시크릿으로 덮어쓴다:
//      npx wrangler pages secret put ENTRY_PHRASE --project-name manri-library
const DEFAULT_PHRASE = "감성찾아삽만리";

// 공백은 무시한다. "감성찾아삽만리에서 보고 왔어요" · "감성찾아삽만리 추천이요" 모두 통과.
const squeeze = (s: string) => s.replace(/\s+/g, "");

export function phraseAccepted(said: string, env: Env): boolean {
  const key = squeeze(env.ENTRY_PHRASE || DEFAULT_PHRASE);
  return key.length > 0 && squeeze(said).includes(key);
}

// 예약제 규칙을 그대로 말한다 — 거짓말하지 않는다("자리가 없습니다" 금지).
export const NOT_RESERVED_MESSAGE =
  "만리서재는 예약으로 운영됩니다. 예약하는 곳은 따로 있고, 필요한 때가 오면 스스로 찾게 되실 겁니다.";

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
