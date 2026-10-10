// tests/truth.test.mjs — unit tests for the Part 5 truth layer (run: node --test)
//   lib/skills/normalize.mjs  — canonical skills + the ONE shared matchFor()
//   lib/realityScore.mjs      — client-side job trust scoring
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalSkill,
  canonicalSet,
  haveSet,
  matchFor,
  CANONICAL_SKILL_ALIASES,
} from "../lib/skills/normalize.mjs";
import {
  daysAgo,
  realityScore,
  isSuspicious,
  LEVEL_THRESHOLDS,
} from "../lib/realityScore.mjs";

/* ───────────────────────── normalize / matchFor ───────────────────────── */

test("acceptance: 'SQL' on the resume counts for a 'MySQL' requirement", () => {
  const r = matchFor(["SQL"], ["MySQL"]);
  assert.deepEqual(r.matched, ["sql"]);
  assert.deepEqual(r.missing, []);
  assert.equal(r.required, 1);
  assert.equal(r.pct, 100);
});

test("every alias in a family collapses to one required slot (no inflated %)", () => {
  // MySQL + PostgreSQL + SQLite are all "sql" -> required is 1, not 3
  const r = matchFor(["sql"], ["MySQL", "PostgreSQL", "SQLite"]);
  assert.equal(r.required, 1);
  assert.equal(r.matched.length, 1);
  assert.equal(r.pct, 100);
});

test("acceptance: every pct equals round(matched / required * 100)", () => {
  const cases = [
    [["React.js", "Node", "MySQL"], ["react", "node.js", "sql", "terraform"]],
    [[], ["sql", "react"]],
    [["python"], []],
    [["js", "ts", "react"], ["javascript", "angular", "vue"]],
  ];
  for (const [p, j] of cases) {
    const r = matchFor(p, j);
    const expected = r.required === 0 ? 0 : Math.round((r.matched.length / r.required) * 100);
    assert.equal(r.pct, expected, `pct mismatch for ${JSON.stringify(j)}`);
    // matched + missing must account for exactly the deduped requirement count
    assert.equal(r.matched.length + r.missing.length, r.required);
  }
});

test("no required skills -> 0%, never NaN or divide-by-zero", () => {
  const r = matchFor(["react"], []);
  assert.equal(r.required, 0);
  assert.equal(r.pct, 0);
  assert.ok(Number.isFinite(r.pct));
});

test("canonicalSkill is case/punctuation-insensitive and idempotent", () => {
  assert.equal(canonicalSkill("React.js"), canonicalSkill("react JS"));
  assert.equal(canonicalSkill("CI/CD"), canonicalSkill("CICD"));
  assert.equal(canonicalSkill("Node.js"), "node js");
  // idempotent: re-canonicalizing a canonical form is a no-op
  for (const v of Object.values(CANONICAL_SKILL_ALIASES)) {
    const once = canonicalSkill(v);
    assert.equal(canonicalSkill(once), once, `not idempotent: ${v}`);
  }
});

test("C++ survives canonicalization (+ is not stripped)", () => {
  assert.equal(canonicalSkill("C++"), "c++");
  assert.equal(matchFor(["C++"], ["c++"]).pct, 100);
});

test("unknown skills still match themselves exactly", () => {
  assert.equal(matchFor(["Zephyr RTOS"], ["zephyr rtos"]).pct, 100);
  assert.equal(matchFor(["Zephyr RTOS"], ["FreeRTOS"]).pct, 0);
});

test("canonicalSet dedupes and preserves the first display form", () => {
  const set = canonicalSet(["MySQL", "SQL", "React", "react.js"]);
  assert.equal(set.size, 2); // sql, react
  assert.equal(set.get("sql"), "MySQL");
  assert.equal(set.get("react"), "React");
});

test("matchFor is order-independent on both sides", () => {
  const a = matchFor(["sql", "react"], ["react", "sql"]);
  const b = matchFor(["react", "sql"], ["sql", "react"]);
  assert.equal(a.pct, b.pct);
  assert.equal(a.required, b.required);
});

test("combo skill 'HTML/CSS' on the resume satisfies separate HTML and CSS asks", () => {
  const r = matchFor(["HTML/CSS"], ["HTML", "CSS"]);
  assert.deepEqual(r.matched.sort(), ["css", "html"]);
  assert.equal(r.required, 2);
  assert.equal(r.pct, 100);
});

