// lib/salary.mjs
// PURE, side-effect-free salary parsing + formatting. No network, no storage, no React.
// This is the ONE module every money-rendering surface must use, so a salary can
// never be shown with mixed periods (the "₹21000L – ₹96L per annum" bug) or with a
// lakh label glued to a rupee-scale number.
//
// Exports:
//   parseSalaryRange(raw, hints) -> { minAnnual, maxAnnual, currency, confidence, hasSalary }
//   formatSalary(parsed)         -> stable display string (memoized; identical input === identical output)
//
// Shipped as .mjs (not .ts) to match the repo's other pure-logic modules
// (resumeChecks.mjs, skillNormalize.mjs) so `node --test` can run it with no build step.

const PERIOD_MULTIPLIERS = {
  hourly: 2080, // 40h * 52w
  daily: 260,
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  annual: 1,
  yearly: 1,
  "per annum": 1,
  pa: 1,
};

// Numbers up to this are treated as MONTHLY rupees when no period metadata exists.
// Above it (and up to MAX_ANNUAL_INR) they are treated as ANNUAL rupees.
const MONTHLY_INR_CEILING = 100000;
const MAX_ANNUAL_INR = 20000000; // 2 crore — beyond this we stop trusting the heuristic

const LAKH = 100000;

const CURRENCY_SYMBOLS = {
  INR: ["₹", "inr", "rs.", "rs ", "rupee"],
  USD: ["$", "usd", "dollar"],
  EUR: ["€", "eur", "euro"],
  GBP: ["£", "gbp", "pound"],
};

function toNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
  return null;
}

// Pull every positive number out of a string, honouring lakh/k shorthand.
function numbersFromText(text) {
  const lower = String(text == null ? "" : text).toLowerCase();
  const usesLakhs = /lpa|lakh|lakhs|lac|lacs|\bl\b/.test(lower);
  const usesThousands = /\bk\b/.test(lower);
  const out = [];
  for (const part of lower.match(/\d[\d,]*(?:\.\d+)?/g) || []) {
    let num = Number(String(part).replace(/,/g, ""));
    if (!Number.isFinite(num) || num <= 0) continue;
    // "12 LPA" / "3.5L" -> rupees; "85k" -> rupees/dollars scaled by 1000
    if (usesLakhs && num < 200) num *= LAKH;
    else if (usesThousands && num < 1000) num *= 1000;
    out.push(num);
  }
  return out;
}

function detectPeriod(text) {
  const lower = String(text == null ? "" : text).toLowerCase();
  for (const key of Object.keys(PERIOD_MULTIPLIERS)) {
    // word-boundary-ish match so "pa" doesn't hit random substrings
    if (key === "pa" || key === "per annum") {
      if (lower.includes(key)) return "annual";
      continue;
    }
    if (new RegExp(`\\b${key.replace(/ /g, "\\s")}\\b`).test(lower)) {
      return key === "yearly" || key === "per annum" ? "annual" : key;
    }
  }
  if (/\/\s*(mo|month|m)\b/.test(lower)) return "monthly";
  if (/\/\s*(yr|year|a)\b/.test(lower)) return "annual";
  if (/\bper\s+(hour|hr)\b/.test(lower)) return "hourly";
  if (/\bper\s+(day|diem)\b/.test(lower)) return "daily";
  if (/\bper\s+week\b/.test(lower)) return "weekly";
  if (/\bper\s+month\b/.test(lower)) return "monthly";
  if (/\bper\s+(year|annum)\b/.test(lower)) return "annual";
  return null;
}

function detectCurrency(text, hint) {
  if (hint) {
    const h = String(hint).toLowerCase();
    if (h.includes("inr") || h === "₹") return "INR";
    if (h.includes("usd") || h === "$") return "USD";
    if (h.includes("eur") || h === "€") return "EUR";
    if (h.includes("gbp") || h === "£") return "GBP";
  }
  const lower = String(text == null ? "" : text).toLowerCase();
  for (const [code, tokens] of Object.entries(CURRENCY_SYMBOLS)) {
    if (tokens.some((t) => lower.includes(t))) return code;
  }
  return null;
}

