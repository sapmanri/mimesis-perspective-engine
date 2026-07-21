import { json, type Env } from "../../_lib/common";
import { guard } from "../../_lib/admin";
import { squeeze } from "../../_lib/pass";

// 예약 문장 관리 — 발급·중지·삭제.
// 사람마다 다른 문장을 건네고, 어떤 건 1회권 어떤 건 10회권으로 준다.

const MAX_PHRASE_CHARS = 100;

// 목록 — 각 문장이 몇 번 쓰였는지 함께 센다(로그에서 세므로 어긋나지 않는다).
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await guard(request, env);
  if (denied) return denied;

  const { results } = await env.DB.prepare(
    `SELECT p.id, p.phrase, p.label, p.max_uses, p.active, p.created_at, p.expires_at, p.kind,
            (SELECT COUNT(*) FROM phrase_uses u WHERE u.phrase_id = p.id AND u.ok = 1) AS used,
            (SELECT MAX(at)   FROM phrase_uses u WHERE u.phrase_id = p.id AND u.ok = 1) AS last_used
       FROM phrases p ORDER BY p.id DESC`,
  ).all();

  return json({ count: results.length, phrases: results });
};

// 발급 — {phrase, label, maxUses, expiresAt}. phrase가 비면 서재가 하나 짓는다.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await guard(request, env);
  if (denied) return denied;

  let body: { phrase?: string; label?: string; maxUses?: number | null; expiresAt?: string | null; kind?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "요청을 읽지 못했습니다." }, 400);
  }

  const phrase = (body.phrase ?? "").trim() || generatePhrase();
  if (phrase.length > MAX_PHRASE_CHARS) return json({ error: "문장이 너무 깁니다." }, 400);

  const key = squeeze(phrase);
  if (key.length < 4) return json({ error: "문장이 너무 짧습니다 (공백 제외 4자 이상)." }, 400);

  // 한 문장이 다른 문장에 포함되면 누구 것인지 갈리지 않는다. 미리 막는다.
  const { results } = await env.DB.prepare("SELECT match_key FROM phrases").all<{ match_key: string }>();
  for (const r of results ?? []) {
    if (r.match_key.includes(key) || key.includes(r.match_key)) {
      return json({ error: `이미 있는 문장과 겹칩니다: ${r.match_key}` }, 409);
    }
  }

  const maxUses =
    body.maxUses === null || body.maxUses === undefined ? null : Math.max(1, Number(body.maxUses));

  try {
    await env.DB.prepare(
      `INSERT INTO phrases (phrase, match_key, label, max_uses, active, created_at, expires_at, kind)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
    )
      .bind(
        phrase,
        key,
        (body.label ?? "").trim() || null,
        maxUses,
        new Date().toISOString(),
        body.expiresAt || null,
        body.kind === "admin" ? "admin" : "seat",
      )
      .run();
  } catch {
    return json({ error: "이미 있는 문장입니다." }, 409);
  }

  const row = await env.DB.prepare("SELECT * FROM phrases WHERE match_key = ?").bind(key).first();
  return json({ phrase: row });
};

// 수정 — {id, active} 로 잠깐 닫아둔다. 지우지 않고 멈추는 길.
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await guard(request, env);
  if (denied) return denied;

  let body: { id?: number; active?: boolean; label?: string; maxUses?: number | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "요청을 읽지 못했습니다." }, 400);
  }
  if (!body.id) return json({ error: "id가 필요합니다." }, 400);

  if (body.active !== undefined) {
    await env.DB.prepare("UPDATE phrases SET active = ? WHERE id = ?")
      .bind(body.active ? 1 : 0, body.id)
      .run();
  }
  if (body.label !== undefined) {
    await env.DB.prepare("UPDATE phrases SET label = ? WHERE id = ?")
      .bind(body.label.trim() || null, body.id)
      .run();
  }
  if (body.maxUses !== undefined) {
    await env.DB.prepare("UPDATE phrases SET max_uses = ? WHERE id = ?")
      .bind(body.maxUses === null ? null : Math.max(1, Number(body.maxUses)), body.id)
      .run();
  }
  const row = await env.DB.prepare("SELECT * FROM phrases WHERE id = ?").bind(body.id).first();
  return json({ phrase: row });
};

// 삭제 — 문장만 지운다. 사용 로그는 남는다(로그에 문장 원문이 함께 적혀 있다).
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await guard(request, env);
  if (denied) return denied;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return json({ error: "id가 필요합니다." }, 400);

  // 마지막 관리자 문장을 지우면 다른 문이 영영 닫힌다 (ADMIN_TOKEN 마스터 키만 남는다).
  const target = await env.DB.prepare("SELECT kind FROM phrases WHERE id = ?")
    .bind(id)
    .first<{ kind: string }>();
  if (target?.kind === "admin") {
    const left = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM phrases WHERE kind = 'admin' AND id != ?",
    )
      .bind(id)
      .first<{ n: number }>();
    if ((left?.n ?? 0) === 0) {
      return json({ error: "마지막 관리자 문장입니다. 새 문장을 먼저 만들고 지워주세요." }, 409);
    }
  }

  await env.DB.prepare("UPDATE phrase_uses SET phrase_id = NULL WHERE phrase_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM phrases WHERE id = ?").bind(id).run();
  return json({ deleted: id });
};

// 서재가 문장을 하나 짓는다. 뜻이 통하고, 외워서 건넬 수 있는 길이로.
const HEAD = ["느린", "오래된", "조용한", "저녁의", "먼", "따뜻한", "흐린", "깊은"];
const BODY = ["창가", "벽난로", "책장", "계단", "빗소리", "등불", "담요", "타자기"];
const TAIL = ["에서 왔어요", "를 지나왔어요", "앞에서 기다렸어요", "쪽으로 앉을게요"];

function generatePhrase(): string {
  const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
  return `${pick(HEAD)} ${pick(BODY)}${pick(TAIL)}`;
}
