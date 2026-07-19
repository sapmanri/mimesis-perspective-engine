import { type Env } from "./common";
import { SEATS } from "./visit";

// 입장 문장 = 예약 확인. 프런트가 아니라 여기서 판정한다 —
// 프런트에서만 보면 /api/ask가 그대로 열려 있고, 누구나 API를 직접 부를 수 있다.
//
// ⚠️ 이 레포는 public이다. 아래 기본값은 소스에서 읽힌다.
//    문장을 감추고 싶으면 시크릿으로 덮어쓴다:
//      npx wrangler pages secret put ENTRY_PHRASE --project-name manri-library
//    (지금 문장은 "감성찾아삽만리" — 어차피 청중이 아는 이름이라 강한 비밀은 아니다.)
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

// 발급된 예약 티켓. uuid가 곧 티켓이며, 좌석이 함께 묶인다(좌석 바꿔치기 방지).
const PASS_TTL_SECONDS = 60 * 60 * 3; // 한 자리의 시간 — 3시간
const passKey = (uuid: string) => `pass:${uuid}`;

export async function issuePass(env: Env, uuid: string, seat: string): Promise<void> {
  await env.PENDING.put(passKey(uuid), seat, { expirationTtl: PASS_TTL_SECONDS });
}

// 이 uuid가 실제로 문턱을 넘어 발급된 것이고, 그 좌석이 맞는가.
export async function passValid(env: Env, uuid: string, seat: string): Promise<boolean> {
  const stored = await env.PENDING.get(passKey(uuid));
  return stored !== null && stored === seat;
}
