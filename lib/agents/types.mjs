// lib/agents/types.mjs
// Shared contracts for the agent runtime: event kinds, agent/mission ids, and
// the append-only event log that lets Mission Control show EVERY tool call.
// Pure and dependency-free so it is unit-testable with no build step.

export const EVENT = Object.freeze({
  MISSION_START: "mission_start",
  MISSION_END: "mission_end",
  AGENT_START: "agent_start",
  AGENT_END: "agent_end",
  TOOL_CALL: "tool_call",   // an AI/API call is about to happen
  TOOL_RESULT: "tool_result", // it returned (ok or fell back)
  LOG: "log",               // human-readable narration
  ERROR: "error",
});

export const AGENT = Object.freeze({
  MINER: "miner",             // extracts structured skills/facts from the resume
  SCOUT: "scout",             // finds/frames real target roles
  CARTOGRAPHER: "cartographer", // maps skill gaps -> a career path
  COURIER: "courier",         // drafts the application kit (resume bullets, cover note)
  COACH: "coach",             // turns the gap map into a step-by-step plan
  BARD: "bard",               // writes the human-facing narrative / speech bubbles
});

export const MISSION = Object.freeze({
  FORGE_KIT: "forge-kit",   // resume -> tailored application kit
  WORLD_PLAN: "world-plan", // resume + target role -> gap map + learning plan
});

// Provenance of a value: was it produced by a live model call or the local
// deterministic fallback? Surfaced in the UI so nothing is passed off as AI
// output when it isn't (mission rule: no simulated agent steps).
export const SOURCE = Object.freeze({
  MODEL: "model",
  FALLBACK: "fallback",
  INPUT: "input",
});

let seq = 0;
function nextId() {
  seq += 1;
  return `e${seq.toString(36)}${Date.now().toString(36)}`;
}

/**
 * Create an append-only event log. Events are the single source of truth for
 * the Mission Control timeline; agents never invent UI state directly.
 */
export function createEventLog(missionId) {
  const events = [];
  return {
    missionId,
    events,
    /** Append an event; returns the stored event. */
    emit(type, fields = {}) {
      const evt = {
        id: nextId(),
        ts: Date.now(),
        missionId,
        type,
        ...fields,
      };
      events.push(evt);
      return evt;
    },
    /** Record a tool call + its outcome as a matched pair. */
    tool(label, fn) {
      const call = this.emit(EVENT.TOOL_CALL, { label, status: "running" });
      return { call, done: (result) => this.emit(EVENT.TOOL_RESULT, { label, callId: call.id, ...result }) };
    },
    clear() {
      events.length = 0;
    },
    /** Plain JSON snapshot (for cv_agent_v1 persistence). */
    serialize() {
      return { missionId, events: events.map((e) => ({ ...e })) };
    },
  };
}

/** Count events of a given type — used by tests and the summary line. */
export function countEvents(log, type) {
  return log.events.filter((e) => e.type === type).length;
}
