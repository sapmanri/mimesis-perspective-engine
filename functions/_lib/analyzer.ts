import Anthropic from "@anthropic-ai/sdk";
import type { Env } from "./common";

// 책 제작용 메타데이터 분석기 (편집자 전용 — 독자 비공개).
// 답변 엔진(prompt.ts)과 별개의 내부 도구다. Blueprint의 Lexicon·Trait·Rule ID를 참조로만 쓴다.
const ANALYZER_SYSTEM = `너는 만리서재 기록 보관소의 사서다. 질문과 답변을 읽고 편집용 메타데이터를 산출한다.
Observation Feature (Static): 추상, 추측, 감정, 명명된 감정, 관계, 불확실성, 위험, 정보, 창작, 회상, 상실, 시간
Emergent Feature: 확인 욕구, 그리움, 방향 상실
Trait ID: P-00 P-01 P-02 P-03 I-00 I-01 I-02 I-03 E-00 E-01 E-02 E-03
질문에서 관찰된 feature(0~1 점수), 도출된 emergent, 답변에 발현된 trait와 그 실행 rule의 ID를 추정한다.
rule_ids는 trait_ids와 동일한 ID 체계를 쓴다(Rule은 Trait ID를 승계한다).`;

const ANALYZER_SCHEMA = {
  type: "object",
  properties: {
    features: {
      type: "array",
      items: {
        type: "object",
        properties: { feature: { type: "string" }, score: { type: "number" } },
        required: ["feature", "score"],
        additionalProperties: false,
      },
    },
    emergent: { type: "array", items: { type: "string" } },
    trait_ids: { type: "array", items: { type: "string" } },
    rule_ids: { type: "array", items: { type: "string" } },
  },
  required: ["features", "emergent", "trait_ids", "rule_ids"],
  additionalProperties: false,
} as const;

// 기록의 메타데이터를 채운다. 실패는 조용히 삼킨다 — 기록의 본질은 질문과 답 자체다.
export async function fillMetadata(
  env: Env,
  uuid: string,
  question: string,
  answer: string,
): Promise<void> {
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });
    const res = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: ANALYZER_SYSTEM,
      output_config: { format: { type: "json_schema", schema: ANALYZER_SCHEMA } },
      messages: [{ role: "user", content: `질문:\n${question}\n\n답변:\n${answer}` }],
    });
    const text = res.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    if (!text) return;
    const meta = JSON.parse(text.text);
    await env.DB.prepare(
      `UPDATE records SET features_json=?, emergent_json=?, trait_ids=?, rule_ids=? WHERE uuid=?`,
    )
      .bind(
        JSON.stringify(meta.features ?? []),
        JSON.stringify(meta.emergent ?? []),
        JSON.stringify(meta.trait_ids ?? []),
        JSON.stringify(meta.rule_ids ?? []),
        uuid,
      )
      .run();
  } catch {
    // 분석 실패 무시.
  }
}
