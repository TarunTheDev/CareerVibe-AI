"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Heart,
  ExternalLink,
  Target,
  TrendingUp,
  Building2,
  DollarSign,
  Clock,
  Loader2,
  RefreshCw,
  Zap,
  X,
} from "lucide-react";
import { parseDaysAgo } from "./FreshnessSystem";

// ─── Skill normalizer ─────────────────────────────────────────────────────────
const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/\.js/g, "js")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();

// ─── Format salary (e.g. 85000 -> "$85k") ───────────────────────────────────
const trimNumber = (n) => Number(n.toFixed(1)).toString();

const fmtSalary = (n, isIndian = false) => {
  if (typeof n === "string") return n;
  if (!n || n <= 0) return isIndian ? "₹0L" : "$0";
  if (isIndian) {
    const lakhs = n >= 100000 ? n / 100000 : n;
    return `₹${trimNumber(lakhs)}L`;
  }
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
};

// ─── Indian city/region detector ─────────────────────────────────────────────
const INDIAN_HINTS = [
  "india",
  "bangalore",
  "bengaluru",
  "mumbai",
  "delhi",
  "hyderabad",
  "pune",
  "chennai",
  "kolkata",
  "noida",
  "gurgaon",
  "gurugram",
  "ahmedabad",
  "jaipur",
  "kochi",
  "trivandrum",
  "bhopal",
  "indore",
  "nagpur",
  "remote india",
];

function detectIsIndian(jobs = []) {
  const locs = jobs.map((j) => (j.location || "").toLowerCase());
  const indiaCount = locs.filter((l) =>
    INDIAN_HINTS.some((h) => l.includes(h)),
  ).length;
  return locs.length > 0 && indiaCount / locs.length >= 0.4;
}

function parseSalaryNumbers(value) {
  if (value == null) return [];
  if (typeof value === "number") return value > 0 ? [value] : [];
  if (typeof value === "object") {
    return [
      ...parseSalaryNumbers(value.min || value.minimum || value.salary_min),
      ...parseSalaryNumbers(value.max || value.maximum || value.salary_max),
      ...parseSalaryNumbers(value.amount || value.value),
    ];
  }

  const text = String(value).toLowerCase();
  const usesLakhs = /lpa|lakh|lakhs|lac|lacs|₹|inr|rs\.?/.test(text);
  const usesThousands = /\bk\b|\$|usd/.test(text);
  return (text.match(/\d+(?:\.\d+)?/g) || [])
    .map((part) => {
      const num = Number(part);
      if (!Number.isFinite(num) || num <= 0) return 0;
      if (usesLakhs && num < 200) return num * 100000;
      if (usesThousands && num < 1000) return num * 1000;
      return num;
    })
    .filter(Boolean);
}

function extractJobSalary(job = {}) {
  const minValues = [
    job.salaryMin,
    job.salary_min,
    job.min_salary,
    job.job_min_salary,
  ].flatMap(parseSalaryNumbers);
  const maxValues = [
    job.salaryMax,
    job.salary_max,
    job.max_salary,
    job.job_max_salary,
  ].flatMap(parseSalaryNumbers);
  const rangeValues = [job.salary, job.compensation, job.pay, job.remuneration]
    .flatMap(parseSalaryNumbers)
    .sort((a, b) => a - b);

  const min = minValues[0] || rangeValues[0] || maxValues[0] || 0;
  const max =
    maxValues[0] ||
    rangeValues[rangeValues.length - 1] ||
    minValues[minValues.length - 1] ||
    min;

  return min > 0 || max > 0
    ? { min: min || max, max: max || min, job }
    : null;
}

