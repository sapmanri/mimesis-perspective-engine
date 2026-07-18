# MIMESIS Observation Architecture

Every question has its own morphology.
Every observer has its own genome.
Understanding begins where the two meet.

---

## Abstract

We propose a perception architecture that separates an observer's immutable traits from the executable rules that generate responses. Unlike conventional prompt engineering, the observer's genome remains fixed while execution rules, prompts, and language models evolve independently. Questions are treated as organisms possessing observable features rather than predefined categories. Understanding emerges through the interaction between the question's morphology and the observer's genome. The first implementation applies this architecture to Sapmanri, an essayist-observer, as the shared core of every MIMESIS service.

---

## 30초 설명

대부분의 AI는 답변을 설계한다. 우리는 관찰자를 설계한다.

관찰자(삽만리)를 해부해서 변하지 않는 형질 17개로 기록했고, 그것을 실행하는 규칙과 완전히 분리했다. 질문도 미리 정해진 카테고리가 아니라 형질을 가진 유기체로 해부한다. 답변은 질문의 형질과 관찰자의 형질이 만나는 곳에서 생성된다.

그래서 모델이 바뀌어도, 서비스가 늘어나도, 프롬프트를 다시 설계하지 않는다 — 번역만 다시 한다.

---

## 1. 문제 정의

특정한 시선을 가진 AI를 만들려는 시도는 대부분 문체 모사로 수렴한다. 작가의 문장을 수집해 프롬프트에 넣으면, 모든 질문에 같은 감성 답변을 반복하는 챗봇이 나온다. 사실 질문에도 시적으로 답하고, 위기 앞에서도 은유를 쓴다.

더 깊은 문제는 구조에 있다. 프롬프트가 원본인 시스템에서는 모델이 바뀔 때마다, 서비스가 하나 늘어날 때마다 그 원본을 다시 설계해야 한다. 시선의 정의와 실행 방법과 안전 정책이 한 덩어리의 프롬프트에 섞여 있기 때문이다. 이 시스템은 자라지 못한다 — 고쳐질 뿐이다.

## 2. 기존 접근

프롬프트 엔지니어링은 모델 중심이다. "이 모델에서 좋은 답이 나오는 문장"을 수집하고 다듬는다. 페르소나 프롬프트는 말투·규칙·금지·안전을 하나의 지시문에 담고, 그 지시문이 곧 캐릭터의 정의가 된다.

이 접근의 한계는 명확하다. 정의와 구현이 분리되지 않으므로 어떤 것도 확정할 수 없다. 프롬프트를 고칠 때마다 캐릭터 자체가 흔들리고, 무엇이 본질이고 무엇이 그 모델의 사정인지 구분할 수 없게 된다.

## 3. 우리의 접근

우리는 방향을 뒤집었다. 모델 중심이 아니라 **관찰자 중심**이다.

먼저 관찰자를 해부했다. 삽만리라는 관찰자에게서 반복 관찰되는 인지 형질(Trait)을 추출해 불변의 명세로 확정했다 — 원리 5개와 형질 12개. 이것이 Genome이다. Genome은 답을 저장하지 않는다. 답을 바라보고 만드는 방식을 저장한다.

다음으로 질문을 해부했다. 질문은 "감정 질문", "사실 질문" 같은 라벨 하나로 분류되지 않는다. 하나의 질문은 추측 0.94, 불확실성 0.92, 관계 0.83, 감정 0.61처럼 여러 형질(Feature)을 동시에 갖는 유기체다. 직접 관찰되는 Static Feature와, 조합에서 떠오르는 Emergent Feature(추측+관계+불확실성 → 확인 욕구)를 구분한다.

이해는 이 둘이 만나는 곳에서 생성된다. Engine은 질문의 형질과 관찰자의 형질을 연결하는 번역기다.

## 4. 계층 구조

```
Observation Architecture
│
├── Genome          관찰자의 형질 — 불변, Edition으로만 자란다
├── Engine          형질을 실행 규칙으로 옮기는 기계 — 가변, Version
├── Blueprint       사람이 읽는 설계 — 파이프라인, 질문 해부(Lexicon), Prompt AST
├── Prompt          기계가 읽는 번역 — 모델별 생성물
└── Implementations Claude(첫 번째), GPT(두 번째), Gemini(세 번째), …
```

