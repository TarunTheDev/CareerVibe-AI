// tests/salary.test.mjs — unit tests for lib/salary.mjs (run: node --test)
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSalaryRange, formatSalary, salaryLabel, isEstimated } from "../lib/salary.mjs";

test("21000 + 96000 monthly normalize to ₹2.5–₹11.5 LPA (the reported bug)", () => {
  const parsed = parseSalaryRange({ min: 21000, max: 96000 }, { period: "monthly" });
  assert.equal(parsed.minAnnual, 252000);
  assert.equal(parsed.maxAnnual, 1152000);
  assert.equal(parsed.confidence, "metadata");
  assert.equal(formatSalary(parsed), "₹2.5–₹11.5 LPA");
});

test("the ₹21000L bug is impossible: never a lakh label on a rupee-scale number", () => {
  const parsed = parseSalaryRange({ min: 21000, max: 96000 }, { period: "monthly" });
  const out = formatSalary(parsed);
  assert.ok(!/₹\d{4,}\s?L/.test(out), `bad output: ${out}`);
  assert.ok(!out.includes("21000L"));
});

test("21000 with NO period uses the monthly heuristic and is marked estimated", () => {
  const parsed = parseSalaryRange({ min: 21000 });
  assert.equal(parsed.minAnnual, 252000); // 21000 * 12
  assert.equal(parsed.confidence, "estimated");
  assert.equal(isEstimated(parsed), true);
  assert.equal(formatSalary(parsed), "₹2.5 LPA");
});

test("96000 monthly -> ₹11.5 LPA", () => {
  const parsed = parseSalaryRange(96000, { period: "monthly" });
  assert.equal(parsed.minAnnual, 1152000);
  assert.equal(formatSalary(parsed), "₹11.5 LPA");
});

test("450000 annual stays annual -> ₹4.5 LPA", () => {
  const parsed = parseSalaryRange({ min: 450000, max: 450000 }, { period: "annual" });
  assert.equal(parsed.minAnnual, 450000);
  assert.equal(parsed.confidence, "metadata");
  assert.equal(formatSalary(parsed), "₹4.5 LPA");
});

test("450000 with no period is treated as annual (heuristic), not monthly", () => {
  const parsed = parseSalaryRange({ min: 450000, max: 900000 });
  assert.equal(parsed.minAnnual, 450000);
  assert.equal(parsed.maxAnnual, 900000);
  assert.equal(parsed.confidence, "estimated");
  assert.equal(formatSalary(parsed), "₹4.5–₹9 LPA");
});

test("2500000 annual -> ₹25 LPA", () => {
  const parsed = parseSalaryRange(2500000, { period: "annual" });
  assert.equal(formatSalary(parsed), "₹25 LPA");
});

test("USD annual range formats as $k per year", () => {
  const parsed = parseSalaryRange({ min: 85000, max: 130000 }, { currency: "USD", period: "annual" });
  assert.equal(parsed.currency, "USD");
  assert.equal(formatSalary(parsed), "$85k–$130k per year");
});

test("currency detected from text symbol", () => {
  const parsed = parseSalaryRange("$120,000 - $150,000 per year");
  assert.equal(parsed.currency, "USD");
  assert.equal(parsed.minAnnual, 120000);
  assert.equal(parsed.maxAnnual, 150000);
});

test("lakh text ('12 LPA') is scaled correctly", () => {
  const parsed = parseSalaryRange("8 - 12 LPA");
  assert.equal(parsed.minAnnual, 800000);
  assert.equal(parsed.maxAnnual, 1200000);
  assert.equal(formatSalary(parsed), "₹8–₹12 LPA");
});

test("single bound only renders one value, no fake range", () => {
  const parsed = parseSalaryRange({ max: 2500000 }, { period: "annual" });
  assert.equal(formatSalary(parsed), "₹25 LPA");
});

test("missing / zero salary renders 'Salary not listed'", () => {
  assert.equal(formatSalary(parseSalaryRange(null)), "Salary not listed");
  assert.equal(formatSalary(parseSalaryRange(0)), "Salary not listed");
  assert.equal(formatSalary(parseSalaryRange({ min: 0, max: 0 })), "Salary not listed");
  assert.equal(salaryLabel(undefined), "Salary not listed");
});

test("annual INR below 1 lakh renders per-year, never LPA", () => {
  const parsed = parseSalaryRange({ min: 60000, max: 90000 }, { period: "annual" });
  assert.equal(formatSalary(parsed), "₹60,000–₹90,000 per year");
  assert.ok(!formatSalary(parsed).includes("LPA"));
});

test("deterministic: identical input always yields the identical string", () => {
  const a = formatSalary(parseSalaryRange({ min: 21000, max: 96000 }, { period: "monthly" }));
  const b = formatSalary(parseSalaryRange({ min: 21000, max: 96000 }, { period: "monthly" }));
  assert.equal(a, b);
});

test("periods are never mixed within one displayed range", () => {
  // min given monthly, max already annual-looking -> both normalized before display
  const parsed = parseSalaryRange({ min: 20000, max: 600000 }, { period: "monthly" });
  assert.equal(parsed.minAnnual, 240000);
  assert.equal(parsed.maxAnnual, 7200000);
  assert.ok(parsed.minAnnual < parsed.maxAnnual);
});

test("Indian comma grouping parses ('₹12,00,000 per year' -> ₹12 LPA)", () => {
  const parsed = parseSalaryRange("₹12,00,000 per year");
  assert.equal(parsed.minAnnual, 1200000);
  assert.equal(formatSalary(parsed), "₹12 LPA");
});

test("a monthly string is converted to annual ('₹25,000 per month' -> ₹3 LPA)", () => {
  const parsed = parseSalaryRange("₹25,000 per month");
  assert.equal(parsed.minAnnual, 300000);
  assert.equal(parsed.confidence, "metadata");
  assert.equal(formatSalary(parsed), "₹3 LPA");
});

test("a job object ({salaryMin, salaryMax}) with no period is normalized heuristically", () => {
  const parsed = parseSalaryRange({ salaryMin: 21000, salaryMax: 96000 });
  assert.equal(parsed.minAnnual, 252000);
  assert.equal(parsed.maxAnnual, 1152000);
  assert.equal(parsed.confidence, "estimated");
  assert.equal(formatSalary(parsed), "₹2.5–₹11.5 LPA");
});

