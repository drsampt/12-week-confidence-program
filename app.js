import { Quiz } from "./quiz.js";
import { generatePlan, getPlanSummary } from "./planGenerator.js";
import { generatePersonalizedContent, getStoredKey, storeKey } from "./claudeApi.js";
import { questions } from "./questions.js";
import { phases } from "./weeklyStructure.js";

const STORAGE_KEY = "ceo_program_plan";

let currentPlan = null;
let activeWeek = null;
let activeDay = null;

// ─── Boot ────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      currentPlan = JSON.parse(saved);
      showDashboard();
      return;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  showLanding();
});

// ─── Screens ─────────────────────────────────────────────────────────────────

function showLanding() {
  render("landing", buildLanding());
  document.getElementById("start-btn").addEventListener("click", startQuiz);
}

function startQuiz() {
  const quiz = new Quiz((answers) => {
    const plan = generatePlan(answers);
    currentPlan = plan;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    showResults(plan);
  });
  renderQuiz(quiz);
}

function showResults(plan) {
  const summary = getPlanSummary(plan.profile);
  render("results", buildResults(summary, plan.profile));
  document.getElementById("view-plan-btn").addEventListener("click", showDashboard);
  document.getElementById("restart-btn")?.addEventListener("click", resetApp);
}

function showDashboard() {
  render("dashboard", buildDashboard(currentPlan));
  bindDashboardEvents();
}

function showWeekDetail(weekNum) {
  const week = currentPlan.weeks.find((w) => w.week === weekNum);
  activeWeek = week;
  activeDay = null;
  render("week", buildWeekDetail(week, currentPlan.profile));
  bindWeekEvents(week);
}

function showDayDetail(weekNum, dayNum) {
  const week = currentPlan.weeks.find((w) => w.week === weekNum);
  const day = week.days.find((d) => d.day === dayNum);
  activeWeek = week;
  activeDay = day;
  render("day", buildDayDetail(day, week, currentPlan.profile));
  bindDayEvents(week, day);
}

// ─── Event Binding ───────────────────────────────────────────────────────────

function bindDashboardEvents() {
  document.querySelectorAll("[data-week]").forEach((el) => {
    el.addEventListener("click", () => showWeekDetail(parseInt(el.dataset.week)));
  });
  document.getElementById("reset-btn")?.addEventListener("click", () => {
    if (confirm("Start over? Your current plan will be cleared.")) resetApp();
  });
}

function bindWeekEvents(week) {
  document.getElementById("back-to-dashboard")?.addEventListener("click", showDashboard);
  document.querySelectorAll("[data-day]").forEach((el) => {
    el.addEventListener("click", () => showDayDetail(week.week, parseInt(el.dataset.day)));
  });
  const genBtn = document.getElementById("gen-affirmation");
  if (genBtn) genBtn.addEventListener("click", () => handleGenerate(week, "affirmation", "gen-affirmation"));
  const genEx = document.getElementById("gen-exercise");
  if (genEx) genEx.addEventListener("click", () => handleGenerate(week, "exercise", "gen-exercise"));
  const genCh = document.getElementById("gen-challenge");
  if (genCh) genCh.addEventListener("click", () => handleGenerate(week, "challenge", "gen-challenge"));
}

function bindDayEvents(week, day) {
  document.getElementById("back-to-week")?.addEventListener("click", () => showWeekDetail(week.week));
  const completeBtn = document.getElementById("complete-day");
  if (completeBtn) {
    completeBtn.addEventListener("click", () => {
      markDayComplete(week.week, day.day);
      completeBtn.textContent = "Completed ✓";
      completeBtn.disabled = true;
      completeBtn.classList.add("completed");
    });
  }
}

// ─── Claude API ───────────────────────────────────────────────────────────────

