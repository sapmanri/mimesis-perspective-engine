import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../_lib/prompt";
import { json, rateLimitKey, type Env } from "../_lib/common";
import { SEATS, validateConversation, saveVisit, type Turn, type MovementLog } from "../_lib/visit";
import { NOT_RESERVED_MESSAGE, readTicket } from "../_lib/pass";
import { MOVEMENT_CODES, TRIGGER_IDS, SIGNAL_IDS } from "../_lib/movements";

// reply(사용자에게)와 movement(내부 기록)를 분리해 받는다.
// 코드·신호 목록은 Conversation Bible에서 생성된 movements.ts가 정본이다 — 여기서 다시 적지 않는다.
const MOVEMENT_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description: "사용자에게 보일 되비춤(0~3문장)과 질문 하나. 이동 코드·이름·신호를 절대 포함하지 않는다.",
    },
    movement: {
      type: "object",
      properties: {
        code: { type: "string", enum: [...MOVEMENT_CODES], description: "이번 턴에 실제로 고른 이동" },
        name: { type: "string", description: "그 이동의 이름" },
        triggers: {
          type: "array",
          // minItems/maxItems는 structured outputs가 받지 않는다 — 개수는 코드에서 자른다.
          items: { type: "string", enum: [...TRIGGER_IDS] },
          description: "이 이동을 고른 근거가 된 관찰 신호. 1~3개.",
        },
      },
      required: ["code", "name", "triggers"],
      additionalProperties: false,
    },
    signals: {
      type: "array",
      // 직전 이동이 만든 변화를 사용자의 방금 말에서만 관찰한다.
      // 성공 판정이 아니다 — 없으면 빈 배열. 억지로 찾지 않는다.
      items: { type: "string", enum: [...SIGNAL_IDS] },
      description:
        "사용자가 방금 한 말에서 관찰된 변화 신호. 없으면 빈 배열. 성공 여부는 판정하지 않는다.",
    },
  },
  required: ["reply", "movement", "signals"],
  additionalProperties: false,
} as const;

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
  // 예약 티켓 확인 — /api/enter에서 문장을 통과한 세션만 대화할 수 있다.
  // (프런트 게이트만으로는 이 엔드포인트가 그대로 열려 있다.)
  const ticket = await readTicket(env, uuid);
  if (!ticket || ticket.seat !== seat) {
    return json({ error: NOT_RESERVED_MESSAGE }, 403);
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
      // 이동은 사용자에게 가는 reply와 분리된 자리로 받는다.
      // 라벨을 나중에 붙이는 게 아니라, 엔진이 옮기기 전에 고른 것을 그대로 받는다.
      output_config: { format: { type: "json_schema", schema: MOVEMENT_SCHEMA } },
      messages,
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
      return json({ error: "서가가 붐빕니다. 잠시 후에 다시 들러주세요." }, 503);
    }
    return json(
      {
        error: "말을 고르지 못했습니다. 다시 한번 적어주세요.",
        detail: err instanceof Error ? err.message.slice(0, 300) : undefined,
      },
      502,
    );
  }

  if (response.stop_reason === "refusal") {
    return json({
      reply: "이 이야기에는 함께 앉아 있기 어렵습니다. 다른 질문을 꺼내 주시면, 다시 바라보겠습니다.",
    });
  }

  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  // 구조화 출력: { reply, movement:{code,name,triggers} }
  let reply = "";
  let movement: { code?: string; name?: string; triggers?: string[] } | null = null;
  let signals: string[] = [];
  try {
    const parsed = JSON.parse(raw) as {
      reply?: string;
      movement?: { code?: string; name?: string; triggers?: string[] };
      signals?: string[];
    };
    reply = (parsed.reply ?? "").trim();
    movement = parsed.movement ?? null;
    signals = Array.isArray(parsed.signals) ? parsed.signals : [];
  } catch {
    reply = raw; // 스키마가 깨져도 대화는 계속된다 — 이동만 기록되지 않는다.
  }
  if (!reply) return json({ error: "말을 고르지 못했습니다. 다시 한번 적어주세요." }, 502);

  const entry: MovementLog | null = movement?.code
    ? {
        turn: messages.length,
        movement: movement.code,
        name: movement.name ?? "",
        triggers: Array.isArray(movement.triggers) ? movement.triggers.slice(0, 3) : [],
        at: new Date().toISOString(),
      }
    : null;

  ctx.waitUntil(
    saveVisit(env, uuid, seat, [...messages, { role: "assistant", content: reply }], null, {
      ticket,
      movement: entry,
      signals,
    }),
  );

  // 이동은 사용자에게 절대 나가지 않는다. reply만.
  return json({ reply });
};
