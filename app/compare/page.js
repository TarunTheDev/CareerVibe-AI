"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronDown, Upload, X, Columns, Rows3, Eye } from "lucide-react";
import { runResumeChecks, ACTION_VERBS } from "@/lib/resumeChecks.mjs";
import { diffSkills, matchRequirements, pairLineDiff, wordDiff } from "@/lib/skillNormalize.mjs";
import { BlockButton, BlockCard, QuoteBlock, AdvancementToast, MiningLoader, MC } from "@/components/pixel/ui.jsx";
import PixelCharacter from "@/components/pixel/PixelCharacter";
import ResumeLabTabs from "@/components/pixel/ResumeLabTabs";

const SAMPLE_A = `Alex Rivera
alex@example.com | 555-0100
Summary: New grad seeking frontend roles.
Skills: HTML, CSS, JavaScript
Experience
- Responsible for the club website
- Worked on a group project
Education: BSc, Example College`;

const SAMPLE_B = `Alex Rivera
alex@example.com | 555-0100 | linkedin.com/in/alex
Summary: Frontend-focused new grad with 2 shipped projects.
Skills: HTML, CSS, JavaScript, React, Git
Projects
- Built a responsive portfolio used by 40 visitors
- Improved Lighthouse score from 62 to 91
Education: BSc, Example College`;

const MAX_BYTES = 10 * 1024 * 1024;

const CATEGORIES = ["impact", "clarity", "quantification", "skills", "structure"];
const CATEGORY_COLOR = {
  impact: MC.emerald,
  clarity: MC.diamond,
  quantification: MC.gold,
  skills: MC.lapis,
  structure: MC.dirt,
};

const makeT = (isDark) => {
  const ink = isDark ? "#EAD9B0" : "#1A1410";
  return {
    bg: isDark ? "#1B1B1B" : "#EAD9B0", bg2: isDark ? "#262626" : "#F7EED8", bg3: isDark ? "#2E2E2E" : "#F4E8CC",
    text: ink, text2: isDark ? "#C9B98F" : "#4A3B2A", text3: isDark ? "#9A8C6C" : "#7A6A52",
    accent: isDark ? "#7BC850" : "#5DAA3A", accent2: "#3DDC84", gold: "#F5C542", redstone: "#D8402E",
    good: isDark ? "#3DDC84" : "#2E7D32", bad: isDark ? "#F0685A" : "#B3261E",
    border: ink, onAccent: isDark ? "#17150F" : "#FFF8EE", ink,
  };
};

function extractJson(str) {
  if (!str) return null;
  const s = str.indexOf("{"), e = str.lastIndexOf("}");
  if (s === -1 || e <= s) return null;
  try { return JSON.parse(str.slice(s, e + 1)); } catch { return null; }
}

