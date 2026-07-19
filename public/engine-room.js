const $ = (id) => document.getElementById(id);

const manuscript = $("manuscript");
const writing = $("writing");
const send = $("send");
const error = $("error");
const status = $("status");

let seat = "fireplace";
let uuid = crypto.randomUUID();
let messages = [];
let busy = false;

for (const button of document.querySelectorAll(".seat")) {
  button.addEventListener("click", () => {
    if (busy || messages.length > 0) return;
    seat = button.dataset.seat;
    for (const candidate of document.querySelectorAll(".seat")) {
      candidate.setAttribute("aria-pressed", String(candidate === button));
    }
  });
}

function appendTurn(kind, text) {
  const p = document.createElement("p");
  p.className = `turn ${kind}`;
  p.textContent = text;
  manuscript.appendChild(p);
  p.scrollIntoView({ behavior: "smooth", block: "end" });
  return p;
}

async function ask(text) {
  busy = true;
  send.disabled = true;
  writing.disabled = true;
  error.hidden = true;

  appendTurn("user", text);
  messages.push({ role: "user", content: text });
  const waiting = appendTurn("waiting", "질문의 자리를 살펴보고 있습니다.");
  status.textContent = "관점 엔진 작동 중";

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uuid, seat, messages }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "말을 고르지 못했습니다.");

    waiting.remove();
    messages.push({ role: "assistant", content: data.reply });
    appendTurn("library", data.reply);
    status.textContent = `대화 ${Math.ceil(messages.length / 2)}턴 · 다음 질문은 방금 한 말에서 생성됨`;
  } catch (err) {
    waiting.remove();
    messages.pop();
    error.textContent = err.message || "말을 고르지 못했습니다. 다시 적어주세요.";
    error.hidden = false;
    status.textContent = "관점 엔진 연결 오류";
  } finally {
    busy = false;
    send.disabled = false;
    writing.disabled = false;
    writing.focus();
  }
}

$("write-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (busy) return;
  const text = writing.value.trim();
  if (!text) return;
  writing.value = "";
  ask(text);
});

$("reset").addEventListener("click", () => {
  if (busy) return;
  uuid = crypto.randomUUID();
  messages = [];
  manuscript.replaceChildren();
  appendTurn("library", "오늘 어떤 질문을 품고 오셨나요?");
  error.hidden = true;
  status.textContent = "관점 엔진 대기 중";
  writing.focus();
});

writing.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("write-form").requestSubmit();
  }
});

writing.focus();
