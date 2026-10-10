// tests/agents.test.mjs — unit tests for the Part 3 agent runtime (run: node --test)
//   lib/agents/json.mjs      — strict JSON extraction + coercion
//   lib/agents/client.mjs    — askJSON (parse -> validate -> retry), injectable caller
//   lib/agents/agents.mjs    — six agents with deterministic fallbacks
//   lib/agents/missions.mjs  — forge-kit / world-plan orchestration + event log
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJson, cleanStringList, clampInt } from "../lib/agents/json.mjs";
import { askJSON } from "../lib/agents/client.mjs";
import { forgeKit, worldPlan } from "../lib/agents/missions.mjs";

const CTX = {
  profile: { name: "Shubham Sharma", topSkills: ["React", "Node.js", "SQL", "JavaScript"], yearsExperience: 3, location: "India" },
  profileText: "Shubham Sharma. React, Node.js, SQL.",
  targetRole: "Full Stack Engineer",
  targetSkills: ["React", "Node.js", "TypeScript", "Docker", "GraphQL"],
  company: "Acme",
};
const NO_AI = async () => ""; // /api/chat returns "" when no key is configured

/* ───────────────────────── json.mjs ───────────────────────── */

test("extractJson parses plain, fenced, prose-wrapped and escaped JSON", () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  assert.deepEqual(extractJson('```json\n{"a":[1,2]}\n```'), { a: [1, 2] });
  assert.deepEqual(extractJson('Sure! Here: {"x":"y"} hope that helps'), { x: "y" });
  assert.deepEqual(extractJson('{"s":"a\\"b"}'), { s: 'a"b' });
  assert.deepEqual(extractJson("noise [1,2,3] noise"), [1, 2, 3]);
});

test("extractJson returns null on garbage / empty (never throws)", () => {
  assert.equal(extractJson("no json here"), null);
  assert.equal(extractJson(""), null);
  assert.equal(extractJson(null), null);
});

test("coercion helpers are defensive", () => {
  assert.deepEqual(cleanStringList(["a", "A", " b ", "", "a"]), ["a", "b"]);
  assert.equal(clampInt("7", 1, 5, 1), 5);
  assert.equal(clampInt(null, 1, 5, 3), 3);
});

/* ───────────────────────── askJSON ───────────────────────── */

test("askJSON returns model data on a valid reply", async () => {
  const r = await askJSON({
    prompt: "p",
    caller: async () => 'here {"roles":[{"title":"SWE","why":"x"}]}',
    validate: (raw) => (raw.roles ? raw : null),
  });
  assert.equal(r.source, "model");
  assert.equal(r.data.roles[0].title, "SWE");
  assert.equal(r.attempts, 1);
});

test("askJSON retries past garbage then succeeds", async () => {
  let n = 0;
  const r = await askJSON({ prompt: "p", retries: 2, caller: async () => (++n < 3 ? "garbage" : '{"ok":true}') });
  assert.equal(r.attempts, 3);
  assert.deepEqual(r.data, { ok: true });
});

test("askJSON gives up cleanly when the model is unavailable", async () => {
  const r = await askJSON({ prompt: "p", retries: 1, caller: NO_AI });
  assert.equal(r.data, null);
  assert.equal(r.attempts, 2);
});

test("askJSON rejects a reply that fails validation and exhausts retries", async () => {
  const r = await askJSON({ prompt: "p", retries: 1, caller: async () => "{}", validate: (o) => (o.roles ? o : null) });
  assert.equal(r.data, null);
});

/* ───────────────────────── worldPlan (fallback) ───────────────────────── */

test("worldPlan runs fully offline via deterministic fallbacks", async () => {
  const out = await worldPlan(CTX, { caller: NO_AI });
  assert.equal(out.mission, "world-plan");
  assert.equal(out.allFallback, true);
  assert.equal(out.usedFallback, true);
  const r = out.result;
  // cartographer used the shared matchFor: React + Node.js + SQL match; the rest are gaps
  assert.ok(r.matched.includes("react"));
  assert.ok(r.matched.includes("node js"));
  const gaps = r.gaps.map((g) => g.skill);
  for (const g of ["typescript", "docker", "graphql"]) assert.ok(gaps.includes(g), `missing gap ${g}`);
  assert.equal(r.plan.steps.length, 3);
  assert.ok(r.narration.bubbles.length >= 2);
  for (const k of ["miner", "scout", "cartographer", "coach", "bard"]) assert.equal(out.sources[k], "fallback");
});

