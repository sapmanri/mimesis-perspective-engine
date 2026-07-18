// 시스템 프롬프트 게이트.
// functions/_lib/prompt.ts 는 docs/CLAUDE_SYSTEM_PROMPT_V1.md 의 ```text 블록과
// 바이트 단위로 일치해야 한다 (지시서: 프롬프트를 직접 작성하지 않는다).
//   node scripts/verify-prompt.mjs          → 검증 (불일치 시 exit 1)
//   node scripts/verify-prompt.mjs --write  → 문서에서 prompt.ts 재생성(번역 갱신 시)
import { readFileSync, writeFileSync } from "node:fs";

const DOC = "docs/CLAUDE_SYSTEM_PROMPT_V1.md";
const OUT = "functions/_lib/prompt.ts";

const doc = readFileSync(DOC, "utf8");
const m = doc.match(/```text\n([\s\S]*?)\n```/);
if (!m) {
  console.error(`FAIL: ${DOC} 에서 \`\`\`text 블록을 찾지 못함`);
  process.exit(1);
}
const prompt = m[1];

const header = `// 자동 생성 파일 — 직접 수정 금지.
// 원본: ${DOC} (번역 v1). 갱신: node scripts/verify-prompt.mjs --write
export const SYSTEM_PROMPT = `;
const generated = header + JSON.stringify(prompt) + ";\n";

if (process.argv.includes("--write")) {
  writeFileSync(OUT, generated);
  console.log(`WROTE ${OUT} (${prompt.length} chars)`);
  process.exit(0);
}

let current;
try {
  current = readFileSync(OUT, "utf8");
} catch {
  console.error(`FAIL: ${OUT} 없음 — --write 로 생성할 것`);
  process.exit(1);
}
if (current !== generated) {
  console.error("FAIL: prompt.ts 가 문서의 번역과 불일치 — 프롬프트는 문서에서만 바꾼다");
  process.exit(1);
}
console.log(`OK: prompt.ts == ${DOC} (${prompt.length} chars)`);