// Collect {value, periodFromText} candidates from any raw shape we support.
function collectBounds(raw) {
  const found = [];
  const push = (val, srcText) => {
    const n = toNumber(val);
    if (n != null) found.push({ value: n, text: srcText || "" });
    return n != null;
  };

  if (raw == null) return found;

  if (typeof raw === "number") {
    push(raw, "");
    return found;
  }

  if (typeof raw === "string") {
    const nums = numbersFromText(raw).sort((a, b) => a - b);
    for (const n of nums) found.push({ value: n, text: raw });
    return found;
  }

  if (typeof raw === "object") {
    // explicit min/max under any of the common key spellings
    const minKeys = ["min", "minimum", "minAnnual", "salaryMin", "salary_min", "min_salary", "job_min_salary"];
    const maxKeys = ["max", "maximum", "maxAnnual", "salaryMax", "salary_max", "max_salary", "job_max_salary"];
    const textKeys = ["salary", "compensation", "pay", "remuneration", "range", "text"];

    let sawMinMax = false;
    for (const k of minKeys) if (push(raw[k], typeof raw[k] === "string" ? raw[k] : "")) sawMinMax = true;
    for (const k of maxKeys) if (push(raw[k], typeof raw[k] === "string" ? raw[k] : "")) sawMinMax = true;
    for (const k of textKeys) {
      const v = raw[k];
      if (typeof v === "string") for (const n of numbersFromText(v)) found.push({ value: n, text: v });
      else push(v, "");
    }
    // period text may live on its own key
    if (!sawMinMax && Array.isArray(raw)) {
      for (const item of raw) collectBounds(item).forEach((b) => found.push(b));
    }
    return found;
  }

  return found;
}

function periodTextFromObject(raw) {
  if (!raw || typeof raw !== "object") return "";
  return String(
    raw.salaryPeriod || raw.salary_period || raw.period ||
    raw.job_min_salary_period || raw.salary_period_lower || raw.interval || ""
  );
}

/**
 * Normalize any salary-ish input to an annual range in a single currency.
 * @param {*} raw  number | string | { min, max, ... } | job-like object
 * @param {{ currency?: string, period?: string, source?: string }} [hints]
 * @returns {{ minAnnual: number|null, maxAnnual: number|null, currency: string, confidence: 'metadata'|'estimated'|'none', hasSalary: boolean }}
 */
export function parseSalaryRange(raw, hints = {}) {
  const bounds = collectBounds(raw);
  const result = { minAnnual: null, maxAnnual: null, currency: "INR", confidence: "none", hasSalary: false };
  if (!bounds.length) return result;

  // Currency: hint > any text symbol > INR default (app is India-first).
  const textBlob = [typeof raw === "string" ? raw : "", ...bounds.map((b) => b.text), periodTextFromObject(raw)].join(" ");
  result.currency = detectCurrency(textBlob, hints.currency) || "INR";

  // Period: explicit hint wins; else text on the object; else per-bound text; else heuristic.
  const hintPeriod = hints.period ? String(hints.period).toLowerCase() : null;
  const objPeriod = detectPeriod(periodTextFromObject(raw));
  let usedHeuristic = false;

  const annualized = bounds.map((b) => {
    let period = hintPeriod || objPeriod || detectPeriod(b.text);
    let value = b.value;

    if (period && PERIOD_MULTIPLIERS[period]) {
      value = value * PERIOD_MULTIPLIERS[period];
    } else if (result.currency === "INR") {
      // Per-bound heuristic (rupees only): small figures are monthly, mid figures annual.
      usedHeuristic = true;
      if (value <= MONTHLY_INR_CEILING) value = value * PERIOD_MULTIPLIERS.monthly;
      else if (value <= MAX_ANNUAL_INR) value = value; // already annual
      // value > MAX_ANNUAL_INR: leave as-is but it is almost certainly already annual
    } else {
      // Non-INR with no period metadata: assume the figure is already annual.
      usedHeuristic = true;
    }
    return value;
  });

  const positive = annualized.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!positive.length) return result;

  result.minAnnual = Math.round(positive[0]);
  result.maxAnnual = Math.round(positive[positive.length - 1]);
  result.hasSalary = true;
  result.confidence = usedHeuristic ? "estimated" : "metadata";
  return result;
}

const inrFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const lakhFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const usdFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function lakhLabel(annual) {
  return `${lakhFormatter.format(annual / LAKH)} LPA`;
}

function formatInr(parsed) {
  const { minAnnual, maxAnnual } = parsed;
  const fmtOne = (v) => (v >= LAKH ? `₹${lakhLabel(v)}` : `₹${inrFormatter.format(v)} per year`);
  if (minAnnual != null && maxAnnual != null && minAnnual !== maxAnnual) {
    // Both bounds in the same scale family for a clean range.
    if (minAnnual >= LAKH && maxAnnual >= LAKH) {
      return `₹${lakhFormatter.format(minAnnual / LAKH)}–₹${lakhFormatter.format(maxAnnual / LAKH)} LPA`;
    }
    if (minAnnual < LAKH && maxAnnual < LAKH) {
      return `₹${inrFormatter.format(minAnnual)}–₹${inrFormatter.format(maxAnnual)} per year`;
    }
    // straddles the lakh boundary — show both as full rupees/year for honesty
    return `₹${inrFormatter.format(minAnnual)}–₹${inrFormatter.format(maxAnnual)} per year`;
  }
  const only = minAnnual != null ? minAnnual : maxAnnual;
  if (only == null) return "Salary not listed";
  // single bound: label direction using whichever side we have
  if (minAnnual != null && maxAnnual == null) return `From ${fmtOne(minAnnual)}`;
  if (maxAnnual != null && minAnnual == null) return `Up to ${fmtOne(maxAnnual)}`;
  return fmtOne(only);
}

function formatUsd(parsed) {
  const { minAnnual, maxAnnual } = parsed;
  const k = (v) => (v >= 1000 ? `$${usdFormatter.format(Math.round(v / 1000))}k` : `$${usdFormatter.format(v)}`);
  if (minAnnual != null && maxAnnual != null && minAnnual !== maxAnnual) {
    return `${k(minAnnual)}–${k(maxAnnual)} per year`;
  }
  const only = minAnnual != null ? minAnnual : maxAnnual;
  if (only == null) return "Salary not listed";
  return `${k(only)} per year`;
}

function formatOther(parsed, symbol) {
  const { minAnnual, maxAnnual } = parsed;
  const n = (v) => `${symbol}${usdFormatter.format(v)}`;
  if (minAnnual != null && maxAnnual != null && minAnnual !== maxAnnual) {
    return `${n(minAnnual)}–${n(maxAnnual)} per year`;
  }
  const only = minAnnual != null ? minAnnual : maxAnnual;
  if (only == null) return "Salary not listed";
  return `${n(only)} per year`;
}

// Memoize so identical parsed input ALWAYS yields the identical string
// (guards against hydration mismatch / format flicker between renders).
const formatCache = new Map();

/**
 * Stable display string for a parsed salary. Same input -> same output, always.
 * @param {{ minAnnual: number|null, maxAnnual: number|null, currency: string, hasSalary?: boolean }} parsed
 * @returns {string}
 */
export function formatSalary(parsed) {
  if (!parsed || !parsed.hasSalary || (parsed.minAnnual == null && parsed.maxAnnual == null)) {
    return "Salary not listed";
  }
  const key = `${parsed.currency}|${parsed.minAnnual}|${parsed.maxAnnual}`;
  if (formatCache.has(key)) return formatCache.get(key);

  let out;
  switch (parsed.currency) {
    case "INR": out = formatInr(parsed); break;
    case "USD": out = formatUsd(parsed); break;
    case "EUR": out = formatOther(parsed, "€"); break;
    case "GBP": out = formatOther(parsed, "£"); break;
    default: out = formatOther(parsed, parsed.currency + " ");
  }
  formatCache.set(key, out);
  return out;
}

// Convenience: raw -> display string in one call (parse + format).
export function salaryLabel(raw, hints) {
  return formatSalary(parseSalaryRange(raw, hints));
}

// True when the displayed value was derived by heuristic rather than source metadata,
// so the UI can attach the "estimated from monthly figure" tooltip.
export function isEstimated(parsed) {
  return parsed?.confidence === "estimated";
}
