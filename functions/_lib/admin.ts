import { json, type Env } from "./common";
import { keeperSessionValid } from "./pass";

// 관리자 문. 모든 /api/admin/* 는 이걸 먼저 통과해야 한다.
// 통과하면 null, 아니면 그대로 돌려보낼 401 응답.
//
// 열쇠는 둘이다.
//   ① ADMIN_TOKEN 시크릿 — 문장이 다 지워져도 남는 마스터 키.
//   ② 다른 문에서 받은 세션 열쇠 — 관리자 문장으로 발급되고 2시간 뒤 사라진다.
// 페이지를 숨기는 것만으로는 문이 아니다. 판정은 반드시 여기서 한다.
export async function guard(request: Request, env: Env): Promise<Response | null> {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);
  if (env.ADMIN_TOKEN && token === env.ADMIN_TOKEN) return null;
  if (await keeperSessionValid(env, token)) return null;
  return json({ error: "unauthorized" }, 401);
}