// ─── Salary lookup table (₹ LPA estimates by domain + level) ─────────────────
const SALARY_FALLBACK = {
  // domain key → { fresher, entry, mid } → { min, max, label }
  tech_engineering: {
    fresher: { min: "₹3L", max: "₹8L", label: "Tech Intern/Fresher" },
    entry: { min: "₹5L", max: "₹12L", label: "Entry-level Tech" },
    mid: { min: "₹12L", max: "₹25L", label: "Mid-level Tech" },
  },
  data_science: {
    fresher: { min: "₹4L", max: "₹10L", label: "Data Science Fresher" },
    entry: { min: "₹8L", max: "₹18L", label: "Data Analyst/Engineer" },
    mid: { min: "₹15L", max: "₹30L", label: "Senior Data Scientist" },
  },
  iot_embedded: {
    fresher: { min: "₹2.5L", max: "₹6L", label: "Embedded/IoT Fresher" },
    entry: { min: "₹4L", max: "₹10L", label: "Embedded Engineer" },
    mid: { min: "₹8L", max: "₹18L", label: "Senior Embedded" },
  },
  marketing: {
    fresher: { min: "₹2L", max: "₹5L", label: "Marketing Fresher" },
    entry: { min: "₹4L", max: "₹9L", label: "Digital Marketer" },
    mid: { min: "₹8L", max: "₹16L", label: "Senior Marketer" },
  },
  sales_marketing: {
    fresher: { min: "₹2L", max: "₹5L", label: "Sales/Marketing Fresher" },
    entry: { min: "₹4L", max: "₹9L", label: "Sales/Marketing Exec" },
    mid: { min: "₹8L", max: "₹16L", label: "Sales/Marketing Manager" },
  },
  business_operations: {
    fresher: { min: "₹2.5L", max: "₹6L", label: "Business Ops Fresher" },
    entry: { min: "₹4L", max: "₹10L", label: "Business Analyst" },
    mid: { min: "₹10L", max: "₹20L", label: "Ops Manager" },
  },
  healthcare: {
    fresher: { min: "₹2L", max: "₹5L", label: "Healthcare Fresher" },
    entry: { min: "₹4L", max: "₹9L", label: "Healthcare Professional" },
    mid: { min: "₹8L", max: "₹15L", label: "Senior Healthcare" },
  },
  education: {
    fresher: { min: "₹2L", max: "₹5L", label: "Education Fresher" },
    entry: { min: "₹3L", max: "₹8L", label: "Educator/Trainer" },
    mid: { min: "₹6L", max: "₹14L", label: "Senior Educator" },
  },
  finance_legal: {
    fresher: { min: "₹3L", max: "₹7L", label: "Finance/Legal Fresher" },
    entry: { min: "₹6L", max: "₹14L", label: "Finance/Legal Analyst" },
    mid: { min: "₹14L", max: "₹28L", label: "Finance/Legal Manager" },
  },
  creative: {
    fresher: { min: "₹2L", max: "₹5L", label: "Creative Fresher" },
    entry: { min: "₹3.5L", max: "₹8L", label: "Designer/Creator" },
    mid: { min: "₹7L", max: "₹16L", label: "Senior Creative" },
  },
  trades_logistics: {
    fresher: { min: "₹1.8L", max: "₹4L", label: "Logistics Fresher" },
    entry: { min: "₹3L", max: "₹7L", label: "Logistics Exec" },
    mid: { min: "₹6L", max: "₹12L", label: "Logistics Manager" },
  },
};

// USD fallback when jobs are international
const SALARY_FALLBACK_USD = {
  tech_engineering: {
    fresher: { min: "$45k", max: "$75k" },
    entry: { min: "$65k", max: "$105k" },
    mid: { min: "$100k", max: "$160k" },
  },
  data_science: {
    fresher: { min: "$50k", max: "$80k" },
    entry: { min: "$75k", max: "$120k" },
    mid: { min: "$115k", max: "$180k" },
  },
  iot_embedded: {
    fresher: { min: "$40k", max: "$65k" },
    entry: { min: "$60k", max: "$95k" },
    mid: { min: "$90k", max: "$140k" },
  },
  marketing: {
    fresher: { min: "$35k", max: "$55k" },
    entry: { min: "$50k", max: "$80k" },
    mid: { min: "$75k", max: "$120k" },
  },
  sales_marketing: {
    fresher: { min: "$35k", max: "$55k" },
    entry: { min: "$50k", max: "$80k" },
    mid: { min: "$75k", max: "$120k" },
  },
  business_operations: {
    fresher: { min: "$40k", max: "$60k" },
    entry: { min: "$55k", max: "$85k" },
    mid: { min: "$80k", max: "$130k" },
  },
  healthcare: {
    fresher: { min: "$38k", max: "$60k" },
    entry: { min: "$55k", max: "$90k" },
    mid: { min: "$80k", max: "$130k" },
  },
  education: {
    fresher: { min: "$32k", max: "$50k" },
    entry: { min: "$45k", max: "$70k" },
    mid: { min: "$65k", max: "$95k" },
  },
  finance_legal: {
    fresher: { min: "$45k", max: "$70k" },
    entry: { min: "$65k", max: "$100k" },
    mid: { min: "$100k", max: "$170k" },
  },
  creative: {
    fresher: { min: "$32k", max: "$52k" },
    entry: { min: "$48k", max: "$75k" },
    mid: { min: "$70k", max: "$110k" },
  },
  trades_logistics: {
    fresher: { min: "$30k", max: "$48k" },
    entry: { min: "$42k", max: "$68k" },
    mid: { min: "$62k", max: "$95k" },
  },
};

