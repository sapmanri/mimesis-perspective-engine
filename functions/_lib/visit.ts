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

// 방문 기록 — 서재의 호흡. 실패는 조용히 삼킨다.
export async function saveVisit(
  env: Env,
  uuid: string,
  seat: string,
  messages: Turn[],
  closing: unknown | null,
): Promise<void> {
  try {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO visits
         (uuid, seat, conversation_json, closing_json, turn_count, created_at, updated_at,
          genome_edition, engine_version, prompt_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         conversation_json = excluded.conversation_json,
         closing_json = COALESCE(excluded.closing_json, visits.closing_json),
         turn_count = excluded.turn_count,
         updated_at = excluded.updated_at`,
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
      )
      .run();
  } catch {
    // 호흡이 끊겨도 대화는 계속된다.
  }
}
