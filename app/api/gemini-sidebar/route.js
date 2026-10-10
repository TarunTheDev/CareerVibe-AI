import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
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

// Groq (OpenAI-compatible) — primary. Throws on failure so callGemini falls through.
async function callGroq(prompt, temperature = 0.7, maxTokens = 300) {
  if (!GROQ_API_KEY) throw new Error("GROQ_KEY_MISSING");
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
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Groq ${res.status}: ${t.slice(0, 160)}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timer);
  }
}

async function callAI(prompt, temperature = 0.7, maxTokens = 300) {
  // Try Groq first; on any failure, fall back to Gemini.
  if (GROQ_API_KEY) {
    try {
      const text = await callGroq(prompt, temperature, maxTokens);
      if (text) return text;
    } catch (e) {
      console.warn("[gemini-sidebar] Groq failed, trying Gemini:", e.message);
    }
  }
  return callGemini(prompt, temperature, maxTokens);
}

async function callGemini(prompt, temperature = 0.7, maxTokens = 300) {
  if (!GEMINI_KEY) {
    throw new Error("GEMINI_KEY_MISSING");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    let res;
    let errBody = "";
    for (const model of GEMINI_MODELS) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
          signal: controller.signal,
        },
      );

      if (res.ok) break;

      errBody = await res.text().catch(() => "");
      console.error(
        `[gemini-sidebar] Gemini model ${model} returned ${res.status}:`,
        errBody.slice(0, 200),
      );
      if (res.status !== 404) break;
    }

    clearTimeout(timer);

    if (!res?.ok) {
      throw new Error(`Gemini API error ${res?.status || "unknown"}: ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonSafe(text) {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  return JSON.parse(cleaned);
}

// ─── Local fallbacks ──────────────────────────────────────────────────────────
// Keep the right-sidebar widgets useful when the LLM is rate-limited/down.
function asList(v) {
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") return v.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

const COMMON_JOB_SKILLS = [
  "Communication", "Data Analysis", "Project Management", "Stakeholder Management",
  "SQL", "Excel", "Problem Solving", "Leadership", "Reporting", "Time Management",
];

function localSkillCoach(skills) {
  const have = new Set(asList(skills).map((s) => s.toLowerCase()));
  const missing = COMMON_JOB_SKILLS.filter((s) => !have.has(s.toLowerCase())).slice(0, 3);
  const list = missing.length ? missing : ["Advanced Excel", "Stakeholder Management", "SQL"];
  return {
    missingSkills: list,
    insight: `Adding ${list[0]} would make you noticeably more competitive for your top matches.`,
    missingCount: list.length,
  };
}

function localInsights(skills, jobList) {
  const s = asList(skills);
  const topSkill = s[0] || "your core skills";
  const n = asList(jobList).length;
  const roleCount = n > 0 ? `${n} live role${n === 1 ? "" : "s"}` : "several live roles";
  return [
    `📈 ${topSkill} is in strong demand — lead with it in every application.`,
    `🎯 You match ${roleCount}; tailoring each resume lifts callbacks sharply.`,
    `💡 Apply within 48 hours of a posting — early applicants get 8x more responses.`,
  ];
}

function localChat(skills, jobTitles, question) {
  const s = asList(skills).slice(0, 2).join(" and ") || "your strengths";
  const role = asList(jobTitles)[0];
  const roleBit = role ? ` toward ${role}` : "";
  return `Focus on roles where ${s} already match most requirements${roleBit}. Tailor each application to the posting's keywords, quantify your impact with numbers, and apply early — momentum matters more than volume.`;
}

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
    const { type } = body;

    if (type === "skillCoach") {
      const { skills, jobTitles } = body;
      if (!GROQ_API_KEY && !GEMINI_KEY) return NextResponse.json({ ...localSkillCoach(skills), source: "local" });
      const prompt = `You are a career coach AI. Given these candidate skills: [${skills}] and these job titles they matched: [${jobTitles}], identify the top 3 missing skills that appear most in these jobs but not in candidate skills. Return ONLY a JSON object with no markdown: {"missingSkills": ["skill1", "skill2", "skill3"], "insight": "One specific sentence about their competitiveness", "missingCount": 3}`;

      const raw = await callAI(prompt, 0.3, 300);
      const parsed = parseJsonSafe(raw);
      return NextResponse.json(parsed);
    }

    if (type === "insights") {
      const { skills, jobs: jobList, seed } = body;
      if (!GROQ_API_KEY && !GEMINI_KEY) return NextResponse.json({ insights: localInsights(skills, jobList), source: "local" });
      const prompt = `You are a career intelligence AI. Generate 3 unique career insights for a job seeker. Their skills: [${skills}]. Their top job matches: [${jobList}]. Session: ${seed}. Each insight must be 1 sentence (10-15 words), start with a different emoji, and be specific and encouraging. Rotate between: skill competitiveness, market trends, salary observations, application strategy. Return ONLY a JSON array with no markdown: ["insight1", "insight2", "insight3"]`;

      const raw = await callAI(prompt, 0.9, 250);
      const parsed = parseJsonSafe(raw);
      if (!Array.isArray(parsed)) throw new Error("Expected array");
      return NextResponse.json({ insights: parsed.slice(0, 3) });
    }

    if (type === "chat") {
      const { skills, jobTitles, question } = body;
      if (!GROQ_API_KEY && !GEMINI_KEY) return NextResponse.json({ response: localChat(skills, jobTitles, question), source: "local" });
      const prompt = `You are a career coach. The candidate has these skills: [${skills}]. They are targeting roles like: [${jobTitles}]. Question: ${question}. Give a concise, actionable response in 2-3 sentences.`;

      const raw = await callAI(prompt, 0.7, 200);
      return NextResponse.json({ response: raw.trim() });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });

  } catch (err) {
    console.error("[gemini-sidebar] serving local fallback:", err.message);

    // Degrade gracefully by type instead of returning a 500 to the widget.
    const { type } = body || {};
    if (type === "skillCoach") return NextResponse.json({ ...localSkillCoach(body.skills), source: "local" });
    if (type === "insights") return NextResponse.json({ insights: localInsights(body.skills, body.jobs), source: "local" });
    if (type === "chat") return NextResponse.json({ response: localChat(body.skills, body.jobTitles, body.question), source: "local" });

    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 400 });
  }
}
