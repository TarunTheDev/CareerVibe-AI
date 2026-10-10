// lib/agents/json.mjs
// PURE strict-JSON helpers for the agent runtime. Model text is untrusted and
// often wrapped in prose or ```json fences; every agent parses through here so
// a chatty reply can never crash a mission. No network, no dependencies.

/**
 * Extract the first balanced JSON value (object or array) from arbitrary text.
 * Handles ```json fences, leading/trailing prose, and escaped quotes inside
 * strings. Returns the parsed value, or null when nothing valid is found.
 */
export function extractJson(text) {
  if (text == null) return null;
  if (typeof text === "object") return text; // already parsed
  let s = String(text).trim();
  if (!s) return null;

  // Strip a single surrounding code fence if present.
  const fence = s.match(/^```(?:json|javascript|js)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();

  // Fast path.
  try {
    return JSON.parse(s);
  } catch {
    /* fall through to scanning */
  }

  // Scan for the first balanced {...} or [...] block, string-aware.
  const start = s.search(/[[{]/);
  if (start === -1) return null;
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        const candidate = s.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// ── Coercion / validation helpers (defensive, never throw) ──────────────────

export function asString(v, fallback = "") {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

export function asNumber(v, fallback = 0) {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}

export function asObject(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

/** Keep only non-empty, trimmed, de-duplicated strings (case-insensitive). */
export function cleanStringList(list, limit = 50) {
  const seen = new Set();
  const out = [];
  for (const item of asArray(list)) {
    const s = asString(item).trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

export function clampInt(n, min, max, fallback = min) {
  const v = Math.round(asNumber(n, fallback));
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}
