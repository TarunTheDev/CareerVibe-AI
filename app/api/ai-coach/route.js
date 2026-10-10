import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GEMINI_MODELS = [
  "gemini-1.5-flash",
  process.env.GEMINI_MODEL,
  "gemini-2.0-flash",
]
  .filter(Boolean)
  .map((model) => model.replace(/^models\//, ""))
  .filter((model, index, models) => models.indexOf(model) === index);

// Groq (OpenAI-compatible) — primary. Returns "" on any failure so callers fall back.
async function callGroq(prompt) {
  if (!GROQ_API_KEY) return "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn("[ai-coach] Groq", res.status, (await res.text()).slice(0, 160));
      return "";
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || "";
  } catch (e) {
    console.warn("[ai-coach] Groq error:", e.message);
    return "";
  } finally {
    clearTimeout(timer);
  }
}

// ─── Local fallback coach ─────────────────────────────────────────────────────
// Keeps the AI Coach useful (never a 500) when the LLM is rate-limited or down.
function localCoachReply(question, skills = [], jobTitles = []) {
  const q = String(question || "").toLowerCase();
  const skillList = (Array.isArray(skills) ? skills : [])
    .filter(Boolean)
    .slice(0, 3);
  const role = (Array.isArray(jobTitles) ? jobTitles : []).filter(Boolean)[0];
  const strengths = skillList.length
    ? `your strengths in ${skillList.join(", ")}`
    : "the strengths already on your resume";
  const roleBit = role ? ` as a ${role}` : "";

  if (/resume|cv|ats/.test(q)) {
    return `Lead your resume with a punchy summary that names your target role and quantifies impact (numbers, %, ₹/$). Mirror the exact keywords from each job description so ATS parsers rank you higher, and put ${strengths} in your top third where recruiters look first.`;
  }
  if (/interview|hr round|hiring manager/.test(q)) {
    return `Prep 5–6 STAR stories (Situation, Task, Action, Result) that showcase ${strengths}. Research the company's product for 20 minutes before each interview, and always close by asking one sharp question about the team's goals — it signals genuine interest.`;
  }
  if (/salary|pay|negotiat|ctc|offer/.test(q)) {
    return `Anchor on market data: check the range for the role and location before you name a number, then aim slightly above the midpoint. Never give the first figure if you can avoid it, and negotiate the whole package — base, bonus, and growth budget — not just salary.`;
  }
  if (/switch|transition|change|break into|pivot/.test(q)) {
    return `Transition by bridging, not jumping: take on projects in your current job that use the new role's skills, then ship 1–2 portfolio pieces that prove it. Leverage ${strengths}${roleBit} as transferable proof, and target roles where 60–70% of the requirements already match you.`;
  }
  if (/skill|learn|course|upskill|grow/.test(q)) {
    return `Pick the 2–3 skills that appear most often in job posts you want, and go deep rather than wide. Build something real with each one — a project beats a certificate — and add it to your resume the week you finish, so ${strengths} keeps compounding.`;
  }
  return `Focus your search on roles where ${strengths} already match most of the requirements${roleBit} — you'll get more callbacks than by casting wide. Tailor each application to the posting's keywords, and track what earns responses so you can double down on what works.`;
}

export async function POST(request) {
  let question = "";
  let skills = [];
  let jobTitles = [];
  try {
    ({ question, skills = [], jobTitles = [] } = await request.json());

    if (!question?.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const skillsText = Array.isArray(skills) ? skills.join(", ") : String(skills || "");
    const jobTitlesText = Array.isArray(jobTitles)
      ? jobTitles.join(", ")
      : String(jobTitles || "");

    const prompt = `You are a career coach. The user has these skills: [${skillsText}].
They are matched with these job types: [${jobTitlesText}].
Their question is: [${question.trim()}]
Give a concise, helpful 2-3 sentence career advice response.`;

    // Groq first (fast + reliable).
    const groqReply = await callGroq(prompt);
    if (groqReply) {
      return NextResponse.json({ reply: groqReply, source: "groq" });
    }

    // If Groq unavailable and no Gemini key, serve the local coach.
    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        reply: localCoachReply(question, skills, jobTitles),
        source: "local",
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    let response;
    let lastErrorText = "";
    let usedModel = "";
    try {
      for (const model of GEMINI_MODELS) {
        usedModel = model;
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
            }),
            signal: controller.signal,
          },
        );

        if (response.ok) break;

        lastErrorText = await response.text().catch(() => "");
        console.error(
          `[ai-coach] Gemini model ${model} returned ${response.status}:`,
          lastErrorText.slice(0, 300),
        );
        if (response.status !== 404) break;
      }
    } finally {
      clearTimeout(timer);
    }

    if (!response?.ok) {
      throw new Error(
        `Gemini API error ${response?.status || "unknown"}: ${lastErrorText.slice(0, 300)}`,
      );
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "";

    if (!reply) {
      throw new Error("Empty response from Gemini");
    }

    console.log(`[ai-coach] Gemini reply generated with ${usedModel}`);
    return NextResponse.json({ reply });
  } catch (error) {
    const normalizedError =
      error?.name === "AbortError"
        ? new Error("AI request timed out")
        : error instanceof Error
          ? error
          : new Error("AI is unavailable right now");

    console.error("[ai-coach] Error, serving local fallback:", normalizedError.message);

    // Never hard-fail the coach: degrade to the rule-based reply instead of a 500.
    if (question?.trim()) {
      return NextResponse.json({
        reply: localCoachReply(question, skills, jobTitles),
        source: "local",
      });
    }
    return NextResponse.json(
      { error: normalizedError.message },
      { status: 400 },
    );
  }
}