실행 시의 계층은 다음과 같다.

```
Layer 0  Observation      관찰 대상 (세계, 그리고 질문)
Layer 1  Genome Traits    관찰자의 형질 — 불변
Layer 2  Engine           Trait를 Rule로 실행
Layer 3  Safety & Truth   사실성과 안전 — Genome 밖의 계약
Layer 4  Prompt Generator Blueprint를 모델별로 번역
Layer 5  LLM              교체 가능한 실행 주체
```

안전·사실성·의료·법률 대응은 의도적으로 Genome 밖에 있다. 관찰자의 시선과 시스템의 책임을 섞으면 어느 쪽도 확정할 수 없기 때문이다. 위기 신호는 확신도와 무관하게 Safety 계층으로 직행하며, 그 순간 형질 발현은 정지된다.

## 5. 핵심 원리

### 왜 Genome은 불변인가

Genome은 좋아지는 문서가 아니라 **발견되는 문서**다. 형질은 창작되지 않고 관찰자에게서 발견된다. 따라서 고칠 것이 없다 — 더 발견할 것이 있을 뿐이다. Genome은 Version이 아니라 Edition을 가지며, Edition은 새 형질의 발견으로만 올라간다.

이 불변성이 시스템 전체의 닻이다. 규칙이 조정되고, 프롬프트가 재번역되고, 모델이 교체되는 동안 관찰 방식은 고정되어 있다. 10년 뒤 어떤 모델이 와도 Genome은 그대로다.

### 왜 Feature는 질문의 형질인가

대부분의 시스템은 질문에서 의도(Intent)만 읽는다. 그러나 사람은 질문을 그렇게 읽지 않는다. "친구가 나를 싫어하는 것 같아요"에서 사람은 추측과 관계와 불확실성을 동시에 보고, 그 조합에서 "위로가 아니라 확인을 원한다"를 읽어낸다.

그래서 이 아키텍처는 질문을 관찰자와 같은 방식으로 다룬다 — 형질을 가진 생물로. 관찰자의 형질(Trait)과 질문의 형질(Feature)은 대칭이면서 다르다: Trait는 불변이고, Feature는 계속 발견된다. 새 Feature의 발견은 Genome을 건드리지 않는다. 이 격리 덕분에 두 사전은 각자의 속도로 자란다.

### 왜 Prompt는 파생물인가

이 아키텍처에서 프롬프트는 설계의 산물이 아니라 번역의 산물이다. 사람이 읽는 설계(Blueprint)가 원본이고, 각 모델의 프롬프트는 그것을 그 모델의 문법으로 옮긴 결과다. 구현체는 번역만 한다 — 단계를 빼거나 규칙을 더하지 않으며, 문제가 발견되면 프롬프트가 아니라 설계를 고친 뒤 재번역한다.

그 결과, 이 시스템의 핵심 자산은 프롬프트가 아니다.

> Prompts can be reproduced. Discovery cannot.

## 6. 하나의 Genome, 여러 발현

이 아키텍처의 목적지는 질문-답변 데모가 아니다. 같은 Genome이 서로 다른 표현으로 발현되는 것이다 — 독자 질문에 답하는 엔진, 별이의 답글, Writing Studio의 문장, 2D 세계 속 관찰자의 행동, 서재의 안내까지. 표현(Expression)은 서비스마다 다르지만 인식(Perception)과 해석(Interpretation)은 하나다.

관찰자가 하나이므로, 시선도 하나다. 그것이 이 아키텍처가 보장하는 것이다.

---

## 문서 지도

| 문서 | 지위 |
|------|------|
| `SAPMANRI_GENOME_SPEC_V1.md` | Genome Edition 1 — 확정·불변 |
| `SAPMANRI_PERCEPTION_ENGINE_SPEC_V1.md` | Engine v1 — Rule·Anti Pattern·Mutation |
| `SAPMANRI_PROMPT_BLUEPRINT_V1.md` | Blueprint v1 — 파이프라인·Lexicon·AST |
| `SAPMANRI_PERSPECTIVE_ENGINE_V1.md` | 프로젝트 정본 — 계층 모델·로드맵·안전 계약 |

---

A genome is not written. It is discovered.
