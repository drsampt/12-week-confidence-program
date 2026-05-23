import { weeks, phases } from "../data/weeklyStructure.js";

export function generatePlan(answers) {
  const profile = buildProfile(answers);
  return {
    profile,
    phases,
    weeks: weeks.map((week) => enrichWeek(week, profile)),
    generatedAt: new Date().toISOString(),
  };
}

function buildProfile(answers) {
  const timeMap = { 15: 15, 30: 30, 60: 60, unlimited: 60 };
  const personaMap = {
    commanding: { adjective: "commanding", drive: "authority that's impossible to question" },
    magnetic: { adjective: "magnetic", drive: "a presence that draws people in naturally" },
    visionary: { adjective: "visionary", drive: "the clarity that makes others want to follow" },
    trusted: { adjective: "trusted", drive: "the reliability that makes you the person everyone turns to" },
  };

  const situationLabels = {
    employee: "an employee moving into leadership",
    leader: "a leader building greater authority",
    founder: "an entrepreneur building a powerful brand",
    job_seeker: "a professional commanding high-stakes opportunities",
    professional: "a professional demanding to be taken seriously",
  };

  const arenas = Array.isArray(answers.arena) ? answers.arena : [answers.arena];
  const persona = personaMap[answers.persona] || personaMap.commanding;

  return {
    situation: answers.situation || "professional",
    situationLabel: situationLabels[answers.situation] || "a professional",
    goal: answers.goal || "command_room",
    challenge: answers.challenge || "nervous",
    arenas,
    selfView: answers.self_view || "inconsistent",
    blocker: answers.blocker || "fear_judgment",
    timeline: answers.timeline || "ongoing",
    dailyMinutes: timeMap[answers.time] || 30,
    learningStyle: answers.learning_style || "doing",
    persona: answers.persona || "commanding",
    personaLabel: persona.adjective,
    personaDrive: persona.drive,
    name: answers.name || "Leader",
    urgentTimeline: answers.timeline === "urgent",
  };
}

function enrichWeek(week, profile) {
  return {
    ...week,
    personalizedFocus: getPersonalizedFocus(week, profile),
    priorityDay: getPriorityDay(week, profile),
    days: week.days.map((day) => ({
      ...day,
      targetDuration: profile.dailyMinutes,
      durationGuide: day.duration[profile.dailyMinutes] || day.duration[30],
      personalizedTip: getDayTip(day, profile),
    })),
  };
}

function getPersonalizedFocus(week, profile) {
  const focusMap = {
    freeze: { 1: "Your core challenge is losing your thread — Week 1 installs a new identity that doesn't freeze.", 4: "Your voice is the tool that stops the freeze. This week is critical for you." },
    passive: { 1: "Your quiet nature is being recoded this week — into strategic silence, not passivity.", 5: "BLUF directly targets your tendency to bury your perspective." },
    ramble: { 5: "This week was designed for you. Brevity and structure are your biggest leverage points.", 6: "Storytelling gives your ideas shape — so they land instead of sprawl." },
    nervous: { 3: "This week is your physical foundation. Nerves live in the body first.", 9: "This is your week — pressure management is where you'll make the biggest leap." },
    influence: { 7: "Reading the room comes before influencing it. Build this first.", 8: "This week is your peak leverage. You're ready for the advanced influence work now." },
  };

  return focusMap[profile.challenge]?.[week.week] || null;
}

function getPriorityDay(week, profile) {
  const styleMap = {
    reading: [1],
    doing: [3, 4],
    stories: [2, 6],
    tracking: [5],
  };
  const priorities = styleMap[profile.learningStyle] || [3];
  return priorities[0];
}

function getDayTip(day, profile) {
  const tips = [];

  if (day.focus === "Challenge" && profile.blocker === "fear_judgment") {
    tips.push("Fear of judgment will show up here. That's the signal — not the stop sign.");
  }
  if (day.focus === "Practice" && profile.learningStyle === "doing") {
    tips.push("This is your highest-leverage day. Bring full intensity to the exercise.");
  }
  if (day.focus === "Reflection" && profile.learningStyle === "tracking") {
    tips.push("Spend your full time on this — reflection is your compounding advantage.");
  }
  if (day.focus === "Skill Building" && profile.learningStyle === "reading") {
    tips.push("Go deep on the concept today before the exercise.");
  }
  if (profile.urgentTimeline && day.focus === "Challenge") {
    tips.push("With your timeline in mind — treat this challenge as a real rehearsal.");
  }

  return tips[0] || null;
}

export function getPlanSummary(profile) {
  const arenaLabels = {
    meetings: "boardrooms and high-stakes conversations",
    presentations: "presentations and public speaking",
    authority: "conversations with senior leaders",
    camera: "on-camera presence",
    networking: "networking and first impressions",
  };

  const arenaText = profile.arenas
    .map((a) => arenaLabels[a] || a)
    .join(" and ");

  return {
    headline: `Your 12-Week Path to ${capitalize(profile.personaLabel)} Leadership`,
    summary: `You're ${profile.situationLabel} who needs to own ${arenaText}. Over 12 weeks, you'll build the identity, communication toolkit, and unshakable presence of someone others follow — starting with the inner work and ending with a CEO you can't turn off.`,
    dailyCommitment: `${profile.dailyMinutes} min/day`,
    primaryFocus: arenaText,
    biggestWin: `Eliminating ${getChallengeLabel(profile.challenge)} and replacing it with ${profile.personaDrive}`,
    weekToWatch: getWeekToWatch(profile),
  };
}

function getWeekToWatch(profile) {
  const map = {
    freeze: 4,
    passive: 8,
    ramble: 5,
    nervous: 9,
    influence: 8,
  };
  return map[profile.challenge] || 6;
}

function getChallengeLabel(challenge) {
  const labels = {
    freeze: "freezing and losing your thread",
    passive: "staying quiet when you should speak",
    ramble: "rambling and burying your point",
    nervous: "nervous energy that shows physically",
    influence: "struggling to persuade and move people",
  };
  return labels[challenge] || "your current blocker";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
