import { json, rateLimitKey, type Env } from "../_lib/common";
import {
  NOT_RESERVED_MESSAGE,
  issuePass,
  phraseAccepted,
  randomSeat,
} from "../_lib/pass";
import { SEATS } from "../_lib/visit";

const MAX_PHRASE_CHARS = 200;
const RATE_LIMIT_PER_MINUTE = 20; // 문 앞에서의 시도 — 대화 카운터와 분리

// 문턱. 입장 문장을 확인하고, 맞으면 예약 티켓(uuid)과 자리를 발급한다.
// 이 티켓이 없으면 /api/ask·/api/close는 열리지 않는다.
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;

  let phrase: string;
  try {
    const body = (await request.json()) as { phrase?: unknown };
    phrase = typeof body.phrase === "string" ? body.phrase : "";
  } catch {
    return json({ error: "요청을 읽지 못했습니다." }, 400);
  }
  if (!phrase.trim()) {
    return json({ error: "문 앞에서 받은 문장을 들려주세요." }, 400);
  }
  if (phrase.length > MAX_PHRASE_CHARS) {
    return json({ error: "문장이 너무 깁니다." }, 400);
  }

  // 문 앞 시도는 대화와 다른 카운터를 쓴다 — 대화량이 입장을 막지 않게.
  const rlKey = (await rateLimitKey(request)) + ":enter";
  const count = Number((await env.PENDING.get(rlKey)) ?? "0");
  if (count >= RATE_LIMIT_PER_MINUTE) {
    return json({ error: "잠시 후에 다시 시도해 주세요." }, 429);
  }
  await env.PENDING.put(rlKey, String(count + 1), { expirationTtl: 60 });

  if (!phraseAccepted(phrase, env)) {
    // 예약이 없는 분께 거짓말하지 않는다 — 예약제 규칙을 그대로 말한다.
    return json({ error: NOT_RESERVED_MESSAGE }, 403);
  }

  // 예약 확인됨. 자리는 서재가 정한다(현재는 무작위 배정 — 예약 시스템 연결 전까지).
  const uuid = crypto.randomUUID();
  const seat = randomSeat();
  await issuePass(env, uuid, seat);

  return json({ uuid, seat, seatContext: SEATS[seat] });
};
