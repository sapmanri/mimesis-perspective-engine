# MANRI INTEGRATION BIBLE v1.0

- 성격: Perspective Engine(기반)과 만리서재 경험층(건물)의 연결 명세
- 상태: 검수 대기
- 제1원칙: **새 문서는 엔진을 대체하는 문서가 아니다. 엔진을 사용하는 문서다.**
  엔진의 우회·재구현 금지. 이 문서에서 "판단한다·계산한다·해부한다"로 서술되는 모든 것은
  기존 엔진 문서(Genome Edition 1 · Engine Spec v1 · Blueprint v1)의 해당 절을 가리킨다.
- 부속 계약: `MANRI_FOUNDATION_CONTRACT.md` — 두 층이 서로 **몰라야 하는 것**의 명세
  (엔진은 공감·UI·말투·예약·공간을 모른다 / 경험층은 엔진 내부 Rule을 복사하지 않는다).

## 0. 구조 — 보이지 않는 건축

```
                 MIMESIS Perspective Engine  (Foundation — 이미 완성된 기반)
                            │
         ┌──────────────────┼──────────────────┐
      질문 이해           관점 이동           표현 생성
   (Observation Lexicon) (Genome/Rules)    (E-Rules/Style)
                            │
                       만 리 서 재
                            │
                     Experience Layer
              공간(Visual Bible) · 대화(Conversation Bible)
              예약석 · 시간 · 침묵 · 기록
```

사람은 카페의 철골을 계산하지 않지만, 그 철골이 공간을 세운다. 엔진이 그 철골이다.
**사용자는 엔진을 직접 만나지 않는다. 만리서재만 만난다.** 엔진이 화면·문장·기능명
어디에도 노출되면 그것은 구조 위반이다.

- 내부 호칭 제안 (Vase 발안, 확정 시 정본 반영): 경험층 문서 안에서 Perspective Engine을
  **Foundation**이라 부른다. 파일명·기존 문서는 그대로 둔다.

## 1. 한 턴의 파이프라인

```
사용자 입력
  ↓  ① Question Parser        — Blueprint Step 1~2: Observation Vector 추출(Static),
  │                              Emergent 도출. [엔진 사용: Blueprint 2절 Lexicon]
  ↓  ② Perspective Engine     — Blueprint Step 3~5: Trait 선택, Rule 적용,
  │                              관점 이동 후보 계산. [엔진 사용: Genome·Engine Spec]
  ↓  ③ Conversation Bible     — 이동 후보 중 이번 턴의 한 걸음 선택 — 또는 T0(머무르기,
  │                              걸음 없음): 계단 확인(taxonomy) → 이동 문법 선택(transition)
  │                              → 금지 필터(anti-patterns) → 속도·침묵 규약.
  │                              엔진의 후보는 후보일 뿐, 이동은 의무가 아니다.
  ↓  ④ Seat Personality       — 좌석 대화 프로필 적용 (주력 문법 가중, 금지 질문,
  │                              되비춤 온도) [seat-*-conversation.md]
  ↓  ⑤ Language Style         — 문장 길이·말끝·어휘·리듬 [language-style.md + E-Rules]
  ↓  ⑥ Output                 — 되비춤 0~3문장 + 질문 하나 (또는 침묵 규약의 그 이하)
```

Safety(Layer 3)는 파이프라인의 단계가 아니라 **전체를 감싸는 외벽**이다 — ①에서
위험 feature가 관찰되면 ②~⑤를 정지시키고 직접 발화한다 (Blueprint Step 6과 동일).

## 2. 분업 선언 (무엇이 누구의 일인가)

| 일 | 담당 | 근거 문서 |
|---|---|---|
| 질문의 형질 추출 (벡터) | 엔진 | Blueprint 2절 Observation Lexicon |
| 형질→발현할 Trait 선택 | 엔진 | Lexicon 라우팅 + Engine Spec |
| 관점 이동의 *방향* 후보 | 엔진 | Genome G원리 + I-Rules |
| 이동의 *걸음* (계단·문법) | Conversation Bible | taxonomy + transition |
| 질문 문장의 형태·온도 | Conversation Bible + 좌석 | seat-* + language-style |
| 침묵·속도·끝 | Conversation Bible | silence + ending |
| 공간·시각·움직임 | Visual Bible | 전 문서 |
| 안전·사실성 | Layer 3 (불변) | 정본 9절 |

중복처럼 보이는 것의 정리: Conversation Bible의 이동 문법은 Engine Rule의 재구현이
아니라 **대화형 발현**이다. T6(장면으로 내려가기)=P-01의 질문형, T5(낱말 되묻기)=
I-01 Mutation(사용자 명명 존중)의 질문형, T9의 주의 조항=I-01 그 자체. 충돌 시
항상 Genome이 이긴다.

## 3. Feature → 대화의 매핑 (①→③의 다리)

| Observation (엔진 산출) | 계단 시작점 | 우선 문법 |
|---|---|---|
| 감정 높음 / 명명된 감정 | 3 (감정) — 내민 것에서 시작 | 받기 → T8/T4 |
| 추측 + 관계 + 불확실성 (확인 욕구) | 2~3 | T5, T7 |
| 회상·상실·시간 (그리움) | 1~2를 오래 | T2, T6 |
| 방향 상실 | 목적지를 5(의미)로 | T4, T1 |
| 추상 높음 | 1로 하강 먼저 | T6 |
| 정보 높음 | 계단 밖 — 즉답 (Layer 3 사실성) | 답 후 필요시 복귀 |
| 위험 | 파이프라인 정지 | Layer 3 직접 발화 |

## 4. 좌석 배정과 엔진

- 좌석은 사용자가 고른다. 엔진은 좌석을 정하지 않는다.
- 다만 첫 입력의 Vector가 좌석과 크게 어긋나면 (예: 책상에 앉아 깊은 상실의 질문)
  좌석을 바꾸라 하지 않는다 — **그 좌석의 문법 안에서 받는다.** 자리를 옮기는 것은
  언제나 사용자의 선택이다.

## 5. 구현 시 금지 (다음 단계를 위한 미리 새김)

- 엔진 문서의 규칙을 경험층 문서에 복사·변형해 넣지 않는다 — 참조한다.
- 경험층의 필요 때문에 Genome·Lexicon·Rule을 수정하지 않는다. 필요가 생기면
  그것은 "새 형질/Rule의 발견"이며 설계자 판정 절차를 탄다.
- 프롬프트 재번역 시(검수 후) 이 파이프라인의 순서를 보존한다 — 번역 규약 5조는
  여기에도 적용된다.