async function handleGenerate(week, type, btnId) {
  let apiKey = getStoredKey();

  if (!apiKey) {
    apiKey = prompt("Enter your Anthropic API key to generate personalized content:\n(It's stored only in your browser — never sent anywhere else)");
    if (!apiKey) return;
    storeKey(apiKey.trim());
  }

  const btn = document.getElementById(btnId);
  const outputId = `${btnId}-output`;
  const output = document.getElementById(outputId);
  if (!btn || !output) return;

  btn.disabled = true;
  btn.textContent = "Generating...";
  output.textContent = "";
  output.classList.remove("hidden");

  try {
    const content = await generatePersonalizedContent(currentPlan.profile, week, type);
    output.textContent = content;
    btn.textContent = "Regenerate";
  } catch (err) {
    if (err.message === "NO_KEY") {
      output.textContent = "No API key found. Click again to enter one.";
    } else {
      output.textContent = `Error: ${err.message}`;
    }
    btn.textContent = labelForType(type);
  }

  btn.disabled = false;
}

function labelForType(type) {
  return { affirmation: "Generate Affirmation", exercise: "Generate Custom Exercise", challenge: "Generate Personal Challenge" }[type] || "Generate";
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function markDayComplete(weekNum, dayNum) {
  if (!currentPlan.completed) currentPlan.completed = {};
  currentPlan.completed[`${weekNum}-${dayNum}`] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPlan));
}

function isDayComplete(weekNum, dayNum) {
  return currentPlan.completed?.[`${weekNum}-${dayNum}`] || false;
}

function getWeekProgress(weekNum) {
  const done = [1, 2, 3, 4, 5].filter((d) => isDayComplete(weekNum, d)).length;
  return Math.round((done / 5) * 100);
}

// ─── Render Helpers ───────────────────────────────────────────────────────────

function render(screen, html) {
  const app = document.getElementById("app");
  app.className = `screen-${screen}`;
  app.innerHTML = html;
}

function resetApp() {
  localStorage.removeItem(STORAGE_KEY);
  currentPlan = null;
  showLanding();
}

// ─── Quiz Renderer ────────────────────────────────────────────────────────────

function renderQuiz(quiz) {
  function draw() {
    const q = quiz.current;
    const isMulti = q.type === "multi";
    const selectedCount = isMulti ? (quiz.answers[q.id] || []).length : 0;

    render(
      "quiz",
      `
      <div class="quiz-container">
        <div class="quiz-header">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${quiz.progress}%"></div>
          </div>
          <span class="progress-label">${quiz.currentIndex + 1} of ${quiz.questions.length}</span>
        </div>

        <div class="question-wrap">
          <div class="question-badge">${isMulti ? `Pick up to ${q.max}` : "Choose one"}</div>
          <h2 class="question-text">${q.question}</h2>
          <p class="question-sub">${q.subtitle}</p>

          <div class="options-grid">
            ${q.options.map((opt) => `
              <button class="option-btn ${quiz.isSelected(opt.value) ? "selected" : ""}" data-value="${opt.value}">
                <span class="option-icon">${opt.icon}</span>
                <span class="option-label">${opt.label}</span>
                ${isMulti && quiz.isSelected(opt.value) ? '<span class="option-check">✓</span>' : ""}
              </button>
            `).join("")}
          </div>

          ${isMulti ? `<p class="multi-hint">${selectedCount}/${q.max} selected</p>` : ""}
        </div>

        <div class="quiz-nav">
          ${!quiz.isFirst ? '<button class="btn-ghost" id="prev-btn">← Back</button>' : '<span></span>'}
          <button class="btn-primary ${quiz.canAdvance() ? "" : "disabled"}" id="next-btn">
            ${quiz.isLast ? "Build My Program →" : "Next →"}
          </button>
        </div>
      </div>
    `
    );

    document.querySelectorAll(".option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        quiz.select(btn.dataset.value);
        if (q.type === "single") {
          setTimeout(() => { if (quiz.next()) draw(); }, 200);
        } else {
          draw();
        }
      });
    });

    document.getElementById("next-btn")?.addEventListener("click", () => {
      if (quiz.next()) draw();
    });

    document.getElementById("prev-btn")?.addEventListener("click", () => {
      quiz.prev();
      draw();
    });
  }

  draw();
}

// ─── Screen Builders ──────────────────────────────────────────────────────────