const SALARY_DOMAIN_LABELS = {
  tech_engineering: "Tech / Engineering",
  data_science: "Data Science / AI",
  iot_embedded: "IoT / Embedded",
  marketing: "Marketing / Digital",
  sales_marketing: "Marketing / Digital",
  business_operations: "Business / Operations",
  healthcare: "Healthcare",
  education: "Education",
  finance_legal: "Finance / Legal",
  creative: "Creative",
  trades_logistics: "Logistics",
};

function detectSalaryDomain(profile, jobs = []) {
  const text = [
    profile?.domain,
    ...(profile?.industries || []),
    ...(profile?.preferredRoles || []),
    ...(profile?.jobTitles || []),
    ...(profile?.topSkills || []),
    ...(jobs || []).slice(0, 8).map((job) => job.title),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/iot|embedded|firmware|arduino|esp32|microcontroller|hardware/.test(text)) {
    return "iot_embedded";
  }
  if (/data|analytics|machine learning|artificial intelligence|\bai\b|python|sql|tableau|power bi/.test(text)) {
    return "data_science";
  }
  if (/marketing|seo|social media|campaign|brand|digital/.test(text)) {
    return "marketing";
  }
  if (/business|operations|administration|coordinator|procurement|supply chain/.test(text)) {
    return "business_operations";
  }
  if (/healthcare|medical|clinical|nurse|nutrition|dietitian|patient/.test(text)) {
    return "healthcare";
  }
  if (/teacher|education|faculty|lecturer|tutor|curriculum/.test(text)) {
    return "education";
  }
  if (/finance|account|legal|law|compliance|audit|bookkeeping/.test(text)) {
    return "finance_legal";
  }
  return "tech_engineering";
}

function getEstimatedSalary(profile, isIndian) {
  const domain = profile?.salaryDomain || profile?.domain || "tech_engineering";
  const yoe = profile?.yearsExperience ?? 0;
  const level = yoe === 0 ? "fresher" : yoe <= 3 ? "entry" : "mid";
  const table = isIndian ? SALARY_FALLBACK : SALARY_FALLBACK_USD;
  const domainData = table[domain] || table["tech_engineering"];
  return {
    ...(domainData[level] || domainData["entry"]),
    level,
    domain,
    isEstimate: true,
  };
}

