// lib/agents/agents.mjs
// The six agents of the CareerVibe runtime. Each is defined declaratively:
// a prompt builder, a strict validator for the model's JSON, and a
// DETERMINISTIC fallback derived only from real input (never invented data).
// run(ctx, log) emits AGENT_START -> TOOL_CALL -> TOOL_RESULT -> AGENT_END so
// Mission Control can show every step, and reports whether the result came
// from the model or the fallback (SOURCE). No agent submits anything anywhere.

import { askJSON } from "./client.mjs";
import { AGENT, EVENT, SOURCE } from "./types.mjs";
import {
  asArray, asNumber, asObject, asString, cleanStringList, clampInt,
} from "./json.mjs";
import { canonicalSkill, matchFor } from "../skills/normalize.mjs";

/* ── small helpers ─────────────────────────────────────────────────────── */

function profileSkills(ctx) {
  const p = asObject(ctx?.profile);
  return cleanStringList(
    [...asArray(p.topSkills), ...asArray(p.skills), ...(ctx?.miner?.skills || [])],
    40,
  );
}

function firstName(ctx) {
  const p = asObject(ctx?.profile);
  const name = asString(p.name || p.fullName || ctx?.userName || "").trim();
  if (!name) return "there";
  return name.split(/\s+/)[0];
}

// Honest, deterministic role suggestion from a primary skill family. Used only
// in the fallback path (no target role supplied) and always labelled as such.
const SKILL_TO_ROLE = {
  react: "Frontend Engineer", "next.js": "Frontend Engineer", javascript: "Frontend Engineer",
  typescript: "Frontend Engineer", angular: "Frontend Engineer", vue: "Frontend Engineer",
  "node.js": "Backend Engineer", python: "Backend Engineer", java: "Backend Engineer",
  spring: "Backend Engineer", go: "Backend Engineer", sql: "Data Analyst",
  "data analysis": "Data Analyst", excel: "Data Analyst", "power bi": "Data Analyst",
  "machine learning": "Machine Learning Engineer", "deep learning": "ML Engineer",
  docker: "DevOps Engineer", kubernetes: "DevOps Engineer", aws: "Cloud Engineer",
  terraform: "DevOps Engineer", figma: "Product Designer", flutter: "Mobile Engineer",
  "react native": "Mobile Engineer", android: "Mobile Engineer", swift: "iOS Engineer",
};

function roleForSkill(skill) {
  return SKILL_TO_ROLE[canonicalSkill(skill)] || null;
}

/* ── the factory ───────────────────────────────────────────────────────── */

function defineAgent({ id, title, maxTokens = 900, retries = 1, prompt, validate, fallback }) {
  return {
    id,
    title,
    /**
     * @param {object} ctx  mission context (profile, targetRole, prior agent output…)
     * @param {object} log  event log from createEventLog()
     * @returns {Promise<{ data: any, source: 'model'|'fallback' }>}
     */
    async run(ctx = {}, log) {
      const emit = log && typeof log.emit === "function" ? (...a) => log.emit(...a) : () => {};
      emit(EVENT.AGENT_START, { agentId: id, label: title });
      const tool = log && typeof log.tool === "function"
        ? log.tool(`${id}: ask /api/chat`)
        : { done: () => {} };

      let data = null;
      let source = SOURCE.FALLBACK;
      try {
        const res = await askJSON({
          prompt: prompt(ctx),
          maxTokens,
          retries,
          validate,
          caller: ctx.__caller, // injectable for tests; defaults to real /api/chat
        });
        if (res.data != null) {
          data = res.data;
          source = res.source;
        }
      } catch {
        data = null;
      }

      if (data == null) {
        data = fallback(ctx);
        source = SOURCE.FALLBACK;
        tool.done({ ok: false, fellBack: true, agentId: id });
        emit(EVENT.LOG, { agentId: id, message: `${title}: model unavailable — used deterministic fallback` });
      } else {
        tool.done({ ok: true, fellBack: false, agentId: id });
      }

      emit(EVENT.AGENT_END, { agentId: id, label: title, source });
      return { data, source };
    },
  };
}