function buildLanding() {
  return `
    <div class="landing">
      <div class="landing-badge">12-WEEK PROGRAM</div>
      <h1 class="landing-title">Talk & Act<br><span class="gradient-text">Like a CEO</span></h1>
      <p class="landing-sub">Answer 10 questions. Get a personalized 12-week program that builds the identity, presence, and communication power of someone others follow.</p>
      <div class="landing-stats">
        <div class="stat"><strong>12</strong><span>Weeks</span></div>
        <div class="stat"><strong>4</strong><span>Phases</span></div>
        <div class="stat"><strong>60</strong><span>Daily Lessons</span></div>
      </div>
      <button class="btn-primary btn-large" id="start-btn">Take the 2-Minute Quiz →</button>
      <p class="landing-note">No account needed · No email · 100% free</p>
    </div>
  `;
}

function buildResults(summary, profile) {
  return `
    <div class="results-container">
      <div class="results-badge">YOUR PROGRAM IS READY</div>
      <h1 class="results-title">${summary.headline}</h1>
      <p class="results-summary">${summary.summary}</p>

      <div class="results-cards">
        <div class="result-card">
          <div class="rc-label">Daily Commitment</div>
          <div class="rc-value">${summary.dailyCommitment}</div>
        </div>
        <div class="result-card">
          <div class="rc-label">Biggest Win</div>
          <div class="rc-value small">${summary.biggestWin}</div>
        </div>
        <div class="result-card">
          <div class="rc-label">Peak Week</div>
          <div class="rc-value">Week ${summary.weekToWatch}</div>
        </div>
      </div>

      <div class="results-phases">
        ${phases.map((p) => `
          <div class="phase-pill" style="border-color: ${p.color}; color: ${p.color}">
            Phase ${p.number}: ${p.name}
          </div>
        `).join("")}
      </div>

      <button class="btn-primary btn-large" id="view-plan-btn">View Full Program →</button>
      <button class="btn-ghost" id="restart-btn">Retake Quiz</button>
    </div>
  `;
}

