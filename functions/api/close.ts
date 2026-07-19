import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../_lib/prompt";
import { json, rateLimitKey, type Env } from "../_lib/common";
import { SEATS, validateConversation, saveVisit, buildOutcome, type Turn } from "../_lib/visit";
import { NOT_RESERVED_MESSAGE, readTicket } from "../_lib/pass";

// 자리에서 일어나기 — 결론이 아니라 사용자의 변화를 정리해 돌려준다.
const CLOSING_SCHEMA = {
  type: "object",
  properties: {
    first_question: { type: "string" },
    discovered_question: { type: "string" },
    user_sentence: { type: "string" },
    farewell: { type: "string" },
  },
  required: ["first_question", "discovered_question", "user_sentence", "farewell"],
  additionalProperties: false,
} as const;

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "서재가 아직 준비되지 않았습니다." }, 503);
  }

  let uuid: string, seat: string, messages: Turn[];
  try {
    const body = (await request.json()) as { uuid?: string; seat?: string; messages?: Turn[] };
    uuid = body.uuid ?? "";
    seat = body.seat ?? "";
    messages = body.messages ?? [];
  } catch {
    return json({ error: "요청을 읽지 못했습니다." }, 400);
  }
  if (!/^[0-9a-f-]{36}$/.test(uuid) || !SEATS[seat]) {
    return json({ error: "잘못된 요청입니다." }, 400);
  }
  const ticket = await readTicket(env, uuid);
  if (!ticket || ticket.seat !== seat) {
    return json({ error: NOT_RESERVED_MESSAGE }, 403);
  }
  const invalid = validateConversation(messages);
  if (invalid && messages.length <= 60) return json({ error: invalid }, 400);

  // 나가는 길은 대화량에 막히면 안 된다. 예전엔 /api/ask와 같은 카운터를 써서,
  // 열 턴 넘게 이야기하면 '자리에서 일어나기'만 429로 막혔다 (실사용 확인 2026-07-20).
  // 일어나기는 세션당 한 번이므로 자기 카운터를 따로 둔다.
  const rlKey = (await rateLimitKey(request)) + ":close";
  const count = Number((await env.PENDING.get(rlKey)) ?? "0");
  if (count >= 6) return json({ error: "잠시 후에 다시 시도해 주세요." }, 429);
  await env.PENDING.put(rlKey, String(count + 1), { expirationTtl: 60 });

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        {
          type: "text",
          text: "[마무리 모드] 사용자가 자리에서 일어난다. 프롬프트의 마무리 모드 규약대로 오늘 처음의 질문(사용자의 첫 문장 그대로), 새롭게 발견한 질문, 사용자가 남긴 문장(실제 쓴 문장 그대로 인용, 창작 금지), 짧은 인사를 산출하라.",
        },
      ],
      output_config: { format: { type: "json_schema", schema: CLOSING_SCHEMA } },
      messages: [
        ...messages,
        { role: "user", content: "(자리에서 일어납니다.)" },
      ],
    });
  } catch {
    return json({ error: "마무리를 준비하지 못했습니다. 잠시 후 다시 일어나 주세요." }, 502);
  }

  const text = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  if (!text) return json({ error: "마무리를 준비하지 못했습니다." }, 502);

  let closing: Record<string, string>;
  try {
    closing = JSON.parse(text.text);
  } catch {
    return json({ error: "마무리를 준비하지 못했습니다." }, 502);
  }

  // 종료 로그 — AI가 판정하지 않는다. 대화에서 그대로 꺼낸 세 가지뿐.
  ctx.waitUntil(
    saveVisit(env, uuid, seat, messages, closing, {
      ticket,
      outcome: buildOutcome(messages, true),
    }),
  );

  return json({ closing });
};
