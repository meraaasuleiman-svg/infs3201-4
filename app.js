/* DevOps Quiz App (Student B)
   - Loads questions via fetch from data/questions.json
   - Topic selection
   - One question at a time
   - Immediate feedback + explanation
*/

const state = {
  allQuestions: [],
  filtered: [],
  topics: [],
  index: 0,
  score: 0,
  locked: false,
};

const el = {
  topicSelect: document.getElementById("topicSelect"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  loadedCount: document.getElementById("loadedCount"),
  activeTopic: document.getElementById("activeTopic"),
  progressText: document.getElementById("progressText"),
  scoreText: document.getElementById("scoreText"),
  statusMsg: document.getElementById("statusMsg"),

  questionText: document.getElementById("questionText"),
  qidTag: document.getElementById("qidTag"),
  topicTag: document.getElementById("topicTag"),
  optionsForm: document.getElementById("optionsForm"),

  submitBtn: document.getElementById("submitBtn"),
  nextBtn: document.getElementById("nextBtn"),

  feedback: document.getElementById("feedback"),
  feedbackTitle: document.getElementById("feedbackTitle"),
  feedbackExpl: document.getElementById("feedbackExpl"),
};

init();

async function init() {
  wireEvents();
  await loadQuestions();
  populateTopics();
  updateStats();
  el.statusMsg.textContent = "Questions loaded. Choose a topic and press Start.";
}

function wireEvents() {
  el.startBtn.addEventListener("click", startQuiz);
  el.resetBtn.addEventListener("click", resetQuiz);

  el.topicSelect.addEventListener("change", () => {
    const topic = el.topicSelect.value;
    el.activeTopic.textContent = topic === "all" ? "All" : topic;
    // Do not auto-restart; keep it simple. Start button applies selection.
  });

  el.submitBtn.addEventListener("click", submitAnswer);
  el.nextBtn.addEventListener("click", nextQuestion);
}

async function loadQuestions() {
  try {
    const res = await fetch("data/questions.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!Array.isArray(data)) throw new Error("questions.json must be an array");

    // Very light validation (keep it forgiving for the assignment)
    state.allQuestions = data.filter(q =>
      q && Array.isArray(q.options) && typeof q.answerIndex === "number"
    );

    el.loadedCount.textContent = String(state.allQuestions.length);
  } catch (err) {
    el.statusMsg.textContent = `Failed to load questions.json: ${err.message}`;
    el.statusMsg.style.color = "#fb7185";
  }
}

function populateTopics() {
  const topicSet = new Set();
  state.allQuestions.forEach(q => {
    if (q.topic) topicSet.add(q.topic);
  });

  state.topics = Array.from(topicSet).sort((a, b) => a.localeCompare(b));

  // keep "All Topics" as first option already in HTML
  for (const t of state.topics) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    el.topicSelect.appendChild(opt);
  }
}

function startQuiz() {
  const selected = el.topicSelect.value;

  state.filtered = selected === "all"
    ? [...state.allQuestions]
    : state.allQuestions.filter(q => q.topic === selected);

  // Basic shuffle so it feels less static (optional but nice)
  state.filtered = shuffle([...state.filtered]);

  state.index = 0;
  state.score = 0;
  state.locked = false;

  el.resetBtn.disabled = false;
  el.submitBtn.disabled = state.filtered.length === 0;
  el.nextBtn.disabled = true;

  hideFeedback();

  if (state.filtered.length === 0) {
    el.questionText.textContent = "No questions found for this topic.";
    el.qidTag.textContent = "—";
    el.topicTag.textContent = "—";
    el.optionsForm.innerHTML = "";
    updateStats();
    return;
  }

  renderQuestion();
  updateStats();
}

function resetQuiz() {
  state.filtered = [];
  state.index = 0;
  state.score = 0;
  state.locked = false;

  el.questionText.textContent = "Select a topic and press Start.";
  el.qidTag.textContent = "—";
  el.topicTag.textContent = "—";
  el.optionsForm.innerHTML = "";

  el.submitBtn.disabled = true;
  el.nextBtn.disabled = true;
  el.resetBtn.disabled = true;

  hideFeedback();
  updateStats();
}

function renderQuestion() {
  state.locked = false;
  hideFeedback();

  const q = state.filtered[state.index];
  if (!q) return;

  el.questionText.textContent = q.question || "Untitled question";
  el.qidTag.textContent = q.id || `Q${state.index + 1}`;
  el.topicTag.textContent = q.topic || "Unknown Topic";

  el.optionsForm.innerHTML = "";

  q.options.forEach((optText, i) => {
    const label = document.createElement("label");
    label.className = "option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "answer";
    input.value = String(i);

    const span = document.createElement("span");
    span.className = "text";
    span.textContent = optText;

    label.appendChild(input);
    label.appendChild(span);

    // clicking label selects input automatically; add small UX to enable submit
    label.addEventListener("click", () => {
      if (state.locked) return;
      el.submitBtn.disabled = false;
    });

    el.optionsForm.appendChild(label);
  });

  el.submitBtn.disabled = true; // until user selects
  el.nextBtn.disabled = true;

  updateStats();
}

function submitAnswer() {
  if (state.locked) return;

  const q = state.filtered[state.index];
  if (!q) return;

  const checked = el.optionsForm.querySelector('input[name="answer"]:checked');
  if (!checked) return;

  const chosenIndex = Number(checked.value);
  const correctIndex = Number(q.answerIndex);

  state.locked = true;

  // lock UI and mark correct/wrong
  const optionEls = Array.from(el.optionsForm.querySelectorAll(".option"));
  optionEls.forEach((optEl, i) => {
    optEl.classList.add("locked");
    const input = optEl.querySelector("input");
    input.disabled = true;

    if (i === correctIndex) optEl.classList.add("correct");
    if (i === chosenIndex && chosenIndex !== correctIndex) optEl.classList.add("wrong");
  });

  const isCorrect = chosenIndex === correctIndex;
  if (isCorrect) state.score += 1;

  showFeedback(isCorrect, q.explanation || "No explanation provided.");

  el.submitBtn.disabled = true;
  el.nextBtn.disabled = false;

  updateStats();
}

function nextQuestion() {
  if (state.filtered.length === 0) return;

  if (state.index < state.filtered.length - 1) {
    state.index += 1;
    renderQuestion();
  } else {
    // End screen
    el.questionText.textContent = `Finished! Your score is ${state.score}/${state.filtered.length}.`;
    el.qidTag.textContent = "Done";
    el.topicTag.textContent = "—";
    el.optionsForm.innerHTML = "";

    el.submitBtn.disabled = true;
    el.nextBtn.disabled = true;

    showFeedback(true, "Tip: Reset and try another topic to practice more.");
  }

  updateStats();
}

function showFeedback(isCorrect, explanation) {
  el.feedback.classList.remove("hidden");
  el.feedbackTitle.textContent = isCorrect ? "Correct ✅" : "Not quite ❌";
  el.feedbackTitle.className = "feedback-title " + (isCorrect ? "good" : "bad");
  el.feedbackExpl.textContent = explanation;
}

function hideFeedback() {
  el.feedback.classList.add("hidden");
  el.feedbackTitle.textContent = "";
  el.feedbackExpl.textContent = "";
}

function updateStats() {
  const total = state.filtered.length;
  const prog = total === 0 ? "0/0" : `${Math.min(state.index + 1, total)}/${total}`;
  el.progressText.textContent = prog;
  el.scoreText.textContent = String(state.score);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
