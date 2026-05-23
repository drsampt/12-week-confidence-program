// Calls Anthropic API directly from the browser.
// Users supply their own API key — it's stored in localStorage and never sent anywhere except api.anthropic.com.

const STORAGE_KEY = "ceo_program_api_key";

export function getStoredKey() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

export function storeKey(key) {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearKey() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function generatePersonalizedContent(profile, week, contentType) {
  const apiKey = getStoredKey();
  if (!apiKey) throw new Error("NO_KEY");

  const prompts = {
    affirmation: buildAffirmationPrompt(profile, week),
    exercise: buildExercisePrompt(profile, week),
    challenge: buildChallengePrompt(profile, week),
  };

  const prompt = prompts[contentType];
  if (!prompt) throw new Error("Unknown content type");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text.trim();
}

function buildAffirmationPrompt(profile, week) {
  return `You are a world-class executive coach writing a personalized daily affirmation.

Context about this person:
- They are ${profile.situationLabel}
- Their biggest blocker: ${profile.blocker}
- They want to be perceived as: ${profile.personaLabel}
- Current week focus: ${week.title} — ${week.subtitle}
- Their primary challenge: ${profile.challenge}

Write ONE powerful affirmation (2-3 sentences max) that:
1. Directly addresses their specific blocker (${profile.blocker})
2. Connects to this week's theme (${week.theme})
3. Is stated as present truth, not future hope ("I am" not "I will be")
4. Sounds like something a CEO would actually say to themselves — grounded, not fluffy

Output only the affirmation text. No intro, no explanation.`;
}

function buildExercisePrompt(profile, week) {
  return `You are a world-class executive coach designing a personalized practice exercise.

Context about this person:
- They are ${profile.situationLabel}
- Their learning style: ${profile.learningStyle}
- They need CEO presence most in: ${profile.arenas.join(", ")}
- Their biggest challenge: ${profile.challenge}
- This week's theme: ${week.title}
- Time available: ${profile.dailyMinutes} minutes

Design ONE targeted practice exercise that:
1. Takes exactly ${profile.dailyMinutes} minutes
2. Is adapted to their learning style (${profile.learningStyle})
3. Specifically addresses where they need it most (${profile.arenas[0]})
4. Builds the skill focus of ${week.theme}
5. Is concrete, actionable, and produces a measurable output

Format:
EXERCISE: [Name]
WHAT TO DO: [3-4 specific steps]
SUCCESS LOOKS LIKE: [One concrete outcome]

Output only the formatted exercise. No preamble.`;
}

function buildChallengePrompt(profile, week) {
  return `You are a world-class executive coach writing a personalized weekly stretch challenge.

Context:
- Person is ${profile.situationLabel}
- Their biggest fear/blocker: ${profile.blocker}
- They want to be seen as: ${profile.personaLabel} — ${profile.personaDrive}
- Week ${week.week} theme: ${week.title}
- Timeline urgency: ${profile.urgentTimeline ? "They have a high-stakes event within 4 weeks" : "Building for long-term identity shift"}

Write a personalized weekly challenge that:
1. Directly confronts their primary blocker (${profile.blocker})
2. Can be completed within the week
3. Involves real-world application, not just practice
4. Is ambitious but achievable
5. Creates a memorable proof point that changes how they see themselves

Format: 2-3 sentences. Start with "This week:"
Output only the challenge. No preamble.`;
}