function buildDashboard(plan) {
  const { profile, weeks } = plan;
  const totalDone = Object.keys(plan.completed || {}).length;
  const totalDays = 60;
  const overallPct = Math.round((totalDone / totalDays) * 100);

  return `
    <div class="dashboard">
      <div class="dash-header">
        <div>
          <div class="dash-badge">YOUR PROGRAM</div>
          <h1 class="dash-title">Talk & Act Like a CEO</h1>
          <p class="dash-sub">${profile.situationLabel} · ${profile.dailyMinutes} min/day · ${profile.personaLabel}</p>
        </div>
        <div class="dash-progress-ring">
          <svg viewBox="0 0 64 64" class="ring-svg">
            <circle cx="32" cy="32" r="28" class="ring-track"/>
            <circle cx="32" cy="32" r="28" class="ring-fill"
              stroke-dasharray="${Math.round(175.9 * overallPct / 100)} 175.9"
              transform="rotate(-90 32 32)"/>
          </svg>
          <span class="ring-label">${overallPct}%</span>
        </div>
      </div>

      <div class="phases-section">
        ${phases.map((phase) => {
          const phaseWeeks = weeks.filter((w) => w.phase === phase.number);
          return `
            <div class="phase-section">
              <div class="phase-header" style="border-left-color: ${phase.color}">
                <span class="phase-num">Phase ${phase.number}</span>
                <span class="phase-name">${phase.name}</span>
              </div>
              <div class="weeks-grid">
                ${phaseWeeks.map((week) => {
                  const pct = getWeekProgress(week.week);
                  return `
                    <div class="week-card" data-week="${week.week}">
                      <div class="week-top">
                        <span class="week-icon">${week.icon}</span>
                        <span class="week-num">Week ${week.week}</span>
                        ${pct === 100 ? '<span class="week-done">✓</span>' : pct > 0 ? `<span class="week-pct">${pct}%</span>` : ""}
                      </div>
                      <div class="week-title">${week.title}</div>
                      <div class="week-sub">${week.subtitle}</div>
                      <div class="week-skill">↳ ${week.keySkill}</div>
                      <div class="week-bar">
                        <div class="week-bar-fill" style="width: ${pct}%; background: ${phase.color}"></div>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <button class="btn-ghost btn-sm" id="reset-btn">Start Over</button>
    </div>
  `;
}

function buildWeekDetail(week, profile) {
  const phase = phases.find((p) => p.number === week.phase);
  return `
    <div class="week-detail">
      <button class="back-btn" id="back-to-dashboard">← All Weeks</button>

      <div class="wd-header" style="border-top-color: ${phase.color}">
        <div class="wd-meta">
          <span class="wd-phase" style="color: ${phase.color}">Phase ${phase.number}: ${phase.name}</span>
          <span class="wd-week">Week ${week.week}</span>
        </div>
        <div class="wd-icon">${week.icon}</div>
        <h1 class="wd-title">${week.title}</h1>
        <p class="wd-sub">${week.subtitle}</p>
        <p class="wd-principle">"${week.principle}"</p>
      </div>

      ${week.personalizedFocus ? `
        <div class="personalized-note">
          <span class="pn-label">Personalized for you</span>
          <p>${week.personalizedFocus}</p>
        </div>
      ` : ""}

      <div class="days-section">
        <h2 class="section-title">5-Day Breakdown</h2>
        <div class="days-list">
          ${week.days.map((day) => {
            const done = isDayComplete(week.week, day.day);
            return `
              <div class="day-card ${done ? "done" : ""}" data-day="${day.day}">
                <div class="day-left">
                  <span class="day-num">Day ${day.day}</span>
                  <span class="day-focus-badge">${day.focus}</span>
                </div>
                <div class="day-center">
                  <div class="day-title">${day.title}</div>
                  <div class="day-desc">${day.description.substring(0, 90)}...</div>
                </div>
                <div class="day-right">
                  ${done ? '<span class="done-check">✓</span>' : '<span class="day-arrow">→</span>'}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="week-challenge-section">
        <h2 class="section-title">Week Challenge</h2>
        <div class="challenge-box">
          <p>${week.weekChallenge}</p>
        </div>
      </div>

      <div class="ai-section">
        <h2 class="section-title">✨ Personalized by AI</h2>
        <p class="ai-note">Generate content tailored specifically to your goals, blocker, and learning style using Claude AI.</p>
        <div class="ai-grid">
          <div class="ai-card">
            <button class="btn-ai" id="gen-affirmation">Generate Affirmation</button>
            <div class="ai-output hidden" id="gen-affirmation-output"></div>
          </div>
          <div class="ai-card">
            <button class="btn-ai" id="gen-exercise">Generate Custom Exercise</button>
            <div class="ai-output hidden" id="gen-exercise-output"></div>
          </div>
          <div class="ai-card">
            <button class="btn-ai" id="gen-challenge">Generate Personal Challenge</button>
            <div class="ai-output hidden" id="gen-challenge-output"></div>
          </div>
        </div>
      </div>

      <div class="success-section">
        <h2 class="section-title">Success Metrics</h2>
        <ul class="metrics-list">
          ${week.successMetrics.map((m) => `<li>${m}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;
}

function buildDayDetail(day, week, profile) {
  const done = isDayComplete(week.week, day.day);
  const durationGuide = day.duration[profile.dailyMinutes] || day.duration[30];

  return `
    <div class="day-detail">
      <button class="back-btn" id="back-to-week">← Week ${week.week}</button>

      <div class="dd-header">
        <div class="dd-meta">
          <span class="dd-week">Week ${week.week}: ${week.title}</span>
          <span class="dd-focus-badge">${day.focus}</span>
        </div>
        <h1 class="dd-title">Day ${day.day}: ${day.title}</h1>
      </div>

      <div class="dd-content">
        <div class="content-block">
          <h3>Today's Concept</h3>
          <p>${day.description}</p>
        </div>

        <div class="content-block exercise-block">
          <h3>Your Exercise</h3>
          <p>${day.exercise}</p>
        </div>

        <div class="content-block time-block">
          <h3>For Your ${profile.dailyMinutes}-Minute Session</h3>
          <p>${durationGuide}</p>
        </div>

        ${day.personalizedTip ? `
          <div class="content-block tip-block">
            <h3>Coach's Note — For You</h3>
            <p>${day.personalizedTip}</p>
          </div>
        ` : ""}
      </div>

      <div class="dd-actions">
        <button class="btn-primary btn-large ${done ? "completed" : ""}" id="complete-day" ${done ? "disabled" : ""}>
          ${done ? "Day Completed ✓" : "Mark Day Complete"}
        </button>
      </div>
    </div>
  `;
}
