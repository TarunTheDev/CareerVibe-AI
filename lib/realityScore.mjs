// lib/realityScore.mjs
// PURE, client-side, zero-API-cost job legitimacy/trust scoring.
// Every signal becomes a human-readable reason; the score is derivable from
// visible job data only — no unsourced statistics, no network.
//
// Shipped as .mjs (see AUDIT.md deviation note) so it is unit-testable with no build.

export const RED_FLAG_PHRASES = [
  "registration fee",
  "security deposit",
  "training fee",
  "earn daily",
  "work from home any degree",
  "telegram",
  "whatsapp group",
  "instant joining",
  "no experience needed earn",
];

const AGGREGATORS = [
  "adzuna", "jooble", "jsearch", "openwebninja", "themuse", "the muse", "careerjet",
  "whatjobs", "indeed", "linkedin", "google jobs", "findwork", "apify", "arbeitnow",
  "usajobs", "devitjobs", "arbeitsamt", "bundesarbeitsagentur", "naukri", "foundit",
  "monster", "glassdoor", "ziprecruiter", "simplyhired",
];

// Level thresholds. "Hide suspicious listings" hides score < 40 (danger).
export const LEVEL_THRESHOLDS = { verified: 80, good: 60, caution: 40 };

function levelFor(score) {
  if (score >= LEVEL_THRESHOLDS.verified) return "verified";
  if (score >= LEVEL_THRESHOLDS.good) return "good";
  if (score >= LEVEL_THRESHOLDS.caution) return "caution";
  return "danger";
}

function hostname(url) {
  try {
    return new URL(String(url || "")).hostname.toLowerCase();
  } catch {
    return String(url || "").toLowerCase();
  }
}

/**
 * Parse a "posted" signal into days ago. Accepts ISO dates, "N days/hours ago",
 * "Today", "Yesterday", "Just posted". Returns null when unknown.
 */
export function daysAgo(posted) {
  if (posted == null) return null;
  if (posted instanceof Date) {
    const d = (Date.now() - posted.getTime()) / 864e5;
    return Number.isFinite(d) && d >= 0 ? d : null;
  }
  if (typeof posted === "number") return posted >= 0 ? posted : null;
  const s = String(posted).toLowerCase().trim();
  if (!s) return null;
  if (/just posted|just now|today|new\b/.test(s)) return 0;
  if (/yesterday/.test(s)) return 1;
  const hourMatch = s.match(/(\d+)\s*(?:hours?|hrs?|h)\b/);
  if (hourMatch) return Number(hourMatch[1]) / 24;
  const minMatch = s.match(/(\d+)\s*(?:minutes?|mins?|m)\b/);
  if (minMatch) return Number(minMatch[1]) / 1440;
  const dayMatch = s.match(/(\d+)\s*(?:days?|d)\b/);
  if (dayMatch) return Number(dayMatch[1]);
  const weekMatch = s.match(/(\d+)\s*(?:weeks?|wks?|w)\b/);
  if (weekMatch) return Number(weekMatch[1]) * 7;
  const monthMatch = s.match(/(\d+)\s*(?:months?|mos?)\b/);
  if (monthMatch) return Number(monthMatch[1]) * 30;
  // try an absolute date
  const t = Date.parse(String(posted));
  if (!Number.isNaN(t)) {
    const d = (Date.now() - t) / 864e5;
    return d >= 0 ? d : null;
  }
  return null;
}

function detectSourceTier(job = {}) {
  const s = String(job.source || "").toLowerCase();
  const host = hostname(job.applyUrl);
  const hay = `${s} ${host}`;

  if (/internshala/.test(hay)) return { points: 25, reason: "Source: Internshala" };
  if (/wellfound|angelist/.test(hay)) return { points: 25, reason: "Source: Wellfound" };
  if (/career site|company site|careers\.|\bdirect\b|employer site/.test(hay)) {
    return { points: 30, reason: "Direct company career site" };
  }
  const known = AGGREGATORS.find((a) => hay.includes(a));
  if (known) return { points: 15, reason: `Aggregator source (${known})` };
  // Unknown origin — treat conservatively as an aggregator.
  return { points: 15, reason: "Aggregator source" };
}

function hasResponsibilities(job = {}) {
  const desc = String(job.description || "");
  if (desc.length < 80) return false;
  const lower = desc.toLowerCase();
  const bullets = (desc.match(/(^|\n)\s*(•|·|-|\*|\d+[.)])\s+/g) || []).length;
  return (
    /responsibilit|you will|your role|what you.ll do|duties|day to day|requirements/.test(lower) ||
    bullets >= 3
  );
}

function hasSalary(job = {}) {
  return Boolean(
    (typeof job.salaryMin === "number" && job.salaryMin > 0) ||
    (typeof job.salaryMax === "number" && job.salaryMax > 0) ||
    (job.salary && String(job.salary).trim()) ||
    (job.compensation && String(job.compensation).trim()),
  );
}

function hasSkills(job = {}) {
  const arr = job.skills || job.requiredSkills || job.jobSkills;
  if (Array.isArray(arr) && arr.length > 0) return true;
  return /(^|\n)\s*(skills|tech stack|technologies|required skills)\s*[:•-]/i.test(
    String(job.description || ""),
  );
}

/**
 * @param {object} job  { title, company, description, source, applyUrl, posted/postedAt, salary*, skills }
 * @returns {{ score: number, level: 'verified'|'good'|'caution'|'danger', reasons: string[] }}
 */
export function realityScore(job = {}) {
  const reasons = [];
  let score = 0;

  // Freshness
  const posted = job.posted ?? job.postedAt ?? job.date;
  const days = daysAgo(posted);
  if (days != null) {
    if (days < 1) { score += 25; reasons.push("Posted in the last 24 hours"); }
    else if (days < 7) { score += 20; reasons.push(`Posted ${Math.round(days)} day${Math.round(days) === 1 ? "" : "s"} ago`); }
    else if (days < 30) { score += 10; reasons.push(`Posted ${Math.round(days)} days ago`); }
    else { reasons.push(`Older listing (${Math.round(days)} days)`); }
  } else {
    reasons.push("No posting date listed");
  }

  // Source trust
  const src = detectSourceTier(job);
  score += src.points;
  reasons.push(src.reason);

  // Quality signals
  if (hasResponsibilities(job)) { score += 15; reasons.push("Lists responsibilities"); }
  else reasons.push("Thin or missing responsibilities");
  if (hasSalary(job)) { score += 10; reasons.push("Salary listed"); }
  else reasons.push("No salary listed");
  if (hasSkills(job)) { score += 10; reasons.push("Skills list present"); }

  // Red flags (-20 each)
  const hay = `${job.title || ""} ${job.company || ""} ${job.description || ""}`.toLowerCase();
  for (const phrase of RED_FLAG_PHRASES) {
    if (hay.includes(phrase)) {
      score -= 20;
      reasons.push(`Red flag: "${phrase}"`);
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, level: levelFor(score), reasons };
}

// Convenience for the "Hide suspicious listings" filter (default ON, hides < 40).
export function isSuspicious(job = {}) {
  return realityScore(job).score < LEVEL_THRESHOLDS.caution;
}
