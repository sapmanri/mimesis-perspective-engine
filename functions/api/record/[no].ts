import { json, libraryNumber, type Env } from "../../_lib/common";

// 공개 열람 — 보관소에는 동의된 기록만 존재하므로 존재 자체가 공개 동의다.
// 메타데이터(feature/trait 등)는 독자에게 공개하지 않는다.
export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const no = Number(params.no);
  if (!Number.isInteger(no) || no < 1) return json({ error: "잘못된 번호입니다." }, 400);

  const row = await env.DB.prepare(
    "SELECT no, question, answer, created_at FROM records WHERE no = ?",
  )
    .bind(no)
    .first<{ no: number; question: string; answer: string; created_at: string }>();

  if (!row) return json({ error: "그 번호의 기록은 서가에 없습니다." }, 404);

  return json({
    no: row.no,
    label: libraryNumber(row.no),
    question: row.question,
    answer: row.answer,
    created_at: row.created_at,
  });
};
