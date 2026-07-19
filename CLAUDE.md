# MIMESIS — Designing Observers (만리서재 / Perception Engine)

관찰자를 설계하는 프로젝트. 세션 시작 시 vault `~/Documents/Obsidian Vault/01 Projects/Byeol/HANDOFF_MANRI_<최신날짜>.md`를 먼저 읽을 것.

## 역할 경계
- **Vase**: 게놈 설계자 · 아키텍트 · PM — 형질 진위와 방향의 **판정**. 기능 아이디어는 Vase가 낸다.
- **Claude**: 개발자 · 초안 작성 — 초안을 만들고 판정을 받는다. 판정 없이 확정하지 않는다.

## 헌법 (읽기 순서 — 이 문서들과 충돌하는 코드·문서는 쓸 수 없다)
1. `docs/MANRI_LIBRARY_MANIFESTO.md` — 철학 선언 (모든 결정의 기준)
2. `docs/MIMESIS_OBSERVATION_ARCHITECTURE.md` — 공개 문서 (30초 설명)
3. `docs/SAPMANRI_GENOME_SPEC_V1.md` — **Genome Edition 1, 확정·영구 불변** (형질 문장 수정 절대 금지 — 새 형질은 설계자 판정으로만 뒤 번호 추가)
4. `docs/SAPMANRI_PERCEPTION_ENGINE_SPEC_V1.md` — Engine v1 (Rule·Anti·Mutation)
5. `docs/SAPMANRI_PROMPT_BLUEPRINT_V1.md` — Blueprint v1 (파이프라인·Lexicon·AST)
6. `docs/SAPMANRI_PERSPECTIVE_ENGINE_V1.md` — 정본 (계층 모델·로드맵·안전 계약 9절)
7. `docs/MANRI_INTEGRATION_BIBLE.md` — 엔진↔경험층 연결 (**제1원칙: 엔진을 우회·재구현하지 말고 사용한다**)
8. `docs/manri-visual-bible/` — 공간의 헌법 (검수 대기)
9. `docs/manri-conversation-bible/` — 대화의 헌법 + 예시 107편 (검수 대기)
10. `docs/MANRI_LIBRARY_EXPRESSION_V2.md` — 현행 서비스 표현 명세

## 절대 원칙 (전부 Vase 판정으로 확정된 것)
- **프롬프트는 창작물이 아니라 파생물** — `functions/_lib/prompt.ts`는 `docs/CLAUDE_SYSTEM_PROMPT_V1.md`에서 기계 추출. 수정은 문서에서만: `node scripts/verify-prompt.mjs --write`. 게이트: `npm run verify` (배포 전 필수).
- **만리서재는 채팅 UI가 아니다. 하나의 디지털 공간이다.** 말풍선·채팅 문법 금지.
- Genome만 Edition(발견으로만 증가), Engine·Prompt·API는 Version.
- 사용자는 엔진을 만나지 않는다 (내부 호칭 제안: Foundation). AI 자기언급 금지 — 단, 직접 물으면 정직하게 인정.
- 기록은 서재의 호흡(자동·무표시) + **완전 내부 보관** (공개 열람 금지 — 동의 개념이 없으므로).
- 안전·사실성(Layer 3)은 모든 형식·철학 위에 있다.
- 표현 변경은 프롬프트 직접 수정이 아니라: 표현 명세 개정 → (필요시 Blueprint 개정) → 재번역.

## 서비스 (배포됨)
- **https://manri-library.pages.dev** — Cloudflare Pages `manri-library`
- 인프라: D1 `manri-library-archive` (records + visits 테이블), KV `PENDING`(임시·rate limit), 시크릿 ANTHROPIC_API_KEY·ADMIN_TOKEN 설정 완료
- 배포: `npm run verify && npx wrangler pages deploy public --project-name manri-library --commit-dirty=true`
- 모델: claude-opus-4-8, adaptive thinking, 시스템 프롬프트 cache_control
- API: POST `/api/ask`(대화 턴, 무상태 — 이력은 클라이언트) · POST `/api/close`(일어나기, structured output) · GET `/api/admin/list`(Bearer)

## 함정 (실경험)
- CC 브라우저 패널은 rAF 스로틀 — 전환·애니메이션이 얼어 보임(로직은 정상). 전환 체감은 **실기기 QA**.
- python-urllib은 Cloudflare에 403 — API 테스트는 curl로.
- `wrangler pages secret put`은 붙여넣기가 화면에 안 보이는 게 정상.
- GitHub Pages(문서 열람용)는 main/root Jekyll — 문서에 `{{` `{%` 넣지 말 것.
- 명령 체인 `&&`만, 게이트는 `> log 2>&1; RC=$?`로 exit 직접 검사, 검증기는 음성 테스트 필수.

## 현재 상태 (2026-07-19)
확정: 헌법 1~7 + Expression V2. **검수 대기: Visual Bible · Manifesto · Conversation Bible(107예시) · Integration Bible.**
다음(검수 후 순서): 기준 컷 생성(master-space-prompt) → 좌석 이동 프로토타입 → 프롬프트 v3 재번역(Integration 파이프라인) → 실측 → 테스트 20문항 평가(로드맵 05).
