import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../_lib/prompt";
import { json, rateLimitKey, type Env, type PendingRecord } from "../_lib/common";

const MAX_QUESTION_CHARS = 500;
const RATE_LIMIT_PER_MINUTE = 6;
const PENDING_TTL_SECONDS = 3600;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "서재가 아직 준비되지 않았습니다." }, 503);
  }

  let question: string;
  try {
    const body = (await request.json()) as { question?: string };
    question = (body.question ?? "").trim();
  } catch {
    return json({ error: "질문을 읽지 못했습니다." }, 400);
  }
  if (!question) return json({ error: "질문이 비어 있습니다." }, 400);
  if (question.length > MAX_QUESTION_CHARS) {
    return json({ error: `질문은 ${MAX_QUESTION_CHARS}자 이내로 적어주세요.` }, 400);
  }

  const rlKey = await rateLimitKey(request);
  const count = Number((await env.PENDING.get(rlKey)) ?? "0");
  if (count >= RATE_LIMIT_PER_MINUTE) {
    return json({ error: "잠시 후에 다시 문을 두드려 주세요." }, 429);
  }
  await env.PENDING.put(rlKey, String(count + 1), { expirationTtl: 60 });

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: question }],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
      return json({ error: "서가가 붐빕니다. 잠시 후에 다시 들러주세요." }, 503);
    }
    return json({ error: "답을 준비하지 못했습니다. 다시 한번 두드려 주세요." }, 502);
  }

  if (response.stop_reason === "refusal") {
    return json({
      uuid: null,
      answer: "이 질문에는 답을 건네드리기 어렵습니다. 다른 질문을 들고 오시면, 다시 바라보겠습니다.",
    });
  }

  const answer = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!answer) {
    return json({ error: "답을 준비하지 못했습니다. 다시 한번 두드려 주세요." }, 502);
  }

  // 동의 전에는 영구 저장하지 않는다 — KV 임시 보관(1시간) 후 자동 소멸.
  const uuid = crypto.randomUUID();
  const pending: PendingRecord = {
    question,
    answer,
    created_at: new Date().toISOString(),
  };
  await env.PENDING.put(`pend:${uuid}`, JSON.stringify(pending), {
    expirationTtl: PENDING_TTL_SECONDS,
  });

  return json({ uuid, answer });
};
