// 만리서재 — 채팅 UI가 아니라 하나의 디지털 공간.
// 상태: 입장 → 예약석 → 착석(원고) → 일어나기. 대화 이력은 이 페이지 안에서만 산다.
const WAITING_LINES = [
  "책장을 한 장 넘기고 있습니다.",
  "조용히 살펴보고 있습니다.",
  "서가를 천천히 둘러보고 있습니다.",
];
const SCENE_CLASS = {
  fireplace: "scene-fireplace",
  desk: "scene-desk",
  nook: "scene-nook",
};
const SCENE_MARKUP = {
  fireplace: '<div class="glow"></div>',
  desk: '<div class="beam"></div>',
  nook: '<div class="rain-window"><div class="rain"></div></div><div class="lamp"></div>',
};

const $ = (id) => document.getElementById(id);
const manuscript = $("manuscript");
const writing = $("writing");
const writeBtn = $("write-btn");
const riseBtn = $("rise-btn");
const roomError = $("room-error");

let uuid = null;
let seat = null;
let messages = [];
let busy = false;

// ── 국면 전환: 느리게 ──
function setPhase(name) {
  const current = document.querySelector(".phase.lit");
  const next = $(name);
  const swap = () => {
    document.body.dataset.phase = name;
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.add("lit")));
  };
  if (current) {
    current.classList.remove("lit");
    setTimeout(swap, 1200);
  } else {
    swap();
  }
}

// ── 입장 ──
$("enter").addEventListener("click", () => setPhase("seats"));

// ── 착석 ──
for (const el of document.querySelectorAll(".seat")) {
  const sit = () => {
    if (seat) return;
    seat = el.dataset.seat;
    uuid = crypto.randomUUID();
    messages = [];
    const backdrop = $("room-backdrop");
    backdrop.className = `scene ${SCENE_CLASS[seat]}`;
    backdrop.innerHTML = SCENE_MARKUP[seat];
    setPhase("room");
    setTimeout(() => writing.focus({ preventScroll: true }), 2600);
  };
  el.addEventListener("click", sit);
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sit(); }
  });
}

// ── 원고에 적기 ──
const appendLine = (cls, text) => {
  const p = document.createElement("p");
  p.className = cls;
  p.textContent = text;
  manuscript.appendChild(p);
  return p;
};

$("write-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (busy) return;
  const text = writing.value.trim();
  if (!text) return;

  busy = true;
  roomError.hidden = true;
  writeBtn.disabled = true;
  writing.value = "";
  appendLine("line-user", text);
  messages.push({ role: "user", content: text });
  const waiting = appendLine(
    "line-waiting",
    WAITING_LINES[Math.floor(Math.random() * WAITING_LINES.length)],
  );
  waiting.scrollIntoView({ behavior: "smooth", block: "end" });

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uuid, seat, messages }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "말을 고르지 못했습니다.");
    messages.push({ role: "assistant", content: data.reply });
    waiting.remove();
    for (const para of data.reply.split(/\n{2,}/).filter((s) => s.trim())) {
      appendLine("line-library", para.replace(/\n/g, " "));
    }
    manuscript.lastElementChild.scrollIntoView({ behavior: "smooth", block: "end" });
  } catch (err) {
    waiting.remove();
    messages.pop();
    roomError.textContent = err.message || "말을 고르지 못했습니다. 다시 적어주세요.";
    roomError.hidden = false;
  } finally {
    busy = false;
    writeBtn.disabled = false;
    writing.focus({ preventScroll: true });
  }
});

// ── 자리에서 일어나기 ──
riseBtn.addEventListener("click", async () => {
  if (busy) return;
  if (messages.length === 0) { setPhase("entrance"); seat = null; return; }

  busy = true;
  roomError.hidden = true;
  riseBtn.disabled = true;
  const waiting = appendLine("line-waiting", "자리를 정리하고 있습니다.");
  waiting.scrollIntoView({ behavior: "smooth", block: "end" });

  try {
    const res = await fetch("/api/close", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uuid, seat, messages }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "마무리를 준비하지 못했습니다.");
    const c = data.closing;
    $("c-first").textContent = c.first_question;
    $("c-found").textContent = c.discovered_question;
    $("c-sentence").textContent = c.user_sentence;
    $("c-farewell").textContent = c.farewell;
    waiting.remove();
    setPhase("closing");
  } catch (err) {
    waiting.remove();
    roomError.textContent = err.message;
    roomError.hidden = false;
  } finally {
    busy = false;
    riseBtn.disabled = false;
  }
});

// ── 서재를 나서기 ──
$("leave").addEventListener("click", () => {
  uuid = null;
  seat = null;
  messages = [];
  manuscript.replaceChildren(
    Object.assign(document.createElement("p"), {
      className: "line-library",
      textContent: "오늘 어떤 질문을 품고 오셨나요?",
    }),
  );
  setPhase("entrance");
});

// 첫 국면 점등
setPhase("entrance");
