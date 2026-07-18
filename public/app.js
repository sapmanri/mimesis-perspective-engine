// 만리서재 — 프론트엔드. AI/모델 언급 없음. 상태는 이 페이지 안에서만 산다.
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
const paperAnswer = $("paper-answer");
const consent = $("consent");
const archivedNote = $("archived-note");
const again = $("again");

let currentUuid = null;

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

    currentUuid = data.uuid;
    paperQuestion.textContent = question;
    paperAnswer.replaceChildren(
      ...data.answer
        .split(/\n{2,}/)
        .map((para) => {
          const p = document.createElement("p");
          p.textContent = para.replace(/\n/g, " ");
          return p;
        }),
    );
    consent.checked = false;
    consent.disabled = !currentUuid;
    archivedNote.hidden = true;
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

consent.addEventListener("change", async () => {
  if (!consent.checked || !currentUuid) return;
  consent.disabled = true;
  try {
    const res = await fetch("/api/archive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uuid: currentUuid }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "기록하지 못했습니다.");
    archivedNote.textContent = `${data.label} — 서가에 기록되었습니다.`;
    archivedNote.hidden = false;
  } catch (err) {
    consent.checked = false;
    consent.disabled = false;
    archivedNote.textContent = err.message;
    archivedNote.hidden = false;
  }
});

again.addEventListener("click", () => {
  currentUuid = null;
  questionEl.value = "";
  paper.hidden = true;
  error.hidden = true;
  questionEl.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
