// lib/agents/missions.mjs
// Mission orchestrations. A mission runs its agents in a fixed order, threads
// each agent's output into the next agent's context, records every step in the
// event log, and returns a result plus per-agent provenance (model vs fallback).
// Pure orchestration — the only side effect is the caller-supplied /api/chat.

import { createEventLog, EVENT, MISSION, SOURCE } from "./types.mjs";
import { miner, scout, cartographer, courier, coach, bard } from "./agents.mjs";

async function runStep(agent, ctx, log, sources) {
  const { data, source } = await agent.run(ctx, log);
  ctx[agent.id] = data;
  sources[agent.id] = source;
  return data;
}

function finalize(missionId, log, result, sources, startedAt) {
  const usedFallback = Object.values(sources).some((s) => s === SOURCE.FALLBACK);
  const allFallback = Object.values(sources).every((s) => s === SOURCE.FALLBACK);
  log.emit(EVENT.MISSION_END, {
    missionId,
    ok: true,
    usedFallback,
    allFallback,
    ms: Date.now() - startedAt,
  });
  return { mission: missionId, result, sources, log: log.serialize(), usedFallback, allFallback };
}

/**
 * FORGE-KIT: resume -> a tailored application kit the human reviews & approves.
 * Pipeline: miner -> cartographer (if target skills known) -> courier -> bard.
 * @param {object} ctx { profileText, profile, targetRole, company, targetSkills }
 * @param {object} [opts] { log, caller }
 */
export async function forgeKit(ctx = {}, opts = {}) {
  const startedAt = Date.now();
  const missionId = MISSION.FORGE_KIT;
  const log = opts.log || createEventLog(missionId);
  const c = { ...ctx, __caller: opts.caller };
  const sources = {};
  log.emit(EVENT.MISSION_START, { missionId, title: "Forge the application kit" });

  await runStep(miner, c, log, sources);
  if (Array.isArray(c.targetSkills) && c.targetSkills.length) {
    await runStep(cartographer, c, log, sources);
  }
  const kit = await runStep(courier, c, log, sources);
  const narration = await runStep(bard, c, log, sources);

  return finalize(
    missionId,
    log,
    {
      summary: c.miner?.summary || "",
      skills: c.miner?.skills || [],
      matched: c.cartographer?.matched || null,
      kit,
      narration,
    },
    sources,
    startedAt,
  );
}

/**
 * WORLD-PLAN: resume + target role -> gap map + a 3-step plan.
 * Pipeline: miner -> scout -> cartographer -> coach -> bard.
 * @param {object} ctx { profileText, profile, targetRole, targetSkills, jobs }
 * @param {object} [opts] { log, caller }
 */
export async function worldPlan(ctx = {}, opts = {}) {
  const startedAt = Date.now();
  const missionId = MISSION.WORLD_PLAN;
  const log = opts.log || createEventLog(missionId);
  const c = { ...ctx, __caller: opts.caller };
  const sources = {};
  log.emit(EVENT.MISSION_START, { missionId, title: "Chart the world plan" });

  await runStep(miner, c, log, sources);
  await runStep(scout, c, log, sources);
  // If no explicit target skills, adopt the first scouted role's title as the target.
  if (!c.targetRole && c.scout?.roles?.[0]?.title) c.targetRole = c.scout.roles[0].title;
  await runStep(cartographer, c, log, sources);
  const plan = await runStep(coach, c, log, sources);
  const narration = await runStep(bard, c, log, sources);

  return finalize(
    missionId,
    log,
    {
      summary: c.miner?.summary || "",
      skills: c.miner?.skills || [],
      roles: c.scout?.roles || [],
      targetRole: c.targetRole || null,
      matched: c.cartographer?.matched || [],
      gaps: c.cartographer?.gaps || [],
      plan,
      narration,
    },
    sources,
    startedAt,
  );
}

export const MISSIONS = { [MISSION.FORGE_KIT]: forgeKit, [MISSION.WORLD_PLAN]: worldPlan };
