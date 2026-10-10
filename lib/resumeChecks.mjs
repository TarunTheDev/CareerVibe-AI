// lib/resumeChecks.js
// PURE, side-effect-free deterministic resume checks. No network, no storage.
// Input: raw resume text. Output: { checks: [{id,label,status,detail,quotes}], summary:{passed,total} }.
// "status" is pass | warn | fail. Every warn/fail carries the exact offending line(s) as quotes.

export const ACTION_VERBS = [
  "built","led","designed","implemented","developed","created","launched","shipped","managed",
  "improved","increased","reduced","optimized","automated","migrated","refactored","delivered",
  "architected","engineered","analyzed","scaled","reduced","drove","owned","coordinated","mentored",
  "established","streamlined","resolved","configured","deployed","integrated","tested","maintained",
  "grew","cut","saved","generated","authored","presented","negotiated","trained","rebuilt","fixed",
];

export const WEAK_PHRASES = [
  "responsible for","worked on","helped with","helped to","hardworking","team player",
  "duties included","involved in","assisted with","participated in","in charge of",
  "familiar with","exposure to","go-getter","detail oriented","detail-oriented","hard worker",
];

const SECTION_KEYWORDS = {
  contact: ["email","e-mail","phone","mobile","contact","linkedin","github","@","tel"],
  summary: ["summary","objective","profile","about me","professional summary","qualifications"],
  education: ["education","academic","degree","bachelor","b.tech","b.e","b.sc","m.tech","master","university","college","diploma","school"],
  experience: ["experience","employment","work history","professional experience","internship","experience","career"],
  projects: ["project","projects","portfolio"],
  skills: ["skills","technical skills","competencies","technologies","tech stack","proficiencies"],
};

const norm = (s) => String(s == null ? "" : s).toLowerCase().replace(/\s+/g, " ").trim();
const splitLines = (text) => String(text == null ? "" : text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

function isBullet(line) {
  return /^([•·▪◦\-*–—]|\d+[.)]|[oO])\s+/.test(line) || line.startsWith("- ");
}

function firstWord(line) {
  const cleaned = line.replace(/^([•·▪◦\-*–—]|\d+[.)]|[oO])\s+/, "").trim();
  const m = cleaned.match(/[A-Za-z]+/);
  return m ? m[0].toLowerCase() : "";
}

function hasMetric(line) {
  return /\d/.test(line) || /\d+%/i.test(line) || /(\$\d|₹\d|\bRs\.?\s?\d|\bUSD\b|\bk\b|\bm\b)/i.test(line);
}

