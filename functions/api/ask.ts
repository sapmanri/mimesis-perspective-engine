import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../_lib/prompt";
import { json, rateLimitKey, type Env } from "../_lib/common";
import { SEATS, validateConversation, saveVisit, type Turn } from "../_lib/visit";

// 한 턴 = 한 요청이다. 10이면 정상 대화가 열 턴에서 막힌다(실사용 확인 2026-07-20).
// 서재의 속도를 지키면서도 대화를 끊지 않는 선으로 올린다. 남용 차단 목적은 유지.
const RATE_LIMIT_PER_MINUTE = 30;

// 대화 턴: 전체 이력을 받아 다음 되비춤+질문 하나를 돌려준다. 서버는 무상태(이력은 클라이언트).
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "서재가 아직 준비되지 않았습니다." }, 503);
  }

  let uuid: string, seat: string, messages: Turn[];
  try {
    const body = (await request.json()) as {
      uuid?: string;
      seat?: string;
      messages?: Turn[];
    };
    uuid = body.uuid ?? "";
    seat = body.seat ?? "";
    messages = body.messages ?? [];
  } catch {
    return json({ error: "요청을 읽지 못했습니다." }, 400);
  }
  if (!/^[0-9a-f-]{36}$/.test(uuid) || !SEATS[seat]) {
    return json({ error: "잘못된 요청입니다." }, 400);
  }
  const invalid = validateConversation(messages);
  if (invalid) return json({ error: invalid }, 400);

  const rlKey = await rateLimitKey(request);
  const count = Number((await env.PENDING.get(rlKey)) ?? "0");
  if (count >= RATE_LIMIT_PER_MINUTE) {
    return json({ error: "잠시 후에 다시 적어주세요." }, 429);
  }
  await env.PENDING.put(rlKey, String(count + 1), { expirationTtl: 60 });

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: `[좌석 맥락] 사용자가 앉은 자리: ${SEATS[seat]}` },
      ],
      messages,
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
      return json({ error: "서가가 붐빕니다. 잠시 후에 다시 들러주세요." }, 503);
    }
    return json({ error: "말을 고르지 못했습니다. 다시 한번 적어주세요." }, 502);
  }

  if (response.stop_reason === "refusal") {
    return json({
      reply: "이 이야기에는 함께 앉아 있기 어렵습니다. 다른 질문을 꺼내 주시면, 다시 바라보겠습니다.",
    });
  }

  const reply = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!reply) return json({ error: "말을 고르지 못했습니다. 다시 한번 적어주세요." }, 502);

  ctx.waitUntil(saveVisit(env, uuid, seat, [...messages, { role: "assistant", content: reply }], null));

  return json({ reply });
};