/* ── 1. MINER — extract structured facts from the resume ───────────────── */

export const miner = defineAgent({
  id: AGENT.MINER,
  title: "Miner — read the resume",
  prompt: (ctx) =>
    `You are the MINER agent. From the resume below, extract structured facts.\n` +
    `Return ONLY JSON: {"summary":string,"skills":string[],"yearsExperience":number|null,` +
    `"seniority":"entry"|"mid"|"senior"|"lead","location":string}.\n` +
    `Do not invent anything not present. If unknown use "" / null.\n\nRESUME:\n"""${asString(
      ctx?.profileText || ctx?.profile?.rawText || "",
    ).slice(0, 6000)}"""`,
  validate: (raw) => {
    const o = asObject(raw);
    const skills = cleanStringList(o.skills, 40);
    const sen = ["entry", "mid", "senior", "lead"].includes(o.seniority) ? o.seniority : "";
    const yrs = o.yearsExperience == null ? null : clampInt(o.yearsExperience, 0, 60, 0);
    return {
      summary: asString(o.summary).slice(0, 600),
      skills,
      yearsExperience: yrs,
      seniority: sen,
      location: asString(o.location).slice(0, 120),
    };
  },
  fallback: (ctx) => {
    const p = asObject(ctx?.profile);
    const skills = cleanStringList([...asArray(p.topSkills), ...asArray(p.skills)], 40);
    const yrs = p.yearsExperience == null ? null : clampInt(p.yearsExperience, 0, 60, 0);
    return {
      summary: asString(p.summary || p.headline || p.title || "").slice(0, 600),
      skills,
      yearsExperience: yrs,
      seniority: asString(p.seniority).toLowerCase() || (yrs == null ? "" : yrs >= 8 ? "senior" : yrs >= 3 ? "mid" : "entry"),
      location: asString(p.location || "").slice(0, 120),
    };
  },
});

/* ── 2. SCOUT — frame real target roles ────────────────────────────────── */

export const scout = defineAgent({
  id: AGENT.SCOUT,
  title: "Scout — frame target roles",
  prompt: (ctx) =>
    `You are the SCOUT agent. Given the candidate's skills and (optional) target role, ` +
    `name 1-3 realistic target roles. Return ONLY JSON: ` +
    `{"roles":[{"title":string,"why":string}]}.\n` +
    `SKILLS: ${JSON.stringify(ctx?.miner?.skills || profileSkills(ctx))}\n` +
    `TARGET: ${asString(ctx?.targetRole || "(none given)")}`,
  validate: (raw) => {
    const roles = asArray(asObject(raw).roles)
      .map((r) => ({ title: asString(asObject(r).title).trim(), why: asString(asObject(r).why).trim() }))
      .filter((r) => r.title)
      .slice(0, 3);
    return roles.length ? { roles } : null;
  },
  fallback: (ctx) => {
    const target = asString(ctx?.targetRole).trim();
    if (target) return { roles: [{ title: target, why: "Your stated target role" }] };
    const skills = ctx?.miner?.skills || profileSkills(ctx);
    const seen = new Set();
    const roles = [];
    for (const s of skills) {
      const role = roleForSkill(s);
      if (role && !seen.has(role)) {
        seen.add(role);
        roles.push({ title: role, why: `Builds on your ${s} experience` });
        if (roles.length >= 3) break;
      }
    }
    return { roles };
  },
});

/* ── 3. CARTOGRAPHER — map the skill gaps to a target ──────────────────── */

