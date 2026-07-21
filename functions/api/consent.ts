import { json, libraryNumber, rateLimitKey, type Env } from "../_lib/common";
import { SEATS } from "../_lib/visit";
import { NOT_RESERVED_MESSAGE, readTicket } from "../_lib/pass";

// 기록으로 남기기 — 유일하게 '공개될 수 있는' 문이다.
//
// visits는 헌법상 완전 내부 보관이다 (동의 개념이 없으므로).
// 그 대화가 로그북이 되려면, 앉았던 사람이 스스로 이 문을 열어야 한다.
// 그래서 이 엔드포인트는 대화를 만들지 않는다 — 이미 있는 방문을 logbook으로 옮길 뿐이다.
//
// 모델을 부르지 않는다. 판정도 요약도 없다. 옮기거나, 지우거나.
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;

  let uuid: string, seat: string, agreed: boolean;
  try {
    const body = (await request.json()) as { uuid?: string; seat?: string; agreed?: boolean };
    uuid = body.uuid ?? "";
    seat = body.seat ?? "";
    agreed = body.agreed !== false; // 기본은 남기기(누른 사람만 여기 온다). false면 철회.
  } catch {
    return json({ error: "요청을 읽지 못했습니다." }, 400);
  }
  if (!/^[0-9a-f-]{36}$/.test(uuid) || !SEATS[seat]) {
    return json({ error: "잘못된 요청입니다." }, 400);
  }

  // 자기 자리의 대화만 남길 수 있다. 남의 uuid로 남을 공개시킬 수 없다.
  const ticket = await readTicket(env, uuid);
  if (!ticket || ticket.seat !== seat) {
    return json({ error: NOT_RESERVED_MESSAGE }, 403);
  }

  const rlKey = (await rateLimitKey(request)) + ":consent";
  const count = Number((await env.PENDING.get(rlKey)) ?? "0");
  if (count >= 10) return json({ error: "잠시 후에 다시 시도해 주세요." }, 429);
  await env.PENDING.put(rlKey, String(count + 1), { expirationTtl: 60 });

  // 철회 — 누른 뒤 마음이 바뀔 수 있다. 되돌릴 수 없는 동의는 동의가 아니다.
  if (!agreed) {
    try {
      await env.DB.prepare("DELETE FROM logbook WHERE uuid = ?").bind(uuid).run();
    } catch {
      return json({ error: "지우지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
    }
    return json({ agreed: false });
  }

  let visit: {
    seat: string | null;
    conversation_json: string;
    closing_json: string | null;
    outcome_json: string | null;
    turn_count: number | null;
    created_at: string | null;
    ticket_json: string | null;
    genome_edition: string | null;
    engine_version: string | null;
    prompt_version: string | null;
  } | null;
  try {
    visit = await env.DB.prepare(
      `SELECT seat, conversation_json, closing_json, outcome_json, turn_count,
              created_at, ticket_json, genome_edition, engine_version, prompt_version
         FROM visits WHERE uuid = ?`,
    )
      .bind(uuid)
      .first();
  } catch {
    return json({ error: "기록을 남기지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
  if (!visit) return json({ error: "남길 대화를 찾지 못했습니다." }, 404);

  try {
    await env.DB.prepare(
      `INSERT INTO logbook
         (uuid, seat, conversation_json, closing_json, outcome_json, turn_count,
          visited_at, consented_at, ticket_json,
          genome_edition, engine_version, prompt_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         conversation_json = excluded.conversation_json,
         closing_json = excluded.closing_json,
         outcome_json = excluded.outcome_json,
         turn_count = excluded.turn_count,
         consented_at = excluded.consented_at`,
    )
      .bind(
        uuid,
        visit.seat ?? seat,
        visit.conversation_json,
        visit.closing_json,
        visit.outcome_json,
        visit.turn_count,
        visit.created_at,
        new Date().toISOString(),
        visit.ticket_json,
        visit.genome_edition,
        visit.engine_version,
        visit.prompt_version,
      )
      .run();
  } catch {
    return json({ error: "기록을 남기지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }

  // 서재 번호는 남긴 뒤에 읽는다 (덧쓰기여도 처음 번호를 그대로 지킨다).
  const row = await env.DB.prepare("SELECT no FROM logbook WHERE uuid = ?")
    .bind(uuid)
    .first<{ no: number }>();

  return json({ agreed: true, label: row ? libraryNumber(row.no) : null });
};
