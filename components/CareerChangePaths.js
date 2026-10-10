"use client";

import { useState, useEffect, useMemo } from "react";
import { formatSalary, parseSalaryRange } from "@/lib/salary.mjs";
import { getUserJSON, setUserJSON } from "@/lib/userStorage";
import {
  GraduationCap,
  Upload,
  Target,
  Loader2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Star,
  ChevronRight,
  ExternalLink,
  TrendingUp,
  Check,
  Flag,
  Trophy,
  RotateCcw,
} from "lucide-react";

// Transparent weighting used to split the remaining match headroom across the
// gaps the model returned. These weights are a UI heuristic — NOT invented
// external statistics — and every "+X%" shown is derived only from the model's
// own currentMatch + the priority it assigned to each gap.
const PRIORITY_WEIGHT = { Essential: 3, Important: 2, "Nice-to-have": 1 };

function normalizeRole(title) {
  return String(title || "").trim().toLowerCase().replace(/\s+/g, "-");
}

export default function CareerChangePaths({ T, isDark, profile, uid, onGoUpload }) {
  const [dreamJob, setDreamJob] = useState("");
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // { skills: { [skillName]: true }, steps: { [index]: true } } for the active role
  const [progress, setProgress] = useState({ skills: {}, steps: {} });

  const analyze = async (title = dreamJob) => {
    const query = title?.trim();
    if (!query || !profile) return;
    setLoading(true);
    setError("");
    setGapAnalysis(null);
    try {
      const res = await fetch("/api/dream-job-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamJob: query, profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze path");
      setGapAnalysis(data.analysis);
    } catch (e) {
      console.error(e);
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const roleKey = normalizeRole(gapAnalysis?.dreamJobTitle);

  // Load saved progress for the active role whenever the analysis changes.
  useEffect(() => {
    if (!roleKey) {
      setProgress({ skills: {}, steps: {} });
      return;
    }
    const all = (uid && getUserJSON(uid, "career_progress", {})) || {};
    const saved = all[roleKey];
    setProgress(
      saved && typeof saved === "object"
        ? { skills: saved.skills || {}, steps: saved.steps || {} }
        : { skills: {}, steps: {} },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleKey, uid]);

  // Persist progress (per user, per role).
  useEffect(() => {
    if (!uid || !roleKey) return;
    const all = getUserJSON(uid, "career_progress", {}) || {};
    all[roleKey] = progress;
    setUserJSON(uid, "career_progress", all);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, uid, roleKey]);

  const toggleSkill = (skill) =>
    setProgress((p) => ({
      ...p,
      skills: { ...p.skills, [skill]: !p.skills[skill] },
    }));

  const toggleStep = (idx) =>
    setProgress((p) => ({
      ...p,
      steps: { ...p.steps, [idx]: !p.steps[idx] },
    }));

  const resetProgress = () => setProgress({ skills: {}, steps: {} });

  // Order gaps by match impact (highest first). Impact is the share of the
  // remaining headroom (100 - currentMatch) attributed to each gap by priority.
  const orderedGaps = useMemo(() => {
    const gaps = gapAnalysis?.skillGaps || [];
    const headroom = Math.max(0, 100 - (gapAnalysis?.currentMatch || 0));
    const weighted = gaps.map((g) => ({
      ...g,
      weight: PRIORITY_WEIGHT[g.priority] ?? 1,
    }));
    const totalW = weighted.reduce((s, g) => s + g.weight, 0) || 1;
    return weighted
      .map((g) => ({ ...g, impact: Math.round((headroom * g.weight) / totalW) }))
      .sort((a, b) => b.impact - a.impact || b.weight - a.weight);
  }, [gapAnalysis]);

  // Group ordered gaps into stepped phases for the roadmap visualization.
  const roadmapPhases = useMemo(() => {
    const order = ["Essential", "Important", "Nice-to-have"];
    const labels = {
      Essential: "Foundations",
      Important: "Core Skills",
      "Nice-to-have": "Specialization",
    };
    const phases = [];
    order.forEach((p) => {
      const skills = orderedGaps.filter((g) => (g.priority || "Nice-to-have") === p);
      if (skills.length)
        phases.push({ key: p, label: labels[p] || p, skills });
    });
    const rest = orderedGaps.filter((g) => !order.includes(g.priority));
    if (rest.length) phases.push({ key: "other", label: "Extras", skills: rest });
    return phases.map((ph, i) => ({ ...ph, index: i + 1 }));
  }, [orderedGaps]);

  const totalMilestones =
    orderedGaps.length + (gapAnalysis?.nextSteps?.length || 0);
  const doneSkills = orderedGaps.filter((g) => progress.skills[g.skill]).length;
  const doneSteps = (gapAnalysis?.nextSteps || []).filter(
    (_, i) => progress.steps[i],
  ).length;
  const doneMilestones = doneSkills + doneSteps;
  const completionPct = totalMilestones
    ? Math.round((doneMilestones / totalMilestones) * 100)
    : 0;

  // Live "what-if": projected match if the user checks off the listed skills.
  const projectedMatch = useMemo(() => {
    const base = gapAnalysis?.currentMatch || 0;
    const gained = orderedGaps.reduce(
      (s, g) => (progress.skills[g.skill] ? s + g.impact : s),
      0,
    );
    return Math.min(100, base + gained);
  }, [gapAnalysis, orderedGaps, progress.skills]);

  const getRecommendedPaths = () => {
    if (!profile) return [];
    const domain = profile.domain || "tech_engineering";
    const title = profile.jobTitles?.[0] || "Professional";

    // Simple custom recommendation rules
    if (domain.includes("tech") || domain.includes("engineer")) {
      return [
        `Senior ${title}`,
        "Solutions Architect",
        "Technical Product Manager",
      ];
    } else if (domain.includes("business") || domain.includes("operation")) {
      return [
        `Operations Director`,
        "Product Manager",
        "Business Consultant",
      ];
    } else if (domain.includes("sale") || domain.includes("marketing")) {
      return [
        "Growth Marketing Director",
        "Head of Sales",
        "Marketing Analytics Manager",
      ];
    } else {
      return [
        `Lead ${title}`,
        "Project Manager",
        "Operations Specialist",
      ];
    }
  };

  // Reusable 44px accessible checkbox toggle. Rendered as a plain function
  // (not a nested component) so the DOM node stays stable across re-renders
  // and keyboard focus is not lost when a box is toggled.
  const milestoneCheck = ({ checked, onChange, label }) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      title={checked ? "Mark as not done" : "Mark as done"}
      onClick={onChange}
      style={{
        minWidth: 44,
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `2px solid ${checked ? T.accent : T.border}`,
          background: checked ? T.accent : T.bg3,
          color: checked ? (T.onAccent || "#fff") : "transparent",
          transition: "background 0.15s, border-color 0.15s",
        }}
      >
        <Check size={15} strokeWidth={3} />
      </span>
    </button>
  );

  const ringR = 26;
  const ringC = 2 * Math.PI * ringR;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "1.5rem 1.5rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.5rem",
            marginBottom: "0.375rem",
            color: T.text,
          }}
        >
          Career Path Simulator & Gap Analysis
        </h2>
        <p
          style={{
            color: T.text2,
            fontSize: "0.875rem",
            lineHeight: 1.5,
          }}
        >
          Explore transition pathways to target roles. Enter a dream job title to get an automated skill gap analysis, a personalized learning roadmap, and immediate next steps.
        </p>
      </div>

      {!profile ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: T.bg2,
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.05)",
          }}
        >
          <GraduationCap
            size={48}
            style={{ marginBottom: "1.25rem", color: T.text3 }}
          />
          <p style={{ fontWeight: 700, fontSize: "1.0625rem", marginBottom: "0.5rem" }}>
            Upload your resume to begin
          </p>
          <p
            style={{
              color: T.text2,
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
            }}
          >
            We need your current skills and experience profile to generate a customized transition roadmap.
          </p>
          <button
            className="btn-primary"
            style={{ background: T.accent, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            onClick={onGoUpload}
          >
            <Upload size={14} /> Upload Resume
          </button>
        </div>
      ) : (
        <>
          {/* Transition Finder */}
          <div
            style={{
              background: T.bg2,
              borderRadius: 16,
              border: `1px solid ${T.border}`,
              padding: "1.5rem",
              marginBottom: "1.5rem",
              boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.02)",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontWeight: 600,
                fontSize: "0.9375rem",
                marginBottom: "0.75rem",
                color: T.text,
              }}
            >
              <Target size={16} color={T.accent} /> What is your target or dream role?
            </label>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
              <input
                value={dreamJob}
                onChange={(e) => setDreamJob(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="e.g. Solutions Architect, Product Manager, Technical Lead, Data Scientist..."
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  background: T.bg3,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  color: T.text,
                  fontSize: "0.875rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = T.accent}
                onBlur={(e) => e.target.style.borderColor = T.border}
              />
              <button
                className="btn-primary"
                style={{ background: T.accent, flexShrink: 0, padding: "0 1.25rem" }}
                onClick={() => analyze()}
                disabled={loading || !dreamJob.trim()}
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin-slow" />
                ) : (
                  <Sparkles size={15} />
                )}
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </div>

            {/* Recommendations */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", color: T.text3, fontWeight: 500 }}>Recommended for you:</span>
              {getRecommendedPaths().map((path) => (
                <button
                  key={path}
                  onClick={() => {
                    setDreamJob(path);
                    analyze(path);
                  }}
                  style={{
                    padding: "0.25rem 0.625rem",
                    borderRadius: 50,
                    fontSize: "0.75rem",
                    border: `1px solid ${T.border}`,
                    background: T.bg3,
                    color: T.text2,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = T.accent;
                    e.currentTarget.style.color = T.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.color = T.text2;
                  }}
                >
                  {path}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#EF4444",
              borderRadius: 12,
              padding: "1rem",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Current profile skills */}
          {!gapAnalysis && !loading && (
            <div
              style={{
                background: T.bg2,
                borderRadius: 16,
                border: `1px solid ${T.border}`,
                padding: "1.5rem",
                boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  marginBottom: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: T.text,
                }}
              >
                <CheckCircle size={16} color={T.accent} /> Your Base Skills Inventory
              </div>
              <p style={{ fontSize: "0.8125rem", color: T.text2, marginBottom: "1rem" }}>
                These are the skills extracted from your resume used as a baseline for gap calculations.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {profile.topSkills?.map((s) => (
                  <span
                    key={s}
                    style={{
                      padding: "0.3rem 0.75rem",
                      borderRadius: 50,
                      background: T.accentDim,
                      color: T.accent,
                      fontSize: "0.75rem",
                      border: `1px solid ${T.borderA}`,
                      fontWeight: 500,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Gap results */}
          {gapAnalysis && (
            <div className="animate-fade-in">
              {/* Summary card */}
              <div
                style={{
                  background: isDark
                    ? "linear-gradient(135deg, #0F1520, #141E2E)"
                    : "linear-gradient(135deg, #FAF7F2, #F0EBE3)",
                  borderRadius: 16,
                  border: `1px solid ${T.borderA}`,
                  padding: "1.5rem",
                  marginBottom: "1.25rem",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>Target Career Path</span>
                    <h3
                      style={{
                        fontWeight: 800,
                        fontSize: "1.375rem",
                        fontFamily: "'Space Grotesk', sans-serif",
                        marginTop: "0.25rem",
                        color: T.text,
                      }}
                    >
                      {gapAnalysis.dreamJobTitle}
                    </h3>
                  </div>
                  <div style={{
                    textAlign: "right",
                    background: "rgba(0, 0, 0, 0.2)",
                    padding: "0.5rem 1rem",
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                  }}>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800, color: T.accent, fontFamily: "'Space Grotesk', sans-serif" }}>
                      {gapAnalysis.currentMatch}%
                    </span>
                    <div style={{ fontSize: "0.625rem", color: T.text2, fontWeight: 600 }}>Match Score</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    marginTop: "1.25rem",
                    color: T.text2,
                    fontSize: "0.8125rem",
                    flexWrap: "wrap",
                    borderTop: `1px solid ${T.border}`,
                    paddingTop: "1rem",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <Clock size={13} color={T.text3} /> {gapAnalysis.timeline} transition
                  </span>
                  <span style={{
                    display: "flex", alignItems: "center", gap: "0.375rem",
                    color: gapAnalysis.demandLevel?.toLowerCase() === "high" ? T.accent : T.gold,
                    fontWeight: 600
                  }}>
                    <TrendingUp size={13} /> {gapAnalysis.demandLevel} Demand
                  </span>
                  {gapAnalysis.salaryRange && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <DollarSign size={13} color={T.text3} /> 
                      Est. {formatSalary(parseSalaryRange(gapAnalysis.salaryRange, { currency: "USD", period: "annual" }))}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress tracker + projected score */}
              <div
                style={{
                  background: T.bg2,
                  borderRadius: 16,
                  border: `1px solid ${T.border}`,
                  padding: "1.25rem 1.5rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem",
                  flexWrap: "wrap",
                  boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.02)",
                }}
              >
                <svg
                  width="68"
                  height="68"
                  viewBox="0 0 68 68"
                  role="img"
                  aria-label={`${completionPct}% of milestones complete`}
                  style={{ flexShrink: 0 }}
                >
                  <circle cx="34" cy="34" r={ringR} fill="none" stroke={T.border} strokeWidth="7" />
                  <circle
                    cx="34"
                    cy="34"
                    r={ringR}
                    fill="none"
                    stroke={completionPct === 100 ? T.accent2 || T.accent : T.accent}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={ringC}
                    strokeDashoffset={ringC * (1 - completionPct / 100)}
                    transform="rotate(-90 34 34)"
                    style={{ transition: "stroke-dashoffset 0.4s ease" }}
                  />
                  <text
                    x="34"
                    y="39"
                    textAnchor="middle"
                    fontSize="16"
                    fontWeight="800"
                    fill={T.text}
                    fontFamily="'Space Grotesk', sans-serif"
                  >
                    {completionPct}%
                  </text>
                </svg>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.9375rem", color: T.text }}>
                    {completionPct === 100 ? (
                      <Trophy size={16} color={T.gold} />
                    ) : (
                      <Flag size={16} color={T.accent} />
                    )}
                    {completionPct === 100
                      ? "Roadmap complete — nice work!"
                      : doneMilestones > 0
                        ? "Pick up where you left off"
                        : "Track your progress"}
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: T.text2, marginTop: "0.25rem", lineHeight: 1.5 }}>
                    {doneMilestones} of {totalMilestones} milestones done
                    {doneSkills > 0 && orderedGaps.length > 0
                      ? ` · ${doneSkills}/${orderedGaps.length} skills`
                      : ""}
                    . Your progress is saved to this account.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginTop: "0.625rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        padding: "0.3rem 0.75rem",
                        borderRadius: 50,
                        background: T.accentDim,
                        border: `1px solid ${T.borderA}`,
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        color: T.accent,
                      }}
                    >
                      <TrendingUp size={13} />
                      Projected match {projectedMatch}%
                    </span>
                    {projectedMatch > (gapAnalysis.currentMatch || 0) && (
                      <span style={{ fontSize: "0.75rem", color: T.text3 }}>
                        +{projectedMatch - (gapAnalysis.currentMatch || 0)}% as you tick off skills
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.6875rem", color: T.text3, marginTop: "0.5rem", lineHeight: 1.4 }}>
                    Projected match is an estimate: each gap&apos;s +X% is its share of the
                    remaining {Math.max(0, 100 - (gapAnalysis.currentMatch || 0))} points, weighted by priority.
                  </p>
                </div>

                {doneMilestones > 0 && (
                  <button
                    type="button"
                    onClick={resetProgress}
                    aria-label="Reset progress for this role"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      minHeight: 44,
                      padding: "0 0.875rem",
                      borderRadius: 10,
                      border: `1px solid ${T.border}`,
                      background: T.bg3,
                      color: T.text2,
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                )}
              </div>

              {/* Visual roadmap — stepped milestone path */}
              {roadmapPhases.length > 0 && (
                <div
                  style={{
                    background: T.bg2,
                    borderRadius: 16,
                    border: `1px solid ${T.border}`,
                    padding: "1.25rem 1.5rem",
                    marginBottom: "1.25rem",
                    boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: T.text,
                    }}
                  >
                    <Target size={15} color={T.accent} /> Your Roadmap
                    <span style={{ fontSize: "0.75rem", fontWeight: 500, color: T.text3, marginLeft: "auto" }}>
                      {gapAnalysis.timeline}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {roadmapPhases.map((phase, pi) => {
                      const done = phase.skills.filter((s) => progress.skills[s.skill]).length;
                      const complete = done === phase.skills.length;
                      return (
                        <div
                          key={phase.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            flex: "1 1 160px",
                            minWidth: 150,
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              borderRadius: 12,
                              border: `1.5px solid ${complete ? T.accent : T.border}`,
                              background: complete ? T.accentDim : T.bg3,
                              padding: "0.75rem 0.875rem",
                              transition: "background 0.2s, border-color 0.2s",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
                              <span
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  background: complete ? T.accent : T.border,
                                  color: complete ? (T.onAccent || "#fff") : T.text2,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.6875rem",
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                {complete ? <Check size={12} strokeWidth={3} /> : phase.index}
                              </span>
                              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: T.text }}>
                                {phase.label}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.6875rem", color: T.text2, lineHeight: 1.4 }}>
                              {done}/{phase.skills.length} skills
                              {phase.skills.slice(0, 3).map((s) => (
                                <div
                                  key={s.skill}
                                  style={{
                                    marginTop: "0.25rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                    color: progress.skills[s.skill] ? T.text3 : T.text2,
                                    textDecoration: progress.skills[s.skill] ? "line-through" : "none",
                                  }}
                                >
                                  <span style={{ opacity: 0.6 }}>•</span> {s.skill}
                                </div>
                              ))}
                              {phase.skills.length > 3 && (
                                <div style={{ marginTop: "0.25rem", opacity: 0.7 }}>
                                  +{phase.skills.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                          {pi < roadmapPhases.length - 1 && (
                            <ChevronRight size={18} color={T.text3} style={{ flexShrink: 0 }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {gapAnalysis.strengths?.length > 0 && (
                <div
                  style={{
                    background: T.bg2,
                    borderRadius: 16,
                    border: `1px solid ${T.border}`,
                    padding: "1.25rem 1.5rem",
                    marginBottom: "1.25rem",
                    boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      marginBottom: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: T.text,
                    }}
                  >
                    <Star size={15} color={T.gold} /> Your Transferable Strengths
                  </div>
                  <p style={{ fontSize: "0.75rem", color: T.text2, marginBottom: "0.75rem" }}>
                    Great! You already have these key skills matching the target role profile:
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.375rem",
                    }}
                  >
                    {gapAnalysis.strengths.map((s) => (
                      <span
                        key={s}
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: 999,
                          background: T.accent2,
                          color: "#17150F",
                          fontSize: "0.75rem",
                          border: `1px solid ${T.border}`,
                          fontWeight: 700,
                        }}
                      >
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill gaps & learning resources — ordered by match impact */}
              {orderedGaps.length > 0 && (
                <div
                  style={{
                    background: T.bg2,
                    borderRadius: 16,
                    border: `1px solid ${T.border}`,
                    padding: "1.25rem 1.5rem",
                    marginBottom: "1.25rem",
                    boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      marginBottom: "0.375rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: T.text,
                    }}
                  >
                    <AlertCircle size={15} color={T.gold} /> Required Gaps & Learning Roadmap
                  </div>
                  <p style={{ fontSize: "0.75rem", color: T.text3, marginBottom: "1rem" }}>
                    Sorted by match impact — tick a skill off as you learn it to update your projected score.
                  </p>
                  {orderedGaps.map((gap, i) => {
                    const done = !!progress.skills[gap.skill];
                    return (
                      <div
                        key={gap.skill}
                        style={{
                          marginBottom: "1.125rem",
                          paddingBottom: "1.125rem",
                          borderBottom:
                            i < orderedGaps.length - 1
                              ? `1px solid ${T.border}`
                              : "none",
                          opacity: done ? 0.6 : 1,
                          transition: "opacity 0.2s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.625rem",
                            flexWrap: "wrap",
                          }}
                        >
                          {milestoneCheck({
                            checked: done,
                            onChange: () => toggleSkill(gap.skill),
                            label: `Mark ${gap.skill} as ${done ? "not done" : "done"}`,
                          })}
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "0.875rem",
                              color: T.text,
                              textDecoration: done ? "line-through" : "none",
                            }}
                          >
                            {gap.skill}
                          </span>
                          {gap.impact > 0 && (
                            <span
                              title="Estimated match gain from learning this skill"
                              style={{
                                fontSize: "0.6875rem",
                                padding: "0.125rem 0.5rem",
                                borderRadius: 50,
                                fontWeight: 700,
                                background: T.accentDim,
                                color: T.accent,
                                border: `1px solid ${T.borderA}`,
                              }}
                            >
                              +{gap.impact}% match
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              padding: "0.125rem 0.5rem",
                              borderRadius: 50,
                              fontWeight: 600,
                              background:
                                gap.priority === "Essential"
                                  ? "rgba(239,68,68,0.1)"
                                  : gap.priority === "Important"
                                    ? "rgba(245,158,11,0.1)"
                                    : T.accentDim,
                              color:
                                gap.priority === "Essential"
                                  ? "#EF4444"
                                  : gap.priority === "Important"
                                    ? T.gold
                                    : T.accent,
                              border: `1px solid ${
                                gap.priority === "Essential"
                                  ? "rgba(239,68,68,0.2)"
                                  : gap.priority === "Important"
                                    ? "rgba(245,158,11,0.2)"
                                    : T.borderA
                              }`
                            }}
                          >
                            {gap.priority}
                          </span>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              color: T.text2,
                              marginLeft: "auto",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <Clock size={10} />
                            {gap.timeToLearn}
                          </span>
                        </div>

                        {gap.resources?.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.5rem",
                              marginTop: "0.5rem",
                              paddingLeft: "2.75rem",
                            }}
                          >
                            {gap.resources.map((res, ri) => (
                              <a
                                key={ri}
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.375rem",
                                  padding: "0.3rem 0.75rem",
                                  borderRadius: 50,
                                  fontSize: "0.75rem",
                                  background: T.bg3,
                                  border: `1px solid ${T.border}`,
                                  color: T.text2,
                                  textDecoration: "none",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = T.accent;
                                  e.currentTarget.style.color = T.text;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = T.border;
                                  e.currentTarget.style.color = T.text2;
                                }}
                              >
                                {res.free && (
                                  <span
                                    style={{
                                      color: T.accent,
                                      fontSize: "0.625rem",
                                      fontWeight: 700,
                                      background: T.accentDim,
                                      padding: "0.05rem 0.25rem",
                                      borderRadius: 4
                                    }}
                                  >
                                    FREE
                                  </span>
                                )}
                                <span>{res.name}</span>
                                <ExternalLink size={9} />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Next steps — checkable action plan */}
              {gapAnalysis.nextSteps?.length > 0 && (
                <div
                  style={{
                    background: T.bg2,
                    borderRadius: 16,
                    border: `1px solid ${T.border}`,
                    padding: "1.25rem 1.5rem",
                    boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      marginBottom: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: T.text,
                    }}
                  >
                    <ChevronRight size={15} color={T.accent2 || T.accent} /> Immediate Action Plan
                  </div>
                  {gapAnalysis.nextSteps.map((step, i) => {
                    const done = !!progress.steps[i];
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.375rem",
                          marginBottom: "0.375rem",
                          fontSize: "0.8125rem",
                          color: done ? T.text3 : T.text2,
                          lineHeight: 1.5,
                        }}
                      >
                        {milestoneCheck({
                          checked: done,
                          onChange: () => toggleStep(i),
                          label: `Mark action "${step}" as ${done ? "not done" : "done"}`,
                        })}
                        <span
                          style={{
                            paddingTop: 12,
                            textDecoration: done ? "line-through" : "none",
                          }}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
