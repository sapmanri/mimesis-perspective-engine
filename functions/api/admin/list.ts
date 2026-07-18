import { json, libraryNumber, type Env } from "../../_lib/common";

// 관리자 전용 목록 — 날짜·질문·답변. Bearer 토큰(ADMIN_TOKEN 시크릿) 필요.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = request.headers.get("authorization") ?? "";
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return json({ error: "unauthorized" }, 401);
  }

  const { results } = await env.DB.prepare(
    `SELECT no, question, answer, created_at,
            features_json, emergent_json, trait_ids, rule_ids, q_len, a_len
     FROM records ORDER BY no DESC LIMIT 200`,
  ).all();

  return json({
    count: results.length,
    records: results.map((r) => ({ ...r, label: libraryNumber(r.no as number) })),
  });
};
