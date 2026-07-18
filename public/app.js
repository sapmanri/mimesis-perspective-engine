// 만리서재 — 프론트엔드. AI/모델 언급 없음. 저장 UI 없음 — 기록은 서재의 호흡이다.
const LOADING_LINES = [
  "책장을 한 장 넘기고 있습니다.",
  "조용히 살펴보고 있습니다.",
  "서가를 천천히 둘러보고 있습니다.",
];

const $ = (id) => document.getElementById(id);
const form = $("ask-form");
const questionEl = $("question");
const knock = $("knock");
const loading = $("loading");
const error = $("error");
const paper = $("paper");
const paperQuestion = $("paper-question");
const layerPlace = $("layer-place");
const layerView = $("layer-view");
const paperAnswer = $("paper-answer");
const again = $("again");

const toParagraphs = (text) =>
  text
    .split(/\n{2,}/)
    .filter((s) => s.trim())
    .map((para) => {
      const p = document.createElement("p");
      p.textContent = para.replace(/\n/g, " ");
      return p;
    });

// 세 층: 질문의 자리 --- 관점 --- 산문. 층이 없으면(사실·고위험) 산문만.
function renderAnswer(answer) {
  const parts = answer
    .split(/\n\s*---\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  layerPlace.hidden = true;
  layerView.hidden = true;

  let prose = parts[parts.length - 1] ?? answer;
  if (parts.length >= 3) {
    layerPlace.replaceChildren(...toParagraphs(parts[0]));
    layerPlace.hidden = false;
    layerView.replaceChildren(...toParagraphs(parts[1]));
    layerView.hidden = false;
  } else if (parts.length === 2) {
    layerPlace.replaceChildren(...toParagraphs(parts[0]));
    layerPlace.hidden = false;
  }
  paperAnswer.replaceChildren(...toParagraphs(prose));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = questionEl.value.trim();
  if (!question) return;

  error.hidden = true;
  paper.hidden = true;
  knock.disabled = true;
  questionEl.disabled = true;
  loading.textContent = LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)];
  loading.hidden = false;

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "답을 받지 못했습니다.");

    paperQuestion.textContent = question;
    renderAnswer(data.answer);
    paper.hidden = false;
    paper.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    error.textContent = err.message || "답을 받지 못했습니다. 잠시 후 다시 두드려 주세요.";
    error.hidden = false;
  } finally {
    loading.hidden = true;
    knock.disabled = false;
    questionEl.disabled = false;
  }
});

again.addEventListener("click", () => {
  questionEl.value = "";
  paper.hidden = true;
  error.hidden = true;
  questionEl.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
