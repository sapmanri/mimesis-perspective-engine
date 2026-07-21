import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../_lib/prompt";
import { json, rateLimitKey, type Env } from "../_lib/common";
import {
  SEATS,
  validateConversation,
  saveVisit,
  readMovements,
  type Turn,
  type MovementLog,
} from "../_lib/visit";
import { NOT_RESERVED_MESSAGE, readTicket } from "../_lib/pass";
import { MOVEMENT_CODES, TRIGGER_IDS, SIGNAL_IDS } from "../_lib/movements";

// 이동은 도구 호출로 받는다 — 되비춤·질문은 본문 그대로 자유롭게 쓰게 둔다.
//
// 예전엔 output_config.format으로 {reply, movement}를 통째로 JSON으로 받았는데,
// 제약 디코딩이 한국어 산문을 손상시켰다 (실사용 2026-07-20: "마스터 샷"→"마스터 피겨",
// ".So they가 지 시서…"). 산문을 JSON 밖으로 빼면 그 위험이 사라지고,
// 본문(text block)과 이동(tool_use block)이 API 층위에서 애초에 분리된다.
//
// 코드·신호 목록은 Conversation Bible에서 생성된 movements.ts가 정본이다 — 여기서 다시 적지 않는다.
const RECORD_MOVEMENT_TOOL: Anthropic.Tool = {
  name: "record_movement",
  description:
    "이번 턴에 고른 이동 문법과, 사용자의 방금 말에서 관찰된 변화를 기록한다. " +
    "매 턴 본문(되비춤+질문)과 함께 정확히 한 번 호출한다. 사용자에게는 보이지 않는다.",
  input_schema: {
    type: "object",
    properties: {
      code: { type: "string", enum: [...MOVEMENT_CODES], description: "이번 턴에 실제로 고른 이동" },
      name: { type: "string", description: "그 이동의 이름" },
      triggers: {
        type: "array",
        items: { type: "string", enum: [...TRIGGER_IDS] },
        description: "이 이동을 고른 근거가 된 관찰 신호 1~3개",
      },
      signals: {
        type: "array",
        items: { type: "string", enum: [...SIGNAL_IDS] },
        description:
          "직전 이동 뒤 사용자의 말에서 관찰된 변화. 없으면 빈 배열. 성공 여부는 판정하지 않는다.",
      },
    },
    required: ["code", "name", "triggers", "signals"],
  },
};

const MOVEMENT_REMINDER =
  "이번 턴도 되비춤·질문 본문과 함께 record_movement를 정확히 한 번 호출한다.";

// 세션 첫머리에는 복원할 이동이 없어 이력이 '도구 없는 대화'로만 보인다.
// 그래서 초반 턴이 자주 빠졌다(실측 2026-07-22: 5턴 중 1·3턴 누락).
// 아직 한 번도 기록되지 않았을 때는 더 분명히 말한다.
const MOVEMENT_REMINDER_FIRST =
  "이 자리의 첫 기록이다. 되비춤과 질문 본문을 쓰고, 같은 응답 안에서 record_movement를 " +
  "반드시 한 번 호출한다. 본문만 쓰고 끝내면 이 턴은 기록되지 않는다.";

// 클라이언트 이력에는 본문만 남는다(이동은 사용자에게 보이지 않으므로).
// 그대로 보내면 모델이 자기 과거를 '도구 없이 텍스트만' 낸 것으로 보고 호출을 건너뛴다
// (실사용 2026-07-20: 4턴 중 1턴만 기록). 저장된 이동으로 이력을 실제 모양대로 복원한다.
function rebuildHistory(messages: Turn[], prior: MovementLog[]): Anthropic.MessageParam[] {
  const byTurn = new Map(prior.map((m) => [m.turn, m]));
  const out: Anthropic.MessageParam[] = [];
  let pending: string | null = null;

  messages.forEach((m, i) => {
    if (m.role === "assistant") {
      const mv = byTurn.get(i);
      if (!mv) {
        out.push({ role: "assistant", content: m.content });
        return;
      }
      const id = `mv_${i}`;
      out.push({
        role: "assistant",
        content: [
          { type: "text", text: m.content },
          {
            type: "tool_use",
            id,
            name: "record_movement",
            input: {
              code: mv.movement,
              name: mv.name,
              triggers: mv.triggers,
              signals: mv.subsequent_signals ?? [],
            },
          },
        ],
      });
      pending = id;
      return;
    }
    // tool_use 뒤의 user 턴은 tool_result를 먼저 담아야 한다.
    if (pending) {
      out.push({
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: pending, content: "기록됨" },
          { type: "text", text: m.content },
        ],
      });
      pending = null;
      return;
    }
    out.push({ role: "user", content: m.content });
  });

  return out;
}

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

  const priorMovements = await readMovements(env, uuid);
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: "claude-opus-4-8",
      // 사고 토큰 + 본문 + 도구 호출이 함께 들어간다. 1024로는 잘렸다(실사용 2026-07-20).
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: `[좌석 맥락] 사용자가 앉은 자리: ${SEATS[seat]}` },
      ],
      // 이동은 도구 호출로만 받는다. 본문(되비춤+질문)은 제약 없는 자유 문장으로 나온다.
      tools: [RECORD_MOVEMENT_TOOL],
      // 저장된 이동으로 이력을 실제 모양(본문+도구 호출)대로 복원해 보낸다.
      // 마지막의 role:"system"은 캐시된 앞부분을 건드리지 않는다 (Opus 4.8).
      messages: [
        ...rebuildHistory(messages, priorMovements),
        {
          role: "system",
          content: priorMovements.length ? MOVEMENT_REMINDER : MOVEMENT_REMINDER_FIRST,
        },
      ],
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

  // 출력이 잘렸으면 문장이 끝나지 않았다 — 반쪽을 보내지 않는다.
  if (response.stop_reason === "max_tokens") {
    return json({ error: "말이 길어져 끝맺지 못했습니다. 다시 한번 적어주세요." }, 502);
  }

  // 본문은 text block 그대로. JSON을 거치지 않으므로 문장이 손상되지 않는다.
  const reply = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  // 이동은 tool_use block에서만 읽는다 — 본문과 애초에 섞이지 않는다.
  const call = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "record_movement",
  );
  const input = (call?.input ?? {}) as {
    code?: string;
    name?: string;
    triggers?: string[];
    signals?: string[];
  };
  const movement = input.code ? { code: input.code, name: input.name, triggers: input.triggers } : null;
  const signals = Array.isArray(input.signals) ? input.signals : [];

  // 최종 방어선: 내부 표지가 한 글자라도 섞였으면 내보내지 않는다.
  // (이동 코드·신호는 사용자에게 절대 보이지 않는다 — 보이면 공략집이 된다.)
  const leaked =
    /"(reply|movement|triggers|signals|code|name)"\s*:/.test(reply) ||
    /\brecord_movement\b/.test(reply) ||
    /\b(T(?:10|[0-9]))\b/.test(reply) ||
    [...TRIGGER_IDS, ...SIGNAL_IDS].some((id) => reply.includes(id));
  if (leaked) {
    return json({ error: "말을 고르지 못했습니다. 다시 한번 적어주세요." }, 502);
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
