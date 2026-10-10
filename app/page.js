"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/lib/authContext";
import { auth, signOut } from "@/lib/firebase";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import MobileBottomBar from "@/components/MobileBottomBar";
import CareerChangePaths from "@/components/CareerChangePaths";
import { parseDaysAgo, getFreshness } from "@/components/FreshnessSystem";
import { salaryLabel } from "@/lib/salary.mjs";
import ModernDashboardLayout from "@/components/ModernDashboardLayout";
import {
  Briefcase,
  Upload,
  BookOpen,
  X,
  MapPin,
  DollarSign,
  Clock,
  Target,
  Zap,
  Award,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Moon,
  Sun,
  RefreshCw,
  Heart,
  ExternalLink,
  Loader2,
  TrendingUp,
  Filter,
  Search,
  Globe,
  Sparkles,
  Brain,
  ChevronDown,
  Star,
  Users,
  Code,
  Rocket,
  BarChart3,
  Shield,
  ChevronRight,
  FileText,
  GraduationCap,
  Layers,
  Play,
  Check,
  Info,
  Building2,
  Wand2,
  LogOut,
  User,
  Settings,
  Plus,
  ChevronUp,
  Menu,
  PanelRightOpen,
  Trash2,
  HelpCircle,
} from "lucide-react";
import LandingPage from "@/components/LandingPage";
import { McCharacter } from "@/components/pixel/McCharacter";
import PixelCharacter from "@/components/pixel/PixelCharacter";
import GuideStrip from "@/components/pixel/GuideStrip";
import Tour from "@/components/pixel/Tour";

