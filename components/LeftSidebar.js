"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { McFace } from "@/components/pixel/McCharacter";
import { parseDaysAgo } from "./FreshnessSystem";
import {
  MapPin,
  Briefcase,
  ChevronRight,
  MessageCircle,
  X,
  Send,
  Loader2,
} from "lucide-react";

// ─── Gemini API key ───────────────────────────────────────────────────────────
// ─── Inject global keyframes once ────────────────────────────────────────────
const KF_ID = "cv-left-sidebar-kf";
function injectKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(KF_ID)) return;
  const s = document.createElement("style");
  s.id = KF_ID;
  s.textContent = `
    @keyframes ringPulse {
      0%,100% { filter: drop-shadow(0 0 3px var(--ring-c, #35C99A)); }
      50%      { filter: drop-shadow(0 0 10px var(--ring-c, #35C99A))
                         drop-shadow(0 0 22px var(--ring-c, #3ED9A855)); }
    }
    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: translateY(0);   }
    }
    @keyframes spin {
      from { transform: rotate(0deg);   }
      to   { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(s);
}

// ─── Animated SVG Progress Ring ───────────────────────────────────────────────
function AnimatedRing({ percent, size = 80, sw = 7, accent }) {
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);

  useEffect(() => {
    const id = setTimeout(
      () => setOffset(circ - (Math.min(percent, 100) / 100) * circ),
      150,
    );
    return () => clearTimeout(id);
  }, [percent, circ]);

  return (
    <svg
      width={size}
      height={size}
      style={{ transform: "rotate(-90deg)", flexShrink: 0 }}
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(138,130,113,0.28)"
        strokeWidth={sw}
      />
      {/* Animated foreground arc */}
      <g
        style={{
          "--ring-c": accent,
          animation: "ringPulse 2.8s ease-in-out infinite",
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={sw}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 1.25s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </g>
    </svg>
  );
}

// ─── Skeleton loading bar ─────────────────────────────────────────────────────
function SkeletonBar({ w = "100%", h = 11, mb = 8 }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 6,
        marginBottom: mb,
        background:
          "linear-gradient(90deg, rgba(138,130,113,0.12) 25%, rgba(138,130,113,0.24) 50%, rgba(138,130,113,0.12) 75%)",
        backgroundSize: "400px 100%",
        animation: "shimmer 1.5s ease-in-out infinite",
      }}
    />
  );
}

// ─── Count-up animation hook ──────────────────────────────────────────────────
function useCountUp(target, duration = 1100) {
  const [val, setVal] = useState(0);
  const t0 = useRef(null);
  const rafId = useRef(null);

  useEffect(() => {
    if (target === 0) {
      setVal(0);
      return;
    }
    t0.current = null;
    const step = (ts) => {
      if (!t0.current) t0.current = ts;
      const p = Math.min((ts - t0.current) / duration, 1);
      setVal(Math.round(p * target));
      if (p < 1) rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId.current);
  }, [target, duration]);

  return val;
}

// ─── Pipeline stat box ────────────────────────────────────────────────────────
function PipelineBox({ color, label, count, star, onClick, T }) {
  const animated = useCountUp(count);
  return (
    <div
      onClick={onClick || undefined}
      style={{
        padding: "10px 8px",
        borderRadius: 10,
        background: `${color}22`,
        border: `1.5px solid ${T.ink || T.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        cursor: onClick ? "pointer" : "default",
        transition:
          "transform 150ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 150ms",
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        e.currentTarget.style.boxShadow = `2.5px 2.5px 0 ${T.ink || T.border}`;
        e.currentTarget.style.transform = "translate(-1.5px,-1.5px)";
      }}
      onMouseLeave={(e) => {
        if (!onClick) return;
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translate(0,0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            border: `1.5px solid ${T.ink || T.border}`,
          }}
        />
        {star && <span style={{ fontSize: 9, color, lineHeight: 1 }}>★</span>}
      </div>
      <span
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: T.text,
          fontFamily: "'Archivo Black', 'Space Grotesk', sans-serif",
          lineHeight: 1,
        }}
      >
        {animated}
      </span>
      <span
        style={{
          fontSize: 10,
          color: T.text3,
          textAlign: "center",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LEFT SIDEBAR — MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function LeftSidebar({
  T,
  isDark,
  profile,
  jobs = [],
  savedJobs = [],
  activeTab,
  setActiveTab,
  sidebarFilters,
  setSidebarFilters,
  applicationPipeline,
  certifications,
  setCertifications,
  onRematchSkills,
  careerPaths = [],
  skillSuggestions = [],
  onAddSkill,
  onReuploadResume,
  show,
  onClose,
}) {
  // Inject keyframes on first render
  useEffect(() => {
    injectKeyframes();
  }, []);

  // ── AI Skill Coach state ───────────────────────────────────────────────────
  const [skillCoachLoading, setSkillCoachLoading] = useState(false);
  const [skillCoachData, setSkillCoachData] = useState(null);

  // ── Inline chat state ──────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatInputRef = useRef(null);

  // ── Profile match score (explainable: share of profile skills that appear in jobs pool) ──
  const profileMatchScore = useMemo(() => {
    if (!profile?.topSkills?.length) return 0;
    const pSkills = new Set((profile.topSkills || []).map((s) => s.toLowerCase()));
    const jSkills = new Set();
    jobs.forEach((j) => (j.skills || j.requiredSkills || []).forEach((s) => jSkills.add(s.toLowerCase())));
    if (!jSkills.size) return Math.min(profile.topSkills.length * 6, 72);
    const matched = [...pSkills].filter((s) => jSkills.has(s)).length;
    return Math.round((matched / pSkills.size) * 100);
  }, [profile, jobs]);

  // ── Filter match counter ──────────────────────────────────────────────────
  const filterMatches = (j) => {
    const exp = sidebarFilters?.experienceLevels || [];
    if (
      exp.length &&
      !exp.some((l) =>
        j.experienceLevel?.toLowerCase().includes(l.toLowerCase()),
      )
    )
      return false;
    const modes = sidebarFilters?.workTypes || [];
    if (
      modes.length &&
      !modes.some((m) => j.workType?.toLowerCase() === m.toLowerCase())
    )
      return false;
    if (sidebarFilters?.datePosted && sidebarFilters.datePosted !== "all") {
      const days = parseDaysAgo(j.posted);
      if (sidebarFilters.datePosted === "24h" && days > 1) return false;
      if (sidebarFilters.datePosted === "week" && days > 7) return false;
      if (sidebarFilters.datePosted === "month" && days > 30) return false;
    }
    return true;
  };
  const matchedJobCount = jobs.filter(filterMatches).length;

  // ── Filter helpers ────────────────────────────────────────────────────────
  const toggleMulti = (key, val) => {
    const cur = sidebarFilters?.[key] || [];
    const next = cur.includes(val)
      ? cur.filter((v) => v !== val)
      : [...cur, val];
    setSidebarFilters?.((prev) => ({ ...prev, [key]: next }));
  };
  const setSingle = (key, val) => {
    setSidebarFilters?.((prev) => ({ ...prev, [key]: val }));
  };
  const clearFilters = () => {
    setSidebarFilters?.({
      experienceLevels: [],
      datePosted: "all",
      workTypes: [],
    });
  };

  // ── Gemini Skill Coach (fires once when jobs arrive) ──────────────────────
  useEffect(() => {
    if (!jobs.length || !profile) return;

    const fetchSkillAdvice = async () => {
      setSkillCoachLoading(true);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch("/api/gemini-sidebar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "skillCoach",
            skills: (profile.topSkills || []).join(", "),
            jobTitles: jobs
              .slice(0, 10)
              .map((j) => j.title)
              .join(", "),
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setSkillCoachData(data);
      } catch {
        clearTimeout(timer);
        // Fallback: compute top missing skills from job data
        const pSet = new Set(
          (profile?.topSkills || []).map((s) => s.toLowerCase()),
        );
        const freq = {};
        jobs.forEach((j) =>
          (j.skills || j.requiredSkills || []).forEach((s) => {
            const k = s.toLowerCase();
            if (!pSet.has(k)) freq[k] = (freq[k] || 0) + 1;
          }),
        );
        const top = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([k]) => k);
        setSkillCoachData({
          missingSkills: top.length ? top : ["TypeScript", "Docker", "AWS"],
          insight:
            "These skills appear frequently in your matched job listings.",
          missingCount: top.length || 3,
        });
      } finally {
        setSkillCoachLoading(false);
      }
    };

    fetchSkillAdvice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.length]);

  // ── Inline AI chat ────────────────────────────────────────────────────────
  const handleAskAI = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatLoading(true);
    setChatResponse("");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      // Use /api/ai-coach which reads the same GEMINI_API_KEY as resume analysis
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          skills: profile?.topSkills || [],
          jobTitles: jobs.slice(0, 5).map((j) => j.title),
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (process.env.NODE_ENV === "development" && data.error) {
          setChatResponse(data.error);
        } else if (false) {
          setChatResponse(
            "AI features require configuration — contact support",
          );
        } else if (false) {
          setChatResponse("AI is taking too long, please try again.");
        } else {
          setChatResponse("AI is unavailable right now");
        }
        return;
      }
      setChatResponse(data.reply || "No response received.");
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        setChatResponse(
          process.env.NODE_ENV === "development"
            ? "AI request timed out"
            : "AI is unavailable right now",
        );
      } else {
        setChatResponse(
          process.env.NODE_ENV === "development" && err.message
            ? err.message
            : "AI is unavailable right now",
        );
      }
    } finally {
      setChatLoading(false);
      setChatInput("");
    }
  };

  // ── Derived profile values ────────────────────────────────────────────────
  const initials = (profile?.name || "?")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const yoe = profile?.yearsExperience;
  const expBadge =
    yoe === 0 ? "Fresher" : (yoe || 0) <= 3 ? "Mid-level" : "Senior";
  const expBadgeColor =
    yoe === 0
      ? { bg: "#B79CFF", fg: "#17150F", border: T.border }
      : (yoe || 0) <= 3
        ? { bg: T.gold, fg: "#17150F", border: T.border }
        : { bg: T.accent2, fg: "#17150F", border: T.border };

  const pipelineCounts = {
    saved: applicationPipeline?.saved ?? savedJobs.length,
    applied: applicationPipeline?.applied ?? 0,
    interview: applicationPipeline?.interview ?? 0,
    offer: applicationPipeline?.offer ?? 0,
  };
  const avgMatchExplained = jobs.length ? Math.round(jobs.reduce((s, j) => s + (j.matchScore || 0), 0) / jobs.length) : 0;

  // ── Layout helpers ────────────────────────────────────────────────────────
  const isDrawer = show !== undefined;

  const sidebarStyle = {
    width: 260,
    minWidth: 260,
    height: "100vh",
    background: T.bg4,
    borderRight: `2px solid ${T.ink || T.border}`,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "16px 12px 32px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "none",
    position: "relative",
    ...(isDrawer
      ? {
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 1001,
          transform: show ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 280ms cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: show ? "6px 0 40px rgba(0,0,0,0.55)" : "none",
        }
      : {}),
  };

  // Reusable card wrapper style — retro paper card with hard offset shadow
  const card = {
    background: T.bg2,
    border: `2px solid ${T.ink || T.border}`,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    boxShadow: T.shadowMd,
  };

  // Section title style (no marginBottom — set per use)
  const titleBase = {
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: T.text3,
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  // Pill factory — retro chips: ink border, solid fill when active, press shadow
  const pill = (active) => ({
    padding: "5px 12px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    border: `1.5px solid ${T.ink || T.border}`,
    background: active ? T.accent : T.bg3,
    color: active ? T.onAccent || "#FFF8EE" : T.text2,
    boxShadow: active ? T.shadow : "none",
    transition: "all 150ms",
    whiteSpace: "nowrap",
    userSelect: "none",
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Drawer backdrop */}
      {isDrawer && show && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.58)",
            backdropFilter: "blur(3px)",
            zIndex: 1000,
          }}
        />
      )}

      <aside className="left-sidebar" style={sidebarStyle}>
        {/* Drawer close button */}
        {isDrawer && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              background: T.bg3,
              border: `1.5px solid ${T.ink || T.border}`,
              borderRadius: 8,
              width: 30,
              height: 30,
              boxShadow: T.shadow,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: T.text2,
              zIndex: 10,
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(1px,1px)";
              e.currentTarget.style.boxShadow = T.shadow;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translate(0,0)";
              e.currentTarget.style.boxShadow = T.shadow;
            }}
          >
            <X size={15} />
          </button>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 1 — AI PROFILE CARD
        ════════════════════════════════════════════ */}
        <div style={card}>
          <div style={{ ...titleBase, marginBottom: 14 }}>
            <span>✨</span> Profile Card
          </div>

          {/* Ring (left) + identity info (right) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
            }}
          >
            {/* Circular progress ring with % in center */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <AnimatedRing
                percent={profileMatchScore}
                size={80}
                sw={6}
                accent={T.accent}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: T.accent,
                    lineHeight: 1,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {profileMatchScore}%
                </span>
              </div>
            </div>

            {/* Name, role, location, badge */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Initials circle + name */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginBottom: 5,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: T.accent,
                    border: `1.5px solid ${T.ink || T.border}`,
                    boxShadow: `1.5px 1.5px 0 ${T.ink || T.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    color: T.onAccent || "#fff",
                    flexShrink: 0,
                    letterSpacing: "-0.5px",
                  }}
                >
                  {initials}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: T.text,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                    lineHeight: 1.2,
                  }}
                >
                  {profile?.name || "Your Profile"}
                </span>
              </div>

              {/* Role title */}
              {profile?.jobTitles?.[0] && (
                <div
                  style={{
                    fontSize: 11,
                    color: T.text2,
                    marginBottom: 4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Briefcase size={9} color={T.text3} />
                  {profile.jobTitles[0]}
                </div>
              )}

              {/* Location */}
              {profile?.location && (
                <div
                  style={{
                    fontSize: 10,
                    color: T.text3,
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <MapPin size={8} color={T.text3} />
                  {profile.location}
                </div>
              )}

              {/* Experience badge */}
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 600,
                  background: expBadgeColor.bg,
                  color: expBadgeColor.fg,
                  border: `1.5px solid ${expBadgeColor.border}`,
                }}
              >
                {expBadge}
              </span>
            </div>
          </div>

          {/* Match score caption — explainable */}
          <div
            style={{
              textAlign: "center",
              fontSize: 10,
              color: T.text3,
              fontWeight: 500,
              paddingTop: 8,
              borderTop: `1.5px dashed ${T.text3}55`,
            }}
          >
            {profileMatchScore}% of your skills appear in these jobs ·{" "}
            <span style={{ color: T.accent, fontWeight: 600 }}>{jobs.length} jobs</span>
          </div>
        </div>

        {/* Sidebar shows profile context + pipeline; filters live in the centre filter bar (deduplicated). */}
        <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.text3 }}>{matchedJobCount} jobs match your filters</span>
          <button onClick={clearFilters} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: T.text3 }}>Clear filters</button>
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 3 — APPLICATION PIPELINE
        ════════════════════════════════════════════ */}
        <div style={card}>
          <div style={{ ...titleBase, marginBottom: 14 }}>
            <span>📋</span> My Applications
          </div>

          {/* 2×2 stat grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <PipelineBox
              color="#4D9DE0"
              label="Saved"
              count={pipelineCounts.saved}
              onClick={() => setActiveTab?.("saved")}
              T={T}
            />
            <PipelineBox
              color="#F59E0B"
              label="Applied"
              count={pipelineCounts.applied}
              onClick={() => setActiveTab?.("applied")}
              T={T}
            />
            <PipelineBox
              color="#35C99A"
              label="Interview"
              count={pipelineCounts.interview}
              onClick={null}
              T={T}
            />
            <PipelineBox
              color="#F59E0B"
              label="Offer"
              count={pipelineCounts.offer}
              star
              onClick={null}
              T={T}
            />
          </div>

          {/* View Pipeline link */}
          <button
            onClick={() => setActiveTab?.("applied")}
            style={{
              width: "100%",
              padding: "8px 0",
              borderRadius: 8,
              border: `1.5px solid ${T.ink || T.border}`,
              background: T.bg3,
              color: T.text,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.bg4;
              e.currentTarget.style.boxShadow = T.shadow;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = T.bg3;
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translate(0,0)";
            }}
          >
            View Pipeline <ChevronRight size={12} />
          </button>
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 4 — AI SKILL COACH
        ════════════════════════════════════════════ */}
        <div style={card}>
          <div style={{ ...titleBase, marginBottom: 14 }}>
            <McFace id="mentor" size={28} aria-hidden style={{ border: `2px solid ${T.ink || T.border}`, borderRadius: 3, flexShrink: 0 }} /> AI Skill Coach
          </div>

          {/* Loading skeleton */}
          {skillCoachLoading && (
            <div>
              <SkeletonBar w="90%" h={11} mb={9} />
              <SkeletonBar w="70%" h={11} mb={9} />
              <SkeletonBar w="80%" h={11} mb={0} />
            </div>
          )}

          {/* Coach data */}
          {!skillCoachLoading && skillCoachData && (
            <div style={{ animation: "fadeSlideIn 320ms ease" }}>
              {/* Headline */}
              <div
                style={{
                  fontSize: 12,
                  color: T.text,
                  fontWeight: 500,
                  marginBottom: 12,
                  lineHeight: 1.55,
                }}
              >
                You&apos;re missing{" "}
                <span style={{ color: T.accent, fontWeight: 700 }}>
                  {skillCoachData.missingCount ||
                    skillCoachData.missingSkills?.length ||
                    0}{" "}
                  skills
                </span>{" "}
                that appear in most of your matched jobs
              </div>

              {/* Missing skill chips */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                  marginBottom: 12,
                }}
              >
                {(skillCoachData.missingSkills || []).map((skill) => (
                  <div
                    key={skill}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: T.bg4,
                      border: `1.5px solid ${T.ink || T.border}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: T.text2,
                        fontWeight: 500,
                        textTransform: "capitalize",
                      }}
                    >
                      {skill}
                    </span>
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.google.com/search?q=learn+${encodeURIComponent(
                            skill,
                          )}+for+free`,
                          "_blank",
                        )
                      }
                      style={{
                        padding: "3px 9px",
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 600,
                        background: `${T.accent}1e`,
                        color: T.accent,
                        border: `1px solid ${T.accent}40`,
                        cursor: "pointer",
                        transition: "all 150ms",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${T.accent}35`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `${T.accent}1e`;
                      }}
                    >
                      Learn →
                    </button>
                  </div>
                ))}
              </div>

              {/* AI insight blurb */}
              {skillCoachData.insight && (
                <div
                  style={{
                    fontSize: 10,
                    color: T.text3,
                    lineHeight: 1.6,
                    marginBottom: 12,
                    fontStyle: "italic",
                    borderLeft: `2px solid ${T.accent}40`,
                    paddingLeft: 8,
                  }}
                >
                  {skillCoachData.insight}
                </div>
              )}

              {/* Get AI Career Advice toggle */}
              <button
                onClick={() => {
                  setChatOpen((v) => !v);
                  if (!chatOpen)
                    setTimeout(() => chatInputRef.current?.focus(), 120);
                }}
                style={{
                  width: "100%",
                  padding: "8px 0",
                  borderRadius: 8,
                  marginBottom: chatOpen ? 10 : 0,
                  border: `1px solid ${T.accent}50`,
                  background: `${T.accent}14`,
                  color: T.accent,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 150ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${T.accent}24`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${T.accent}14`;
                }}
              >
                <MessageCircle size={13} />
                {chatOpen ? "Close Chat" : "Get AI Career Advice →"}
              </button>

              {/* Inline chat panel */}
              {chatOpen && (
                <div style={{ animation: "fadeSlideIn 250ms ease" }}>
                  {/* AI response bubble */}
                  {chatResponse && (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        marginBottom: 8,
                        background: T.bg4,
                        border: `1.5px solid ${T.ink || T.border}`,
                        boxShadow: T.shadow,
                        fontSize: 11,
                        color: T.text,
                        lineHeight: 1.65,
                      }}
                    >
                      {chatResponse}
                    </div>
                  )}

                  {/* Typing indicator */}
                  {chatLoading && (
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        alignItems: "center",
                        padding: "8px 12px",
                        marginBottom: 8,
                      }}
                    >
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: T.text3,
                            animation: `fadeSlideIn 0.6s ease ${i * 0.15}s infinite alternate`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Input row */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      ref={chatInputRef}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAskAI();
                        }
                      }}
                      placeholder="Ask a career question…"
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        borderRadius: 8,
                        border: `1.5px solid ${T.ink || T.border}`,
                        background: T.bg3,
                        color: T.text,
                        fontSize: 11,
                        outline: "none",
                        transition: "box-shadow 150ms",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.boxShadow = T.shadow;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    <button
                      onClick={handleAskAI}
                      disabled={chatLoading || !chatInput.trim()}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        flexShrink: 0,
                        border: `1.5px solid ${T.ink || T.border}`,
                        background: chatLoading ? T.bg4 : T.accent,
                        color: chatLoading ? T.text3 : (T.onAccent || "#FFF8EE"),
                        boxShadow: T.shadow,
                        cursor:
                          chatLoading || !chatInput.trim()
                            ? "default"
                            : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 150ms",
                        opacity: !chatInput.trim() ? 0.5 : 1,
                      }}
                    >
                      {chatLoading ? (
                        <Loader2
                          size={13}
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                      ) : (
                        <Send size={13} />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!skillCoachLoading && !skillCoachData && (
            <div
              style={{
                fontSize: 11,
                color: T.text3,
                textAlign: "center",
                padding: "12px 0",
              }}
            >
              Load jobs to get AI skill insights
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 9, color: T.text3, textAlign: "center", opacity: 0.6 }}>
            <span style={{ fontSize: 8 }}>AI suggestion — may be wrong</span> · Powered by Gemini ✨
          </div>
        </div>
      </aside>
    </>
  );
}
