import { json, libraryNumber, type Env } from "../../_lib/common";
import { guard } from "../../_lib/admin";

// 대화 기록 열람 — 관리자 내부 검토용.
//
// ⚠️ 두 출처는 성격이 다르다. 화면에서도 절대 섞지 않는다.
//    visits  = 완전 내부 보관. 동의를 받지 않았다. 공개·인용·출판 금지.
//    logbook = 앉았던 사람이 직접 남기겠다고 누른 것. 로그북은 여기서만 뽑는다.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await guard(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const source = url.searchParams.get("source") === "logbook" ? "logbook" : "visits";
  const uuid = url.searchParams.get("uuid");

  // 한 건 펼쳐 보기 — 대화 전문까지.
  if (uuid) {
    if (!/^[0-9a-f-]{36}$/.test(uuid)) return json({ error: "잘못된 uuid입니다." }, 400);
    const row = await env.DB.prepare(`SELECT * FROM ${source} WHERE uuid = ?`).bind(uuid).first();
    if (!row) return json({ error: "찾지 못했습니다." }, 404);
    return json({ source, visit: row });
  }

  const limit = Math.min(300, Math.max(1, Number(url.searchParams.get("limit")) || 100));

  // 목록에는 전문을 싣지 않는다 — 첫 문장만 보인다.
  const cols =
    source === "logbook"
      ? `no, uuid, seat, turn_count, visited_at AS created_at, consented_at,
         closing_json, outcome_json, NULL AS movements_json,
         genome_edition, engine_version, prompt_version`
      : `NULL AS no, uuid, seat, turn_count, created_at, NULL AS consented_at,
         closing_json, outcome_json, movements_json,
         genome_edition, engine_version, prompt_version`;

  const { results } = await env.DB.prepare(
    `SELECT ${cols} FROM ${source} ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(limit)
    .all();

  // 목록용 요약: 첫 질문·이동 수만 꺼낸다. 판정하지 않는다.
  const rows = (results ?? []).map((r) => {
    const outcome = safeParse(r.outcome_json as string | null);
    const movements = safeParse(r.movements_json as string | null);
    return {
      ...r,
      label: r.no ? libraryNumber(r.no as number) : null,
      firstQuestion: outcome?.firstQuestion ?? null,
      lastSentence: outcome?.lastSentence ?? null,
      userEnded: outcome?.userEnded ?? null,
      movementCount: Array.isArray(movements) ? movements.length : null,
      closing_json: undefined,
      outcome_json: undefined,
      movements_json: undefined,
    };
  });

  return json({ source, count: rows.length, visits: rows });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParse(s: string | null): any {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
