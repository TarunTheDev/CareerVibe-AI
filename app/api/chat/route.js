import { NextResponse } from "next/server";

// Thin AI text proxy for the new /review and /compare surfaces.
// Reuses the same provider chain as app/api/ai-coach (Groq -> Gemini).
// Returns { text } (possibly "" on any failure) so the CLIENT can fall back to
// deterministic-only results — the UI must never break. Does not touch any
// existing route or API contract.

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
// gpt-oss / o-series are reasoning models: their internal reasoning counts
// against max_tokens, so a small client budget leaves `content` empty.
const IS_GROQ_REASONING = /gpt-oss|reasoning|o1|o3/i.test(GROQ_MODEL);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_MODELS = ["gemini-1.5-flash", process.env.GEMINI_MODEL, "gemini-2.0-flash"]
  .filter(Boolean)
  .map((m) => m.replace(/^models\//, ""))
  .filter((m, i, arr) => arr.indexOf(m) === i);

async function callGroq(prompt, maxTokens) {
  if (!GROQ_API_KEY) return "";
  // Reserve room for reasoning + the actual answer; cap reasoning effort so the
  // visible JSON isn't squeezed out. Retry a couple of times because the
  // empty-content case is intermittent on reasoning models.
  const budget = IS_GROQ_REASONING ? Math.max(maxTokens || 0, 4096) : maxTokens;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: budget,
          ...(IS_GROQ_REASONING ? { reasoning_effort: "low" } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) return ""; // real error — fall through to Gemini
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim() || "";
      if (text) return text;
      // Empty content (reasoning ate the budget) — retry.
    } catch {
      return "";
    } finally {
      clearTimeout(timer);
    }
  }
  return "";
}

async function callGemini(prompt, maxTokens) {
  if (!GEMINI_API_KEY) return "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    let response;
    for (const model of GEMINI_MODELS) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
          }),
          signal: controller.signal,
        },
      );
      if (response.ok) break;
      if (response.status !== 404) return "";
    }
    if (!response?.ok) return "";
    const data = await response.json();
    return (
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() || ""
    );
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request) {
  let prompt = "";
  let maxTokens = 700;
  try {
    ({ prompt, maxTokens = 700 } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!prompt || !String(prompt).trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  // Never 500: on total failure return empty text so the client shows its fallback.
  let text = await callGroq(prompt, maxTokens);
  if (!text) text = await callGemini(prompt, maxTokens);
  return NextResponse.json({ text });
}
