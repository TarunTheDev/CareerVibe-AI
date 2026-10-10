// tests/career-craft.test.mjs — pure-function unit tests (run: node --test)
import { test } from "node:test";
import assert from "node:assert/strict";
import { runResumeChecks, quoteIsInSource, ACTION_VERBS } from "../lib/resumeChecks.mjs";
import {
  normalizeSkill,
  diffSkills,
  matchRequirements,
  lineDiff,
} from "../lib/skillNormalize.mjs";

const GOOD = [
  "Jane Doe",
  "jane@example.com | +1 555 123 4567 | linkedin.com/in/janedoe",
  "Summary: Frontend engineer focused on React.",
  "Skills: React, JavaScript, CSS",
  "Experience",
  "- Built a dashboard that cut load time 40%",
  "- Led a team of 4 to ship the checkout redesign",
  "- Increased conversion 12% with A/B tests",
  "Education: B.Tech, Example University",
].join("\n");

const BAD = [
  "john@x",
  "Responsible for working on stuff",
  "- I was a hardworking team player",
  "- helped with the project",
  "- worked on things",
  "Responsible for working on stuff",
].join("\n");

test("runResumeChecks returns checks + summary with correct shape", () => {
  const { checks, summary } = runResumeChecks(GOOD);
  assert.ok(Array.isArray(checks) && checks.length >= 5);
  assert.equal(summary.total, checks.length);
  assert.equal(summary.passed, checks.filter((c) => c.status === "pass").length);
  for (const c of checks) {
    assert.ok(["pass", "warn", "fail"].includes(c.status), `bad status ${c.status}`);
    assert.ok(Array.isArray(c.quotes));
    assert.ok(typeof c.label === "string" && c.label.length);
  }
});

test("a strong resume passes sections + contact; length is pass or warn", () => {
  const { checks } = runResumeChecks(GOOD);
  const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
  assert.equal(byId.sections.status, "pass");
  assert.equal(byId.contact.status, "pass");
  assert.ok(["pass", "warn"].includes(byId.length.status));
});

test("bullets without numbers are flagged with the exact offending lines", () => {
  const text = [
    "Skills: React",
    "- Built a widget",
    "- Led a project",
    "- Shipped a feature",
  ].join("\n");
  const { checks } = runResumeChecks(text);
  const bullets = checks.find((c) => c.id === "bullets");
  assert.ok(bullets.status === "warn" || bullets.status === "fail");
  // metric share is 0% -> offending (no-metric) lines are quoted
  assert.ok(bullets.quotes.some((q) => /Built a widget/i.test(q)));
});

test("weak phrases and first-person are quoted exactly from the source", () => {
  const { checks } = runResumeChecks(BAD);
  const weak = checks.find((c) => c.id === "weak-phrases");
  const fp = checks.find((c) => c.id === "first-person");
  assert.ok(weak.status !== "pass");
  assert.ok(weak.quotes.some((q) => /responsible for/i.test(q)));
  assert.ok(fp.quotes.some((q) => /\bI\b|team player|hardworking/i.test(q)));
  for (const q of [...weak.quotes, ...fp.quotes]) {
    assert.ok(quoteIsInSource(q, BAD), `quote not in source: ${q}`);
  }
});

test("duplicate lines are detected", () => {
  const { checks } = runResumeChecks(BAD);
  const dup = checks.find((c) => c.id === "duplicates");
  assert.ok(dup.status !== "pass");
});

test("empty input never throws and reports fails", () => {
  const { checks, summary } = runResumeChecks("");
  assert.ok(checks.length >= 5);
  assert.ok(summary.passed < summary.total);
});

test("quoteIsInSource normalizes whitespace + case", () => {
  assert.ok(quoteIsInSource("Built   a DASHBOARD", "we built a dashboard last quarter"));
  assert.ok(!quoteIsInSource("built a rocket", "we built a dashboard"));
});

test("ACTION_VERBS list is populated", () => {
  assert.ok(ACTION_VERBS.length > 20);
});

// ── skillNormalize ──────────────────────────────────────────────────────────
test("normalizeSkill applies alias map + punctuation trim", () => {
  assert.equal(normalizeSkill("JS"), "javascript");
  assert.equal(normalizeSkill("react.js"), "react");
  assert.equal(normalizeSkill("Postgres"), "postgresql");
  assert.equal(normalizeSkill("Node"), "node.js");
  assert.equal(normalizeSkill("ML"), "machine learning");
});

test("diffSkills classifies both/only/related", () => {
  const d = diffSkills(["React", "SQL", "Git"], ["React", "MySQL", "Docker"]);
  assert.ok(d.both.some((x) => x.key === "react"));
  assert.ok(d.onlyA.some((x) => x.key === "git"));
  assert.ok(d.onlyB.some((x) => x.key === "docker"));
  // SQL vs MySQL -> related, not a hard miss
  assert.ok(d.relatedA.some((x) => x.key === "sql" && /mysql/.test(x.relatedTo)));
});

test("matchRequirements reports found/related/absent with a real quote", () => {
  const resumeText = ["React developer", "- Built dashboards with React and Redux"].join("\n");
  const res = matchRequirements(["React", "Vue", "Redux"], ["React"], resumeText);
  const byTerm = Object.fromEntries(res.map((r) => [r.term, r]));
  assert.equal(byTerm.React.status, "found");
  assert.ok(/React/.test(byTerm.React.quote));
  assert.equal(byTerm.Vue.status, "absent");
  assert.equal(byTerm.Redux.status, "found");
});

test("lineDiff marks added and removed lines", () => {
  const a = "line1\nline2\nline3";
  const b = "line1\nchanged\nline3";
  const d = lineDiff(a, b);
  assert.ok(d.some((x) => x.type === "same" && x.text === "line1"));
  assert.ok(d.some((x) => x.type === "del" && x.text === "line2"));
  assert.ok(d.some((x) => x.type === "add" && x.text === "changed"));
});