export function runResumeChecks(rawText) {
  const text = String(rawText == null ? "" : rawText);
  const lower = norm(text);
  const lines = splitLines(text);
  const checks = [];

  // 1. Sections found
  const found = [];
  const missing = [];
  for (const [section, keys] of Object.entries(SECTION_KEYWORDS)) {
    const hit = keys.some((k) => lower.includes(k));
    if (hit) found.push(section);
    else missing.push(section);
  }
  const coreFound = ["contact","summary","education","skills"].filter((s) => found.includes(s));
  const hasExpOrProj = found.includes("experience") || found.includes("projects");
  const sectionCount = found.length + (hasExpOrProj ? 1 : 0);
  checks.push({
    id: "sections",
    label: "Sections found",
    status: found.length >= 4 && hasExpOrProj ? "pass" : found.length >= 2 ? "warn" : "fail",
    detail: `Found: ${found.join(", ") || "none"}${hasExpOrProj ? " (experience/projects present)" : ""}.`,
    quotes: missing.length ? [`Missing/unclear: ${missing.join(", ")}`] : [],
  });

  // 2. Contact signals
  const email = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i.test(text);
  const phone = /(\+?\d[\d\s().\-]{7,}\d)/.test(text);
  const social = /(linkedin\.com|github\.com)/i.test(text);
  const contactHits = [email && "email", phone && "phone", social && "LinkedIn/GitHub"].filter(Boolean);
  checks.push({
    id: "contact",
    label: "Contact signals",
    status: email && (phone || social) ? "pass" : contactHits.length ? "warn" : "fail",
    detail: contactHits.length ? `Detected: ${contactHits.join(", ")}.` : "No email, phone, or profile link found.",
    quotes: contactHits.length ? [] : ["Add an email and a phone or LinkedIn/GitHub link near the top."],
  });

  // 3. Length (word count)
  const words = text.split(/\s+/).filter(Boolean).length;
  const lenStatus = words === 0 ? "fail" : words < 200 ? "warn" : words <= 800 ? "pass" : "warn";
  checks.push({
    id: "length",
    label: "Length",
    status: lenStatus,
    detail: `${words} words.${words < 200 ? " A bit thin for early-career (aim ~200–800)." : words > 800 ? " Long — consider trimming to the most relevant ~2 pages." : " Good range for early-career."}`,
    quotes: [],
  });

  // 4. Bullets: action verbs + metrics
  const bullets = lines.filter(isBullet);
  const verbBullets = bullets.filter((b) => ACTION_VERBS.includes(firstWord(b)));
  const metricBullets = bullets.filter(hasMetric);
  const verbShare = bullets.length ? verbBullets.length / bullets.length : 0;
  const metricShare = bullets.length ? metricBullets.length / bullets.length : 0;
  const noMetricLines = bullets.filter((b) => !hasMetric(b)).slice(0, 6);
  checks.push({
    id: "bullets",
    label: "Bullet strength (action verbs + metrics)",
    status: bullets.length === 0 ? "fail" : verbShare >= 0.6 && metricShare >= 0.4 ? "pass" : verbShare >= 0.3 || metricShare >= 0.2 ? "warn" : "fail",
    detail: bullets.length
      ? `${bullets.length} bullets · ${Math.round(verbShare * 100)}% start with an action verb · ${Math.round(metricShare * 100)}% include a number/metric.`
      : "No bullet-style lines detected.",
    quotes: bullets.length && metricShare < 0.4 ? noMetricLines : [],
  });

  // 5. Weak phrases
  const weakLines = lines.filter((l) => WEAK_PHRASES.some((p) => norm(l).includes(p)));
  checks.push({
    id: "weak-phrases",
    label: "Weak phrases",
    status: weakLines.length === 0 ? "pass" : weakLines.length <= 3 ? "warn" : "fail",
    detail: weakLines.length ? `${weakLines.length} line(s) use vague filler — swap for a strong verb + result.` : "No filler phrases detected.",
    quotes: weakLines.slice(0, 8),
  });

  // 6. First-person pronouns in bullets
  const fpLines = bullets.filter((l) => /(^|\s)(i|my|me)\s/i.test(l));
  checks.push({
    id: "first-person",
    label: "First-person pronouns in bullets",
    status: fpLines.length === 0 ? "pass" : "warn",
    detail: fpLines.length ? `${fpLines.length} bullet(s) use "I/my/me" — resumes read better in implied-first-person.` : "None found in bullets.",
    quotes: fpLines.slice(0, 8),
  });

  // 7. Duplicate lines / repeated skills
  const seen = new Map();
  const dupes = [];
  for (const l of lines) {
    const k = norm(l);
    if (!k) continue;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  for (const [k, n] of seen) if (n > 1) dupes.push(k);
  checks.push({
    id: "duplicates",
    label: "Repeated lines",
    status: dupes.length === 0 ? "pass" : "warn",
    detail: dupes.length ? `${dupes.length} line(s) repeat — remove exact duplicates.` : "No duplicate lines.",
    quotes: dupes.slice(0, 8),
  });

  const summary = {
    passed: checks.filter((c) => c.status === "pass").length,
    total: checks.length,
  };
  return { checks, summary };
}

// Verify a quote is a real substring of the source after whitespace/case normalization.
export function quoteIsInSource(quote, source) {
  const q = norm(quote);
  if (!q) return false;
  return norm(source).includes(q);
}
