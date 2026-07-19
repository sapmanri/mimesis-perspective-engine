import { type Env } from "./common";

export const SEATS: Record<string, string> = {
  fireplace: "벽난로 옆 흔들의자 — 감정을 가라앉히는 공간 (불, 나무, 저녁, 따뜻함, 천천히)",
  desk: "낡은 책상과 타자기 — 생각을 정리하는 공간 (창문, 종이, 연필, 햇빛)",
  nook: "책 더미와 무릎담요의 큰 의자 — 오래 머무르는 공간 (조용함, 독서, 밤, 비)",
};

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

export const MAX_TURNS = 60;
export const MAX_TOTAL_CHARS = 24000;
export const MAX_MESSAGE_CHARS = 1000;

// 대화 이력 검증. 실패 시 사유 문자열, 성공 시 null.
export function validateConversation(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0) return "대화가 비어 있습니다.";
  if (messages.length > MAX_TURNS) return "오늘의 자리는 여기까지입니다. 자리에서 일어나 주세요.";
  let total = 0;
  for (const m of messages as Turn[]) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return "대화 형식이 올바르지 않습니다.";
    if (typeof m.content !== "string" || !m.content.trim()) return "대화 형식이 올바르지 않습니다.";
    if (m.role === "user" && m.content.length > MAX_MESSAGE_CHARS)
      return `한 번에 ${MAX_MESSAGE_CHARS}자 이내로 적어주세요.`;
    total += m.content.length;
  }
  if (total > MAX_TOTAL_CHARS) return "오늘의 자리는 여기까지입니다. 자리에서 일어나 주세요.";
  if ((messages as Turn[])[0].role !== "user") return "대화 형식이 올바르지 않습니다.";
  return null;
}

// 종료 로그 — AI가 판정하지 않는다. 대화에서 그대로 꺼낸 세 가지뿐.
// (평가·점수·해석 금지. 내부 검토용으로만 본다.)
export interface Outcome {
  firstQuestion: string | null; // 사용자가 처음 적은 문장
  lastSentence: string | null;  // 사용자가 마지막으로 적은 문장
  userEnded: boolean;           // 사용자가 스스로 일어났는가
}

export function buildOutcome(messages: Turn[], userEnded: boolean): Outcome {
  const said = messages.filter((m) => m.role === "user").map((m) => m.content);
  return {
    firstQuestion: said[0] ?? null,
    lastSentence: said.length ? said[said.length - 1] : null,
    userEnded,
  };
}

// 한 턴의 '왜' — 어떤 이동 문법을 왜 골랐는가. 결과만 남기면 게놈을 고칠 수 없다.
export interface MovementLog {
  turn: number;
  movement: string;   // 이동 코드 (question-transition.md의 T0~T10)
  name: string;       // 사람이 읽는 이름
  triggers: string[]; // 이동을 고른 근거 — 산문이 아니라 코드. 이래야 세어볼 수 있다.
  at: string;
  // 이 이동 뒤에 사용자의 말에서 관찰된 변화. 서버가 시간순으로 이어 붙인다.
  // success 같은 결론은 저장하지 않는다 — 효과는 나중에 운영 분석에서 센다.
  subsequent_signals?: string[];
  observed_at_turn?: number;
}

// 이번 턴에 관찰된 신호를 '직전 이동'에 되돌려 붙인다.
// 지금 사용자가 보인 변화는 직전 턴의 이동이 만든 것이기 때문이다.
export function linkMovements(
  prior: MovementLog[],
  entry: MovementLog | null,
  signals: string[],
): MovementLog[] {
  const log = [...prior];
  if (signals.length) {
    for (let i = log.length - 1; i >= 0; i -= 1) {
      if (!log[i].subsequent_signals) {
        log[i] = { ...log[i], subsequent_signals: signals, observed_at_turn: entry?.turn ?? log[i].turn + 1 };
        break;
      }
    }
  }
  if (entry) log.push(entry);
  return log;
}

// 방문 기록 — 서재의 호흡. 실패는 조용히 삼킨다.
export async function saveVisit(
  env: Env,
  uuid: string,
  seat: string,
  messages: Turn[],
  closing: unknown | null,
  extra?: {
    ticket?: unknown | null;
    outcome?: Outcome | null;
    movement?: MovementLog | null; // 이번 턴에 고른 이동
    signals?: string[];            // 이번 턴 사용자의 말에서 관찰된 변화
  },
): Promise<void> {
  try {
    const now = new Date().toISOString();
    // 이동 기록은 누적된다 — 앞선 이동에 이번 신호를 이어 붙인 뒤 새 이동을 덧붙인다.
    let movementsJson: string | null = null;
    if (extra?.movement || extra?.signals?.length) {
      let prior: MovementLog[] = [];
      try {
        const row = await env.DB.prepare("SELECT movements_json FROM visits WHERE uuid = ?")
          .bind(uuid)
          .first<{ movements_json: string | null }>();
        if (row?.movements_json) prior = JSON.parse(row.movements_json) as MovementLog[];
      } catch {
        prior = [];
      }
      const linked = linkMovements(prior, extra.movement ?? null, extra.signals ?? []);
      if (linked.length) movementsJson = JSON.stringify(linked);
    }
    await env.DB.prepare(
      `INSERT INTO visits
         (uuid, seat, conversation_json, closing_json, turn_count, created_at, updated_at,
          genome_edition, engine_version, prompt_version,
          ticket_json, outcome_json, movements_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         conversation_json = excluded.conversation_json,
         closing_json = COALESCE(excluded.closing_json, visits.closing_json),
         turn_count = excluded.turn_count,
         updated_at = excluded.updated_at,
         ticket_json = COALESCE(excluded.ticket_json, visits.ticket_json),
         outcome_json = COALESCE(excluded.outcome_json, visits.outcome_json),
         movements_json = COALESCE(excluded.movements_json, visits.movements_json)`,
    )
      .bind(
        uuid,
        seat,
        JSON.stringify(messages),
        closing ? JSON.stringify(closing) : null,
        messages.length,
        now,
        now,
        env.GENOME_EDITION,
        env.ENGINE_VERSION,
        env.PROMPT_VERSION,
        extra?.ticket ? JSON.stringify(extra.ticket) : null,
        extra?.outcome ? JSON.stringify(extra.outcome) : null,
        movementsJson,
      )
      .run();
  } catch {
    // 호흡이 끊겨도 대화는 계속된다.
  }
}