// ─── Format time ago ─────────────────────────────────────────────────────────
const formatAgo = (at) => {
  const diff = Math.max(0, Date.now() - (at || Date.now()));
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ─── CompanyAvatar ────────────────────────────────────────────────────────────
function CompanyAvatar({ name, size = 32 }) {
  const initials = (name || "CO")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const colors = [
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
        borderRadius: Math.max(8, size * 0.28),
        background: colors[idx],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: size * 0.36,
        flexShrink: 0,
        border: "1.5px solid var(--ink)",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {initials}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--paper)",
        border: "2px solid var(--border)",
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
        boxShadow: "var(--card-shadow)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Section Title ────────────────────────────────────────────────────────────
function SectionTitle({ children, T, style = {} }) {
  return (
    <div
      style={{
        fontWeight: 800,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: T.text3,
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 5,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIGHT SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════
export default function RightSidebar({
  T,
  isDark,
  profile,
  jobs = [],
  savedJobs = [],
  hoveredJob,
  activityLog = [],
  learningPlan = [],
  activeCompany = "",
  show,
  onClose,
  onSaveJob,
  onApplyJob,
  onRoleSearch,
  onOpenCareer,
  onCompanyFilter,
  onAddToPlan,
  onShowNewest,
}) {
  // ── AI Insights state ────────────────────────────────────────────────────
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const fetchedRef = useRef(false);

  // ── Score color helper — mint / gold / rust tiers ─────────────────────────
  const scoreColor = (score) =>
    score >= 85
      ? isDark
        ? "#3ED9A8"
        : "#1F9E75"
      : score >= 70
        ? isDark
          ? "#FFC838"
          : "#A87508"
        : isDark
          ? "#FF7A3D"
          : "#E5511A";

  // ── Computed: skill match for selected job ────────────────────────────────
  const { matchedSkills, gapSkills } = useMemo(() => {
    if (!hoveredJob) return { matchedSkills: [], gapSkills: [] };
    const candidateKeys = new Set((profile?.topSkills || []).map(norm));
    const jobSkills = [
      ...new Set([
        ...(hoveredJob.requiredSkills || []),
        ...(hoveredJob.tags || []),
      ]),
    ];
    return {
      matchedSkills: jobSkills
        .filter((s) => candidateKeys.has(norm(s)))
        .slice(0, 5),
      gapSkills: jobSkills
        .filter((s) => !candidateKeys.has(norm(s)))
        .slice(0, 4),
    };
  }, [hoveredJob, profile]);

  // ── Computed: top 3 employers by job count ────────────────────────────────
  const topEmployers = useMemo(() => {
    const companyCount = {};
    jobs.forEach((j) => {
      if (j.company)
        companyCount[j.company] = (companyCount[j.company] || 0) + 1;
    });
    return Object.entries(companyCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([company, count]) => ({ company, count }));
  }, [jobs]);

  // ── Computed: salary stats ────────────────────────────────────────────────
  const salaryData = useMemo(() => {
    const isIndian = detectIsIndian(jobs);
    const salaryJobs = jobs.map(extractJobSalary).filter(Boolean);

    if (salaryJobs.length) {
      const mins = salaryJobs.map((item) => item.min).filter(Boolean);
      const maxs = salaryJobs.map((item) => item.max).filter(Boolean);
      const allVals = [...mins, ...maxs].sort((a, b) => a - b);
      return {
        min: Math.min(...mins),
        max: Math.max(...maxs),
        median: allVals[Math.floor(allVals.length / 2)],
        isIndian,
        isEstimate: false,
        context: "based on salary data in current results",
      };
    }

    const domain = detectSalaryDomain(profile, jobs);
    const estimate = getEstimatedSalary({ ...profile, salaryDomain: domain }, isIndian);
    const domainLabel = SALARY_DOMAIN_LABELS[domain] || "Industry";
    const levelLabel =
      estimate.level === "fresher"
        ? domain === "iot_embedded"
          ? "Intern"
          : "Fresher/Intern"
        : estimate.level === "entry"
          ? "Entry"
          : "Mid";

    return {
      ...estimate,
      isIndian,
      context: `estimated for ${domainLabel} ${levelLabel} roles`,
    };
  }, [jobs, profile]);

  const highestPayingJob = useMemo(
    () => {
      const salaryJobs = jobs.map(extractJobSalary).filter(Boolean);
      if (salaryJobs.length) {
        return salaryJobs.sort((a, b) => b.max - a.max)[0].job;
      }
      return [...jobs].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))[0] || null;
    },
    [jobs],
  );
  const highestPayingSalary = highestPayingJob
    ? extractJobSalary(highestPayingJob)
    : null;

  // ── Computed: pulse stats ─────────────────────────────────────────────────
  const newJobsToday = useMemo(
    () => jobs.filter((j) => parseDaysAgo(j.posted) <= 1).length,
    [jobs],
  );
  const matchingToday = useMemo(
    () =>
      jobs.filter((j) => parseDaysAgo(j.posted) <= 1 && j.matchScore >= 70)
        .length,
    [jobs],
  );

  // ── Fallback insights ─────────────────────────────────────────────────────
  const fallbackInsights = useMemo(() => {
    const topMatchScore = jobs.length
      ? Math.max(...jobs.map((j) => j.matchScore || 0))
      : 0;
    const topSkill = profile?.topSkills?.[0] || "your top skill";
    const topSkillCount = jobs.filter((j) => {
      const jSkills = [...(j.requiredSkills || []), ...(j.tags || [])].map(
        norm,
      );
      return jSkills.includes(norm(topSkill));
    }).length;
    return [
      `💡 You match ${topMatchScore}% on your best opportunities — strong candidate profile`,
      `📈 ${jobs.length} curated roles match your background — explore your best fits`,
      `⚡ Your top skill ${topSkill} appears in ${topSkillCount} of your matched jobs`,
    ];
  }, [jobs, profile]);

  // ── Fetch Gemini insights ─────────────────────────────────────────────────
  const fetchInsights = async () => {
    if (!profile || jobs.length === 0) return;
    setInsightsLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch("/api/gemini-sidebar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "insights",
          skills: (profile.topSkills || []).slice(0, 8).join(", "),
          jobs: jobs
            .slice(0, 5)
            .map((j) => `${j.title} at ${j.company}`)
            .join(", "),
          seed: Date.now(), // ensures varied responses every refresh
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.insights) && data.insights.length > 0) {
        setInsights(data.insights.slice(0, 3));
      } else {
        throw new Error("Invalid response");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setInsights([
          "⏱ AI is taking too long — showing curated insights",
          ...fallbackInsights.slice(0, 2),
        ]);
      } else {
        setInsights(fallbackInsights);
      }
    } finally {
      setInsightsLoading(false);
    }
  };

  // ── Initial fetch once jobs load ──────────────────────────────────────────
  useEffect(() => {
    if (jobs.length > 0 && profile && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchInsights();
    }
    // intentionally only re-run when jobs.length changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.length]);

  // ── Misc ──────────────────────────────────────────────────────────────────
  const isDrawer = show !== undefined;
  const isSaved = hoveredJob
    ? savedJobs.some((j) => j.id === hoveredJob.id)
    : false;

  // ── Sidebar style ─────────────────────────────────────────────────────────
  const sidebarStyle = isDrawer
    ? {
        position: "fixed",
        right: 0,
        top: 0,
        height: "100vh",
        width: 280,
        minWidth: 280,
        overflowY: "auto",
        overflowX: "hidden",
        background: T.bg4,
        borderLeft: `2px solid ${T.ink || T.border}`,
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        transition: "transform 300ms cubic-bezier(0.4,0,0.2,1)",
        transform: show ? "translateX(0)" : "translateX(100%)",
        boxShadow: show ? "-4px 0 24px rgba(0,0,0,0.3)" : "none",
      }
    : {
        width: 280,
        minWidth: 280,
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        background: T.bg4,
        borderLeft: `2px solid ${T.ink || T.border}`,
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "none",
      };

  return (
    <>
      {/* ── Keyframe + utility CSS ──────────────────────────────────────── */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0 }
          100% { background-position:  200% 0 }
        }
        @keyframes cvPulseDot {
          0%   { box-shadow: 0 0 0 0   rgba(53,201,154,0.5) }
          70%  { box-shadow: 0 0 0 8px rgba(53,201,154,0)   }
          100% { box-shadow: 0 0 0 0   rgba(53,201,154,0)   }
        }
        @keyframes rsInsightFade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes rsSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .rs-spin { animation: rsSpin 1s linear infinite; display: inline-block; }
        .rs-row-hover:hover  { background: var(--bg4) !important; }
        .rs-btn-hover:hover  { background: var(--bg4) !important; box-shadow: 0 2px 6px rgba(16,24,40,0.10) !important; transform: translateY(-1px); }
        .rs-apply-hover:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(255,107,43,0.28) !important; }
        .rs-apply-hover:active { transform: translateY(0); box-shadow: 0 2px 6px rgba(255,107,43,0.20) !important; }
        .right-sidebar::-webkit-scrollbar       { width: 4px; }
        .right-sidebar::-webkit-scrollbar-track { background: transparent; }
        .right-sidebar::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--ink) 25%, transparent); border-radius: 2px; }
      `}</style>

      {/* ── Backdrop (drawer mode only) ─────────────────────────────────── */}
      {isDrawer && show && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 999,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`right-sidebar${show ? " sidebar-drawer-open" : ""}`}
        style={sidebarStyle}
      >
        {/* Close button – drawer mode only */}
        {isDrawer && (
          <button
            type="button"
            onClick={onClose}
            className="rs-btn-hover"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: T.bg3,
              border: `1.5px solid ${T.ink || T.border}`,
              color: T.text2,
              cursor: "pointer",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
              zIndex: 10,
              transition: "all 150ms",
            }}
          >
            <X size={14} /> Close
          </button>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* § 1  Selected Job Preview                                      */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <SectionCard>
          <SectionTitle T={T}>📌 Selected Job</SectionTitle>

          {!hoveredJob ? (
            /* ── Empty state ─────────────────────────────────────────── */
            <div style={{ textAlign: "center", padding: "20px 8px" }}>
              <Target
                size={28}
                style={{
                  opacity: 0.25,
                  color: T.text3,
                  display: "block",
                  margin: "0 auto 10px",
                }}
              />
              <p
                style={{
                  color: T.text3,
                  fontSize: 12,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                👆 Click any job card to see full details, salary insights, and
                your skill match breakdown
              </p>
            </div>
          ) : (
            /* ── Job detail ──────────────────────────────────────────── */
            <div>
              {/* Header: avatar + title + company */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <CompanyAvatar name={hoveredJob.company} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: T.text,
                      lineHeight: 1.3,
                      marginBottom: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {hoveredJob.title}
                  </div>
                  <div style={{ fontSize: 12, color: T.text2 }}>
                    {hoveredJob.company}
                  </div>
                </div>
              </div>

              {/* Location + work-type chips */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 5,
                  marginBottom: 10,
                }}
              >
                {hoveredJob.location && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: T.bg4,
                      color: T.text2,
                      fontWeight: 600,
                      border: `1.5px solid ${T.ink || T.border}`,
                    }}
                  >
                    📍 {hoveredJob.location}
                  </span>
                )}
                {hoveredJob.workType && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: T.bg4,
                      color: T.text2,
                      fontWeight: 600,
                      border: `1.5px solid ${T.ink || T.border}`,
                    }}
                  >
                    {hoveredJob.workType}
                  </span>
                )}
              </div>

              {/* Match score */}
              <div
                style={{
                  textAlign: "center",
                  padding: "10px 0 6px",
                  marginBottom: 8,
                  borderRadius: 10,
                  border: `1.5px solid ${T.ink || T.border}`,
                  background: T.bg4,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 36,
                    fontWeight: 900,
                    color: scoreColor(hoveredJob.matchScore || 0),
                    lineHeight: 1,
                    marginBottom: 3,
                  }}
                >
                  {hoveredJob.matchScore || 0}%
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: T.text3,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Match Score
                </div>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  border: `1.5px solid ${T.ink || T.border}`,
                  background: T.paper || T.bg3,
                  marginBottom: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${hoveredJob.matchScore || 0}%`,
                    borderRadius: 0,
                    borderRight: `1.5px solid ${T.ink || T.border}`,
                    background: scoreColor(hoveredJob.matchScore || 0),
                    transition: "width 500ms ease",
                  }}
                />
              </div>

              {/* Matched skills */}
              {matchedSkills.length > 0 && (
                <div style={{ marginBottom: 9 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: isDark ? "#3ED9A8" : "#35C99A",
                      fontWeight: 700,
                      marginBottom: 5,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    ✓ Matched Skills
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {matchedSkills.slice(0, 3).map((s, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: isDark ? "#3ED9A8" : "#35C99A",
                          color: "#17150F",
                          border: `1.5px solid ${T.ink || T.border}`,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill gaps */}
              {gapSkills.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#F59E0B",
                      fontWeight: 700,
                      marginBottom: 5,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    ⚡ Skill Gaps
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {gapSkills.slice(0, 2).map((s, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 10,
                          padding: "2px 7px",
                          borderRadius: 8,
                          background: "rgba(245,158,11,0.1)",
                          color: "#F59E0B",
                          border: "1px solid rgba(245,158,11,0.25)",
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Salary + posted date */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {(hoveredJob.salaryMin > 0 || hoveredJob.salaryMax > 0) && (
                  <span
                    style={{
                      fontSize: 11,
                      color: T.text2,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <DollarSign size={11} />
                    {hoveredJob.salaryMin && hoveredJob.salaryMax
                      ? `${fmtSalary(hoveredJob.salaryMin)} – ${fmtSalary(hoveredJob.salaryMax)}`
                      : fmtSalary(hoveredJob.salaryMin || hoveredJob.salaryMax)}
                  </span>
                )}
                {hoveredJob.posted && (
                  <span
                    style={{
                      fontSize: 11,
                      color: T.text3,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Clock size={11} />
                    {hoveredJob.posted}
                  </span>
                )}
              </div>

              {/* Apply + Save buttons */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="rs-apply-hover"
                  onClick={() => {
                    onApplyJob?.(hoveredJob);
                    if (hoveredJob.applyUrl)
                      window.open(hoveredJob.applyUrl, "_blank", "noopener");
                  }}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    borderRadius: 8,
                    border: `1.5px solid ${T.ink || T.border}`,
                    background: T.accent,
                    color: T.onAccent || "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxShadow: T.shadow,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    transition: "all 150ms",
                  }}
                >
                  <ExternalLink size={13} /> Apply Now
                </button>
                <button
                  type="button"
                  onClick={() => onSaveJob?.(hoveredJob)}
                  className="rs-btn-hover"
                  style={{
                    padding: "9px 11px",
                    borderRadius: 8,
                    border: `1.5px solid ${T.ink || T.border}`,
                    background: isSaved ? "#FF8FAB" : T.bg3,
                    color: isSaved ? "#17150F" : T.text2,
                    boxShadow: T.shadow,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    transition: "all 150ms",
                  }}
                >
                  <Heart
                    size={14}
                    fill={isSaved ? "#17150F" : "none"}
                    stroke={isSaved ? "#17150F" : "currentColor"}
                  />
                </button>
              </div>
            </div>
          )}
        </SectionCard>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* § 2  AI Job Insights                                          */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <SectionCard>
          {/* Title + Refresh row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <SectionTitle T={T} style={{ marginBottom: 0 }}>
              ✨ AI Insights for You
            </SectionTitle>
            <button
              type="button"
              onClick={fetchInsights}
              disabled={insightsLoading}
              className="rs-btn-hover"
              style={{
                background: "none",
                border: "none",
                color: T.text3,
                cursor: insightsLoading ? "not-allowed" : "pointer",
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 10,
                display: "flex",
                alignItems: "center",
                gap: 3,
                opacity: insightsLoading ? 0.5 : 1,
                transition: "all 150ms",
              }}
            >
              {insightsLoading ? (
                <Loader2 size={11} className="rs-spin" />
              ) : (
                <RefreshCw size={11} />
              )}{" "}
              Refresh
            </button>
          </div>

          {insightsLoading ? (
            /* Skeleton bars */
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 40,
                    borderRadius: 8,
                    border: `1.5px solid ${T.ink || T.border}`,
                    background:
                      "linear-gradient(90deg, rgba(138,130,113,0.12) 25%, rgba(138,130,113,0.24) 50%, rgba(138,130,113,0.12) 75%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s infinite linear",
                  }}
                />
              ))}
            </div>
          ) : insights.length > 0 ? (
            /* Insights with staggered fade-in */
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {insights.map((insight, i) => (
                <div
                  key={`insight-${i}`}
                  style={{
                    fontSize: 12,
                    color: T.text,
                    lineHeight: 1.5,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: T.bg4,
                    border: `1.5px solid ${T.ink || T.border}`,
                    boxShadow: T.shadow,
                    animation: "rsInsightFade 400ms ease forwards",
                    animationDelay: `${i * 300}ms`,
                    opacity: 0,
                  }}
                >
                  {insight}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                fontSize: 12,
                color: T.text3,
                textAlign: "center",
                padding: "12px 0",
              }}
            >
              Waiting for job data to generate insights…
            </div>
          )}

          <div
            style={{
              fontSize: 9,
              color: T.text3,
              marginTop: 8,
              textAlign: "right",
              opacity: 0.7,
            }}
          >
            Powered by Gemini AI ✨
          </div>
        </SectionCard>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* § 3  Top Employers Hiring                                     */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <SectionCard>
          <SectionTitle T={T}>🏢 Top Employers Hiring</SectionTitle>
          {topEmployers.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: T.text3,
                textAlign: "center",
                padding: "8px 0",
              }}
            >
              No employer data available
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {topEmployers.map(({ company, count }) => {
                const isActive = activeCompany === company;
                return (
                  <div
                    key={company}
                    className="rs-row-hover"
                    onClick={() => onCompanyFilter?.(isActive ? "" : company)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "7px 8px",
                      borderRadius: 8,
                      cursor: "pointer",
                      transition: "all 150ms",
                      background: isActive ? T.accentDim : "transparent",
                      border: isActive
                        ? `1.5px solid ${T.ink || T.border}`
                        : "1.5px solid transparent",
                      boxShadow: isActive ? T.shadow : "none",
                    }}
                  >
                    <CompanyAvatar name={company} size={30} />
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13,
                        color: isActive ? T.accent : T.text,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isActive && (
                        <span style={{ marginRight: 4, color: T.accent }}>
                          ✓
                        </span>
                      )}
                      {company}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#17150F",
                        background: isActive ? T.accent2 : T.gold,
                        border: `1.5px solid ${T.ink || T.border}`,
                        padding: "2px 8px",
                        borderRadius: 999,
                        flexShrink: 0,
                      }}
                    >
                      {count} job{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* § 4  Salary Intelligence                                      */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <SectionCard>
          <SectionTitle T={T}>💰 Salary Intelligence</SectionTitle>
          {(
            <div>
              {/* Salary range — solid retro ink, no gradient */}
              <div
                style={{
                  color: isDark ? "#3ED9A8" : "#1F9E75",
                  fontSize: 18,
                  fontWeight: 800,
                  fontFamily: "'Space Grotesk', sans-serif",
                  lineHeight: 1.2,
                  marginBottom: 3,
                }}
              >
                {fmtSalary(salaryData.min, salaryData.isIndian)} –{" "}
                {fmtSalary(salaryData.max, salaryData.isIndian)} per annum
              </div>
              <div style={{ fontSize: 11, color: T.text3, marginBottom: 12 }}>
                {salaryData.isEstimate
                  ? `(${salaryData.context})`
                  : `median: ${fmtSalary(salaryData.median, salaryData.isIndian)}`}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: T.text3,
                  marginBottom: 12,
                  opacity: 0.7,
                }}
              >
                {salaryData.isEstimate
                  ? "Estimates based on industry averages"
                  : "Based on salary data in current results"}
              </div>

              {/* Highest paying match */}
              {highestPayingJob && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: T.text3,
                      marginBottom: 5,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      fontWeight: 700,
                    }}
                  >
                    Highest paying match
                  </div>
                  <div
                    className="rs-row-hover"
                    onClick={() => onRoleSearch?.(highestPayingJob.title)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 9px",
                      borderRadius: 8,
                      cursor: "pointer",
                      transition: "all 150ms",
                      border: `1.5px solid ${T.ink || T.border}`,
                      background: T.bg4,
                    }}
                  >
                    <CompanyAvatar name={highestPayingJob.company} size={26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: T.text,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {highestPayingJob.title}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: isDark ? "#F59E0B" : "#D97706",
                          fontWeight: 700,
                        }}
                      >
                        {highestPayingSalary
                          ? `up to ${fmtSalary(
                              highestPayingSalary.max,
                              salaryData.isIndian,
                            )}`
                          : `${highestPayingJob.matchScore || 0}% match`}
                      </div>
                    </div>
                    <ExternalLink
                      size={12}
                      style={{ color: T.text3, flexShrink: 0 }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* § 5  Daily Job Pulse                                          */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <SectionCard
          onClick={() => onShowNewest?.()}
          style={{ cursor: "pointer" }}
        >
          <SectionTitle T={T}>🔥 Today's Pulse</SectionTitle>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "4px 4px",
            }}
          >
            {/* Animated pulse dot */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#35C99A",
                flexShrink: 0,
                animation: "cvPulseDot 1.8s infinite ease-out",
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 14,
                  color: T.text,
                  fontWeight: 700,
                  lineHeight: 1.3,
                }}
              >
                🔥 {newJobsToday} new jobs today
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.accent,
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                {matchingToday} match your profile
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* § 6  Recent Activity Feed                                     */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <SectionCard>
          <SectionTitle T={T}>⏱ Recent Activity</SectionTitle>
          {activityLog.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: T.text3,
                textAlign: "center",
                padding: "8px 0",
              }}
            >
              No activity yet — start exploring!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[...activityLog]
                .reverse()
                .slice(0, 5)
                .map((item, i, arr) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 0",
                      borderBottom:
                        i < arr.length - 1
                          ? `1.5px dashed ${T.text3}55`
                          : "none",
                    }}
                  >
                    {/* Green dot */}
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#35C99A",
                        flexShrink: 0,
                      }}
                    />
                    {/* Activity text */}
                    <div
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 12,
                        color: T.text2,
                      }}
                    >
                      {item.text}
                    </div>
                    {/* Time ago */}
                    <div
                      style={{ fontSize: 10, color: T.text3, flexShrink: 0 }}
                    >
                      {formatAgo(item.at)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </SectionCard>
      </aside>
    </>
  );
}
