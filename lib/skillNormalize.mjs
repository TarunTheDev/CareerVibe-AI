// lib/skillNormalize.js
// PURE helpers: one shared skill normalizer + set-diff, and a hand-written line diff.
// No dependencies, no side effects.

// Small alias map — lowercase keys. Extend conservatively.
export const SKILL_ALIASES = {
  js: "javascript",
  ts: "typescript",
  node: "node.js",
  nodejs: "node.js",
  "node js": "node.js",
  reactjs: "react",
  "react js": "react",
  reactnative: "react native",
  "react native": "react native",
  nextjs: "next.js",
  "next js": "next.js",
  vuejs: "vue",
  "vue js": "vue",
  postgres: "postgresql",
  pg: "postgresql",
  "postgre sql": "postgresql",
  "my sql": "mysql",
  ml: "machine learning",
  ai: "artificial intelligence",
  dl: "deep learning",
  "object oriented programming": "oop",
  "oOP": "oop",
  k8s: "kubernetes",
  gcp: "google cloud",
  "google cloud platform": "google cloud",
  aws: "amazon web services",
};

// Normalize a single skill: lowercase, trim punctuation/whitespace, apply alias map.
export function normalizeSkill(raw) {
  let s = String(raw == null ? "" : raw)
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=`~()"'[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (SKILL_ALIASES[s]) s = SKILL_ALIASES[s];
  return s;
}

// Normalize a list, dedupe by normalized key, keep first display form.
export function normalizeSkillList(list) {
  const map = new Map();
  for (const item of Array.isArray(list) ? list : []) {
    const key = normalizeSkill(item);
    if (key && !map.has(key)) map.set(key, String(item).trim());
  }
  return map;
}

// Is `a` related to `b` (near-match, not equal)? e.g. "sql" vs "mysql".
function related(a, b) {
  if (!a || !b || a === b) return false;
  return a.includes(b) || b.includes(a);
}

// Diff two skill sets. Returns both/onlyA/onlyB and "related" pairs (present in one,
// near-match in the other) so a general term isn't wrongly flagged missing.
export function diffSkills(listA, listB) {
  const A = normalizeSkillList(listA);
  const B = normalizeSkillList(listB);
  const both = [];
  const onlyA = [];
  const onlyB = [];
  const relatedA = []; // in A, near-match in B
  const relatedB = []; // in B, near-match in A

  for (const [key, disp] of A) {
    if (B.has(key)) {
      both.push({ key, display: disp });
    } else {
      const near = [...B.keys()].find((bk) => related(key, bk));
      if (near) relatedA.push({ key, display: disp, relatedTo: near });
      else onlyA.push({ key, display: disp });
    }
  }
  for (const [key, disp] of B) {
    if (!A.has(key)) {
      const near = [...A.keys()].find((ak) => related(key, ak));
      if (near) relatedB.push({ key, display: disp, relatedTo: near });
      else onlyB.push({ key, display: disp });
    }
  }
  return { both, onlyA, onlyB, relatedA, relatedB };
}

// Which requirement terms literally appear in a resume's skills/text (via normalizer).
// Returns per-term status: found | related | absent, with the matching resume line as quote.
export function matchRequirements(requirementTerms, resumeSkillList, resumeText) {
  const have = normalizeSkillList(resumeSkillList);
  const haveKeys = [...have.keys()];
  const textNorm = String(resumeText || "").toLowerCase();
  const lines = String(resumeText || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return requirementTerms.map((term) => {
    const key = normalizeSkill(term);
    if (!key) return { term, status: "absent", quote: "" };
    if (have.has(key)) {
      const line = lines.find((l) => normalizeSkill(l).includes(key)) || "";
      return { term, status: "found", quote: line };
    }
    const near = haveKeys.find((hk) => related(key, hk));
    if (near) return { term, status: "related", relatedTo: near, quote: "" };
    // fall back to literal text presence
    if (textNorm.includes(key)) {
      const line = lines.find((l) => l.toLowerCase().includes(key)) || "";
      return { term, status: "found", quote: line };
    }
    return { term, status: "absent", quote: "" };
  });
}

// Hand-written LCS line diff between A and B. Returns array of {type:'same'|'add'|'del', text}.
export function lineDiff(aText, bText) {
  const a = String(aText || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const b = String(bText || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const n = a.length, m = b.length;
  // DP table (LCS). Guard size to avoid blowups on huge inputs.
  if (n * m > 400000) {
    // Fallback: simple set-based diff for very large inputs.
    const bset = new Set(b), aset = new Set(a);
    return [
      ...a.filter((l) => !bset.has(l)).map((text) => ({ type: "del", text })),
      ...b.filter((l) => !aset.has(l)).map((text) => ({ type: "add", text })),
    ];
  }
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ type: "same", text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: "del", text: a[i] }); i++; }
    else { out.push({ type: "add", text: b[j] }); j++; }
  }
  while (i < n) out.push({ type: "del", text: a[i++] });
  while (j < m) out.push({ type: "add", text: b[j++] });
  return out;
}

// Align the flat lineDiff output into side-by-side rows for a split view.
// Consecutive del/add runs are paired positionally into 'changed' rows so the
// two panes line up; leftovers become pure 'del' (left only) or 'add' (right
// only). Returns [{ type:'same'|'changed'|'del'|'add', left:string|null, right:string|null }].
export function pairLineDiff(aText, bText) {
  const flat = lineDiff(aText, bText);
  const rows = [];
  let run = [];
  const flush = () => {
    if (!run.length) return;
    const dels = run.filter((r) => r.type === "del").map((r) => r.text);
    const adds = run.filter((r) => r.type === "add").map((r) => r.text);
    const len = Math.max(dels.length, adds.length);
    for (let k = 0; k < len; k++) {
      const left = k < dels.length ? dels[k] : null;
      const right = k < adds.length ? adds[k] : null;
      if (left != null && right != null) rows.push({ type: "changed", left, right });
      else if (left != null) rows.push({ type: "del", left, right: null });
      else rows.push({ type: "add", left: null, right });
    }
    run = [];
  };
  for (const item of flat) {
    if (item.type === "same") {
      flush();
      rows.push({ type: "same", left: item.text, right: item.text });
    } else {
      run.push(item);
    }
  }
  flush();
  return rows;
}

// Token-level LCS diff of two lines for intra-line highlighting.
// Returns { a:[{text,changed}], b:[{text,changed}] } where adjacent segments
// with the same `changed` flag are merged. Whitespace is preserved as tokens.
export function wordDiff(aLine, bLine) {
  const at = String(aLine == null ? "" : aLine).split(/(\s+)/).filter((t) => t !== "");
  const bt = String(bLine == null ? "" : bLine).split(/(\s+)/).filter((t) => t !== "");
  const n = at.length, m = bt.length;
  if (n === 0 && m === 0) return { a: [], b: [] };
  if (n * m > 250000) {
    return {
      a: aLine ? [{ text: String(aLine), changed: true }] : [],
      b: bLine ? [{ text: String(bLine), changed: true }] : [],
    };
  }
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = at[i] === bt[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const aSeg = [], bSeg = [];
  const push = (arr, text, changed) => {
    const last = arr[arr.length - 1];
    if (last && last.changed === changed) last.text += text;
    else arr.push({ text, changed });
  };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (at[i] === bt[j]) { push(aSeg, at[i], false); push(bSeg, bt[j], false); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push(aSeg, at[i], true); i++; }
    else { push(bSeg, bt[j], true); j++; }
  }
  while (i < n) push(aSeg, at[i++], true);
  while (j < m) push(bSeg, bt[j++], true);
  return { a: aSeg, b: bSeg };
}
