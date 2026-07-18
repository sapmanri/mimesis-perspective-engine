-- 만리서재 기록 보관소 (Archive)
-- 동의된 기록만 이 테이블에 존재한다. 개인정보·IP는 저장하지 않는다.
-- no = 서재 번호 (만리서재 000127)
CREATE TABLE IF NOT EXISTS records (
  no INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL,
  genome_edition TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  -- 책 제작용 메타데이터 (편집자 전용, 독자 비공개)
  features_json TEXT,
  emergent_json TEXT,
  trait_ids TEXT,
  rule_ids TEXT,
  q_len INTEGER,
  a_len INTEGER
);