// ─── Deterministic stars ─────────────────────────────────────────────────────
const STARS = Array.from({ length: 35 }, (_, i) => {
  const a = ((i * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  const b = ((i * 22695477 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  const c = ((i * 214013 + 2531011) & 0x7fffffff) / 0x7fffffff;
  const d = ((i * 69069 + 12345) & 0x7fffffff) / 0x7fffffff;
  return {
    id: i,
    top: `${(a * 100).toFixed(1)}%`,
    left: `${(b * 100).toFixed(1)}%`,
    size: `${(1 + c * 2).toFixed(1)}px`,
    delay: `${(d * 4).toFixed(1)}s`,
    dur: `${(2 + a * 3).toFixed(1)}s`,
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Score tiers use the landing palette: mint / gold / rust.
const scoreColor = (score, isDark) => {
  if (score >= 85) return isDark ? "#3ED9A8" : "#1F9E75";
  if (score >= 70) return isDark ? "#FFC838" : "#A87508";
  return isDark ? "#FF7A3D" : "#E5511A";
};
const scoreBg = (score, isDark) => {
  if (score >= 85)
    return isDark ? "rgba(62,217,168,0.14)" : "rgba(53,201,154,0.16)";
  if (score >= 70)
    return isDark ? "rgba(255,200,56,0.14)" : "rgba(255,200,56,0.22)";
  return isDark ? "rgba(255,122,61,0.14)" : "rgba(255,107,43,0.14)";
};

// ─── Theme factory ────────────────────────────────────────────────────────────
const COMMON_SKILLS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "SQL",
  "MongoDB",
  "PostgreSQL",
  "REST APIs",
  "GraphQL",
  "Machine Learning",
  "AI",
  "Data Analysis",
  "Pandas",
  "NumPy",
  "Scikit-learn",
  "Docker",
  "AWS",
  "Git",
  "Testing",
];

const stripJobHtml = (value = "") =>
  String(value)
    .replace(/&amp;#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(/&amp;#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/sorry,\s*this job is not available in your region\.?/gi, "")
    .replace(/search for similar jobs in your region\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const skillKey = (skill = "") =>
  String(skill)
    .toLowerCase()
    .replace(/\.js/g, "js")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();

const uniqueSkills = (items = [], limit = 16) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const value = String(item || "").trim();
    if (!value) continue;
    const key = skillKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
};

const deriveSkillData = (job, profile) => {
  const text = `${job?.title || ""} ${stripJobHtml(job?.description || "")} ${(job?.tags || []).join(" ")}`;
  const inferred = COMMON_SKILLS.filter((skill) =>
    new RegExp(
      `\\b${skill
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\\ /g, "\\s+")}\\b`,
      "i",
    ).test(text),
  );
  const requiredSkills = uniqueSkills(
    [
      ...(job?.requiredSkills || []),
      ...(job?.matchedSkills || []),
      ...(job?.missingSkills || []),
      ...(job?.tags || []),
      ...inferred,
    ],
    16,
  );
  const candidateKeys = new Set(
    (profile?.topSkills || []).flatMap((skill) => {
      const key = skillKey(skill);
      if (key === "html css") return ["html css", "html", "css"];
      if (key === "ai ml") return ["ai ml", "ai", "machine learning"];
      return [key];
    }),
  );
  const matchedSkills = uniqueSkills(
    requiredSkills.filter((skill) => {
      const key = skillKey(skill);
      return (
        candidateKeys.has(key) ||
        (key === "html" && candidateKeys.has("html css")) ||
        (key === "css" && candidateKeys.has("html css")) ||
        (key === "ai" && candidateKeys.has("ai ml")) ||
        (key === "machine learning" && candidateKeys.has("ai ml"))
      );
    }),
    10,
  );
  const matchedKeys = new Set(matchedSkills.map(skillKey));
  const missingSkills = uniqueSkills(
    requiredSkills.filter((skill) => !matchedKeys.has(skillKey(skill))),
    8,
  );
  return { requiredSkills, matchedSkills, missingSkills };
};

// ─── Display-name helper ──────────────────────────────────────────────────────
// Derive a friendly first name once: display name → cleaned email local-part
// (strip dots/digits, take first word) → "there". Never shows the @domain.
function deriveFirstName(user) {
  const disp = (user?.displayName || "").trim();
  if (disp) {
    const w = disp.split(/\s+/)[0];
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }
  const local = (user?.email || "").split("@")[0];
  const cleaned = local
    .split(/[._\-+0-9]+/)
    .filter((s) => /^[a-z]+$/i.test(s))
    .sort((a, b) => b.length - a.length)[0];
  if (cleaned) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  return "there";
}

// Prefix a "Senior" level only when the title doesn't already carry one, so we
// never render "Senior Senior Frontend Engineer".
function seniorTitle(title) {
  const t = (title || "Professional").trim();
  if (/^(senior|lead|staff|principal|junior|mid|head|chief|vp)\b/i.test(t)) return t;
  return "Senior " + t;
}

// ─── Neo-brutalist retro palette ──────────────────────────────────────────────
// Mirrors the landing-page design system (components/landing-retro.css, .rv-*).
// Warm paper + hard offset shadows. NOTE: in dark mode the ink/border/shadow
// color is LIGHT parchment (#F4ECDD) — that inversion is the signature look.
const makeT = (isDark) => {
  const ink = isDark ? "#EAD9B0" : "#1A1410"; // border + hard-shadow color
  const hard = (n) => `${n}px ${n}px 0 ${ink}`;
  return {
    bg: isDark ? "#1B1B1B" : "#EAD9B0", // page paper (parchment / bedrock)
    bg2: isDark ? "#262626" : "#F7EED8", // card
    bg3: isDark ? "#2E2E2E" : "#F4E8CC", // chip / inset
    bg4: isDark ? "#212121" : "#E2CFA4", // alt / hover
    text: ink, // ink
    text2: isDark ? "#C9B98F" : "#4A3B2A", // soft ink
    text3: isDark ? "#9A8C6C" : "#7A6A52", // faint ink
    accent: isDark ? "#7BC850" : "#5DAA3A", // grass
    accentDeep: isDark ? "#5DAA3A" : "#3F7A27", // grass-dark
    accent2: isDark ? "#3DDC84" : "#3DDC84", // emerald
    accentDim: isDark ? "rgba(93,170,58,0.18)" : "rgba(93,170,58,0.14)",
    border: ink,
    borderA: isDark ? "#7BC850" : "#5DAA3A",
    gold: "#F5C542", // gold
    lilac: isDark ? "#C3ACFF" : "#B79CFF", // rv-lilac
    pink: isDark ? "#FF9DB6" : "#FF8FAB", // rv-pink
    blue: isDark ? "#4FE3E0" : "#2F4FBF", // diamond / lapis
    purple: isDark ? "#C3ACFF" : "#B79CFF",
    ink,
    onAccent: isDark ? "#17150F" : "#FFF8EE", // text on orange fills
    // Chunky offset shadows — the signature of the whole system.
    hardShadowSm: hard(2),
    hardShadow: hard(4),
    hardShadowLg: hard(6),
    radius: 14,
    radiusSm: 10,
    // Legacy keys kept so existing inline styles stay valid.
    shadow: hard(2),
    shadowMd: hard(4),
    glow: hard(6), // used as the hover shadow-shift target
  };
};

// ─── Company Avatar ───────────────────────────────────────────────────────────
function CompanyAvatar({ name, size = 44, isDark }) {
  const initials = (name || "CO")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  // Landing sticker palette — same hue family in both themes.
  const colors = isDark
    ? [
        "#62AEEE",
        "#C3ACFF",
        "#FF9DB6",
        "#FFC838",
        "#3ED9A8",
        "#FF7A3D",
        "#4D9DE0",
      ]
    : [
        "#4D9DE0",
        "#B79CFF",
        "#FF8FAB",
        "#FFC838",
        "#35C99A",
        "#FF6B2B",
        "#62AEEE",
      ];
  const idx = (name || "").charCodeAt(0) % colors.length;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: colors[idx],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: size * 0.36,
        flexShrink: 0,
        fontFamily: "'Space Grotesk', sans-serif",
        letterSpacing: "0.03em",
        border: `2px solid ${isDark ? "#F4ECDD" : "#17150F"}`,
        boxShadow: `2px 2px 0 ${isDark ? "#F4ECDD" : "#17150F"}`,
      }}
    >
      {initials}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LANDING PAGE — Imported from components/LandingPage.js
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// APP NAVBAR (top-level)
// ════════════════════════════════════════════════════════════════════════════
function AppNavbar({
  isDark,
  T,
  activeTab,
  setActiveTab,
  savedCount,
  appliedCount = 0,
  interviewCount = 0,
  toggleTheme,
  resetSession,
  goHome,
  onSignOut,
  onReplayTour,
  user,
  profile,
  onNavigate,
  onOpenLeftDrawer,
  jobsLoaded,
}) {
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [tipIdx, setTipIdx] = useState(null);
  const menuRef = useRef(null);
  const helpRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setAvatarMenuOpen(false);
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const displayName = profile?.name || user?.displayName || user?.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "U";

  const NAV = [
    { id: "find", label: "Find Jobs", icon: <Search size={14} />, desc: "Browse roles matched to your resume" },
    { id: "myjobs", label: "My Jobs", icon: <Briefcase size={14} />, desc: "Saved / Applied / Interview / Offer — your pipeline" },
    { id: "career", label: "Career Path", icon: <TrendingUp size={14} />, desc: "Match score, gaps & 3-step plan for any target role" },
    { id: "resumelab", label: "Resume Lab", icon: <FileText size={14} />, desc: "Review my resume or compare two versions" },
    { id: "world", label: "Skill World", icon: <Globe size={14} />, desc: "Your skills as a 3D block map — fill the gaps" },
  ];
  const myJobsCount = savedCount + appliedCount + interviewCount;

  return (
    <nav
      style={{
        background: isDark ? "#211C17" : "#FFFDF7",
        borderBottom: `3px solid ${T.ink}`,
        height: 64,
        padding: "0 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: `0 3px 0 ${T.ink}`,
      }}
    >
      <button onClick={goHome} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", color: T.text, flexShrink: 0 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${T.ink}`, boxShadow: `2px 2px 0 ${T.ink}` }}>
          <Sparkles size={15} color={T.onAccent} strokeWidth={2.75} />
        </span>
        <span style={{ fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", fontSize: "1rem", letterSpacing: "-0.01em" }} className="nav-wordmark">CareerVibe</span>
      </button>

      <div className="navbar-tabs" style={{ display: "flex", gap: "0.2rem", background: T.bg, borderRadius: 12, padding: "0.22rem", border: `2px solid ${T.ink}`, boxShadow: `2px 2px 0 ${T.ink}`, marginLeft: "0.5rem" }}>
        {NAV.map((tab) => {
          const isMyJobs = tab.id === "myjobs";
          const active = activeTab === tab.id || (isMyJobs && (activeTab === "saved" || activeTab === "applied"));
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "world") { onNavigate?.("/world"); return; }
                if (tab.id === "resumelab") { onNavigate?.("/review"); return; }
                setActiveTab(tab.id === "myjobs" ? "saved" : tab.id);
              }}
              onMouseEnter={() => setTipIdx(tab.id)}
              onMouseLeave={() => setTipIdx(null)}
              onFocus={() => setTipIdx(tab.id)}
              onBlur={() => setTipIdx(null)}
              title={tab.desc}
              aria-label={`${tab.label}: ${tab.desc}`}
              className={`nav-tab ${active ? "active" : ""}`}
              style={{
                color: active ? T.onAccent : T.text2,
                background: active ? T.accent : "transparent",
                border: `1.5px solid ${active ? T.ink : "transparent"}`,
                borderRadius: 10,
                padding: "0.35rem 0.55rem",
                fontSize: "0.72rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "0.28rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                position: "relative",
              }}
            >
              {tab.icon} {tab.label}
              {isMyJobs && myJobsCount > 0 && <span style={{ background: T.gold, color: "#17150F", borderRadius: 999, padding: "0 5px", fontSize: "0.62rem", border: `1px solid ${T.ink}` }}>{myJobsCount}</span>}
              {tipIdx === tab.id && (
                <span style={{ position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: T.bg2, color: T.text, border: `2px solid ${T.ink}`, borderRadius: 8, padding: "0.35rem 0.6rem", fontSize: "0.68rem", fontWeight: 600, whiteSpace: "nowrap", boxShadow: `3px 3px 0 ${T.ink}`, zIndex: 20 }}>
                  {tab.desc}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <div ref={helpRef} style={{ position: "relative" }}>
          <button onClick={() => setHelpOpen((v) => !v)} aria-label="Help — what each section does" style={{ width: 36, height: 36, borderRadius: 9, border: `2px solid ${T.ink}`, background: T.bg3, color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `2px 2px 0 ${T.ink}` }}>
            <HelpCircle size={16} />
          </button>
          {helpOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 300, background: T.bg2, border: `2px solid ${T.ink}`, borderRadius: 12, boxShadow: `4px 4px 0 ${T.ink}`, padding: "0.8rem", zIndex: 1001, fontSize: "0.78rem", lineHeight: 1.5, color: T.text }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Where is everything?</div>
              {NAV.map((n) => (
                <div key={n.id} style={{ display: "flex", gap: 6, marginBottom: 4 }}><span style={{ flexShrink: 0 }}>{n.icon}</span><span><strong>{n.label}:</strong> {n.desc}</span></div>
              ))}
              <div style={{ marginTop: 6, color: T.text3, fontSize: "0.72rem" }}>Resume Review &amp; Compare live inside Resume Lab. Skill World is your 3D skill map.</div>
            </div>
          )}
        </div>
        <button onClick={toggleTheme} aria-label="Toggle theme" style={{ width: 36, height: 36, borderRadius: 9, border: `2px solid ${T.ink}`, background: T.bg3, color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `2px 2px 0 ${T.ink}` }}>
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div ref={menuRef} style={{ position: "relative" }}>
          <button onClick={() => setAvatarMenuOpen(!avatarMenuOpen)} aria-label="Account menu" style={{ width: 38, height: 38, borderRadius: 10, overflow: "hidden", border: `2px solid ${T.ink}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: user?.photoURL ? "transparent" : T.accent, color: T.onAccent, fontWeight: 800, fontSize: "0.8rem", padding: 0, boxShadow: `2px 2px 0 ${T.ink}` }} title={displayName}>
            {user?.photoURL ? <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" /> : initials}
          </button>
          {avatarMenuOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 240, background: T.bg2, border: `2px solid ${T.ink}`, borderRadius: 14, boxShadow: `4px 4px 0 ${T.ink}`, padding: "0.5rem", zIndex: 1001 }}>
              <div style={{ padding: "0.6rem 0.7rem", borderBottom: `1.5px solid ${T.ink}`, marginBottom: "0.3rem", overflow: "hidden" }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
                <div style={{ fontSize: "0.7rem", color: T.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email || ""}</div>
              </div>
              <button onClick={() => { setAvatarMenuOpen(false); onNavigate("/profile"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.7rem", borderRadius: 10, border: "none", background: "transparent", color: T.text, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }} onMouseEnter={(e) => e.currentTarget.style.background = T.accentDim} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <User size={14} /> Profile
              </button>
              <button onClick={() => { setAvatarMenuOpen(false); onNavigate("/settings"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.7rem", borderRadius: 10, border: "none", background: "transparent", color: T.text, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }} onMouseEnter={(e) => e.currentTarget.style.background = T.accentDim} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <Settings size={14} /> Settings
              </button>
              <button onClick={() => { setAvatarMenuOpen(false); onReplayTour?.(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.7rem", borderRadius: 10, border: "none", background: "transparent", color: T.text, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }} onMouseEnter={(e) => e.currentTarget.style.background = T.accentDim} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <BookOpen size={14} /> Replay tour
              </button>
              <div style={{ height: 1, background: T.border, margin: "0.3rem 0" }} />
              <button onClick={() => setClearConfirm(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.7rem", borderRadius: 10, border: "none", background: "transparent", color: T.accentDeep, cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }} onMouseEnter={(e) => e.currentTarget.style.background = T.accentDim} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <Trash2 size={14} /> Clear my data
              </button>
              <div style={{ height: 1, background: T.border, margin: "0.3rem 0" }} />
              <button onClick={() => { setAvatarMenuOpen(false); onSignOut(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.7rem", borderRadius: 10, border: "none", background: "transparent", color: T.accentDeep, cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }} onMouseEnter={(e) => e.currentTarget.style.background = T.accentDim} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      {clearConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "1rem" }} onClick={() => setClearConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.bg2, border: `3px solid ${T.ink}`, borderRadius: 16, padding: "1.2rem", maxWidth: 420, width: "100%", boxShadow: `6px 6px 0 ${T.ink}` }}>
            <h3 style={{ margin: "0 0 0.4rem", fontSize: "1rem", fontWeight: 800 }}>Clear my data?</h3>
            <p style={{ margin: 0, fontSize: "0.82rem", color: T.text2, lineHeight: 1.5 }}>This deletes your profile, saved jobs, application pipeline and local hints on <strong>this device</strong>. Sample data is not affected. This cannot be undone.</p>
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem", justifyContent: "flex-end" }}>
              <button onClick={() => setClearConfirm(false)} style={{ padding: "0.5rem 0.9rem", borderRadius: 10, border: `2px solid ${T.ink}`, background: T.bg3, color: T.text, cursor: "pointer", fontWeight: 700 }}>Cancel</button>
              <button onClick={() => { setClearConfirm(false); setAvatarMenuOpen(false); resetSession(); }} style={{ padding: "0.5rem 0.9rem", borderRadius: 10, border: `2px solid ${T.ink}`, background: "#D8402E", color: "#FFF8EE", cursor: "pointer", fontWeight: 800 }}>Clear everything</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// UPLOAD ZONE (top-level)
// ════════════════════════════════════════════════════════════════════════════
function UploadZone({
  isDark,
  T,
  onFile,
  parseError,
  fileInputRef,
  user,
  isNewUser,
}) {
  const [dragOver, setDragOver] = useState(false);
  const firstName = deriveFirstName(user);
  return (
    <div
      style={{
        maxWidth: 600,
        margin: "4rem auto",
        padding: "0 1.5rem",
        textAlign: "center",
      }}
    >
      {/* Welcome message — differs for new vs returning users */}
      {firstName && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: T.bg2,
            border: `2px solid ${T.ink}`,
            borderRadius: 999,
            padding: "0.5rem 1.25rem",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
            color: T.text,
            fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            boxShadow: `3px 3px 0 ${T.ink}`,
            transform: "rotate(-1deg)",
          }}
        >
          {isNewUser
            ? `Welcome, ${firstName}! Let's get started 👋`
            : `Welcome back, ${firstName} 👋`}
        </div>
      )}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: T.gold,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#17150F",
          margin: "0 auto 1.5rem",
          border: `2px solid ${T.ink}`,
          boxShadow: `3px 3px 0 ${T.ink}`,
          transform: "rotate(-4deg)",
        }}
      >
        <Brain size={30} />
      </div>
      <h2
        className="retro-display"
        style={{
          fontSize: "2rem",
          marginBottom: "0.5rem",
        }}
      >
        {isNewUser ? "Upload Your Resume" : "Upload Your Resume"}
      </h2>
      <p style={{ color: T.text2, marginBottom: "2rem", lineHeight: 1.6 }}>
        {isNewUser
          ? "Upload your resume to discover your best-matched jobs and get personalized career insights."
          : "Let AI analyze your skills, experience, and potential to find your ideal career matches."}
      </p>

      <div
        style={{
          borderRadius: 22,
          padding: "3rem 2rem",
          cursor: "pointer",
          transition:
            "transform 0.16s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.16s ease, background 0.2s ease",
          border: `2px dashed ${dragOver ? T.accent : T.ink}`,
          background: dragOver ? T.accentDim : T.bg2,
          boxShadow: dragOver ? T.hardShadowLg : T.hardShadow,
          transform: dragOver ? "translate(-2px,-2px)" : "translate(0,0)",
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        tabIndex={0}
        role="button"
        aria-label="Upload resume file"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.docx"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files[0]) onFile(e.target.files[0]);
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div aria-hidden="true" style={{ height: 64, display: "flex", alignItems: "flex-end" }}>
            <McCharacter id="engineer" scale={4} height={64} />
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: T.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.onAccent,
              border: `2px solid ${T.ink}`,
              boxShadow: `3px 3px 0 ${T.ink}`,
            }}
            className="animate-float"
          >
            <Upload size={24} />
          </div>
          <div>
            <p
              style={{
                fontWeight: 700,
                fontSize: "1.0625rem",
                marginBottom: "0.25rem",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Drag & drop your resume here
            </p>
            <p style={{ color: T.text2, fontSize: "0.8125rem" }}>
              or click to browse · PDF, DOCX, or TXT · Max 10MB
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {[
              { fmt: "PDF", bg: T.gold },
              { fmt: "DOCX", bg: T.accent2 },
              { fmt: "TXT", bg: T.lilac },
            ].map(({ fmt, bg }) => (
              <span
                key={fmt}
                className="retro-sticker"
                style={{
                  padding: "0.25rem 0.8rem",
                  background: bg,
                  color: "#17150F",
                  fontSize: "0.6875rem",
                }}
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: "1.5rem",
        }}
      >
        {[
          { icon: "⚡", text: "Results in 30 seconds" },
          { icon: "🔒", text: "Your data stays private" },
          { icon: "🎯", text: "AI-powered matching" },
        ].map((badge) => (
          <div
            key={badge.text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.375rem 0.9rem",
              borderRadius: 999,
              background: T.bg3,
              border: `1.5px solid ${T.ink}`,
              fontSize: "0.75rem",
              color: T.text2,
              fontWeight: 600,
            }}
          >
            <span>{badge.icon}</span>
            <span>{badge.text}</span>
          </div>
        ))}
      </div>

      {parseError && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 10,
            background: isDark ? "rgba(255,122,61,0.14)" : "#FBE3D8",
            border: `2px solid ${T.ink}`,
            boxShadow: T.hardShadowSm,
            color: T.accentDeep,
            fontSize: "0.8125rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertCircle size={14} /> {parseError}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LOADING SCREEN (top-level)
// ════════════════════════════════════════════════════════════════════════════
function LoadingScreen({ type, T, isDark }) {
  const steps =
    type === "parsing"
      ? [
          "Reading your resume...",
          "Extracting skills & experience...",
          "Identifying background...",
          "Building your profile...",
        ]
      : [
          "Analyzing your profile...",
          "Searching job database...",
          "Calculating match scores...",
          "Ranking opportunities...",
        ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % steps.length), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div
      style={{
        maxWidth: 480,
        margin: "6rem auto",
        padding: "0 1.5rem",
        textAlign: "center",
      }}
    >
      <div aria-hidden="true" style={{ height: 48, display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "0.75rem" }}>
        <McCharacter id="explorer" scale={3} height={48} />
      </div>
      <div
        style={{
          position: "relative",
          width: 84,
          height: 84,
          margin: "0 auto 2rem",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 24,
            border: `2px solid ${T.ink}`,
            background: T.gold,
            boxShadow: `4px 4px 0 ${T.ink}`,
            transform: "rotate(-4deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#17150F",
          }}
          className="animate-float"
        >
          {type === "parsing" ? <FileText size={30} /> : <Sparkles size={30} />}
        </div>
      </div>
      <h2
        className="retro-display"
        style={{
          fontSize: "1.75rem",
          marginBottom: "0.5rem",
        }}
      >
        {type === "parsing" ? "Analyzing Your Resume" : "Finding Your Matches"}
      </h2>
      <p
        style={{
          color: T.accent,
          fontSize: "0.875rem",
          fontWeight: 700,
          fontFamily: "'Space Mono', monospace",
          marginBottom: "2rem",
          minHeight: "1.5em",
        }}
      >
        {steps[step]}
      </p>
      <div
        style={{ display: "flex", gap: "0.45rem", justifyContent: "center" }}
      >
        {steps.map((_, i) => (
          <div
            key={i}
            style={{
              height: 12,
              width: i === step ? 34 : 14,
              borderRadius: 4,
              border: `1.5px solid ${T.ink}`,
              background: i === step ? T.accent : i < step ? T.accent2 : T.bg3,
              boxShadow: i === step ? `2px 2px 0 ${T.ink}` : "none",
              transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          />
        ))}
      </div>
      <p
        style={{
          color: T.text3,
          fontSize: "0.6875rem",
          marginTop: "1.5rem",
          fontFamily: "'Space Mono', monospace",
          letterSpacing: "0.04em",
        }}
      >
        AI-POWERED ANALYSIS · GEMINI 2.0 FLASH
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PROFILE REVIEW (top-level)
// ════════════════════════════════════════════════════════════════════════════
function ProfileReview({
  T,
  isDark,
  profile,
  parseError,
  onReupload,
  onFindMatches,
}) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const summary = profile?.summary || "";
  const summaryIsLong = summary.length > 260;
  const visibleSummary =
    summaryIsLong && !summaryExpanded
      ? `${summary.slice(0, 260).trim()}...`
      : summary;
  return (
    <div
      className="profile-review-shell"
      style={{ maxWidth: 700, margin: "0 auto", padding: "0" }}
    >
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div
          className="retro-sticker"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            background: T.accent2,
            padding: "0.35rem 1rem",
            marginBottom: "1rem",
            color: "#17150F",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            transform: "rotate(-1deg)",
          }}
        >
          <CheckCircle size={12} /> Profile Extracted Successfully
        </div>
        <h2
          className="retro-display"
          style={{
            fontSize: "2rem",
            marginBottom: "0.375rem",
          }}
        >
          Review Your Profile
        </h2>
        <p style={{ color: T.text2, fontSize: "0.875rem" }}>
          Verify your details are correct before we find your matches.
        </p>
      </div>

      <div
        style={{
          background: T.bg2,
          borderRadius: 22,
          border: `2px solid ${T.ink}`,
          boxShadow: T.hardShadowLg,
          overflow: "hidden",
          marginBottom: "1.5rem",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.5rem 1.75rem",
            background: T.bg3,
            borderBottom: `2px solid ${T.ink}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              className="retro-display"
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: T.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.onAccent,
                fontSize: 20,
                border: `2px solid ${T.ink}`,
                boxShadow: `3px 3px 0 ${T.ink}`,
                transform: "rotate(-4deg)",
              }}
            >
              {(profile?.name?.[0] || "?").toUpperCase()}
            </div>
            <div>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: "1.125rem",
                  marginBottom: "0.125rem",
                }}
              >
                {profile?.name || "Unknown Candidate"}
              </h3>
              <p style={{ color: T.text2, fontSize: "0.8125rem" }}>
                {profile?.careerStage ||
                  (profile?.yearsExperience === 0
                    ? "Student / Fresher"
                    : `${profile?.yearsExperience} year${profile?.yearsExperience !== 1 ? "s" : ""} of experience`)}
                {profile?.education ? ` · ${profile.education}` : ""}
              </p>
            </div>
          </div>
          {summary && (
            <div
              style={{
                marginTop: "0.875rem",
                background: T.bg3,
                padding: "0.75rem 1rem",
                borderRadius: 10,
                border: `1.5px solid ${T.ink}`,
              }}
            >
              <p
                style={{
                  color: T.text2,
                  fontSize: "0.875rem",
                  lineHeight: 1.65,
                  overflow: "visible",
                  maxHeight: "none",
                }}
              >
                <Info
                  size={13}
                  style={{ display: "inline", marginRight: 6, color: T.accent }}
                />
                {visibleSummary}
              </p>
              {summaryIsLong && (
                <button
                  type="button"
                  onClick={() => setSummaryExpanded((v) => !v)}
                  style={{
                    marginTop: "0.5rem",
                    border: "none",
                    background: "transparent",
                    color: T.accent,
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: 0,
                  }}
                >
                  {summaryExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Skills */}
        <div
          style={{
            padding: "1.25rem 1.75rem",
            borderBottom: `1.5px solid ${T.ink}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.875rem",
            }}
          >
            <Code size={14} color={T.accent} />
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
              Skills Detected
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.75rem",
                color: T.text3,
              }}
            >
              {profile?.topSkills?.length || 0} skills
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              overflow: "visible",
              maxHeight: "none",
            }}
          >
            {(profile?.topSkills || []).map((s, si) => (
              <span
                key={s}
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: 999,
                  background: [T.gold, T.accent2, T.lilac, T.pink][si % 4],
                  color: "#17150F",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  border: `1.5px solid ${T.ink}`,
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Roles & Industries */}
        <div
          style={{
            padding: "1.25rem 1.75rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            borderBottom: `1.5px solid ${T.ink}`,
          }}
        >
          {profile?.jobTitles?.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <Briefcase size={13} color={T.accent2} />
                <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                  Previous Roles
                </span>
              </div>
              {profile.jobTitles.slice(0, 4).map((t) => (
                <div
                  key={t}
                  style={{
                    fontSize: "0.8125rem",
                    color: T.text2,
                    marginBottom: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: T.accent2,
                    }}
                  />
                  {t}
                </div>
              ))}
            </div>
          )}
          {profile?.industries?.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <Building2 size={13} color={T.gold} />
                <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                  Industries
                </span>
              </div>
              {profile.industries.slice(0, 4).map((ind) => (
                <div
                  key={ind}
                  style={{
                    fontSize: "0.8125rem",
                    color: T.text2,
                    marginBottom: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: T.gold,
                    }}
                  />
                  {ind}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        {profile?.projects?.length > 0 && (
          <div style={{ padding: "1.25rem 1.75rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.625rem",
              }}
            >
              <Layers size={13} color={T.text2} />
              <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                Key Projects
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {profile.projects.slice(0, 5).map((p) => (
                <span
                  key={p}
                  style={{
                    padding: "0.22rem 0.65rem",
                    borderRadius: 999,
                    background: T.bg3,
                    color: T.text2,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: `1.5px solid ${T.ink}`,
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {parseError && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 10,
            background: isDark ? "rgba(255,122,61,0.14)" : "#FBE3D8",
            border: `2px solid ${T.ink}`,
            boxShadow: T.hardShadowSm,
            color: T.accentDeep,
            fontSize: "0.8125rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertCircle size={14} /> {parseError}
        </div>
      )}

      <div
        style={{ display: "flex", gap: "0.875rem", justifyContent: "center" }}
      >
        <button className="btn-secondary" onClick={onReupload}>
          <Upload size={14} /> Re-upload Resume
        </button>
        <button
          className="btn-primary"
          style={{ background: T.accent }}
          onClick={onFindMatches}
        >
          <Sparkles size={14} /> Find My Matches
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SKILLS BREAKDOWN POPUP (shown when clicking match % badge on job card)
// ════════════════════════════════════════════════════════════════════════════
function SkillsBreakdownPopup({ job, isDark, T, profile, onClose }) {
  const skillData = deriveSkillData(job, profile);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-scale-in"
        style={{
          background: T.bg2,
          borderRadius: 22,
          width: "100%",
          maxWidth: 480,
          maxHeight: "80vh",
          overflow: "auto",
          border: `2px solid ${T.ink}`,
          boxShadow: `8px 8px 0 ${T.ink}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: `2px solid ${T.ink}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: T.bg3,
          }}
        >
          <div>
            <h3
              className="retro-display"
              style={{
                fontSize: "1rem",
                marginBottom: "0.125rem",
              }}
            >
              Skills Match Breakdown
            </h3>
            <p style={{ color: T.text2, fontSize: "0.75rem" }}>
              {job.title} at {job.company}
            </p>
          </div>
          <button
            onClick={onClose}
            className="retro-btn"
            style={{
              width: 32,
              height: 32,
              background: T.bg2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.text,
              padding: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: "1.25rem 1.5rem" }}>
          {/* Score display */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "1.25rem",
              background: scoreBg(job.matchScore, isDark),
              borderRadius: 14,
              padding: "1.25rem",
              border: `2px solid ${T.ink}`,
              boxShadow: T.hardShadowSm,
            }}
          >
            <div
              className="retro-display"
              style={{
                fontSize: "2.5rem",
                color: scoreColor(job.matchScore, isDark),
                lineHeight: 1,
              }}
            >
              {job.matchScore}%
            </div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: T.text2,
                marginTop: "0.375rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Overall Match Score
            </div>
            {/* Progress bar */}
            <div
              style={{
                height: 10,
                borderRadius: 999,
                background: T.bg3,
                border: `1.5px solid ${T.ink}`,
                marginTop: "0.875rem",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${job.matchScore}%`,
                  background: `repeating-linear-gradient(-45deg, ${scoreColor(job.matchScore, isDark)} 0 8px, ${T.ink}22 8px 16px)`,
                  borderRight:
                    job.matchScore < 100 ? `1.5px solid ${T.ink}` : "none",
                  transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            </div>
          </div>

          {/* Matched Skills */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.875rem",
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                color: isDark ? "#3ED9A8" : "#35C99A",
              }}
            >
              <CheckCircle size={14} /> Matched Skills (
              {skillData.matchedSkills.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {skillData.matchedSkills.length > 0 ? (
                skillData.matchedSkills.map((s) => (
                  <span
                    key={s}
                    className="skill-matched"
                    style={{
                      padding: "0.3rem 0.75rem",
                      fontSize: "0.8125rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <Check size={11} /> {s}
                  </span>
                ))
              ) : (
                <p style={{ color: T.text2, fontSize: "0.8125rem" }}>
                  No direct skill matches found
                </p>
              )}
            </div>
          </div>

          {/* Missing Skills */}
          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.875rem",
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                color: T.accentDeep,
              }}
            >
              <AlertCircle size={14} /> Skills to Develop (
              {skillData.missingSkills.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {skillData.missingSkills.length > 0 ? (
                skillData.missingSkills.map((s) => (
                  <span
                    key={s}
                    className="skill-missing"
                    style={{
                      padding: "0.3rem 0.75rem",
                      fontSize: "0.8125rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <AlertCircle size={11} /> {s}
                  </span>
                ))
              ) : (
                <p style={{ color: T.text2, fontSize: "0.8125rem" }}>
                  You have all the required skills! 🎉
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// JOB CARD (top-level)
// ════════════════════════════════════════════════════════════════════════════
function JobCard({
  job,
  isDark,
  T,
  saved,
  onSave,
  onView,
  index,
  profile,
  onHover,
  reportedJobs = {},
  onReportExpired,
  onApply,
  jobStatus,
  onUpdateStatus,
}) {
  const [showSkills, setShowSkills] = useState(false);
  const likelihood = job.interviewLikelihood || "Medium";
  const likColor =
    likelihood === "High"
      ? T.accent2
      : likelihood === "Medium"
        ? T.gold
        : T.accentDeep;
  const cls = [
    "stagger-1",
    "stagger-2",
    "stagger-3",
    "stagger-4",
    "stagger-5",
    "stagger-6",
    "stagger-7",
    "stagger-8",
  ][Math.min(index, 7)];

  const applyUrl =
    job.applyUrl ||
    `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(job.title + " " + job.company)}`;

  const { daysAgo, freshnessClass, freshnessLabel, freshnessTooltip } =
    getFreshness(job.posted);

  // "Why this matches" data — also expose lists for the inline badges
  const skillData = profile
    ? (() => {
        const norm = (s) =>
          s
            .toLowerCase()
            .replace(/\.js/g, "js")
            .replace(/[^a-z0-9+#]+/g, " ")
            .trim();
        const candidateKeys = new Set((profile.topSkills || []).map(norm));
        const jobSkills = [
          ...new Set([...(job.requiredSkills || []), ...(job.tags || [])]),
        ];
        const matchedList = jobSkills.filter((s) => candidateKeys.has(norm(s)));
        const missingList = jobSkills.filter(
          (s) => !candidateKeys.has(norm(s)),
        );
        return {
          matched: matchedList.length,
          total: jobSkills.length,
          gaps: missingList.length,
          matchedList,
          missingList,
        };
      })()
    : null;

  const reportEntry = reportedJobs?.[job.id] || null;
  const isReported = !!reportEntry;
  const reportCount = reportEntry?.count || 0;
  const [showReportModal, setShowReportModal] = useState(false);
  // Link-health-check state
  const [linkChecking, setLinkChecking] = useState(false);
  const [linkWarning, setLinkWarning] = useState(null); // { url, status }

  // Quick HEAD/GET check via our API before opening the apply URL
  const handleApplyClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!applyUrl) return;
    onApply?.(job);
    setLinkChecking(true);
    try {
      const res = await fetch("/api/check-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: applyUrl }),
      });
      const data = await res.json().catch(() => ({}));
      setLinkChecking(false);
      if (res.ok && data.ok) {
        window.open(applyUrl, "_blank", "noopener,noreferrer");
      } else {
        setLinkWarning({ url: applyUrl, status: data?.status || "unknown" });
      }
    } catch (_err) {
      // Network error or endpoint unavailable — open anyway but be quick about it
      setLinkChecking(false);
      window.open(applyUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <div
        className={`${cls} job-card-shell`}
        style={{
          background: T.bg2,
          borderRadius: T.radius,
          border: `2px solid ${T.ink}`,
          padding: "1.1rem 1.2rem",
          cursor: "pointer",
          transition:
            "transform 0.16s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.16s ease",
          marginBottom: "1.1rem",
          opacity: daysAgo > 60 ? 0.6 : 1,
          maxWidth: "100%",
          overflow: "hidden",
          boxShadow: T.hardShadow,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = T.hardShadowLg;
          e.currentTarget.style.transform = "translate(-3px,-3px)";
          onHover?.(job);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = T.hardShadow;
          e.currentTarget.style.transform = "translate(0,0)";
        }}
        onClick={onView}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.875rem",
            marginBottom: "0.75rem",
            minWidth: 0,
          }}
        >
          <CompanyAvatar name={job.company} size={48} isDark={isDark} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "nowrap",
                marginBottom: "0.25rem",
                minWidth: 0,
              }}
            >
              <h3
                title={job.title}
                style={{
                  fontWeight: 700,
                  fontSize: "0.9375rem",
                  color: T.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  flex: "1 1 auto",
                }}
              >
                {job.title}
              </h3>
              <span
                className="retro-sticker"
                style={{
                  padding: "0.15rem 0.6rem",
                  fontSize: "0.6875rem",
                  background: job.jobType === "Internship" ? T.blue : T.gold,
                  color: "#17150F",
                  flexShrink: 0,
                }}
              >
                {job.jobType}
              </span>
              {job.source && (
                <span
                  style={{
                    padding: "0.15rem 0.55rem",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "'Space Mono', monospace",
                    background: T.bg3,
                    color: T.text3,
                    border: `1.5px solid ${T.ink}`,
                    flexShrink: 0,
                  }}
                >
                  {job.source}
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.875rem",
                flexWrap: "nowrap",
                color: T.text2,
                fontSize: "0.75rem",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <Building2 size={11} />
                {job.company}
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <MapPin size={11} />
                {job.location}
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <Globe size={11} />
                {job.workType}
              </span>
              {(job.salaryMin > 0 || job.salaryMax > 0 || job.salary) && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <DollarSign size={11} />
                  {salaryLabel(job)}
                </span>
              )}
            </div>
          </div>
          {/* Score badge — clickable for skills breakdown */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowSkills(true);
            }}
            title="Click to see skills breakdown"
            style={{
              textAlign: "center",
              flexShrink: 0,
              background: scoreBg(job.matchScore, isDark),
              borderRadius: T.radiusSm,
              padding: "0.55rem 0.9rem",
              border: `2px solid ${T.ink}`,
              boxShadow: T.hardShadowSm,
              cursor: "pointer",
              transition:
                "transform 0.14s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.14s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(-2px,-2px)";
              e.currentTarget.style.boxShadow = T.hardShadow;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translate(0,0)";
              e.currentTarget.style.boxShadow = T.hardShadowSm;
            }}
          >
            <div
              className="retro-display"
              style={{
                fontSize: "1.4rem",
                color: scoreColor(job.matchScore, isDark),
                lineHeight: 1,
              }}
            >
              {job.matchScore}%
            </div>
            <div
              style={{
                fontSize: "0.5625rem",
                color: T.text2,
                marginTop: 3,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Match
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 9,
            borderRadius: 999,
            background: T.bg3,
            border: `1.5px solid ${T.ink}`,
            overflow: "hidden",
            marginBottom: "0.75rem",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${job.matchScore}%`,
              background: `repeating-linear-gradient(-45deg, ${scoreColor(job.matchScore, isDark)} 0 8px, ${T.ink}22 8px 16px)`,
              borderRight:
                job.matchScore < 100 ? `1.5px solid ${T.ink}` : "none",
              transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </div>

        {/* Tags row */}
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            flexWrap: "nowrap",
            marginBottom: "0.75rem",
            overflow: "hidden",
          }}
        >
          {job.tags?.slice(0, 4).map((tag) => (
            <span
              key={tag}
              style={{
                padding: "0.22rem 0.65rem",
                borderRadius: 999,
                background: T.bg3,
                color: T.text2,
                fontSize: "0.6875rem",
                fontWeight: 600,
                border: `1.5px solid ${T.ink}`,
                whiteSpace: "nowrap",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Meta row: left = likelihood + time | right = Apply + heart */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          {/* Left side: likelihood + posted time */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: likColor,
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <BarChart3 size={10} /> {likelihood}
            </span>
            <span
              style={{
                fontSize: "0.6875rem",
                color: T.text3,
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <Clock size={10} /> {job.posted}
            </span>
            {/* Freshness Badge */}
            <span
              className={`freshness-badge ${freshnessClass}`}
              title={freshnessTooltip}
            >
              {freshnessLabel}
            </span>
          </div>

          {/* Right side: Apply button + Save heart */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              flexShrink: 0,
            }}
          >
            {/* Apply button (with quick link health check) */}
            <button
              type="button"
              onClick={handleApplyClick}
              disabled={linkChecking}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1.25rem",
                borderRadius: 10,
                background: T.accent,
                color: T.onAccent,
                fontSize: "0.8125rem",
                fontWeight: 800,
                fontFamily: "'Space Grotesk', sans-serif",
                textDecoration: "none",
                cursor: linkChecking ? "wait" : "pointer",
                transition:
                  "transform 0.16s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.16s ease",
                border: `2px solid ${T.ink}`,
                letterSpacing: "0.02em",
                boxShadow: T.hardShadowSm,
                flexShrink: 0,
                opacity: linkChecking ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (linkChecking) return;
                e.currentTarget.style.transform = "translate(-2px,-2px)";
                e.currentTarget.style.boxShadow = T.hardShadow;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translate(0,0)";
                e.currentTarget.style.boxShadow = T.hardShadowSm;
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "translate(2px,2px)";
                e.currentTarget.style.boxShadow = `0 0 0 ${T.ink}`;
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "translate(-2px,-2px)";
                e.currentTarget.style.boxShadow = T.hardShadow;
              }}
            >
              {linkChecking ? (
                <>
                  <Loader2 size={13} className="animate-spin-slow" /> Checking…
                </>
              ) : (
                <>
                  <ExternalLink size={13} /> Apply
                </>
              )}
            </button>
            {/* Save button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: saved ? T.pink : T.bg2,
                border: `2px solid ${T.ink}`,
                boxShadow: T.hardShadowSm,
                cursor: "pointer",
                color: saved ? "#17150F" : T.text3,
                transition:
                  "transform 0.14s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.14s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(-2px,-2px)";
                e.currentTarget.style.boxShadow = T.hardShadow;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translate(0,0)";
                e.currentTarget.style.boxShadow = T.hardShadowSm;
              }}
              title={saved ? "Saved" : "Save job"}
            >
              <Heart size={15} fill={saved ? "#17150F" : "none"} />
            </button>
          </div>
        </div>

        {/* Status badge + update row */}
        {(jobStatus || onUpdateStatus) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              marginBottom: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            {jobStatus && (
              <span
                className="retro-sticker"
                style={{
                  padding: "2px 10px",
                  fontSize: 10,
                  boxShadow: `1.5px 1.5px 0 ${T.ink}`,
                  background:
                    jobStatus === "Interview"
                      ? T.accent2
                      : jobStatus === "Offer"
                        ? T.gold
                        : T.lilac,
                  color: "#17150F",
                }}
              >
                {jobStatus === "Interview"
                  ? "📅"
                  : jobStatus === "Offer"
                    ? "🎉"
                    : "✓"}{" "}
                {jobStatus}
              </span>
            )}
            {onUpdateStatus && (
              <select
                value={jobStatus || ""}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(job.id, e.target.value || null);
                }}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "3px 7px",
                  borderRadius: 7,
                  background: T.bg3,
                  border: `1.5px solid ${T.ink}`,
                  color: T.text2,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="">Update status…</option>
                <option value="Applied">✓ Applied</option>
                <option value="Interview">📅 Interview</option>
                <option value="Offer">🎉 Offer</option>
              </select>
            )}
          </div>
        )}

        {/* "Why this matches" — subtle muted line below tags */}
        {skillData && skillData.matched > 0 && (
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: 12,
              color: "#4ade80",
              lineHeight: 1.4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span>
              <span style={{ fontWeight: 600 }}>We read your whole resume</span>{" "}
              — {skillData.matched} of {skillData.total} required skills match
              {likelihood === "High" && " · strong interview likelihood"}
            </span>
          </div>
        )}

        {/* "Missing for this role" orange badge */}
        {skillData &&
          skillData.missingList &&
          skillData.missingList.length > 0 && (
            <div
              style={{
                marginTop: "0.25rem",
                fontSize: 11,
                color: "#fb923c",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.4,
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                }}
              >
                Gap: {skillData.missingList.slice(0, 2).join(", ")}
                {skillData.missingList.length > 2 &&
                  ` +${skillData.missingList.length - 2}`}
              </span>
              <span style={{ fontStyle: "italic" }}>
                (preferred, not required)
              </span>
            </div>
          )}

        {/* Report expired — show flag link on every job card */}
        {!isReported && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowReportModal(true);
              }}
              style={{
                marginTop: "0.375rem",
                background: "none",
                border: "none",
                color: T.text3,
                fontSize: 10,
                cursor: "pointer",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                opacity: 0.6,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = 1;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = 0.6;
              }}
              title="Report this listing as expired or broken"
            >
              ⚑ Report
            </button>
          </div>
        )}
        {isReported && reportCount === 1 && (
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.625rem",
              color: T.text3,
              fontStyle: "italic",
            }}
          >
            ✓ Reported — thanks for helping keep listings fresh
          </div>
        )}

        {/* Link Warning Modal */}
        {linkWarning && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setLinkWarning(null);
            }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1500,
              padding: "1rem",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: T.bg2,
                border: `2px solid ${T.ink}`,
                borderRadius: 14,
                padding: "1.25rem",
                maxWidth: 400,
                width: "100%",
                boxShadow: `6px 6px 0 ${T.ink}`,
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: T.gold,
                  marginBottom: "0.5rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                ⚠️ This link may no longer be active
              </div>
              <div
                style={{
                  fontSize: "0.8125rem",
                  color: T.text2,
                  marginBottom: "1rem",
                  lineHeight: 1.5,
                }}
              >
                The job posting at this URL returned an error or redirect
                (status: {linkWarning.status}). It might have been removed by
                the employer. Do you still want to proceed?
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(
                      linkWarning.url,
                      "_blank",
                      "noopener,noreferrer",
                    );
                    setLinkWarning(null);
                  }}
                  className="retro-btn"
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    background: T.accent,
                    color: T.onAccent,
                    fontSize: "0.8125rem",
                  }}
                >
                  Yes, open anyway
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLinkWarning(null);
                  }}
                  className="retro-btn"
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    background: T.bg3,
                    color: T.text2,
                    fontSize: "0.8125rem",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Reason Modal */}
        {showReportModal && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowReportModal(false);
            }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1500,
              padding: "1rem",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: T.bg2,
                border: `2px solid ${T.ink}`,
                borderRadius: 14,
                padding: "1.25rem",
                maxWidth: 360,
                width: "100%",
                boxShadow: `6px 6px 0 ${T.ink}`,
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: T.text,
                  marginBottom: "0.25rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                Report this listing
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: T.text2,
                  marginBottom: "0.875rem",
                }}
              >
                Why are you reporting?
              </div>
              {[
                { value: "Position Filled", label: "Position already filled" },
                { value: "Link Broken", label: "Link is broken / 404" },
                { value: "Other", label: "Other reason" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReportExpired?.(job.id, opt.value);
                    setShowReportModal(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.5rem 0.75rem",
                    borderRadius: 8,
                    marginBottom: "0.375rem",
                    background: T.bg3,
                    color: T.text,
                    border: `1.5px solid ${T.ink}`,
                    cursor: "pointer",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = T.bg4 || T.bg3;
                    e.currentTarget.style.boxShadow = `2px 2px 0 ${T.ink}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = T.bg3;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReportModal(false);
                }}
                style={{
                  width: "100%",
                  padding: "0.4rem",
                  borderRadius: 8,
                  marginTop: "0.25rem",
                  background: "transparent",
                  color: T.text3,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Skills Breakdown Popup */}
      {showSkills && profile && (
        <SkillsBreakdownPopup
          job={job}
          isDark={isDark}
          T={T}
          profile={profile}
          onClose={() => setShowSkills(false)}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// KPI OVERVIEW STRIP (top of results — the dashboard signal)
// ════════════════════════════════════════════════════════════════════════════
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    let raf;
    const start = ref.current;
    let t0;
    const step = (ts) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(start + (target - start) * eased);
      setVal(next);
      if (p < 1) raf = requestAnimationFrame(step);
      else ref.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function KpiTile({ T, icon, label, value, suffix = "", tint, index = 0 }) {
  const shown = useCountUp(value);
  return (
    <div
      className={`stagger-${Math.min(index + 1, 8)}`}
      style={{
        flex: "1 1 0",
        minWidth: 128,
        background: T.bg2,
        border: `2px solid ${T.ink}`,
        borderRadius: T.radius,
        boxShadow: T.hardShadow,
        padding: "0.85rem 1rem",
        transition:
          "transform 0.16s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.16s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translate(-3px,-3px)";
        e.currentTarget.style.boxShadow = T.hardShadowLg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translate(0,0)";
        e.currentTarget.style.boxShadow = T.hardShadow;
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          marginBottom: "0.55rem",
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: tint,
            border: `1.5px solid ${T.ink}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#17150F",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: "0.625rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: T.text3,
            lineHeight: 1.1,
          }}
        >
          {label}
        </span>
      </div>
      <div
        className="retro-display"
        style={{ fontSize: "1.75rem", lineHeight: 1, color: T.text }}
      >
        {shown}
        {suffix}
      </div>
    </div>
  );
}

function KPIOverviewStrip({ T, jobsCount, avgMatch, saved, applied, interviews }) {
  const tiles = [
    { icon: <Target size={14} />, label: "Avg Match", value: avgMatch, suffix: "%", tint: T.accent },
    { icon: <Briefcase size={14} />, label: "Jobs Matched", value: jobsCount, tint: T.gold },
    { icon: <Heart size={14} />, label: "Saved", value: saved, tint: T.pink },
    { icon: <CheckCircle size={14} />, label: "Applied", value: applied, tint: T.accent2 },
    { icon: <Users size={14} />, label: "Interviews", value: interviews, tint: T.lilac },
  ];
  return (
    <div
      className="kpi-strip"
      style={{
        display: "flex",
        gap: "0.85rem",
        marginBottom: "1.25rem",
        flexWrap: "wrap",
      }}
    >
      {tiles.map((t, i) => (
        <KpiTile key={t.label} T={T} index={i} {...t} />
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// RESULTS VIEW (top-level)
// ════════════════════════════════════════════════════════════════════════════
function ResultsView({
  T,
  isDark,
  jobs,
  savedJobs,
  onToggleSave,
  onViewJob,
  onHoverJob,
  onReanalyze,
  profile,
  onRematchSkills,
  sidebarFilters,
  setSidebarFilters,
  reportedJobs,
  onReportExpired,
  showOlderJobs,
  setShowOlderJobs,
  onApplyJob,
  jobStatuses = {},
  onUpdateJobStatus,
}) {
  const [filters, setFilters] = useState({
    jobType: "all",
    workType: "all",
    search: "",
  });
  const [sortBy, setSortBy] = useState("matchScore");

  // Skills panel state
  const [skillsPanelOpen, setSkillsPanelOpen] = useState(true);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [addedSkills, setAddedSkills] = useState([]);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [skillsError, setSkillsError] = useState("");

  const existingSkills = profile?.topSkills || [];

  const handleAddSkill = () => {
    const skill = newSkillInput.trim();
    if (!skill) return;
    // Avoid duplicates (check existing + added)
    const allKeys = new Set([
      ...existingSkills.map((s) => s.toLowerCase()),
      ...addedSkills.map((s) => s.toLowerCase()),
    ]);
    if (allKeys.has(skill.toLowerCase())) {
      setSkillsError("This skill is already in your list");
      setTimeout(() => setSkillsError(""), 2500);
      setNewSkillInput("");
      return;
    }
    setAddedSkills((prev) => [...prev, skill]);
    setNewSkillInput("");
    setSkillsError("");
  };

  const handleRemoveAddedSkill = (idx) => {
    setAddedSkills((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleRematch = async () => {
    if (addedSkills.length === 0) {
      setSkillsError("Add at least one new skill to rematch");
      setTimeout(() => setSkillsError(""), 3000);
      return;
    }
    setRematchLoading(true);
    setSkillsError("");
    try {
      const combinedSkills = [...existingSkills, ...addedSkills];
      await onRematchSkills(combinedSkills);
      setToast("Jobs updated with your new skills! \u2705");
      setTimeout(() => setToast(""), 3500);
    } catch (e) {
      setSkillsError("Failed to rematch. Please try again.");
      setTimeout(() => setSkillsError(""), 3000);
    } finally {
      setRematchLoading(false);
    }
  };

  // Freshness helper is imported

  const displayed = jobs
    .filter(
      (j) =>
        !/not available in your region|search for similar jobs in your region|job no longer available/i.test(
          `${j.title || ""} ${j.description || ""}`,
        ),
    )
    .filter((j) => {
      if (filters.jobType !== "all" && j.jobType !== filters.jobType)
        return false;
      if (filters.workType !== "all" && j.workType !== filters.workType)
        return false;
      if (
        filters.search &&
        !j.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !j.company.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      // Sidebar filters
      const selectedExperience =
        sidebarFilters?.experienceLevels ||
        (sidebarFilters?.experienceLevel
          ? [sidebarFilters.experienceLevel]
          : []);
      if (
        selectedExperience.length &&
        !selectedExperience.some((level) =>
          j.experienceLevel?.toLowerCase().includes(level.toLowerCase()),
        )
      )
        return false;
      const selectedWorkTypes =
        sidebarFilters?.workTypes ||
        (sidebarFilters?.workType && sidebarFilters.workType !== "all"
          ? [sidebarFilters.workType]
          : []);
      if (
        selectedWorkTypes.length &&
        !selectedWorkTypes.some(
          (type) => j.workType?.toLowerCase() === type.toLowerCase(),
        )
      )
        return false;
      if (
        sidebarFilters?.roleQuery &&
        !j.title?.toLowerCase().includes(sidebarFilters.roleQuery.toLowerCase())
      )
        return false;
      if (sidebarFilters?.company && j.company !== sidebarFilters.company)
        return false;
      if (sidebarFilters?.datePosted && sidebarFilters.datePosted !== "all") {
        const days = parseDaysAgo(j.posted);
        if (sidebarFilters.datePosted === "24h" && days > 1) return false;
        if (sidebarFilters.datePosted === "week" && days > 7) return false;
        if (sidebarFilters.datePosted === "month" && days > 30) return false;
      }
      // Min salary filter (from sidebar slider)
      if (sidebarFilters?.minSalary && sidebarFilters.minSalary > 0) {
        const jobSal = Math.max(j.salaryMin || 0, j.salaryMax || 0);
        if (jobSal > 0 && jobSal < sidebarFilters.minSalary) return false;
      }
      // Hide jobs that have been reported as expired by users (>=2 reports)
      const reportEntry = reportedJobs?.[j.id];
      if (reportEntry && reportEntry.count >= 2) return false;
      // Freshness gate: hide jobs > 60 days unless showOlderJobs
      if (!showOlderJobs && parseDaysAgo(j.posted) > 60) return false;
      return true;
    })
    .sort((a, b) => {
      if (sidebarFilters?.datePosted === "24h")
        return parseDaysAgo(a.posted) - parseDaysAgo(b.posted);
      return sortBy === "salary"
        ? (b.salaryMax || 0) - (a.salaryMax || 0)
        : b.matchScore - a.matchScore;
    });

  return (
    <div
      className="results-shell"
      style={{ maxWidth: "100%", width: "100%", margin: "0 auto", padding: 0 }}
    >
      {/* Skills panel moved into the LeftSidebar "Add Skills" section. */}

      {/* Toast */}
      {toast && (
        <div className="skills-toast" data-theme={isDark ? "dark" : "light"}>
          {toast}
        </div>
      )}

      {/* ── KPI overview strip ── */}
      <KPIOverviewStrip
        T={T}
        jobsCount={displayed.length}
        avgMatch={
          displayed.length
            ? Math.round(
                displayed.reduce((s, j) => s + (j.matchScore || 0), 0) /
                  displayed.length,
              )
            : 0
        }
        saved={savedJobs.length}
        applied={
          Object.values(jobStatuses || {}).filter((s) => s === "Applied").length
        }
        interviews={
          Object.values(jobStatuses || {}).filter((s) => s === "Interview")
            .length
        }
      />

      {/* ── Active filter pills + global Back to All ── */}
      {(() => {
        const hasFilters =
          sidebarFilters?.experienceLevels?.length > 0 ||
          sidebarFilters?.workTypes?.length > 0 ||
          (sidebarFilters?.datePosted && sidebarFilters.datePosted !== "all") ||
          sidebarFilters?.company ||
          sidebarFilters?.roleQuery;
        if (!hasFilters) return null;
        const clearAll = () =>
          setSidebarFilters?.({
            experienceLevels: [],
            datePosted: "all",
            workTypes: [],
            minSalary: 0,
            roleQuery: "",
            company: "",
          });
        return (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.375rem",
              marginBottom: "0.75rem",
              alignItems: "center",
            }}
          >
            {sidebarFilters?.company && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 11px",
                  borderRadius: 999,
                  fontSize: 11,
                  background: T.blue,
                  color: "#17150F",
                  border: `1.5px solid ${T.ink}`,
                  fontWeight: 700,
                }}
              >
                🏢 {sidebarFilters.company}
                <button
                  onClick={() =>
                    setSidebarFilters?.((f) => ({
                      ...f,
                      company: "",
                      roleQuery: "",
                    }))
                  }
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#17150F",
                    padding: 0,
                    lineHeight: 1,
                    fontSize: 13,
                  }}
                >
                  ×
                </button>
              </span>
            )}
            {sidebarFilters?.datePosted === "24h" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 11px",
                  borderRadius: 999,
                  fontSize: 11,
                  background: T.accent2,
                  color: "#17150F",
                  border: `1.5px solid ${T.ink}`,
                  fontWeight: 700,
                }}
              >
                🔥 New Today
                <button
                  onClick={() =>
                    setSidebarFilters?.((f) => ({ ...f, datePosted: "all" }))
                  }
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#17150F",
                    padding: 0,
                    lineHeight: 1,
                    fontSize: 13,
                  }}
                >
                  ×
                </button>
              </span>
            )}
            {(sidebarFilters?.experienceLevels || []).map((lvl) => (
              <span
                key={lvl}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 11px",
                  borderRadius: 999,
                  fontSize: 11,
                  background: T.lilac,
                  color: "#17150F",
                  border: `1.5px solid ${T.ink}`,
                  fontWeight: 700,
                }}
              >
                Experience: {lvl}
                <button
                  onClick={() =>
                    setSidebarFilters?.((f) => ({
                      ...f,
                      experienceLevels: f.experienceLevels.filter(
                        (v) => v !== lvl,
                      ),
                    }))
                  }
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#17150F",
                    padding: 0,
                    lineHeight: 1,
                    fontSize: 13,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            <button
              onClick={clearAll}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: T.text3,
                fontSize: 11,
                padding: "2px 4px",
                textDecoration: "underline",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              ← Back to All Jobs
            </button>
          </div>
        );
      })()}

      <div
        className="filters-bar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2
            className="retro-display"
            style={{
              fontSize: "1.5rem",
              marginBottom: "0.2rem",
              lineHeight: 1.1,
            }}
          >
            {displayed.length} Jobs Matched
          </h2>
          <p style={{ color: T.text2, fontSize: "0.8125rem", fontWeight: 500 }}>
            Sorted by {sortBy === "salary" ? "Salary" : "Best Match"} · All
            based on your resume
          </p>
        </div>
        <button
          onClick={onReanalyze}
          style={{
            background: T.bg2,
            border: `2px solid ${T.ink}`,
            borderRadius: 10,
            padding: "0.45rem 1rem",
            color: T.text,
            fontSize: "0.75rem",
            fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            boxShadow: T.hardShadowSm,
            transition:
              "transform 0.14s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.14s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translate(-2px,-2px)";
            e.currentTarget.style.boxShadow = T.hardShadow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translate(0,0)";
            e.currentTarget.style.boxShadow = T.hardShadowSm;
          }}
        >
          <Upload size={12} /> Re-analyze
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          background: T.bg2,
          borderRadius: T.radius,
          padding: "0.7rem 0.8rem",
          border: `2px solid ${T.ink}`,
          boxShadow: T.hardShadow,
          marginBottom: "1.5rem",
          display: "flex",
          gap: "0.45rem",
          flexWrap: "nowrap",
          alignItems: "center",
          overflowX: "auto",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 180px", minWidth: 140 }}>
          <Search
            size={12}
            style={{
              position: "absolute",
              left: "0.6rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: T.text3,
              pointerEvents: "none",
            }}
          />
          <input
            placeholder="Search roles or companies..."
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
            style={{
              paddingLeft: "1.7rem",
              paddingRight: "0.6rem",
              paddingTop: "0.38rem",
              paddingBottom: "0.38rem",
              background: T.bg3,
              border: `1.5px solid ${T.ink}`,
              borderRadius: 9,
              color: T.text,
              fontSize: "0.75rem",
              fontWeight: 500,
              outline: "none",
              width: "100%",
            }}
          />
        </div>
        {/* Job Type Filters */}
        {["all", "Full-time", "Internship"].map((opt) => (
          <button
            key={opt}
            onClick={() => setFilters((f) => ({ ...f, jobType: opt }))}
            style={{
              padding: "6px 13px",
              borderRadius: 9,
              border: `1.5px solid ${filters.jobType === opt ? T.ink : T.ink}`,
              background: filters.jobType === opt ? T.accent : T.bg3,
              color: filters.jobType === opt ? T.onAccent : T.text2,
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxShadow:
                filters.jobType === opt ? `1.5px 1.5px 0 ${T.ink}` : "none",
              transition: "background 0.14s, box-shadow 0.14s",
            }}
          >
            {opt === "all" ? "All Types" : opt}
          </button>
        ))}
        {/* Divider */}
        <div
          style={{
            width: 2,
            height: 20,
            background: T.ink,
            borderRadius: 2,
            flexShrink: 0,
            opacity: 0.35,
          }}
        />
        {/* Work Mode Filters */}
        {["all", "Remote", "On-site", "Hybrid"].map((opt) => (
          <button
            key={`wm-${opt}`}
            onClick={() => setFilters((f) => ({ ...f, workType: opt }))}
            style={{
              padding: "6px 13px",
              borderRadius: 9,
              border: `1.5px solid ${T.ink}`,
              background: filters.workType === opt ? T.gold : T.bg3,
              color: filters.workType === opt ? "#17150F" : T.text2,
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxShadow:
                filters.workType === opt ? `1.5px 1.5px 0 ${T.ink}` : "none",
              transition: "background 0.14s, box-shadow 0.14s",
            }}
          >
            {opt === "all" ? "All Modes" : opt}
          </button>
        ))}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            marginLeft: "auto",
            padding: "6px 12px",
            background: T.bg3,
            border: `1.5px solid ${T.ink}`,
            borderRadius: 9,
            color: T.text,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
            outline: "none",
            cursor: "pointer",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          <option value="matchScore">Best Match</option>
          <option value="salary">Highest Salary</option>
        </select>
      </div>

      {displayed.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "3rem 1rem", color: T.text2 }}
        >
          <Search size={32} style={{ marginBottom: "1rem", opacity: 0.4 }} />
          {sidebarFilters?.datePosted === "24h" ? (
            <>
              <p>
                No new jobs in the last 24h — showing this week&apos;s matches.
              </p>
              <button
                onClick={() =>
                  setSidebarFilters?.((f) => ({ ...f, datePosted: "week" }))
                }
                className="retro-btn"
                style={{
                  marginTop: "0.75rem",
                  padding: "0.5rem 1.1rem",
                  background: T.accent,
                  color: T.onAccent,
                  fontSize: "0.8125rem",
                }}
              >
                Show this week’s jobs
              </button>
            </>
          ) : (
            <p>No jobs match your current filters.</p>
          )}
          {!showOlderJobs && sidebarFilters?.datePosted !== "24h" && (
            <button
              onClick={() => setShowOlderJobs?.(true)}
              className="retro-btn"
              style={{
                marginTop: "0.75rem",
                padding: "0.5rem 1.1rem",
                background: T.bg2,
                color: T.text2,
                fontSize: "0.8125rem",
              }}
            >
              Show older listings
            </button>
          )}
        </div>
      ) : (
        <>
          {displayed.map((job, i) => (
            <JobCard
              key={job.id}
              job={job}
              index={i}
              isDark={isDark}
              T={T}
              saved={savedJobs.some((j) => j.id === job.id)}
              onSave={() => onToggleSave(job)}
              onView={() => onViewJob(job)}
              onHover={onHoverJob}
              onApply={onApplyJob}
              profile={profile}
              reportedJobs={reportedJobs}
              onReportExpired={onReportExpired}
              jobStatus={jobStatuses?.[job.id]}
              onUpdateStatus={onUpdateJobStatus}
            />
          ))}
          {!showOlderJobs && jobs.some((j) => parseDaysAgo(j.posted) > 60) && (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <button
                onClick={() => setShowOlderJobs?.(true)}
                className="retro-btn"
                style={{
                  padding: "0.5rem 1.1rem",
                  background: T.bg2,
                  color: T.text2,
                  fontSize: "0.8125rem",
                }}
              >
                Show older listings ▾
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SAVED VIEW (top-level)
// ════════════════════════════════════════════════════════════════════════════
function SavedView({
  T,
  isDark,
  savedJobs,
  onToggleSave,
  onViewJob,
  onGoFind,
  profile,
}) {
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "1.5rem 1.5rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <h2
          className="retro-display"
          style={{
            fontSize: "1.4rem",
          }}
        >
          Saved Jobs{" "}
          <span style={{ color: T.text2, fontWeight: 400, fontSize: "1rem" }}>
            ({savedJobs.length})
          </span>
        </h2>
        <p
          style={{
            color: T.text2,
            fontSize: "0.8125rem",
            marginTop: "0.25rem",
          }}
        >
          Your bookmarked opportunities.
        </p>
      </div>
      {savedJobs.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "4rem 1rem", color: T.text2 }}
        >
          <div aria-hidden="true" style={{ height: 64, display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "0.75rem" }}>
            <McCharacter id="explorer" scale={4} height={64} />
          </div>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
            No saved jobs yet. Tap the heart on any job to save it here.
          </p>
          <button
            className="btn-primary"
            style={{ background: T.accent, marginTop: "1.25rem" }}
            onClick={onGoFind}
          >
            <Search size={14} /> Find Jobs
          </button>
        </div>
      ) : (
        savedJobs.map((job, i) => (
          <JobCard
            key={job.id}
            job={job}
            index={i}
            isDark={isDark}
            T={T}
            saved={true}
            onSave={() => onToggleSave(job)}
            onView={() => onViewJob(job)}
            onApply={onViewJob}
            profile={profile}
          />
        ))
      )}
    </div>
  );
}

function AppliedView({
  T,
  isDark,
  appliedJobs,
  savedJobs,
  onToggleSave,
  onViewJob,
  onGoFind,
  profile,
}) {
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "1.5rem 1.5rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <h2
          className="retro-display"
          style={{
            fontSize: "1.4rem",
          }}
        >
          Applied Jobs{" "}
          <span style={{ color: T.text2, fontWeight: 400, fontSize: "1rem" }}>
            ({appliedJobs.length})
          </span>
        </h2>
        <p
          style={{
            color: T.text2,
            fontSize: "0.8125rem",
            marginTop: "0.25rem",
          }}
        >
          Applications tracked from Apply clicks.
        </p>
      </div>
      {appliedJobs.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "4rem 1rem", color: T.text2 }}
        >
          <Briefcase size={40} style={{ marginBottom: "1rem", opacity: 0.3 }} />
          <p style={{ fontWeight: 600, marginBottom: "1rem" }}>
            No applications tracked yet.
          </p>
          <button
            className="btn-primary"
            style={{ background: T.accent }}
            onClick={onGoFind}
          >
            <Search size={14} /> Find Jobs
          </button>
        </div>
      ) : (
        appliedJobs.map((job, i) => (
          <JobCard
            key={job.id || `${job.title}-${i}`}
            job={job}
            index={i}
            isDark={isDark}
            T={T}
            saved={savedJobs.some((j) => j.id === job.id)}
            onSave={() => onToggleSave(job)}
            onView={() => onViewJob(job)}
            onApply={onViewJob}
            profile={profile}
          />
        ))
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CAREER VIEW (top-level)
// ════════════════════════════════════════════════════════════════════════════
function CareerView({ T, isDark, profile, onGoUpload }) {
  const [dreamJob, setDreamJob] = useState("");
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!dreamJob.trim() || !profile) return;
    setLoading(true);
    setGapAnalysis(null);
    try {
      const res = await fetch("/api/dream-job-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamJob, profile }),
      });
      const data = await res.json();
      setGapAnalysis(data.analysis);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "1.5rem 1.5rem" }}>
      <h2
        className="retro-display"
        style={{
          fontSize: "1.4rem",
          marginBottom: "0.25rem",
        }}
      >
        Career Path Simulator
      </h2>
      <p
        style={{
          color: T.text2,
          fontSize: "0.8125rem",
          marginBottom: "1.75rem",
        }}
      >
        Enter your dream job title to get a personalized skill gap analysis and
        learning roadmap.
      </p>

      {!profile ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            background: T.bg2,
            borderRadius: 16,
            border: `1.5px solid ${T.ink}`,
            boxShadow: T.hardShadow,
          }}
        >
          <GraduationCap
            size={40}
            style={{ marginBottom: "1rem", color: T.text3 }}
          />
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
            Upload your resume first
          </p>
          <p
            style={{
              color: T.text2,
              fontSize: "0.8125rem",
              marginBottom: "1.25rem",
            }}
          >
            We need your profile to generate a personalized roadmap.
          </p>
          <button
            className="btn-primary"
            style={{ background: T.accent }}
            onClick={onGoUpload}
          >
            <Upload size={14} /> Upload Resume
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              background: T.bg2,
              borderRadius: 16,
              border: `1.5px solid ${T.ink}`,
              boxShadow: T.hardShadow,
              padding: "1.5rem",
              marginBottom: "1.25rem",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                fontWeight: 600,
                fontSize: "0.875rem",
                marginBottom: "0.75rem",
              }}
            >
              <Target size={14} color={T.accent} /> What's your dream job title?
            </label>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input
                value={dreamJob}
                onChange={(e) => setDreamJob(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="e.g. Senior Full-Stack Engineer, Data Scientist, Product Manager..."
                style={{
                  flex: 1,
                  padding: "0.625rem 1rem",
                  background: T.bg3,
                  border: `1.5px solid ${T.ink}`,
                  borderRadius: 10,
                  color: T.text,
                  fontSize: "0.875rem",
                  outline: "none",
                }}
              />
              <button
                className="btn-primary"
                style={{ background: T.accent, flexShrink: 0 }}
                onClick={analyze}
                disabled={loading || !dreamJob.trim()}
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin-slow" />
                ) : (
                  <Sparkles size={14} />
                )}
                {loading ? "Analyzing..." : "Analyze Gap"}
              </button>
            </div>
          </div>

          {/* Current skills */}
          <div
            style={{
              background: T.bg2,
              borderRadius: 16,
              border: `1.5px solid ${T.ink}`,
              boxShadow: T.hardShadow,
              padding: "1.25rem 1.5rem",
              marginBottom: "1.25rem",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.875rem",
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <CheckCircle size={14} color={T.accent} /> Your Current Skills
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {profile.topSkills?.map((s) => (
                <span
                  key={s}
                  style={{
                    padding: "0.25rem 0.625rem",
                    borderRadius: 999,
                    background: T.accentDim,
                    color: T.accent,
                    fontSize: "0.75rem",
                    border: `1.5px solid ${T.ink}`,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Gap results */}
          {gapAnalysis && (
            <div>
              <div
                style={{
                  background: T.bg2,
                  borderRadius: 16,
                  border: `2px solid ${T.ink}`,
                  boxShadow: T.hardShadow,
                  padding: "1.25rem 1.5rem",
                  marginBottom: "1rem",
                }}
              >
                <h3
                  className="retro-display"
                  style={{
                    fontSize: "1.0625rem",
                  }}
                >
                  {gapAnalysis.dreamJobTitle}
                </h3>
                <div
                  style={{
                    display: "flex",
                    gap: "1.25rem",
                    marginTop: "0.5rem",
                    color: T.text2,
                    fontSize: "0.8125rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    <span style={{ color: T.accent, fontWeight: 700 }}>
                      {gapAnalysis.currentMatch}%
                    </span>{" "}
                    current match
                  </span>
                  <span>
                    <Clock
                      size={11}
                      style={{ display: "inline", marginRight: 3 }}
                    />
                    {gapAnalysis.timeline}
                  </span>
                  <span
                    style={{
                      color:
                        gapAnalysis.demandLevel === "High" ? T.accent : T.gold,
                    }}
                  >
                    {gapAnalysis.demandLevel} demand
                  </span>
                  {gapAnalysis.salaryRange && (
                    <span>
                      <DollarSign
                        size={11}
                        style={{ display: "inline", marginRight: 2 }}
                      />
                      ${gapAnalysis.salaryRange.min?.toLocaleString()}–$
                      {gapAnalysis.salaryRange.max?.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {gapAnalysis.strengths?.length > 0 && (
                <div
                  style={{
                    background: T.bg2,
                    borderRadius: 16,
                    border: `1.5px solid ${T.ink}`,
                    boxShadow: T.hardShadow,
                    padding: "1.25rem 1.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      marginBottom: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <Star size={14} color={T.gold} /> Your Strengths
                  </div>
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
                          fontWeight: 700,
                          border: `1.5px solid ${T.ink}`,
                        }}
                      >
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {gapAnalysis.skillGaps?.length > 0 && (
                <div
                  style={{
                    background: T.bg2,
                    borderRadius: 16,
                    border: `1.5px solid ${T.ink}`,
                    boxShadow: T.hardShadow,
                    padding: "1.25rem 1.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <AlertCircle size={14} color={T.gold} /> Skills to Learn
                  </div>
                  {gapAnalysis.skillGaps.map((gap, i) => (
                    <div
                      key={gap.skill}
                      style={{
                        marginBottom: "1.125rem",
                        paddingBottom: "1.125rem",
                        borderBottom:
                          i < gapAnalysis.skillGaps.length - 1
                            ? `1.5px solid ${T.ink}`
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          marginBottom: "0.625rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                          {gap.skill}
                        </span>
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            padding: "0.15rem 0.55rem",
                            borderRadius: 999,
                            fontWeight: 700,
                            border: `1.5px solid ${T.ink}`,
                            background:
                              gap.priority === "Essential"
                                ? T.accent
                                : gap.priority === "Important"
                                  ? T.gold
                                  : T.accent2,
                            color:
                              gap.priority === "Essential"
                                ? T.onAccent
                                : "#17150F",
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
                                borderRadius: 999,
                                fontSize: "0.75rem",
                                background: T.bg3,
                                border: `1.5px solid ${T.ink}`,
                                color: T.text2,
                                textDecoration: "none",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.border = `1.5px solid ${T.accent}`)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.border = `1.5px solid ${T.ink}`)
                              }
                            >
                              {res.free && (
                                <span
                                  style={{
                                    color: T.accent,
                                    fontSize: "0.625rem",
                                    fontWeight: 700,
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
                  ))}
                </div>
              )}

              {gapAnalysis.nextSteps?.length > 0 && (
                <div
                  style={{
                    background: T.bg2,
                    borderRadius: 16,
                    border: `1.5px solid ${T.ink}`,
                    boxShadow: T.hardShadow,
                    padding: "1.25rem 1.5rem",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      marginBottom: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <ChevronRight size={14} color={T.accent2} /> Immediate Next
                    Steps
                  </div>
                  {gapAnalysis.nextSteps.map((step, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        marginBottom: "0.625rem",
                        fontSize: "0.8125rem",
                        color: T.text2,
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: T.accentDim,
                          color: T.accent,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {i + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// JOB MODAL (top-level)
// ════════════════════════════════════════════════════════════════════════════
function JobModal({ job, isDark, T, saved, onSave, onClose, profile }) {
  const [tab, setTab] = useState("overview");
  const [atsData, setAtsData] = useState(null);
  const [atsLoading, setAtsLoading] = useState(false);

  const likelihood = job.interviewLikelihood || "Medium";
  const likColor =
    likelihood === "High"
      ? T.accent2
      : likelihood === "Medium"
        ? T.gold
        : T.accentDeep;
  const description = stripJobHtml(job.description || "");
  const skillData = deriveSkillData(job, profile);
  const technologyTags = uniqueSkills(
    [
      ...(job.tags || []),
      ...skillData.matchedSkills,
      ...skillData.missingSkills,
    ],
    8,
  );

  const getAts = async () => {
    setAtsLoading(true);
    setAtsData(null);
    try {
      const res = await fetch("/api/ats-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, job }),
      });
      const data = await res.json();
      setAtsData(data.result);
    } catch (e) {
      console.error(e);
    } finally {
      setAtsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: T.bg2,
          borderRadius: 20,
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          border: `1.5px solid ${T.ink}`,
          boxShadow: isDark
            ? "0 20px 60px rgba(0,0,0,0.8)"
            : "0 20px 60px rgba(0,0,0,0.2)",
        }}
        className="animate-scale-in job-modal-panel"
      >
        {/* Header */}
        <div
          className="job-modal-tabs"
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: `1.5px solid ${T.ink}`,
            display: "flex",
            alignItems: "flex-start",
            gap: "1rem",
            background: isDark ? "#171A1F" : "#FFFFFF",
          }}
        >
          <CompanyAvatar name={job.company} size={48} isDark={isDark} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
                marginBottom: "0.25rem",
              }}
            >
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: "1.0625rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                  overflowWrap: "anywhere",
                }}
              >
                {job.title}
              </h3>
              <span
                style={{
                  fontSize: "0.6875rem",
                  padding: "0.125rem 0.5rem",
                  borderRadius: 999,
                  fontWeight: 700,
                  background: `${likColor}20`,
                  color: likColor,
                  border: `1px solid ${likColor}40`,
                }}
              >
                ⚡ {likelihood} Interview Likelihood
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                color: T.text2,
                fontSize: "0.8125rem",
              }}
            >
              <span>{job.company}</span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <MapPin size={11} />
                {job.location}
              </span>
              <span>
                {job.workType} · {job.jobType}
              </span>
              {(job.salaryMin > 0 || job.salaryMax > 0) && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <DollarSign size={11} />
                  {job.salaryMin > 0
                    ? `$${job.salaryMin.toLocaleString()}`
                    : ""}
                  {job.salaryMin > 0 && job.salaryMax > 0 ? "–" : ""}
                  {job.salaryMax > 0
                    ? `$${job.salaryMax.toLocaleString()}`
                    : "+"}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
            <button
              onClick={onSave}
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                border: `1.5px solid ${T.ink}`,
                background: saved ? T.pink : T.bg3,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: saved ? "#17150F" : T.text2,
              }}
            >
              <Heart size={14} fill={saved ? "#17150F" : "none"} />
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                border: `1.5px solid ${T.ink}`,
                background: T.bg3,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.text2,
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            padding: "0 1.5rem",
            borderBottom: `1.5px solid ${T.ink}`,
            display: "flex",
            gap: "0.25rem",
            background: isDark ? "#171A1F" : "#FFFFFF",
          }}
        >
          {[
            { id: "overview", label: "Overview", icon: <Info size={12} /> },
            { id: "skills", label: "Skills Match", icon: <Target size={12} /> },
            { id: "ats", label: "Resume Tailor", icon: <Wand2 size={12} /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "0.625rem 0.875rem",
                border: "none",
                borderBottom: `2px solid ${tab === t.id ? T.accent : "transparent"}`,
                background: "none",
                cursor: "pointer",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: tab === t.id ? T.accent : T.text2,
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                transition: "all 0.2s",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ overflow: "auto", padding: "1.5rem", flex: 1 }}>
          {tab === "overview" && (
            <div>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  marginBottom: "1.25rem",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    background: scoreBg(job.matchScore, isDark),
                    borderRadius: 12,
                    padding: "1rem 1.25rem",
                    border: `1px solid ${scoreColor(job.matchScore, isDark)}30`,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: scoreColor(job.matchScore, isDark),
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {job.matchScore}%
                  </div>
                  <div style={{ fontSize: "0.75rem", color: T.text2 }}>
                    Overall Match
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: T.border,
                      marginTop: "0.75rem",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${job.matchScore}%`,
                        borderRadius: 2,
                        background: `linear-gradient(90deg, ${scoreColor(job.matchScore, isDark)}, ${T.accent2})`,
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    background: T.bg3,
                    borderRadius: 12,
                    padding: "1rem 1.25rem",
                    border: `1.5px solid ${T.ink}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      color: T.text2,
                      marginBottom: "0.25rem",
                    }}
                  >
                    Experience Level
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {job.experienceLevel}
                  </div>
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      color: T.text2,
                      marginBottom: "0.25rem",
                    }}
                  >
                    Posted
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    {job.posted}
                  </div>
                </div>
              </div>

              {description && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      marginBottom: "0.625rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <FileText size={13} color={T.text2} /> Role Description
                  </div>
                  <p
                    style={{
                      color: T.text2,
                      fontSize: "0.875rem",
                      lineHeight: 1.7,
                      background: T.bg3,
                      padding: "0.875rem 1rem",
                      borderRadius: 10,
                      border: `1.5px solid ${T.ink}`,
                    }}
                  >
                    {description}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    marginBottom: "0.625rem",
                  }}
                >
                  Key Technologies
                </div>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                >
                  {technologyTags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: "0.3rem 0.875rem",
                        borderRadius: 999,
                        background: T.bg3,
                        color: T.text,
                        fontSize: "0.8125rem",
                        border: `1.5px solid ${T.ink}`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <a
                href={
                  job.applyUrl ||
                  `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(job.title + " " + job.company)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", display: "block" }}
              >
                <button
                  className="btn-primary"
                  style={{
                    background: T.accent,
                    width: "100%",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <ExternalLink size={14} />
                  Apply Now
                  {job.source && (
                    <span style={{ fontSize: "0.7rem", opacity: 0.75 }}>
                      via {job.source}
                    </span>
                  )}
                </button>
              </a>
            </div>
          )}

          {tab === "skills" && (
            <div>
              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    marginBottom: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    color: isDark ? "#3ED9A8" : "#35C99A",
                  }}
                >
                  <CheckCircle size={14} /> Matched Skills (
                  {skillData.matchedSkills.length})
                </div>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                >
                  {skillData.matchedSkills.map((s) => (
                    <span
                      key={s}
                      className="skill-matched"
                      style={{
                        padding: "0.3rem 0.75rem",
                        borderRadius: 999,
                        fontSize: "0.8125rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      <Check size={11} /> {s}
                    </span>
                  ))}
                  {skillData.matchedSkills.length === 0 && (
                    <p style={{ color: T.text2, fontSize: "0.8125rem" }}>
                      No direct matches found
                    </p>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    marginBottom: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    color: T.accentDeep,
                  }}
                >
                  <AlertCircle size={14} /> Skills to Develop (
                  {skillData.missingSkills.length})
                </div>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                >
                  {skillData.missingSkills.map((s) => (
                    <span
                      key={s}
                      className="skill-missing"
                      style={{
                        padding: "0.3rem 0.75rem",
                        borderRadius: 999,
                        fontSize: "0.8125rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      <AlertCircle size={11} /> {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    marginBottom: "0.75rem",
                    color: T.text2,
                  }}
                >
                  All Required Skills
                </div>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                >
                  {skillData.requiredSkills.map((s) => {
                    const matched = skillData.matchedSkills.some(
                      (skill) => skillKey(skill) === skillKey(s),
                    );
                    return (
                      <span
                        key={s}
                        style={{
                          padding: "0.3rem 0.8rem",
                          borderRadius: 999,
                          fontSize: "0.8125rem",
                          fontWeight: matched ? 700 : 500,
                          background: matched ? T.accent2 : T.bg3,
                          color: matched ? "#17150F" : T.text2,
                          border: `1.5px solid ${T.ink}`,
                          boxShadow: matched ? T.shadow : "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                        }}
                      >
                        {matched ? <Check size={11} /> : null} {s}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "ats" && (
            <div>
              <p
                style={{
                  color: T.text2,
                  fontSize: "0.8125rem",
                  marginBottom: "1.25rem",
                  lineHeight: 1.6,
                }}
              >
                We check if your resume fits what this employer wants — and
                tailor your summary so the right keywords stand out.
              </p>
              {!atsData && !atsLoading && (
                <button
                  className="btn-primary"
                  style={{
                    background: T.accent,
                    width: "100%",
                    justifyContent: "center",
                    marginBottom: "1rem",
                  }}
                  onClick={getAts}
                >
                  <Wand2 size={14} /> Tailor Resume Summary
                </button>
              )}
              {atsLoading && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.875rem",
                    color: T.text2,
                  }}
                >
                  <Loader2
                    size={24}
                    color={T.accent}
                    className="animate-spin-slow"
                  />
                  <p style={{ fontSize: "0.875rem" }}>
                    Tailoring resume content...
                  </p>
                </div>
              )}
              {atsData && (
                <div>
                  <div
                    style={{
                      background: T.bg3,
                      borderRadius: 12,
                      padding: "1rem",
                      border: `1.5px solid ${T.ink}`,
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                        Optimized Summary
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: T.accent,
                          background: T.accentDim,
                          padding: "0.125rem 0.5rem",
                          borderRadius: 999,
                        }}
                      >
                        Resume Fit: {atsData.atsScore}%
                      </span>
                    </div>
                    <p
                      style={{
                        color: T.text2,
                        fontSize: "0.875rem",
                        lineHeight: 1.65,
                        fontStyle: "italic",
                      }}
                    >
                      {atsData.optimizedSummary}
                    </p>
                  </div>
                  {atsData.keyBullets?.length > 0 && (
                    <div
                      style={{
                        background: T.bg3,
                        borderRadius: 12,
                        padding: "1rem",
                        border: `1.5px solid ${T.ink}`,
                        marginBottom: "1rem",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        Key Bullet Points
                      </div>
                      {atsData.keyBullets.map((b, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: "0.8125rem",
                            color: T.text2,
                            marginBottom: "0.5rem",
                            lineHeight: 1.6,
                          }}
                        >
                          {b}
                        </div>
                      ))}
                    </div>
                  )}
                  {atsData.keywordsAdded?.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <div
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          marginBottom: "0.5rem",
                          color: T.text2,
                        }}
                      >
                        Keywords Added
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.375rem",
                        }}
                      >
                        {atsData.keywordsAdded.map((k) => (
                          <span
                            key={k}
                            style={{
                              padding: "0.2rem 0.625rem",
                              borderRadius: 999,
                              background: T.accentDim,
                              color: T.accent,
                              fontSize: "0.75rem",
                              border: `1.5px solid ${T.ink}`,
                            }}
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {atsData.tips?.length > 0 && (
                    <div
                      style={{
                        background: "rgba(245,158,11,0.08)",
                        borderRadius: 10,
                        padding: "0.875rem 1rem",
                        border: "1px solid rgba(245,158,11,0.2)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          color: T.gold,
                          marginBottom: "0.5rem",
                        }}
                      >
                        ✨ Pro Tips
                      </div>
                      {atsData.tips.map((tip, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: "0.8125rem",
                            color: T.text2,
                            marginBottom: "0.375rem",
                            display: "flex",
                            gap: "0.5rem",
                          }}
                        >
                          <span style={{ color: T.gold, flexShrink: 0 }}>
                            →
                          </span>{" "}
                          {tip}
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    className="btn-secondary"
                    style={{ marginTop: "0.875rem" }}
                    onClick={getAts}
                  >
                    <RefreshCw size={13} /> Regenerate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════════════

// Import centralized user-scoped storage helpers
import {
  userKey,
  nukeAllResumeData,
  clearUserData,
  getUserJSON,
  setUserJSON,
  setUserItem,
  getUserItem,
  userHasResumeData,
} from "@/lib/userStorage";

export default function App() {
  const { user, loading: authLoading, isNewAccount } = useAuth();
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);
  const [appState, setAppState] = useState("landing");
  const [activeTab, setActiveTab] = useState("find");
  const [findState, setFindState] = useState("upload");
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [parseError, setParseError] = useState("");
  // ── New sidebar/dashboard state ──
  const [hoveredJob, setHoveredJob] = useState(null);
  const [showLeftDrawer, setShowLeftDrawer] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const defaultSidebarFilters = {
    experienceLevels: [],
    datePosted: "all",
    workTypes: [],
    minSalary: 0,
    roleQuery: "",
    company: "",
  };
  const [sidebarFilters, setSidebarFilters] = useState(defaultSidebarFilters);
  const [certifications, setCertifications] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [learningPlan, setLearningPlan] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  // reportedJobs is a map { jobId: { count, reasons: [], reportedAt } }
  const [reportedJobs, setReportedJobs] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("cv_reported_jobs") || "{}");
      // Backward-compat: old format was a flat array of jobIds
      if (Array.isArray(raw)) {
        const map = {};
        raw.forEach((id) => {
          map[id] = { count: 1, reasons: ["legacy"], reportedAt: Date.now() };
        });
        return map;
      }
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  });
  const [showOlderJobs, setShowOlderJobs] = useState(false);

  // Job statuses map: { jobId: "Applied" | "Interview" | "Offer" }
  const [jobStatuses, setJobStatuses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cv_job_statuses") || "{}");
    } catch {
      return {};
    }
  });

  // Derived skill suggestions for the LeftSidebar "Add Skills" panel —
  // top job-required skills the candidate doesn't have yet.
  const skillSuggestions = useMemo(() => {
    if (!profile || !jobs?.length) return [];
    const have = new Set((profile.topSkills || []).map((s) => s.toLowerCase()));
    const freq = {};
    jobs.forEach((j) => {
      [...(j.requiredSkills || []), ...(j.tags || [])].forEach((s) => {
        const k = String(s || "").trim();
        if (!k || k.length < 2) return;
        if (have.has(k.toLowerCase())) return;
        freq[k] = (freq[k] || 0) + 1;
      });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([s]) => s);
  }, [profile, jobs]);

  // Add a skill via sidebar — augments profile and re-matches jobs
  const handleAddSkillFromSidebar = async (skill) => {
    if (!profile || !skill) return;
    const trimmed = String(skill).trim();
    if (!trimmed) return;
    const have = new Set((profile.topSkills || []).map((s) => s.toLowerCase()));
    if (have.has(trimmed.toLowerCase())) return;
    const newSkills = [...(profile.topSkills || []), trimmed];
    try {
      await rematchWithSkills(newSkills);
      logActivity?.(`Added skill: ${trimmed}`);
    } catch (e) {
      console.error("Add skill failed", e);
    }
  };

  // Trigger a re-upload of resume (resets to upload state)
  const handleReuploadResume = () => {
    setFindState("upload");
    setActiveTab("find");
  };

  // Track the last uploaded resume info for email tracking
  const lastResumeRef = useRef({ text: "", fileName: "" });
  const fileInputRef = useRef(null);

  // ── Fix 6: Track previous UID to detect account switches ──
  const prevUidRef = useRef(null);

  // Helper: wipe all React state back to a clean "just signed up" baseline
  const resetAllState = () => {
    setProfile(null);
    setJobs([]);
    setSavedJobs([]);
    setFindState("upload");
    setActiveTab("find");
    setSelectedJob(null);
    setParseError("");
    setSessionId("");
    setHoveredJob(null);
    setShowLeftDrawer(false);
    setShowRightDrawer(false);
    setSidebarFilters(defaultSidebarFilters);
    setAppliedJobs([]);
    setLearningPlan([]);
    setActivityLog([]);
    lastResumeRef.current = { text: "", fileName: "" };
  };

  // ── Activity log helper ──
  const logActivity = (text) => {
    setActivityLog((prev) => [{ text, at: Date.now() }, ...prev].slice(0, 20));
  };

  // ── Job status update handler ──
  const handleUpdateJobStatus = (jobId, status) => {
    setJobStatuses((prev) => {
      const next = status
        ? { ...prev, [jobId]: status }
        : Object.fromEntries(
            Object.entries({ ...prev }).filter(([k]) => k !== jobId),
          );
      try {
        localStorage.setItem("cv_job_statuses", JSON.stringify(next));
      } catch {}
      return next;
    });
    if (status)
      logActivity(
        `Marked as ${status}: ${jobs.find((j) => j.id === jobId)?.title || jobId}`,
      );
  };

  const handleApplyJob = (job) => {
    if (!job) return;
    setAppliedJobs((prev) => {
      const next = prev.some((j) => j.id === job.id)
        ? prev
        : [{ ...job, appliedAt: new Date().toISOString() }, ...prev];
      const uid = user?.uid;
      if (uid) setUserJSON(uid, "applied", next);
      return next;
    });
    logActivity(`Applied: ${job.title}`);
  };

  const handleAddToLearningPlan = (cert) => {
    if (!cert?.name) return;
    setLearningPlan((prev) => {
      const next = prev.some((item) => item.name === cert.name)
        ? prev
        : [...prev, { ...cert, addedAt: new Date().toISOString() }];
      const uid = user?.uid;
      if (uid) setUserJSON(uid, "learning_plan", next);
      return next;
    });
  };

  // ── Report expired helper (now accepts reason + counts toward threshold) ──
  const handleReportExpired = (jobId, reason = "Other") => {
    const prev = reportedJobs[jobId];
    const next = {
      ...reportedJobs,
      [jobId]: {
        count: (prev?.count || 0) + 1,
        reasons: [...(prev?.reasons || []), reason],
        reportedAt: Date.now(),
      },
    };
    setReportedJobs(next);
    try {
      localStorage.setItem("cv_reported_jobs", JSON.stringify(next));
    } catch {}
    logActivity(`Reported job as expired (${reason})`);
  };

  // ── Sync theme from localStorage ──
  useEffect(() => {
    const saved = localStorage.getItem("cv_theme");
    if (saved === "light") setIsDark(false);
  }, []);

  // First-run product tour (once per browser; replayable from the account menu).
  useEffect(() => {
    try { if (localStorage.getItem("cv_tour_v1") !== "done") setTourOpen(true); } catch {}
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // Fix 2 + 4 + 6:  Master auth-state handler
  //   • Detects new-vs-returning user
  //   • Nukes ALL foreign/legacy data from localStorage
  //   • Loads ONLY data scoped to the current user's UID
  //   • Detects account switches mid-session
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const uid = user?.uid || null;
    const prevUid = prevUidRef.current;

    // ── Case A: user signed out ──────────────────────────────────────────
    if (!uid) {
      // Fix 5: Wipe React state, clear sessionStorage, keep their
      // UID-scoped localStorage so data is there when they return.
      resetAllState();
      try {
        sessionStorage.clear();
      } catch (_) {}
      prevUidRef.current = null;
      return;
    }

    // ── Case B: uid changed (new login or account switch) ────────────────
    const isAccountSwitch = prevUid !== null && prevUid !== uid;
    const isFirstLoad = prevUid === null;
    prevUidRef.current = uid;

    if (isAccountSwitch) {
      // Fix 6: Different account — nuke everything except new user's data
      resetAllState();
    }

    // Fix 1 + 4: Nuclear wipe of ALL localStorage keys that don't belong
    // to this UID (legacy unscoped keys AND data from other accounts).
    // For brand-new accounts, wipe ALL data (pass null) to guarantee clean slate.
    nukeAllResumeData(isNewAccount ? null : uid);
    // Mark this UID as seen so isNewAccount can't re-trigger the full wipe
    // on the next reload (must be written AFTER the wipe).
    setUserItem(uid, "seen", "1");

    // ── Load this user's scoped data ─────────────────────────────────────
    let sid = getUserItem(uid, "session");
    if (!sid) {
      sid = uuidv4();
      setUserItem(uid, "session", sid);
    }
    setSessionId(sid);

    const savedData = getUserJSON(uid, "saved", []);
    const appliedData = getUserJSON(uid, "applied", []);
    const learningPlanData = getUserJSON(uid, "learning_plan", []);
    const cachedProfile = getUserJSON(uid, "profile", null);
    const cachedJobs = getUserJSON(uid, "jobs", []);
    setSavedJobs(savedData);
    setAppliedJobs(appliedData);
    setLearningPlan(learningPlanData);

    // Fix 2 + 3: Only show cached data if it actually exists for THIS user
    if (cachedProfile && cachedJobs.length > 0) {
      setProfile(cachedProfile);
      setJobs(cachedJobs);
      setFindState("results");
      setAppState("app");
    } else {
      // Fix 3: No data for this user → fresh upload screen
      setProfile(null);
      setJobs([]);
      setFindState("upload");
      // Stay on "app" so they see the upload UI (not landing)
      if (isFirstLoad || isAccountSwitch) {
        setAppState("app");
      }
    }
  }, [user]);

  const T = makeT(isDark);

  const toggleTheme = () =>
    setIsDark((d) => {
      localStorage.setItem("cv_theme", d ? "light" : "dark");
      return !d;
    });

  // ══════════════════════════════════════════════════════════════════════════
  // Fix 5: Sign Out — clear session state, keep UID-scoped localStorage
  // ══════════════════════════════════════════════════════════════════════════
  const handleSignOut = async () => {
    // Wipe all React state first so user never briefly sees old data
    resetAllState();
    // Clear session-level storage
    try {
      sessionStorage.clear();
    } catch (_) {}
    // Sign out from Firebase (triggers onAuthStateChanged → uid becomes null)
    await signOut(auth);
    setAppState("landing");
    router.replace("/");
  };

  const goHome = () => setAppState("landing");
  const goApp = () => {
    // If not logged in, redirect to login page
    if (!user) {
      router.push("/login");
      return;
    }
    setAppState("app");
    setActiveTab("find");
  };

  const resetSession = () => {
    const uid = user?.uid;
    // Wipe this user's scoped data
    clearUserData(uid);
    // Nuclear wipe of any legacy/orphaned keys
    nukeAllResumeData(uid);
    // Fresh session
    const sid = uuidv4();
    if (uid) setUserItem(uid, "session", sid);
    resetAllState();
    setSessionId(sid);
    setAppState("app");
  };

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      if (
        ![
          "application/pdf",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(file.type) &&
        !file.name.endsWith(".pdf") &&
        !file.name.endsWith(".txt") &&
        !file.name.endsWith(".docx")
      ) {
        setParseError("Please upload a PDF, DOCX, or plain text (.txt) file.");
        return;
      }
      setParseError("");
      setFindState("parsing");
      setAppState("app");

      // Extract plain text from the file for tracking (best-effort)
      let resumePlainText = "";
      try {
        if (file.type === "text/plain" || file.name.endsWith(".txt")) {
          resumePlainText = await file.text();
        }
      } catch (_) {
        // Ignore — we'll still send the profile data
      }
      lastResumeRef.current = { text: resumePlainText, fileName: file.name };

      try {
        const fd = new FormData();
        fd.append("resume", file);
        const res = await fetch("/api/parse-resume", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to parse");
        setProfile(data.profile);
        const uid = user?.uid;
        if (uid) {
          setUserJSON(uid, "profile", data.profile);
          setUserItem(uid, "resume_filename", file.name);
        }
        setFindState("review");
      } catch (e) {
        setParseError(e.message || "Failed to parse resume. Please try again.");
        setFindState("upload");
      }
    },
    [user],
  );

  const generateJobs = async () => {
    setFindState("matching");
    setParseError("");
    try {
      const res = await fetch("/api/generate-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate jobs");
      setJobs(data.jobs);
      const uid = user?.uid;
      if (uid) setUserJSON(uid, "jobs", data.jobs);
      setFindState("results");
    } catch (e) {
      setParseError(e.message || "Failed to find matches. Please try again.");
      setFindState("review");
    }
  };

  // Rematch jobs with an augmented skill set (from skills panel)
  const rematchWithSkills = async (combinedSkills) => {
    const augmentedProfile = {
      ...profile,
      topSkills: combinedSkills,
    };
    try {
      const res = await fetch("/api/generate-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: augmentedProfile, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate jobs");
      // Update profile with combined skills and refresh jobs
      setProfile(augmentedProfile);
      const uid = user?.uid;
      if (uid) setUserJSON(uid, "profile", augmentedProfile);
      setJobs(data.jobs);
      if (uid) setUserJSON(uid, "jobs", data.jobs);
    } catch (e) {
      throw e; // Let the caller handle the error
    }
  };

  const toggleSave = (job) => {
    const exists = savedJobs.some((j) => j.id === job.id);
    const next = exists
      ? savedJobs.filter((j) => j.id !== job.id)
      : [...savedJobs, { ...job, savedAt: new Date().toISOString() }];
    setSavedJobs(next);
    const uid = user?.uid;
    if (uid) setUserJSON(uid, "saved", next);
    logActivity(`${exists ? "Unsaved" : "Saved"}: ${job.title}`);
  };

  // Show loading spinner only while auth is loading
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: isDark ? "#0F1115" : "#F6F7F9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: `3px solid transparent`,
            borderTopColor: isDark ? "#FF7A3D" : "#FF6B2B",
            borderRightColor: isDark ? "#FF7A3D" : "#FF6B2B",
            borderRadius: "50%",
            animation: "rotate 0.7s linear infinite",
          }}
        />
      </div>
    );
  }

  // ── Landing page (public, shows auth buttons) ──
  if (appState === "landing") {
    return (
      <LandingPage
        isDark={isDark}
        T={T}
        onStart={goApp}
        toggleTheme={toggleTheme}
        user={user}
        onSignOut={handleSignOut}
      />
    );
  }

  // ── App dashboard requires authentication ──
  if (!user) {
    router.replace("/login");
    return (
      <div
        style={{
          minHeight: "100vh",
          background: isDark ? "#0F1115" : "#F6F7F9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: `3px solid transparent`,
            borderTopColor: isDark ? "#FF7A3D" : "#FF6B2B",
            borderRightColor: isDark ? "#FF7A3D" : "#FF6B2B",
            borderRadius: "50%",
            animation: "rotate 0.7s linear infinite",
          }}
        />
      </div>
    );
  }

  // ── jobsLoaded: controls sidebar visibility and layout mode ──
  const jobsLoaded = findState === "results" && jobs.length > 0;

  // ── Compute career paths for sidebar ──
  const careerPaths =
    profile?.careerPaths ||
    (profile?.domain
      ? [
          {
            targetRole: seniorTitle(profile.jobTitles?.[0] || "Professional"),
            matchPercent: 82,
            transferableSkills: profile.topSkills?.slice(0, 3) || [],
          },
          {
            targetRole: profile.jobTitles?.[1] || "Team Lead",
            matchPercent: 65,
            transferableSkills: profile.topSkills?.slice(1, 4) || [],
          },
        ]
      : []);

  return (
    <div
      data-theme={isDark ? "dark" : "light"}
      className="app-shell"
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        transition: "background 0.3s, color 0.3s",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <AppNavbar
        isDark={isDark}
        T={T}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedJobs.length}
        toggleTheme={toggleTheme}
        resetSession={resetSession}
        goHome={goHome}
        onSignOut={handleSignOut}
        user={user}
        onNavigate={(path) => router.push(path)}
        onOpenLeftDrawer={() => setShowLeftDrawer(true)}
        jobsLoaded={jobsLoaded}
        onReplayTour={() => setTourOpen(true)}
      />

      <Tour open={tourOpen} onClose={() => setTourOpen(false)} />

      {/* ── Sidebar toggle buttons (tablet) — only when jobs are loaded ── */}
      {jobsLoaded && (
        <>
          <button
            className="sidebar-toggle-btn left"
            onClick={() => setShowLeftDrawer(true)}
          >
            <Menu size={14} />
          </button>
          <button
            className="sidebar-toggle-btn right"
            onClick={() => setShowRightDrawer(true)}
          >
            <PanelRightOpen size={14} />
          </button>
        </>
      )}

      <main className="dashboard-main">
        <div className={`dashboard-layout${jobsLoaded ? "" : " upload-mode"}`}>
          {/* ── LEFT SIDEBAR — only visible after jobs are loaded ── */}
          {appState === "app" && jobsLoaded && (
            <LeftSidebar
              T={T}
              isDark={isDark}
              profile={profile}
              jobs={jobs}
              savedJobs={savedJobs}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              sidebarFilters={sidebarFilters}
              setSidebarFilters={setSidebarFilters}
              applicationPipeline={{
                saved: savedJobs.length,
                applied:
                  appliedJobs.length +
                  Object.values(jobStatuses).filter((s) => s === "Applied")
                    .length,
                interview: Object.values(jobStatuses).filter(
                  (s) => s === "Interview",
                ).length,
                offer: Object.values(jobStatuses).filter((s) => s === "Offer")
                  .length,
              }}
              certifications={certifications}
              setCertifications={setCertifications}
              careerPaths={careerPaths}
              skillSuggestions={skillSuggestions}
              onAddSkill={handleAddSkillFromSidebar}
              onReuploadResume={handleReuploadResume}
              onRematchSkills={rematchWithSkills}
              show={showLeftDrawer ? true : undefined}
              onClose={() => setShowLeftDrawer(false)}
            />
          )}

          {/* ── CENTER CONTENT ── */}
          <div className="dashboard-center">
            <GuideStrip
              hasProfile={!!profile}
              savedCount={savedJobs.length}
              appliedCount={appliedJobs.length}
              staleApplied={appliedJobs.filter((j) => j.appliedAt && Date.now() - new Date(j.appliedAt).getTime() > 7 * 864e5).length}
              onAction={(key) => {
                if (key === "review") router.push("/review");
                else if (key === "apply" || key === "followup") setActiveTab("applied");
                else setActiveTab("find");
              }}
              style={{ marginBottom: 16 }}
            />
            {activeTab === "find" && (
              <>
                {findState === "upload" && (
                  <UploadZone
                    isDark={isDark}
                    T={T}
                    onFile={handleFile}
                    parseError={parseError}
                    fileInputRef={fileInputRef}
                    user={user}
                    isNewUser={isNewAccount}
                  />
                )}
                {findState === "parsing" && (
                  <LoadingScreen type="parsing" T={T} isDark={isDark} />
                )}
                {findState === "review" && profile && (
                  <ProfileReview
                    T={T}
                    isDark={isDark}
                    profile={profile}
                    parseError={parseError}
                    onReupload={() => setFindState("upload")}
                    onFindMatches={generateJobs}
                  />
                )}
                {findState === "matching" && (
                  <LoadingScreen type="matching" T={T} isDark={isDark} />
                )}
                {findState === "results" && (
                  <ResultsView
                    T={T}
                    isDark={isDark}
                    jobs={jobs}
                    savedJobs={savedJobs}
                    onToggleSave={toggleSave}
                    onViewJob={(job) => {
                      setSelectedJob(job);
                      logActivity(`Viewed: ${job.title}`);
                    }}
                    onHoverJob={() => {}}
                    onReanalyze={() => {
                      setFindState("review");
                    }}
                    profile={profile}
                    onRematchSkills={rematchWithSkills}
                    sidebarFilters={sidebarFilters}
                    setSidebarFilters={setSidebarFilters}
                    reportedJobs={reportedJobs}
                    onReportExpired={handleReportExpired}
                    showOlderJobs={showOlderJobs}
                    setShowOlderJobs={setShowOlderJobs}
                    onApplyJob={handleApplyJob}
                    jobStatuses={jobStatuses}
                    onUpdateJobStatus={handleUpdateJobStatus}
                  />
                )}
              </>
            )}

            {activeTab === "applied" && (
              <AppliedView
                T={T}
                isDark={isDark}
                appliedJobs={appliedJobs}
                savedJobs={savedJobs}
                onToggleSave={toggleSave}
                onViewJob={(job) => {
                  setSelectedJob(job);
                  logActivity(`Viewed: ${job.title}`);
                }}
                onGoFind={() => setActiveTab("find")}
                profile={profile}
              />
            )}

            {activeTab === "saved" && (
              <SavedView
                T={T}
                isDark={isDark}
                savedJobs={savedJobs}
                onToggleSave={toggleSave}
                onViewJob={(job) => {
                  setSelectedJob(job);
                  logActivity(`Viewed saved: ${job.title}`);
                }}
                onGoFind={() => {
                  setActiveTab("find");
                }}
                profile={profile}
              />
            )}

            {activeTab === "career" && (
              <CareerChangePaths
                T={T}
                isDark={isDark}
                profile={profile}
                onGoUpload={() => {
                  setActiveTab("find");
                  setFindState("upload");
                }}
              />
            )}
          </div>

          {/* ── RIGHT SIDEBAR — only visible after jobs are loaded ── */}
          {appState === "app" && jobsLoaded && (
            <RightSidebar
              T={T}
              isDark={isDark}
              profile={profile}
              jobs={jobs}
              savedJobs={savedJobs}
              hoveredJob={selectedJob}
              activityLog={activityLog}
              learningPlan={learningPlan}
              activeCompany={sidebarFilters.company}
              show={showRightDrawer ? true : undefined}
              onClose={() => setShowRightDrawer(false)}
              onSaveJob={toggleSave}
              onApplyJob={handleApplyJob}
              onRoleSearch={(role) => {
                setSidebarFilters((f) => ({
                  ...f,
                  roleQuery: role,
                  company: "",
                }));
                setActiveTab("find");
              }}
              onOpenCareer={() => setActiveTab("career")}
              onCompanyFilter={(company) => {
                setSidebarFilters((f) => ({
                  ...f,
                  company: f.company === company ? "" : company,
                  roleQuery: "",
                }));
                setActiveTab("find");
              }}
              onAddToPlan={handleAddToLearningPlan}
              onShowNewest={() => {
                // Fix 6: clear ALL filters first, then apply only 24h
                setSidebarFilters({
                  experienceLevels: [],
                  datePosted: "24h",
                  workTypes: [],
                  minSalary: 0,
                  roleQuery: "",
                  company: "",
                });
                setActiveTab("find");
              }}
            />
          )}
        </div>
      </main>

      {/* ── Mobile Bottom Bar ── */}
      <MobileBottomBar
        T={T}
        isDark={isDark}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedJobs.length}
        onOpenLeftDrawer={() => setShowLeftDrawer(true)}
        onOpenRightDrawer={() => setShowRightDrawer(true)}
      />

      {/* ── Drawer overlays for Left Sidebar (mobile/tablet) ── */}
      {false && selectedJob && (
        <JobModal
          job={selectedJob}
          isDark={isDark}
          T={T}
          saved={savedJobs.some((j) => j.id === selectedJob.id)}
          onSave={() => {
            toggleSave(selectedJob);
            logActivity(
              savedJobs.some((j) => j.id === selectedJob.id)
                ? `Unsaved: ${selectedJob.title}`
                : `Saved: ${selectedJob.title}`,
            );
          }}
          onClose={() => setSelectedJob(null)}
          profile={profile}
        />
      )}
    </div>
  );
}
