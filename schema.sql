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

-- 동의된 기록 — 만리서재 로그북 후보.
--
-- visits는 완전 내부 보관이다 (CLAUDE.md: "공개 열람 금지 — 동의 개념이 없으므로").
-- 그래서 공개를 전제로 하는 기록은 이 테이블에만 존재한다.
-- 자리에서 일어난 사람이 스스로 남기겠다고 눌렀을 때만 한 행이 생긴다.
--
-- records(관점엔진 Q&A 아카이브)와 섞지 않는다 — 저쪽은 질문 하나·답변 하나의 모양이라
-- 대화 전문이 들어갈 자리가 없다.
--
-- movements_json은 일부러 옮기지 않는다. 이동 코드는 엔진 내부 계기판이지
-- 그 사람이 남기겠다고 한 것이 아니다. 엔진 개선은 visits에서 계속한다.
CREATE TABLE IF NOT EXISTS logbook (
  no INTEGER PRIMARY KEY AUTOINCREMENT,   -- 서재 번호 (만리서재 000001)
  uuid TEXT UNIQUE NOT NULL,
  seat TEXT,
  conversation_json TEXT NOT NULL,
  closing_json TEXT,
  outcome_json TEXT,
  turn_count INTEGER,
  visited_at TEXT,                        -- 그 사람이 앉았던 때
  consented_at TEXT NOT NULL,             -- 남기겠다고 누른 때
  ticket_json TEXT,                       -- 그때의 판본 스냅샷
  genome_edition TEXT,
  engine_version TEXT,
  prompt_version TEXT
);