export const cartographer = defineAgent({
  id: AGENT.CARTOGRAPHER,
  title: "Cartographer — map the gap",
  prompt: (ctx) =>
    `You are the CARTOGRAPHER agent. Compare the candidate's skills to the target role's ` +
    `required skills and list the gaps, highest priority first. Return ONLY JSON: ` +
    `{"matched":string[],"gaps":[{"skill":string,"priority":"high"|"medium"|"low","reason":string}]}.\n` +
    `HAVE: ${JSON.stringify(ctx?.miner?.skills || profileSkills(ctx))}\n` +
    `NEED: ${JSON.stringify(ctx?.targetSkills || [])}\n` +
    `TARGET ROLE: ${asString(ctx?.targetRole || (ctx?.scout?.roles?.[0]?.title ?? ""))}`,
  validate: (raw) => {
    const o = asObject(raw);
    const gaps = asArray(o.gaps)
      .map((g) => {
        const go = asObject(g);
        const pr = ["high", "medium", "low"].includes(go.priority) ? go.priority : "medium";
        return { skill: asString(go.skill).trim(), priority: pr, reason: asString(go.reason).trim() };
      })
      .filter((g) => g.skill)
      .slice(0, 12);
    return { matched: cleanStringList(o.matched, 40), gaps };
  },
  fallback: (ctx) => {
    const have = ctx?.miner?.skills || profileSkills(ctx);
    const need = cleanStringList(ctx?.targetSkills || [], 40);
    const { matched, missing } = matchFor(have, need);
    // Rank missing skills: those that appear in more of the target's phrasing first is
    // unavailable offline, so use a stable priority by canonical order.
    const gaps = missing.map((skill, i) => ({
      skill,
      priority: i === 0 ? "high" : i < 3 ? "medium" : "low",
      reason: `Required for ${asString(ctx?.targetRole || "the target role")} and not on your resume`,
    }));
    return { matched, gaps };
  },
});

/* ── 4. COURIER — draft the application kit (never sends) ──────────────── */

export const courier = defineAgent({
  id: AGENT.COURIER,
  title: "Courier — draft the kit",
  maxTokens: 1200,
  prompt: (ctx) =>
    `You are the COURIER agent. Draft (DO NOT send) an application kit for the target role.\n` +
    `Return ONLY JSON: {"subjectLine":string,"resumeBullets":string[],"coverNote":string}.\n` +
    `resumeBullets: 3-5 tailored, achievement-style bullets grounded ONLY in the candidate's real ` +
    `skills/experience (no fabricated employers, dates, or metrics).\n` +
    `CANDIDATE: ${asString(ctx?.profile?.name || firstName(ctx))}\n` +
    `SKILLS: ${JSON.stringify(ctx?.miner?.skills || profileSkills(ctx))}\n` +
    `MATCHED: ${JSON.stringify(ctx?.cartographer?.matched || [])}\n` +
    `TARGET ROLE: ${asString(ctx?.targetRole || (ctx?.scout?.roles?.[0]?.title ?? ""))}\n` +
    `COMPANY: ${asString(ctx?.company || "(unknown)")}`,
  validate: (raw) => {
    const o = asObject(raw);
    const bullets = cleanStringList(o.resumeBullets, 6);
    const cover = asString(o.coverNote).trim();
    const subject = asString(o.subjectLine).trim();
    if (!bullets.length && !cover && !subject) return null;
    return { subjectLine: subject, resumeBullets: bullets, coverNote: cover.slice(0, 2500) };
  },
  fallback: (ctx) => {
    const role = asString(ctx?.targetRole || ctx?.scout?.roles?.[0]?.title || "this role");
    const company = asString(ctx?.company).trim();
    const skillDisplay = ctx?.miner?.skills || profileSkills(ctx);
    // Prefer the resume's own phrasing for matched skills (canonical -> display).
    const displayFor = new Map(skillDisplay.map((s) => [canonicalSkill(s), s]));
    const matched = cleanStringList(ctx?.cartographer?.matched || [], 8)
      .map((k) => displayFor.get(k) || k);
    const highlight = (matched.length ? matched : skillDisplay).slice(0, 6);
    const name = firstName(ctx);
    const bullets = highlight.slice(0, 4).map(
      (s) => `Applied ${s} to deliver work relevant to the ${role} role`,
    );
    const coverNote =
      `Hi${company ? ` ${company} team` : ""},\n\n` +
      `I'm ${name}, applying for the ${role} position. My strongest relevant skills include ` +
      `${highlight.slice(0, 5).join(", ") || "the core stack for this role"}. ` +
      `I'd welcome the chance to show how I can contribute.\n\nThank you,\n${name}`;
    return {
      subjectLine: `Application — ${role}${company ? ` at ${company}` : ""}`,
      resumeBullets: bullets,
      coverNote,
    };
  },
});

