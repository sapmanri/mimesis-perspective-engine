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

-- 예약 문장 — 사람마다 다르게 발급한다. 어떤 건 1회권, 어떤 건 10회권.
--
-- 예전엔 ENTRY_PHRASE 시크릿 하나였다. 그러면 누가 썼는지도, 몇 번 남았는지도 모른다.
-- 문장이 곧 예약이므로, 예약을 세려면 문장이 행이어야 한다.
CREATE TABLE IF NOT EXISTS phrases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phrase TEXT NOT NULL,           -- 사람에게 건네는 문장 그대로
  match_key TEXT UNIQUE NOT NULL, -- 공백 제거본 — 대조는 이걸로 한다
  label TEXT,                     -- 누구에게 건넨 것인가 (관리자만 본다)
  max_uses INTEGER,               -- NULL이면 무제한
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  expires_at TEXT,                -- NULL이면 기한 없음
  -- 'seat'  = 자리로 안내하는 예약 문장 (부분일치 — "…에서 보고 왔어요"도 통과)
  -- 'admin' = 세 자리가 아닌 다른 문이 열린다 (완전일치만 — 실수로 열리면 안 된다)
  kind TEXT NOT NULL DEFAULT 'seat'
);

-- 예약 문장 사용 로그. 문장을 지워도 남는다 — 그래서 문장 원문을 함께 적어둔다.
CREATE TABLE IF NOT EXISTS phrase_uses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phrase_id INTEGER,              -- 지워졌으면 NULL이 될 수 있다
  phrase TEXT NOT NULL,           -- 그때 대조된 문장
  said TEXT,                      -- 실제로 들려준 말 (어디서 왔는지의 단서)
  uuid TEXT,                      -- 발급된 티켓
  seat TEXT,
  at TEXT NOT NULL,
  ok INTEGER NOT NULL             -- 1=입장 / 0=거절(만료·소진·중지)
);
CREATE INDEX IF NOT EXISTS idx_phrase_uses_phrase ON phrase_uses(phrase_id);
CREATE INDEX IF NOT EXISTS idx_phrase_uses_at ON phrase_uses(at);