function fmtSize(n) {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Parse an uploaded resume via the SAME endpoint the Reviewer uses. Returns
// { text } on success or { error } on failure — never throws.
async function parseResumeFile(file) {
  if (!file) return { error: "No file selected." };
  const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
  const isDocx = /\.docx$/i.test(file.name) ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isText = /\.(txt|md|csv)$/i.test(file.name) || (file.type || "").startsWith("text/");
  if (!isPdf && !isDocx && !isText)
    return { error: "Unsupported file type — upload a PDF, DOCX, or plain text (.txt) file." };
  if (file.size > MAX_BYTES) return { error: "That file is larger than 10 MB — please upload a smaller resume." };
  if (file.size === 0) return { error: "That file is empty (0 bytes) — please upload a resume." };
  try {
    const fd = new FormData();
    fd.append("resume", file);
    const res = await fetch("/api/parse-resume", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = String(data?.error || "");
      if (isPdf && /image scan|scanned|extract text|text-based/i.test(msg))
        return { error: "This looks like a scanned PDF — try a text-based PDF or a DOCX/TXT file." };
      return { error: msg || "Could not parse that file — please try again." };
    }
    const extracted = String(data?.resumeText || "");
    if (!extracted.trim()) return { error: "No text found in that file — try a text-based PDF, DOCX, or TXT file." };
    return { text: extracted };
  } catch {
    return { error: "Could not parse that file — please try again." };
  }
}

// Deterministic metrics for one resume.
const BULLET_RE = /^([•·▪◦*+>–—-]|\d+[.)])\s+/;
function bulletFirstWord(line) {
  const cleaned = line.replace(BULLET_RE, "").trim();
  const m = cleaned.match(/[A-Za-z]+/);
  return m ? m[0].toLowerCase() : "";
}
function computeMetrics(text) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const words = String(text || "").split(/\s+/).filter(Boolean).length;
  const bullets = lines.filter((l) => BULLET_RE.test(l));
  const verbCount = bullets.filter((b) => ACTION_VERBS.includes(bulletFirstWord(b))).length;
  const metricCount = bullets.filter((b) => /\d/.test(b)).length;
  const { summary, checks } = runResumeChecks(text);
  const sections = checks.find((c) => c.id === "sections");
  const foundStr = (sections && sections.detail.match(/Found: ([^.(]+)/)) ? sections.detail.match(/Found: ([^.(]+)/)[1] : "";
  const sectionCount = foundStr.split(",").filter((x) => x.trim()).length;
  return {
    words,
    bullets: bullets.length,
    metricPct: bullets.length ? Math.round((metricCount / bullets.length) * 100) : 0,
    verbPct: bullets.length ? Math.round((verbCount / bullets.length) * 100) : 0,
    sections: sectionCount,
    checksPassed: summary.passed + "/" + summary.total,
  };
}

function extractSkills(text) {
  const lines = String(text || "").split(/\r?\n/);
  const idx = lines.findIndex((l) => /^\s*skills?\b/i.test(l));
  let chunk = "";
  if (idx >= 0) {
    chunk = lines.slice(idx + 1, idx + 4).join(", ");
    chunk = lines[idx].replace(/^\s*skills?\b[:\-]?\s*/i, "") + ", " + chunk;
  } else {
    chunk = lines.join(", ");
  }
  return chunk.split(/[,/•·|;\n]+/).map((s) => s.trim()).filter((s) => s && s.length <= 24);
}

function SkillChip({ label, state }) {
  const matched = state === "both";
  const related = state === "related";
  const color = matched ? MC.emerald : related ? MC.gold : "#8A8A8A";
  return (
    <span title={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.3rem 0.6rem", background: matched ? "#123B2A" : MC.bedrock, color, border: matched ? `3px solid ${MC.emerald}` : related ? `3px solid ${MC.gold}` : `2px dashed ${MC.stoneDark}`, borderRadius: 3, fontSize: "0.85rem" }}>
      <span aria-hidden="true">{matched ? "◆" : related ? "≈" : "＋"}</span>{label}
      <span style={{ fontSize: "0.7rem", opacity: 0.85 }}>{matched ? "both" : related ? "related — confirm" : state === "onlyA" || state === "onlyB" ? "only here" : "missing"}</span>
    </span>
  );
}

// Render word-diff segments; changed tokens become <mark>.
function Segs({ segs, tone }) {
  if (!segs || !segs.length) return <span aria-hidden="true" style={{ opacity: 0.4 }}>—</span>;
  return (
    <>
      {segs.map((s, i) =>
        s.changed ? (
          <mark key={i} style={{ background: tone === "a" ? "rgba(216,64,46,0.38)" : "rgba(61,220,132,0.45)", color: "inherit", padding: "0 1px", borderRadius: 2 }}>{s.text}</mark>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </>
  );
}

export default function ComparePage() {
  const [isDark, setIsDark] = useState(true);
  const [labelA, setLabelA] = useState("Version A");
  const [labelB, setLabelB] = useState("Version B");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [jd, setJd] = useState("");
  const [fileA, setFileA] = useState({ name: "", size: null, state: "idle", error: "" });
  const [fileB, setFileB] = useState({ name: "", size: null, state: "idle", error: "" });
  // Workspace view state
  const [view, setView] = useState("split"); // split | unified
  const [diffOnly, setDiffOnly] = useState(false);
  const [reqRows, setReqRows] = useState(null);
  const [ai, setAi] = useState(null);
  const [openPoints, setOpenPoints] = useState({});
  const [loading, setLoading] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [toast, setToast] = useState(null);
  const T = makeT(isDark);

  useEffect(() => { try { setIsDark(localStorage.getItem("cv_theme") !== "light"); } catch {} }, []);

  const mA = useMemo(() => computeMetrics(a), [a]);
  const mB = useMemo(() => computeMetrics(b), [b]);
  const diff = useMemo(() => diffSkills(extractSkills(a), extractSkills(b)), [a, b]);

  // Aligned diff rows (live — no AI needed). Changed rows carry word-level segments.
  const diffRows = useMemo(() => {
    if (!a.trim() && !b.trim()) return [];
    return pairLineDiff(a, b).map((r) =>
      r.type === "changed" ? { ...r, w: wordDiff(r.left, r.right) } : r
    );
  }, [a, b]);
  const visibleRows = useMemo(
    () => (diffOnly ? diffRows.filter((r) => r.type !== "same") : diffRows),
    [diffRows, diffOnly]
  );
  const changedCount = useMemo(() => diffRows.filter((r) => r.type !== "same").length, [diffRows]);

  const pickFile = async (file, which) => {
    if (!file) return;
    const setFile = which === "A" ? setFileA : setFileB;
    const setTextV = which === "A" ? setA : setB;
    setFile({ name: file.name, size: file.size, state: "parsing", error: "" });
    const { text, error } = await parseResumeFile(file);
    if (error) { setFile({ name: "", size: null, state: "error", error }); return; }
    setTextV(text);
    setFile({ name: file.name, size: file.size, state: "success", error: "" });
    setAi(null); setAiUnavailable(false); setReqRows(null);
    setToast({ title: "Resume loaded", line: `${file.name} parsed into slot ${which}.` });
  };

  const clearSlot = (which) => {
    if (which === "A") { setA(""); setFileA({ name: "", size: null, state: "idle", error: "" }); }
    else { setB(""); setFileB({ name: "", size: null, state: "idle", error: "" }); }
    setAi(null); setAiUnavailable(false); setReqRows(null);
  };

  const clearAll = () => {
    setA(""); setB(""); setJd(""); setLabelA("Version A"); setLabelB("Version B");
    setFileA({ name: "", size: null, state: "idle", error: "" });
    setFileB({ name: "", size: null, state: "idle", error: "" });
    setReqRows(null); setAi(null); setAiUnavailable(false); setDiffOnly(false);
    try { localStorage.removeItem("cv_compare_v1"); } catch {}
  };

  const loadSample = () => {
    setA(SAMPLE_A); setB(SAMPLE_B); setLabelA("Older draft"); setLabelB("Newer draft");
    setFileA({ name: "", size: null, state: "idle", error: "" });
    setFileB({ name: "", size: null, state: "idle", error: "" });
  };

  const normQ = (q, src) => {
    const needle = String(q || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!needle) return false;
    return String(src || "").toLowerCase().replace(/\s+/g, " ").includes(needle);
  };

  const analyze = async () => {
    if (!a.trim() && !b.trim()) return;
    setLoading(true); setAiUnavailable(false); setAi(null); setReqRows(null);
    const hasJd = jd.trim().length > 0;
    const jdBlock = hasJd ? 'JOB DESCRIPTION:\n"""\n' + jd + '\n"""' : "";
    const prompt =
      "You are an honest resume comparison assistant — NOT a hiring predictor and NOT a ranker of people. " +
      "Return ONLY minified JSON, no prose, matching exactly:\n" +
      '{"requirements":[{"term":"...","quote":"..."}],' +
      '"points":[{"category":"impact|clarity|quantification|skills|structure","observationA":"...","observationB":"...","evidenceA":"...","evidenceB":"...","recommendation":"...","stronger":"A|B|tie"}],' +
      '"summary":"..."}\n' +
      (hasJd
        ? 'Fill "requirements" from the JOB DESCRIPTION; every requirement quote MUST be a verbatim substring of the JD.\n'
        : 'Return "requirements":[].\n') +
      'Produce 4-6 "points", each about a DIFFERENT category. Every evidenceA MUST be copied EXACTLY (verbatim substring) from RESUME A and every evidenceB EXACTLY from RESUME B; if a side has no relevant text use "" for that evidence. ' +
      '"recommendation" must NOT add any fact, tool, number, outcome or employer absent from the resumes — use a placeholder like [add your real number] where a metric belongs. ' +
      '"stronger" says only which side shows the stronger signal FOR THAT CATEGORY based on the quoted evidence ("A","B", or "tie") — it is NOT an overall winner and NOT a hiring prediction. ' +
      '"summary" is one neutral sentence on the biggest differences; never declare an overall winner.\n' +
      'RESUME A:\n"""\n' + a + '\n"""\n' +
      'RESUME B:\n"""\n' + b + '\n"""\n' +
      jdBlock;

    let parsed = null;
    for (let i = 0; i < 2 && !parsed; i++) {
      try {
        const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, maxTokens: 1400 }) });
        const data = await res.json(); parsed = extractJson(data?.text || "");
      } catch { parsed = null; }
    }
    if (!parsed) { setLoading(false); setAiUnavailable(true); return; }

    // Job lens: verify each requirement quote exists in the JD; drop failures.
    if (hasJd && Array.isArray(parsed.requirements)) {
      const reqs = parsed.requirements.filter((r) => r && r.term && normQ(r.quote, jd));
      const terms = reqs.map((r) => r.term);
      setReqRows({ terms, rowsA: matchRequirements(terms, extractSkills(a), a), rowsB: matchRequirements(terms, extractSkills(b), b) });
    }

    // AI points: verify evidence quotes are real substrings; drop failures.
    const points = (Array.isArray(parsed.points) ? parsed.points : [])
      .map((p) => {
        if (!p || (!p.observationA && !p.observationB)) return null;
        const cat = CATEGORIES.includes(String(p.category || "").toLowerCase()) ? String(p.category).toLowerCase() : "clarity";
        const okA = !p.evidenceA || normQ(p.evidenceA, a);
        const okB = !p.evidenceB || normQ(p.evidenceB, b);
        if (!okA || !okB) return null;
        const stronger = ["A", "B", "tie"].includes(p.stronger) ? p.stronger : "tie";
        return {
          category: cat,
          observationA: String(p.observationA || ""),
          observationB: String(p.observationB || ""),
          evidenceA: p.evidenceA ? String(p.evidenceA) : "",
          evidenceB: p.evidenceB ? String(p.evidenceB) : "",
          recommendation: String(p.recommendation || ""),
          stronger,
        };
      })
      .filter(Boolean)
      .slice(0, 6);
    const summary = typeof parsed.summary === "string" ? parsed.summary : "";
    setAi({ points, summary });
    setOpenPoints(points.length ? { 0: true } : {});
    setLoading(false);
    setToast({ title: "Comparison complete", line: `${points.length} evidence-backed point${points.length === 1 ? "" : "s"} ready.` });
  };

  const metricRows = [
    { label: "Word count", a: mA.words, b: mB.words, better: null },
    { label: "Bullet lines", a: mA.bullets, b: mB.bullets, better: "high" },
    { label: "% bullets with a metric", a: mA.metricPct + "%", b: mB.metricPct + "%", better: "high" },
    { label: "% bullets start with an action verb", a: mA.verbPct + "%", b: mB.verbPct + "%", better: "high" },
    { label: "Sections found", a: mA.sections, b: mB.sections, better: "high" },
    { label: "Automatic checks passed", a: mA.checksPassed, b: mB.checksPassed, better: "high" },
  ];

  const strongerLabel = (s) => (s === "A" ? labelA : s === "B" ? labelB : "Even");

  // One upload slot (label + upload button + file chip + textarea).
  const renderSlot = (which, value, setValue, label, setLabel, fileState, ph) => (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} aria-label={`Label for resume ${which}`} style={{ flex: 1, minWidth: 120, boxSizing: "border-box", padding: "0.4rem 0.6rem", background: T.bg3, color: T.text, border: `2px solid ${T.ink}`, borderRadius: 4, fontFamily: MC.display, fontSize: "0.6rem" }} />
        <label style={{ position: "relative" }}>
          <input type="file" accept=".pdf,.docx,.txt,.md,.csv,application/pdf,text/*" onChange={(e) => { pickFile(e.target.files?.[0], which); e.target.value = ""; }} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", minWidth: 44, minHeight: 44 }} aria-label={`Upload resume ${which} (PDF, DOCX, or TXT)`} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.5rem 0.75rem", minHeight: 44, boxSizing: "border-box", background: T.bg3, border: `2px solid ${T.ink}`, borderRadius: 4, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", boxShadow: `2px 2px 0 ${T.ink}`, color: T.text }}>
            {fileState.state === "parsing" ? <MiningLoader label="" /> : <Upload size={14} />}
            {fileState.state === "parsing" ? "Parsing…" : value ? "Replace" : "Upload"}
          </span>
        </label>
      </div>
      {fileState.name && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "0.4rem 0.6rem", marginBottom: 6, background: T.bg3, border: `2px solid ${T.ink}`, borderRadius: 4 }}>
          <span style={{ fontWeight: 700, fontSize: "0.78rem", wordBreak: "break-all" }}>{fileState.name}</span>
          {fileState.size != null && <span style={{ fontSize: "0.7rem", color: T.text3 }}>{fmtSize(fileState.size)}</span>}
          {fileState.state === "success" && <span style={{ fontSize: "0.72rem", color: T.accent, fontWeight: 700 }}>✓ Parsed</span>}
          <button onClick={() => clearSlot(which)} aria-label={`Remove file from slot ${which}`} style={{ marginLeft: "auto", minHeight: 32, display: "inline-flex", alignItems: "center", gap: 4, padding: "0.2rem 0.5rem", background: "transparent", border: `2px solid ${T.ink}`, borderRadius: 4, color: T.text, cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}>
            <X size={12} /> Remove
          </button>
        </div>
      )}
      {fileState.state === "error" && fileState.error && (
        <div role="alert" style={{ padding: "0.5rem 0.7rem", marginBottom: 6, background: "rgba(216,64,46,0.14)", border: `2px solid ${MC.redstone}`, borderRadius: 4, color: T.text, fontSize: "0.78rem", fontWeight: 600 }}>{fileState.error}</div>
      )}
      <textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder={ph} aria-label={ph} style={{ width: "100%", minHeight: 170, boxSizing: "border-box", padding: "0.6rem", background: T.bg2, color: T.text, border: `2px solid ${T.ink}`, borderRadius: 4, fontFamily: "inherit", fontSize: "0.9rem", lineHeight: 1.55 }} />
    </div>
  );

  const segBtn = (on) => ({
    display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, padding: "0.4rem 0.75rem",
    fontFamily: MC.display, fontSize: "0.6rem", borderRadius: 4, cursor: "pointer",
    background: on ? MC.grass : T.bg3, color: on ? "#0E2A06" : T.text2,
    border: `2px solid ${T.ink}`, boxShadow: on ? `inset 2px 2px 0 #7BC850, 2px 2px 0 ${T.ink}` : `2px 2px 0 ${T.ink}`,
  });

  return (
    <div data-theme={isDark ? "dark" : "light"} style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: T.bg2, borderBottom: `3px solid ${T.ink}`, boxShadow: `0 3px 0 ${T.ink}`, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem" }}>
        <Link href="/" style={{ color: T.text2, textDecoration: "none", fontSize: "0.85rem", fontWeight: 700 }}>← Back</Link>
        <span style={{ display: "inline-flex", border: `2px solid ${T.ink}`, borderRadius: 3, background: T.bg3, lineHeight: 0 }}>
          <PixelCharacter name="byte" pose="wave" size={30} decorative />
        </span>
        <div style={{ flex: 1 }}>
          {/* Not an h1 — the single page h1 lives in <main> below (W-3a). */}
          <div style={{ margin: 0, fontFamily: MC.display, fontSize: "0.9rem" }}>Resume Comparison</div>
          <p style={{ margin: 0, fontSize: "0.75rem", color: T.text3 }}>Compare two resumes side by side. Evidence-backed points — it won't rank people or claim a winner.</p>
        </div>
        <button onClick={() => setIsDark((d) => { try { localStorage.setItem("cv_theme", d ? "light" : "dark"); } catch {} return !d; })} aria-label="Toggle theme" style={{ width: 36, height: 36, background: T.bg3, border: `2px solid ${T.ink}`, borderRadius: 4, color: T.text, cursor: "pointer", boxShadow: `2px 2px 0 ${T.ink}` }}>{isDark ? "☀" : "☾"}</button>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
        <ResumeLabTabs active="compare" T={T} />
        {/* W-3a: the single, unmissable page heading (consistent with Resume Reviewer) */}
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ margin: 0, fontFamily: MC.display, fontSize: "clamp(1.7rem, 5vw, 2.6rem)", lineHeight: 1.1, letterSpacing: "0.01em", color: T.text }}>Resume Comparison</h1>
          <p style={{ margin: "8px 0 0", fontSize: "1rem", lineHeight: 1.6, color: T.text2, maxWidth: "62ch" }}>Attach two resumes and compare them in an interactive side-by-side workspace — live diff, computed metrics, skill differences, and an AI point-by-point read backed by quoted evidence. No ranking, no winner.</p>
        </div>

        <BlockCard tone={isDark ? "stone" : "parchment"} title="1 · Two resumes" style={{ marginBottom: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }} className="cmp-grid">
            {renderSlot("A", a, setA, labelA, setLabelA, fileA, "Paste Resume A…")}
            {renderSlot("B", b, setB, labelB, setLabelB, fileB, "Paste Resume B…")}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginTop: "12px" }}>
            <BlockButton variant="stone" onClick={loadSample}>Use sample pair</BlockButton>
            <span style={{ fontSize: "0.78rem", color: T.text3 }}>PDF, DOCX or TXT per slot — or paste. The diff updates live as you type.</span>
          </div>
          <div style={{ marginTop: "12px" }}>
            <textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Optional: paste a job description to check which requirement terms appear in each resume (found in text, not proof of skill)…" aria-label="Job description" style={{ width: "100%", minHeight: 90, boxSizing: "border-box", padding: "0.6rem", background: T.bg2, color: T.text, border: `2px solid ${T.ink}`, borderRadius: 4, fontFamily: "inherit", fontSize: "0.9rem", lineHeight: 1.5 }} />
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" }}>
            <BlockButton variant="grass" onClick={analyze} disabled={(!a.trim() && !b.trim()) || loading}>{loading ? "Comparing…" : "Run AI comparison"}</BlockButton>
            <BlockButton variant="redstone" onClick={clearAll}>Clear everything</BlockButton>
          </div>
          <p style={{ fontSize: "0.72rem", color: T.text3, marginTop: "10px", lineHeight: 1.5 }}>Privacy: text stays in this tab. Only the AI step sends it to the model provider via /api/chat. Nothing is saved to storage by default.</p>
        </BlockCard>

        {(a.trim() || b.trim()) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* ── Comparison workspace ── */}
            <BlockCard tone={isDark ? "stone" : "parchment"} title="2 · Comparison workspace">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                <div role="group" aria-label="Diff view mode" style={{ display: "inline-flex", gap: 6 }}>
                  <button type="button" aria-pressed={view === "split"} onClick={() => setView("split")} style={segBtn(view === "split")}><Columns size={14} /> Side by side</button>
                  <button type="button" aria-pressed={view === "unified"} onClick={() => setView("unified")} style={segBtn(view === "unified")}><Rows3 size={14} /> Unified</button>
                </div>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: T.text2, minHeight: 40, cursor: "pointer" }}>
                  <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} style={{ width: 18, height: 18 }} /> <Eye size={14} /> Differences only
                </label>
                <span style={{ marginLeft: "auto", fontFamily: MC.display, fontSize: "0.6rem", color: T.text3 }}>{changedCount} changed line{changedCount === 1 ? "" : "s"}</span>
              </div>

              {diffRows.length === 0 ? (
                <p style={{ color: T.text3, fontSize: "0.85rem" }}>Add text to both resumes to see the comparison.</p>
              ) : visibleRows.length === 0 ? (
                <p style={{ color: T.text3, fontSize: "0.85rem" }}>No differences — the two resumes are identical. Turn off “Differences only” to see the full text.</p>
              ) : view === "split" ? (
                <div style={{ maxHeight: 480, overflow: "auto", border: `3px solid ${MC.ink}`, borderRadius: 3, background: MC.parchment, color: MC.ink }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", position: "sticky", top: 0, zIndex: 2, background: MC.grass, color: "#0E2A06", fontFamily: MC.display, fontSize: "0.6rem" }}>
                    <div style={{ padding: "6px 8px", borderRight: `2px solid ${MC.ink}` }}>{labelA}</div>
                    <div style={{ padding: "6px 8px" }}>{labelB}</div>
                  </div>
                  {visibleRows.map((r, i) => {
                    const leftBg = r.type === "same" ? "transparent"
                      : r.type === "changed" ? "rgba(216,64,46,0.10)"
                      : r.type === "del" ? "rgba(216,64,46,0.18)"
                      : "repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0 6px, transparent 6px 12px)";
                    const rightBg = r.type === "same" ? "transparent"
                      : r.type === "changed" ? "rgba(61,220,132,0.12)"
                      : r.type === "add" ? "rgba(61,220,132,0.20)"
                      : "repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0 6px, transparent 6px 12px)";
                    return (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid rgba(0,0,0,0.08)` }}>
                        <div style={{ padding: "2px 8px", background: leftBg, borderRight: `2px solid rgba(0,0,0,0.15)`, fontFamily: MC.body, fontSize: "1rem", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {r.type === "changed" ? <Segs segs={r.w.a} tone="a" /> : (r.left ?? <span aria-hidden="true" style={{ opacity: 0.4 }}>—</span>)}
                        </div>
                        <div style={{ padding: "2px 8px", background: rightBg, fontFamily: MC.body, fontSize: "1rem", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {r.type === "changed" ? <Segs segs={r.w.b} tone="b" /> : (r.right ?? <span aria-hidden="true" style={{ opacity: 0.4 }}>—</span>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ maxHeight: 480, overflow: "auto", border: `3px solid ${MC.ink}`, borderRadius: 3, background: MC.parchment, color: MC.ink, padding: "4px 0", fontFamily: MC.body, fontSize: "1rem", lineHeight: 1.5 }}>
                  {visibleRows.map((r, i) => {
                    if (r.type === "same") return <div key={i} style={{ padding: "1px 8px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{r.left}</div>;
                    if (r.type === "changed") return (
                      <div key={i} style={{ padding: "1px 0" }}>
                        <div style={{ padding: "1px 8px", background: "rgba(216,64,46,0.12)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}><span style={{ color: MC.redstone, fontWeight: 700 }}>− </span><Segs segs={r.w.a} tone="a" /></div>
                        <div style={{ padding: "1px 8px", background: "rgba(61,220,132,0.14)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}><span style={{ color: MC.grassDark, fontWeight: 700 }}>+ </span><Segs segs={r.w.b} tone="b" /></div>
                      </div>
                    );
                    if (r.type === "del") return <div key={i} style={{ padding: "1px 8px", background: "rgba(216,64,46,0.12)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}><span style={{ color: MC.redstone, fontWeight: 700 }}>− </span>{r.left}</div>;
                    return <div key={i} style={{ padding: "1px 8px", background: "rgba(61,220,132,0.14)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}><span style={{ color: MC.grassDark, fontWeight: 700 }}>+ </span>{r.right}</div>;
                  })}
                </div>
              )}
              <p style={{ fontSize: "0.72rem", color: T.text3, marginTop: "8px" }}>
                {view === "split" ? "Side-by-side rows stay aligned and scroll together. " : "Unified view merges both into one column. "}
                <mark style={{ background: "rgba(216,64,46,0.38)", color: "inherit", padding: "0 2px" }}>red</mark> marks {labelA} text, <mark style={{ background: "rgba(61,220,132,0.45)", color: "inherit", padding: "0 2px" }}>green</mark> marks {labelB}. Word-level highlights show exactly what changed.
              </p>
            </BlockCard>

            {/* ── Metrics ── */}
            <BlockCard tone={isDark ? "stone" : "parchment"} title="3 · Metrics (computed in code)">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", minWidth: 420 }}>
                  <thead>
                    <tr style={{ fontFamily: MC.display, fontSize: "0.55rem", color: T.text3, textAlign: "left" }}>
                      <th style={{ padding: "6px 8px" }}>Metric</th><th style={{ padding: "6px 8px" }}>{labelA}</th><th style={{ padding: "6px 8px" }}>{labelB}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricRows.map((r) => (
                      <tr key={r.label} style={{ borderTop: `2px solid ${T.bg3}` }}>
                        <td style={{ padding: "8px", color: T.text2 }}>{r.label}</td>
                        <td style={{ padding: "8px", fontWeight: 700, color: r.better === "high" && Number(String(r.a).replace(/\D/g, "")) > Number(String(r.b).replace(/\D/g, "")) ? T.good : T.text }}>{r.a}</td>
                        <td style={{ padding: "8px", fontWeight: 700, color: r.better === "high" && Number(String(r.b).replace(/\D/g, "")) > Number(String(r.a).replace(/\D/g, "")) ? T.good : T.text }}>{r.b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: "0.72rem", color: T.text3, marginTop: "8px" }}>Higher is not always better (e.g. word count). Green just marks the larger value where higher is generally better.</p>
            </BlockCard>

            {/* ── Skills diff ── */}
            <BlockCard tone={isDark ? "stone" : "parchment"} title="4 · Skill differences">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                {diff.both.map((s) => <SkillChip key={"b" + s.key} label={s.display} state="both" />)}
                {diff.relatedA.map((s) => <SkillChip key={"ra" + s.key} label={`${s.display} ≈ ${s.relatedTo}`} state="related" />)}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {diff.onlyA.map((s) => <SkillChip key={"a" + s.key} label={s.display} state="onlyA" />)}
                {diff.onlyB.map((s) => <SkillChip key={"c" + s.key} label={s.display} state="onlyB" />)}
              </div>
              {diff.both.length + diff.onlyA.length + diff.onlyB.length + diff.relatedA.length === 0 && (
                <p style={{ color: T.text3, fontSize: "0.85rem" }}>No skills detected yet — add both resumes and click Run AI comparison.</p>
              )}
            </BlockCard>

            {/* ── Job lens ── */}
            {reqRows && (
              <BlockCard tone={isDark ? "stone" : "parchment"} title="5 · Job requirements found in text">
                <p style={{ fontSize: "0.75rem", color: T.text3, marginTop: 0 }}>
                  {labelA}: {reqRows.rowsA.filter((r) => r.status === "found").length} of {reqRows.terms.length} terms found · {labelB}: {reqRows.rowsB.filter((r) => r.status === "found").length} of {reqRows.terms.length}. Terms found in text, not proof of skill.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {reqRows.terms.map((term, i) => {
                    const ra = reqRows.rowsA[i], rb = reqRows.rowsB[i];
                    const word = (r) => r.status === "found" ? "found" : r.status === "related" ? "related — confirm" : "not found in the resume text";
                    return (
                      <div key={i} style={{ padding: "8px", border: `2px solid ${T.bg3}`, borderRadius: 3 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{term}</div>
                        <div style={{ fontSize: "0.82rem", color: T.text2 }}>{labelA}: {word(ra)}{ra.quote ? ` — “${ra.quote}”` : ""}</div>
                        <div style={{ fontSize: "0.82rem", color: T.text2 }}>{labelB}: {word(rb)}{rb.quote ? ` — “${rb.quote}”` : ""}</div>
                      </div>
                    );
                  })}
                  {reqRows.terms.length === 0 && <p style={{ color: T.text3, fontSize: "0.85rem" }}>No verifiable requirements found in the job description.</p>}
                </div>
              </BlockCard>
            )}

            {loading && <BlockCard tone={isDark ? "stone" : "parchment"} title="AI comparison"><div style={{ padding: "1rem 0" }}><MiningLoader label="Comparing…" /></div></BlockCard>}
            {aiUnavailable && (
              <div style={{ padding: "0.75rem 1rem", background: "rgba(216,64,46,0.14)", border: `2px solid ${MC.redstone}`, borderRadius: 4, fontSize: "0.85rem" }}>AI comparison unavailable — showing the workspace, computed metrics and skill diff only.</div>
            )}

            {/* ── AI detailed points ── */}
            {ai && (ai.points.length > 0 || ai.summary) && (
              <BlockCard tone={isDark ? "stone" : "parchment"} title="6 · AI detailed comparison (points, not a verdict)">
                {ai.summary && <p style={{ fontSize: "0.9rem", color: T.text2, marginTop: 0, marginBottom: "12px" }}>🧭 {ai.summary}</p>}
                {ai.points.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                    <BlockButton variant="stone" onClick={() => setOpenPoints(Object.fromEntries(ai.points.map((_, i) => [i, true])))}>Expand all</BlockButton>
                    <BlockButton variant="stone" onClick={() => setOpenPoints({})}>Collapse all</BlockButton>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {ai.points.map((p, i) => {
                    const open = !!openPoints[i];
                    const catColor = CATEGORY_COLOR[p.category] || MC.stone;
                    return (
                      <div key={i} style={{ border: `2px solid ${T.bg3}`, borderRadius: 4, overflow: "hidden" }}>
                        <button
                          type="button"
                          onClick={() => setOpenPoints((o) => ({ ...o, [i]: !o[i] }))}
                          aria-expanded={open}
                          aria-controls={`point-panel-${i}`}
                          style={{ width: "100%", minHeight: 44, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", padding: "0.5rem 0.7rem", background: T.bg3, border: "none", cursor: "pointer", color: T.text, textAlign: "left" }}
                        >
                          <span style={{ fontFamily: MC.display, fontSize: "0.55rem", padding: "0.2rem 0.4rem", borderRadius: 3, background: MC.bedrock, color: catColor, border: `2px solid ${catColor}`, textTransform: "uppercase" }}>{p.category}</span>
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, flex: 1, minWidth: 120 }}>
                            Stronger signal: <span style={{ color: p.stronger === "tie" ? T.text2 : T.accent }}>{strongerLabel(p.stronger)}</span>
                          </span>
                          <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }} />
                        </button>
                        {open && (
                          <div id={`point-panel-${i}`} style={{ padding: "0.75rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }} className="cmp-grid">
                              <div>
                                <div style={{ fontFamily: MC.display, fontSize: "0.55rem", color: T.text3, marginBottom: 4 }}>{labelA}</div>
                                <p style={{ margin: "0 0 6px", fontSize: "0.85rem", color: T.text2 }}>{p.observationA || "—"}</p>
                                {p.evidenceA && <QuoteBlock quote={p.evidenceA} source={labelA} />}
                              </div>
                              <div>
                                <div style={{ fontFamily: MC.display, fontSize: "0.55rem", color: T.text3, marginBottom: 4 }}>{labelB}</div>
                                <p style={{ margin: "0 0 6px", fontSize: "0.85rem", color: T.text2 }}>{p.observationB || "—"}</p>
                                {p.evidenceB && <QuoteBlock quote={p.evidenceB} source={labelB} />}
                              </div>
                            </div>
                            {p.recommendation && (
                              <div style={{ marginTop: "10px", padding: "0.5rem 0.6rem", background: T.bg3, border: `2px dashed ${T.ink}`, borderRadius: 3, fontSize: "0.85rem" }}>
                                <span style={{ fontFamily: MC.display, fontSize: "0.55rem", color: T.text3 }}>SUGGESTION — ONLY USE IT IF TRUE</span>
                                <div style={{ marginTop: 4 }}>💡 {p.recommendation}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: "0.75rem", color: T.text3, marginTop: "10px", lineHeight: 1.5 }}>
                  “Stronger signal” is per category and backed by the quoted evidence — it is not an overall ranking and not a hiring prediction. AI can be wrong; verify every quote before acting.
                </p>
              </BlockCard>
            )}
            <p style={{ fontSize: "0.78rem", color: T.text3 }}>This tool does not rank people or predict hiring outcomes.</p>
          </div>
        )}
      </main>

      <AdvancementToast open={!!toast} title={toast?.title} line={toast?.line} onClose={() => setToast(null)} />
      <style>{`@media (min-width: 860px) { .cmp-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
    </div>
  );
}