test("worldPlan emits a complete, well-formed event log (every tool call recorded)", () =>
  worldPlan(CTX, { caller: NO_AI }).then((out) => {
    const ev = out.log.events;
    const by = (t) => ev.filter((e) => e.type === t).length;
    assert.equal(by("mission_start"), 1);
    assert.equal(by("mission_end"), 1);
    assert.equal(by("agent_start"), 5);
    assert.equal(by("agent_end"), 5);
    assert.ok(by("tool_call") >= 5);
    assert.ok(ev.some((e) => e.type === "tool_result" && e.fellBack === true));
    assert.ok(ev.every((e) => e.missionId === "world-plan"));
  }));

/* ───────────────────────── forgeKit (fallback) ───────────────────────── */

test("forgeKit drafts a reviewable kit offline and never fabricates a send", async () => {
  const out = await forgeKit(CTX, { caller: NO_AI });
  assert.equal(out.mission, "forge-kit");
  assert.equal(out.allFallback, true);
  const kit = out.result.kit;
  assert.ok(kit.subjectLine.includes("Full Stack Engineer"));
  assert.ok(kit.resumeBullets.length >= 1);
  assert.ok(kit.coverNote.includes("Shubham"));
  assert.ok(kit.coverNote.includes("Acme"));
  // bullets use the resume's own phrasing, not canonical lowercase keys
  assert.ok(kit.resumeBullets[0].includes("React"), `bullet was: ${kit.resumeBullets[0]}`);
  // cartographer ran because targetSkills were supplied
  assert.ok(Array.isArray(out.result.matched));
});

/* ───────────────────────── model path + provenance ───────────────────────── */

const MODEL_CALLER = async (prompt) => {
  if (/MINER/.test(prompt)) return '{"summary":"Backend dev","skills":["Python","SQL"],"yearsExperience":5,"seniority":"mid","location":"Pune"}';
  if (/SCOUT/.test(prompt)) return 'noise {"roles":[{"title":"Data Engineer","why":"fits"}]} more';
  if (/CARTOGRAPHER/.test(prompt)) return '{"matched":["sql"],"gaps":[{"skill":"spark","priority":"high","reason":"needed"}]}';
  if (/COACH/.test(prompt)) return '{"steps":[{"title":"Learn Spark","detail":"build etl","weeks":3},{"title":"SQL deep","detail":"x","weeks":2},{"title":"Apply","detail":"y","weeks":1}]}';
  if (/BARD/.test(prompt)) return '{"headline":"Data Eng plan ready","bubbles":["1 gap to close.","Review before sending."]}';
  return "";
};

test("worldPlan uses model output and records 'model' provenance", async () => {
  const out = await worldPlan(
    { profile: { topSkills: ["Python", "SQL"] }, targetRole: "Data Engineer", targetSkills: ["SQL", "Spark"] },
    { caller: MODEL_CALLER },
  );
  assert.equal(out.usedFallback, false);
  assert.equal(out.sources.miner, "model");
  assert.equal(out.sources.bard, "model");
  assert.equal(out.result.plan.steps[0].title, "Learn Spark");
  assert.equal(out.result.narration.headline, "Data Eng plan ready");
  assert.equal(out.result.skills.length, 2);
});

test("mixed model/fallback is reported honestly (usedFallback true, allFallback false)", async () => {
  const caller = async (prompt) =>
    /MINER/.test(prompt) ? '{"summary":"s","skills":["React"],"yearsExperience":2,"seniority":"entry","location":""}' : "";
  const out = await worldPlan(
    { profile: { topSkills: ["React"] }, targetRole: "Frontend Engineer", targetSkills: ["React", "CSS"] },
    { caller },
  );
  assert.equal(out.sources.miner, "model");
  assert.equal(out.sources.scout, "fallback");
  assert.equal(out.usedFallback, true);
  assert.equal(out.allFallback, false);
});
