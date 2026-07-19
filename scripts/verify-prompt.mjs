// 프롬프트 생성·검증 게이트.
//
// 사슬:  Conversation Bible  →  CLAUDE_SYSTEM_PROMPT_V1.md  →  functions/_lib/prompt.ts
//
// 정본은 언제나 Bible이다. 프롬프트는 파생물이며 손으로 고치지 않는다.
// 이동 문법(T0~T10)과 관찰 신호는 question-transition.md의 표에서 생성된다.
//
//   node scripts/verify-prompt.mjs          → 사슬 전체 검증 (불일치 시 exit 1)
//   node scripts/verify-prompt.mjs --write  → Bible에서 문서 구역 + prompt.ts 재생성
import { readFileSync, writeFileSync } from "node:fs";

const BIBLE = "docs/manri-conversation-bible/question-transition.md";
const DOC = "docs/CLAUDE_SYSTEM_PROMPT_V1.md";
const OUT = "functions/_lib/prompt.ts";
const OUT_MOVES = "functions/_lib/movements.ts";

const BEGIN = "# 질문의 이동 — 자동 생성 구역 시작 (Conversation Bible 파생 · 직접 수정 금지)";
const END = "# 질문의 이동 — 자동 생성 구역 끝";

const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
};

// ── 1. Bible에서 이동 코드 / 관찰 신호 표를 읽는다 ──────────────────────────
function readTable(md, heading) {
  const start = md.indexOf(heading);
  if (start < 0) fail(`${BIBLE} 에서 '${heading}' 절을 찾지 못함`);
  const body = md.slice(start + heading.length);
  const rows = [];
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (t.startsWith("###") || t.startsWith("## ")) break; // 다음 절에서 멈춤
    if (!t.startsWith("|")) continue;
    const cells = t.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    if (/^-+$/.test(cells[0].replace(/[: ]/g, ""))) continue; // 구분선
    if (cells[0] === "code" || cells[0] === "trigger") continue; // 헤더
    rows.push(cells);
  }
  if (!rows.length) fail(`${BIBLE} '${heading}' 표가 비어 있음`);
  return rows;
}

const bible = readFileSync(BIBLE, "utf8");
const movements = readTable(bible, "### 이동 코드");
const triggers = readTable(bible, "### 관찰 신호 (trigger)");

// ── 2. 프롬프트에 넣을 블록으로 렌더 ────────────────────────────────────────
const block = [
  BEGIN,
  "",
  "질문은 바꾸지 않는다. 조금씩 옮긴다. 아래 문법 중 하나를 골라 한 턴에 하나만 쓴다.",
  "옮기지 않는 것(T0)도 문법이며, 이동할 이유가 분명하지 않으면 T0가 기본값이다.",
  "",
  ...movements.map(([code, name, when]) => `- ${code} · ${name} — ${when}`),
  "",
  "이동을 고른 근거는 아래 관찰 신호 중 1~3개로 지목한다.",
  "",
  ...triggers.map(([id, seen]) => `- ${id} — ${seen}`),
  "",
  END,
].join("\n");

// ── 3. 문서의 자동 생성 구역을 교체 ─────────────────────────────────────────
const doc = readFileSync(DOC, "utf8");
const b = doc.indexOf(BEGIN);
const e = doc.indexOf(END);
if (b < 0 || e < 0 || e < b) fail(`${DOC} 에서 자동 생성 구역 표식을 찾지 못함`);
const nextDoc = doc.slice(0, b) + block + doc.slice(e + END.length);

// ── 4. 문서의 ```text 블록 → prompt.ts ─────────────────────────────────────
const m = nextDoc.match(/```text\n([\s\S]*?)\n```/);
if (!m) fail(`${DOC} 에서 \`\`\`text 블록을 찾지 못함`);
const prompt = m[1];

const header = `// 자동 생성 파일 — 직접 수정 금지.
// 원본: ${DOC} (번역 v1). 이동 문법은 ${BIBLE} 에서 파생.
// 갱신: node scripts/verify-prompt.mjs --write
export const SYSTEM_PROMPT = `;
const generated = header + JSON.stringify(prompt) + ";\n";

// ── 5. 코드·신호 목록도 Bible에서 생성한다 (API 스키마가 정본을 복사하지 않게) ──
const movesFile =
  `// 자동 생성 파일 — 직접 수정 금지.\n` +
  `// 원본: ${BIBLE} (이동 문법의 정본).\n` +
  `// 갱신: node scripts/verify-prompt.mjs --write\n` +
  `export const MOVEMENT_CODES = ${JSON.stringify(movements.map((r) => r[0]))} as const;\n` +
  `export const MOVEMENT_NAMES: Record<string, string> = ${JSON.stringify(
    Object.fromEntries(movements.map((r) => [r[0], r[1]])),
  )};\n` +
  `export const TRIGGER_IDS = ${JSON.stringify(triggers.map((r) => r[0]))} as const;\n`;

if (process.argv.includes("--write")) {
  if (nextDoc !== doc) writeFileSync(DOC, nextDoc);
  writeFileSync(OUT, generated);
  writeFileSync(OUT_MOVES, movesFile);
  console.log(
    `OK(write): Bible(이동 ${movements.length} · 신호 ${triggers.length}) → ${DOC} → ${OUT} (${prompt.length} chars)`,
  );
  process.exit(0);
}

// 검증: 문서 구역이 Bible과 어긋나 있으면 실패
if (nextDoc !== doc) {
  fail(`${DOC} 의 이동 문법 구역이 ${BIBLE} 과 다릅니다 — node scripts/verify-prompt.mjs --write`);
}
let current;
try {
  current = readFileSync(OUT, "utf8");
} catch {
  fail(`${OUT} 없음 — --write 로 생성할 것`);
}
if (current !== generated) {
  fail(`${OUT} 가 ${DOC} 와 다릅니다 — node scripts/verify-prompt.mjs --write`);
}
let currentMoves;
try {
  currentMoves = readFileSync(OUT_MOVES, "utf8");
} catch {
  fail(`${OUT_MOVES} 없음 — --write 로 생성할 것`);
}
if (currentMoves !== movesFile) {
  fail(`${OUT_MOVES} 가 ${BIBLE} 과 다릅니다 — node scripts/verify-prompt.mjs --write`);
}
console.log(
  `OK: ${BIBLE}(이동 ${movements.length} · 신호 ${triggers.length}) == ${DOC} == ${OUT} (${prompt.length} chars)`,
);