test("combo 'AI/ML' satisfies an 'AI' or 'Machine Learning' requirement", () => {
  assert.equal(matchFor(["AI/ML"], ["Machine Learning"]).pct, 100);
  assert.equal(matchFor(["AI ML"], ["AI"]).pct, 100);
});

test("a combined 'HTML/CSS' requirement is met by having both parts", () => {
  // A job asking for "HTML/CSS" is ONE required slot, satisfied by html + css.
  const r = matchFor(["html", "css"], ["HTML/CSS"]);
  assert.equal(r.required, 1);
  assert.equal(r.pct, 100);
  // but only one of the two parts -> not satisfied
  assert.equal(matchFor(["html"], ["HTML/CSS"]).pct, 0);
  assert.ok(haveSet(["HTML/CSS"]).has("html"));
  assert.ok(canonicalSet(["HTML/CSS"]).has("html css"));
  assert.ok(!canonicalSet(["HTML/CSS"]).has("html"));
});

/* ───────────────────────── realityScore / daysAgo ───────────────────────── */

test("daysAgo parses relative + plural phrases", () => {
  assert.equal(daysAgo("Today"), 0);
  assert.equal(daysAgo("Just posted"), 0);
  assert.equal(daysAgo("Yesterday"), 1);
  assert.equal(daysAgo("3 days ago"), 3);
  assert.equal(daysAgo("2 weeks ago"), 14);
  assert.equal(daysAgo("1 month ago"), 30);
  assert.ok(Math.abs(daysAgo("5 hours ago") - 5 / 24) < 1e-9);
  assert.equal(daysAgo(null), null);
  assert.equal(daysAgo("sometime"), null);
});

const RICH_JOB = {
  title: "Senior React Developer",
  company: "Acme",
  description:
    "We are hiring.\nResponsibilities:\n- Build features\n- Ship code\n- Review PRs\nRequirements: 5+ years React, strong SQL.",
  source: "careers.acme.com",
  applyUrl: "https://careers.acme.com/job/1",
  posted: "Today",
  salaryMin: 120000,
  salaryMax: 180000,
  skills: ["react", "sql"],
};

test("a rich, fresh, direct-source listing scores 'verified'", () => {
  const r = realityScore(RICH_JOB);
  assert.ok(r.score >= LEVEL_THRESHOLDS.verified, `score was ${r.score}`);
  assert.equal(r.level, "verified");
  assert.equal(isSuspicious(RICH_JOB), false);
  assert.ok(r.reasons.length > 0);
});

test("a scam listing with red flags is floored at 0 and flagged suspicious", () => {
  const scam = {
    title: "WORK FROM HOME earn daily",
    company: "???",
    description:
      "Pay registration fee and join our whatsapp group. Instant joining. No experience needed earn 50000 weekly.",
    source: "jooble",
    posted: "90 days ago",
  };
  const r = realityScore(scam);
  assert.equal(r.score, 0);
  assert.equal(r.level, "danger");
  assert.equal(isSuspicious(scam), true);
  assert.ok(r.reasons.some((x) => x.startsWith('Red flag: "registration fee"')));
});

test("a thin listing (no salary, short desc, aggregator) is suspicious", () => {
  const thin = { title: "Dev", company: "X", description: "Short.", source: "adzuna", posted: "10 days ago" };
  const r = realityScore(thin);
  assert.ok(r.score < LEVEL_THRESHOLDS.caution);
  assert.equal(isSuspicious(thin), true);
});

test("score is always clamped to 0..100 and level is derived from the score", () => {
  for (const job of [RICH_JOB, {}, { description: "x".repeat(5000), source: "direct", posted: "Today", skills: ["a"], salary: "1" }]) {
    const r = realityScore(job);
    assert.ok(r.score >= 0 && r.score <= 100, `out of range: ${r.score}`);
    const expectedLevel =
      r.score >= 80 ? "verified" : r.score >= 60 ? "good" : r.score >= 40 ? "caution" : "danger";
    assert.equal(r.level, expectedLevel);
  }
});

test("realityScore is deterministic (same input -> same score)", () => {
  const a = realityScore(RICH_JOB);
  const b = realityScore({ ...RICH_JOB });
  assert.equal(a.score, b.score);
  assert.deepEqual(a.reasons, b.reasons);
});
