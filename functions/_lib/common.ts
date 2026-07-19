export interface Env {
  ANTHROPIC_API_KEY: string;
  ADMIN_TOKEN: string;
  DB: D1Database;
  PENDING: KVNamespace;
  GENOME_EDITION: string;
  ENGINE_VERSION: string;
  PROMPT_VERSION: string;
  // 입장 문장(예약 확인). 미설정 시 _lib/pass.ts의 기본값을 쓴다.
  ENTRY_PHRASE?: string;
  // 티켓에 함께 찍히는 판본 (게놈이 올라가도 예전 예약을 다시 읽기 위해)
  CONVERSATION_VERSION?: string;
  VISUAL_VERSION?: string;
}

export const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

// 서재 번호 표기: 1 → "만리서재 000001"
export const libraryNumber = (no: number): string =>
  `만리서재 ${String(no).padStart(6, "0")}`;

// 남용 방지용 임시 카운터 키 (아카이브에는 IP를 저장하지 않는다 — TTL 60초 후 소멸)
export async function rateLimitKey(request: Request): Promise<string> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`manri:${ip}`),
  );
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `rl:${hex.slice(0, 24)}`;
}
