import { json, rateLimitKey, type Env } from "../_lib/common";
import {
  REFUSAL_MESSAGE,
  buildTicket,
  issueKeeperSession,
  issuePass,
  logPhraseUse,
  randomSeat,
  resolvePhrase,
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

  const verdict = await resolvePhrase(env, phrase);

  if (!verdict.ok) {
    // 문장을 알아본 경우(소진·만료·중지)는 거절도 로그에 남긴다 — 나중에 봐야 하므로.
    if (verdict.row) {
      ctx.waitUntil(
        logPhraseUse(env, {
          phraseId: verdict.row.id,
          phrase: verdict.row.phrase,
          said: phrase.trim(),
          uuid: null,
          seat: null,
          ok: false,
        }),
      );
    }
    // 예약이 없는 분께 거짓말하지 않는다 — 사정을 그대로 말한다.
    return json({ error: REFUSAL_MESSAGE[verdict.reason] ?? REFUSAL_MESSAGE.no_match }, 403);
  }

  // 세 자리가 아닌 다른 문. 문장이 열쇠를 발급한다 — 페이지만 숨기는 게 아니다.
  if (verdict.row?.kind === "admin") {
    const token = await issueKeeperSession(env, verdict.row.id);
    ctx.waitUntil(
      logPhraseUse(env, {
        phraseId: verdict.row.id,
        phrase: verdict.row.phrase,
        said: phrase.trim(),
        uuid: null,
        seat: "(다른 문)",
        ok: true,
      }),
    );
    return json({ door: "keeper", token });
  }

  // 예약 확인됨. 자리는 서재가 정한다(현재는 무작위 배정 — 예약 시스템 연결 전까지).
  const uuid = crypto.randomUUID();
  const seat = randomSeat();
  // 티켓에 '그때의 서재'를 통째로 찍는다 — 판본이 올라가도 이 예약을 다시 읽을 수 있게.
  const ticket = buildTicket(env, seat, phrase.trim());
  await issuePass(env, uuid, ticket);

  // 사용 로그는 입장을 막지 않는다. 티켓은 이미 발급됐다.
  ctx.waitUntil(
    logPhraseUse(env, {
      phraseId: verdict.row?.id ?? null,
      phrase: verdict.row?.phrase ?? "(비상 만능열쇠)",
      said: phrase.trim(),
      uuid,
      seat,
      ok: true,
    }),
  );

  return json({ uuid, seat, seatContext: SEATS[seat] });
};