/* ── 5. COACH — turn gaps into a step-by-step plan ─────────────────────── */

export const coach = defineAgent({
  id: AGENT.COACH,
  title: "Coach — build the plan",
  prompt: (ctx) =>
    `You are the COACH agent. Turn the skill gaps into a concrete, ordered 3-step plan.\n` +
    `Return ONLY JSON: {"steps":[{"title":string,"detail":string,"weeks":number}]} (exactly 3 steps).\n` +
    `Do not invent URLs or course names you are unsure of.\n` +
    `GAPS: ${JSON.stringify((ctx?.cartographer?.gaps || []).map((g) => g.skill))}\n` +
    `TARGET ROLE: ${asString(ctx?.targetRole || (ctx?.scout?.roles?.[0]?.title ?? ""))}`,
  validate: (raw) => {
    const steps = asArray(asObject(raw).steps)
      .map((s) => {
        const so = asObject(s);
        return { title: asString(so.title).trim(), detail: asString(so.detail).trim(), weeks: clampInt(so.weeks, 1, 52, 2) };
      })
      .filter((s) => s.title)
      .slice(0, 3);
    return steps.length ? { steps } : null;
  },
  fallback: (ctx) => {
    const gaps = asArray(ctx?.cartographer?.gaps);
    const role = asString(ctx?.targetRole || ctx?.scout?.roles?.[0]?.title || "your target role");
    const top = gaps.slice(0, 3);
    const steps = top.length
      ? top.map((g) => ({
          title: `Close the ${g.skill} gap`,
          detail: asString(g.reason) || `Build one small, real project using ${g.skill} to prove it for the ${role} role.`,
          weeks: g.priority === "high" ? 2 : g.priority === "medium" ? 3 : 4,
        }))
      : [{
          title: `Sharpen your ${role} story`,
          detail: `You already match the core requirements. Tailor one project and your bullets to the ${role} wording.`,
          weeks: 2,
        }];
    while (steps.length < 3) {
      steps.push({ title: `Apply and iterate`, detail: `Send tailored applications and track responses.`, weeks: 1 });
    }
    return { steps: steps.slice(0, 3) };
  },
});

/* ── 6. BARD — the human-facing narrative ──────────────────────────────── */

export const bard = defineAgent({
  id: AGENT.BARD,
  title: "Bard — narrate the result",
  prompt: (ctx) =>
    `You are the BARD agent. Write a short, honest, encouraging narration of what was just built.\n` +
    `Return ONLY JSON: {"headline":string,"bubbles":string[]} (2-4 bubbles, <=140 chars each).\n` +
    `Only reference real numbers given here — do not invent statistics.\n` +
    `TARGET ROLE: ${asString(ctx?.targetRole || (ctx?.scout?.roles?.[0]?.title ?? ""))}\n` +
    `MATCHED: ${asNumber((ctx?.cartographer?.matched || []).length)} skills\n` +
    `GAPS: ${asNumber((ctx?.cartographer?.gaps || []).length)} skills`,
  validate: (raw) => {
    const o = asObject(raw);
    const headline = asString(o.headline).trim().slice(0, 120);
    const bubbles = cleanStringList(o.bubbles, 4).map((b) => b.slice(0, 140));
    if (!headline && !bubbles.length) return null;
    return { headline, bubbles };
  },
  fallback: (ctx) => {
    const role = asString(ctx?.targetRole || ctx?.scout?.roles?.[0]?.title || "your target role");
    const matched = (ctx?.cartographer?.matched || []).length;
    const gaps = (ctx?.cartographer?.gaps || []).length;
    return {
      headline: `Your kit for ${role} is ready`,
      bubbles: [
        `I read your resume and found ${matched} matching skill${matched === 1 ? "" : "s"}.`,
        gaps ? `${gaps} gap${gaps === 1 ? "" : "s"} to close — the plan tackles the top one first.` : `No major gaps — you're aligned already.`,
        `Everything is drafted for you to review. Nothing gets sent without your approval.`,
      ],
    };
  },
});

export const AGENTS = { miner, scout, cartographer, courier, coach, bard };
