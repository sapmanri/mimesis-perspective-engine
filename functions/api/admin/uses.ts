import { json, type Env } from "../../_lib/common";
import { guard } from "../../_lib/admin";

// 예약 문장 사용 로그 — 입장도 거절도 함께 본다.
// 거절(ok=0)이 쌓이면 그 문장은 소진됐거나 기한이 지난 것이다.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await guard(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const phraseId = url.searchParams.get("phraseId");
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 200));

  const sql =
    `SELECT id, phrase_id, phrase, said, uuid, seat, at, ok FROM phrase_uses` +
    (phraseId ? ` WHERE phrase_id = ?` : ``) +
    ` ORDER BY at DESC LIMIT ?`;

  const stmt = phraseId
    ? env.DB.prepare(sql).bind(Number(phraseId), limit)
    : env.DB.prepare(sql).bind(limit);

  const { results } = await stmt.all();
  return json({ count: results.length, uses: results });
};
