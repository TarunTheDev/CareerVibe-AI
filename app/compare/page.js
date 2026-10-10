"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { runResumeChecks, ACTION_VERBS } from "@/lib/resumeChecks.mjs";
import { diffSkills, matchRequirements, lineDiff, normalizeSkill } from "@/lib/skillNormalize.mjs";
import { BlockButton, BlockCard, QuoteBlock, AdvancementToast, MiningLoader, MC } from "@/components/pixel/ui.jsx";
import { McFace } from "@/components/pixel/McCharacter";

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

// Pull a rough skill list from a resume's Skills section (comma/slash separated).
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

export default function ComparePage() {
  const [isDark, setIsDark] = useState(true);
  const [labelA, setLabelA] = useState("Version A");
  const [labelB, setLabelB] = useState("Version B");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [jd, setJd] = useState("");
  const [sameResume, setSameResume] = useState(false);
  const [reqRows, setReqRows] = useState(null);
  const [ai, setAi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [toast, setToast] = useState(null);
  const T = makeT(isDark);

  useEffect(() => { try { setIsDark(localStorage.getItem("cv_theme") !== "light"); } catch {} }, []);

  const mA = useMemo(() => computeMetrics(a), [a]);
  const mB = useMemo(() => computeMetrics(b), [b]);
  const diff = useMemo(() => diffSkills(extractSkills(a), extractSkills(b)), [a, b]);
  const lineD = useMemo(() => (sameResume ? lineDiff(a, b) : []), [a, b, sameResume]);

  const clearAll = () => { setA(""); setB(""); setJd(""); setLabelA("Version A"); setLabelB("Version B"); setReqRows(null); setAi(null); setAiUnavailable(false); setSameResume(false); try { localStorage.removeItem("cv_compare_v1"); } catch {} };

  const loadSample = () => { setA(SAMPLE_A); setB(SAMPLE_B); setLabelA("Older draft"); setLabelB("Newer draft"); setSameResume(true); };

  const normQ = (q, src) => String(q || "").toLowerCase().replace(/\s+/g, " ").trim() && String(src || "").toLowerCase().replace(/\s+/g, " ").includes(String(q || "").toLowerCase().replace(/\s+/g, " ").trim());

  const analyze = async () => {
    if (!a.trim() && !b.trim()) return;
    setLoading(true); setAiUnavailable(false); setAi(null); setReqRows(null);
    const hasJd = jd.trim().length > 0;
    const reqPart = hasJd
      ? 'From the JOB DESCRIPTION, extract requirements as {"requirements":[{"term":"...","quote":"..."}]} — every quote MUST be a verbatim substring of the JD.'
      : '{"requirements":[]}';
    const jdBlock = hasJd ? 'JOB DESCRIPTION:\n"""\n' + jd + '\n"""' : "";
    const prompt =
      "Return ONLY minified JSON. " + reqPart +
      ' and also a qualitative comparison {"dimensions":[{"name":"clarity","note":"...","quoteA":"...","quoteB":"..."}],"suggestion":"..."} where every quoteA is verbatim from RESUME A and every quoteB verbatim from RESUME B. The suggestion is phrased as a suggestion with reasons ("Version B reads stronger because...") — NEVER a score or probability.\n' +
      'RESUME A:\n"""\n' + a + '\n"""\n' +
      'RESUME B:\n"""\n' + b + '\n"""\n' +
      jdBlock;

    let parsed = null;
    for (let i = 0; i < 2 && !parsed; i++) {
      try {
        const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, maxTokens: 1000 }) });
        const data = await res.json(); parsed = extractJson(data?.text || "");
      } catch { parsed = null; }
    }
    if (!parsed) { setLoading(false); setAiUnavailable(true); return; }

    // Job lens: verify each requirement quote exists in the JD; drop failures.
    if (hasJd && Array.isArray(parsed.requirements)) {
      const reqs = parsed.requirements.filter((r) => r && r.term && normQ(r.quote, jd));
      const terms = reqs.map((r) => r.term);
      const rowsA = matchRequirements(terms, extractSkills(a), a);
      const rowsB = matchRequirements(terms, extractSkills(b), b);
      setReqRows({ terms, rowsA, rowsB });
    }

    // AI dimensions: verify quoteA in A and quoteB in B; drop failures.
    const dims = (Array.isArray(parsed.dimensions) ? parsed.dimensions : [])
      .filter((d) => d && d.note && normQ(d.quoteA, a) && normQ(d.quoteB, b));
    const suggestion = typeof parsed.suggestion === "string" ? parsed.suggestion : "";
    setAi({ dims, suggestion });
    setLoading(false);
    setToast({ title: "Comparison complete", line: "Deterministic metrics + verified feedback ready." });
  };

  const rows = [
    { label: "Word count", a: mA.words, b: mB.words, better: null },
    { label: "Bullet lines", a: mA.bullets, b: mB.bullets, better: "high" },
    { label: "% bullets with a metric", a: mA.metricPct + "%", b: mB.metricPct + "%", better: "high" },
    { label: "% bullets start with an action verb", a: mA.verbPct + "%", b: mB.verbPct + "%", better: "high" },
    { label: "Sections found", a: mA.sections, b: mB.sections, better: "high" },
    { label: "Automatic checks passed", a: mA.checksPassed, b: mB.checksPassed, better: "high" },
  ];

  return (
    <div data-theme={isDark ? "dark" : "light"} style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: T.bg2, borderBottom: `3px solid ${T.ink}`, boxShadow: `0 3px 0 ${T.ink}`, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem" }}>
        <Link href="/" style={{ color: T.text2, textDecoration: "none", fontSize: "0.85rem", fontWeight: 700 }}>← Back</Link>
        <McFace id="engineer" size={30} style={{ border: `2px solid ${T.ink}`, borderRadius: 3 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontFamily: MC.display, fontSize: "0.9rem" }}>The Crafting Table</h1>
          <p style={{ margin: 0, fontSize: "0.75rem", color: T.text3 }}>Compare two versions of YOUR resume. It won't rank people or claim a winner.</p>
        </div>
        <button onClick={() => setIsDark((d) => { try { localStorage.setItem("cv_theme", d ? "light" : "dark"); } catch {} return !d; })} aria-label="Toggle theme" style={{ width: 36, height: 36, background: T.bg3, border: `2px solid ${T.ink}`, borderRadius: 4, color: T.text, cursor: "pointer", boxShadow: `2px 2px 0 ${T.ink}` }}>{isDark ? "☀" : "☾"}</button>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
        <BlockCard tone={isDark ? "stone" : "parchment"} title="1 · Two versions" style={{ marginBottom: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }} className="cmp-grid">
            {[{ v: a, set: setA, label: labelA, setLabel: setLabelA, ph: "Paste Resume A…" }, { v: b, set: setB, label: labelB, setLabel: setLabelB, ph: "Paste Resume B…" }].map((slot, i) => (
              <div key={i}>
                <input value={slot.label} onChange={(e) => slot.setLabel(e.target.value)} aria-label={`Label ${i === 0 ? "A" : "B"}`} style={{ width: "100%", boxSizing: "border-box", marginBottom: 6, padding: "0.4rem 0.6rem", background: T.bg3, color: T.text, border: `2px solid ${T.ink}`, borderRadius: 4, fontFamily: MC.display, fontSize: "0.6rem" }} />
                <textarea value={slot.v} onChange={(e) => slot.set(e.target.value)} placeholder={slot.ph} aria-label={slot.ph} style={{ width: "100%", minHeight: 160, boxSizing: "border-box", padding: "0.6rem", background: T.bg2, color: T.text, border: `2px solid ${T.ink}`, borderRadius: 4, fontFamily: "inherit", fontSize: "0.9rem", lineHeight: 1.55 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginTop: "12px" }}>
            <BlockButton variant="stone" onClick={loadSample}>Use sample pair</BlockButton>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: T.text2 }}>
              <input type="checkbox" checked={sameResume} onChange={(e) => setSameResume(e.target.checked)} style={{ width: 18, height: 18 }} /> These are versions of the same resume (show line diff)
            </label>
          </div>
          <div style={{ marginTop: "12px" }}>
            <textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Optional: paste a job description to check which requirement terms appear (found in text, not proof of skill)…" aria-label="Job description" style={{ width: "100%", minHeight: 90, boxSizing: "border-box", padding: "0.6rem", background: T.bg2, color: T.text, border: `2px solid ${T.ink}`, borderRadius: 4, fontFamily: "inherit", fontSize: "0.9rem", lineHeight: 1.5 }} />
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" }}>
            <BlockButton variant="grass" onClick={analyze} disabled={(!a.trim() && !b.trim()) || loading}>{loading ? "Crafting…" : "Compare"}</BlockButton>
            <BlockButton variant="redstone" onClick={clearAll}>Clear everything</BlockButton>
          </div>
          <p style={{ fontSize: "0.72rem", color: T.text3, marginTop: "10px", lineHeight: 1.5 }}>Privacy: text stays in this tab. Only the optional AI step sends it to the model provider via /api/chat. Nothing is saved to storage by default.</p>
        </BlockCard>

        {(a.trim() || b.trim()) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Metrics */}
            <BlockCard tone={isDark ? "stone" : "parchment"} title="2 · Metrics (computed in code)">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", minWidth: 420 }}>
                  <thead>
                    <tr style={{ fontFamily: MC.display, fontSize: "0.55rem", color: T.text3, textAlign: "left" }}>
                      <th style={{ padding: "6px 8px" }}>Metric</th><th style={{ padding: "6px 8px" }}>{labelA}</th><th style={{ padding: "6px 8px" }}>{labelB}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
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

            {/* Skills diff */}
            <BlockCard tone={isDark ? "stone" : "parchment"} title="3 · Skill differences">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                {diff.both.map((s) => <SkillChip key={"b" + s.key} label={s.display} state="both" />)}
                {diff.relatedA.map((s) => <SkillChip key={"ra" + s.key} label={`${s.display} ≈ ${s.relatedTo}`} state="related" />)}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {diff.onlyA.map((s) => <SkillChip key={"a" + s.key} label={s.display} state="onlyA" />)}
                {diff.onlyB.map((s) => <SkillChip key={"c" + s.key} label={s.display} state="onlyB" />)}
              </div>
              {diff.both.length + diff.onlyA.length + diff.onlyB.length + diff.relatedA.length === 0 && (
                <p style={{ color: T.text3, fontSize: "0.85rem" }}>No skills detected yet — paste both resumes and click Compare.</p>
              )}
            </BlockCard>

            {/* Line diff */}
            {sameResume && lineD.length > 0 && (
              <BlockCard tone={isDark ? "stone" : "parchment"} title="4 · Line-by-line changes">
                <div style={{ maxHeight: 320, overflowY: "auto", fontFamily: "'VT323', monospace", fontSize: "1rem", lineHeight: 1.5 }}>
                  {lineD.filter((x) => x.type !== "same").slice(0, 200).map((x, i) => (
                    <div key={i} style={{ color: x.type === "add" ? T.good : T.bad, padding: "1px 4px" }}>{x.type === "add" ? "+ " : "− "}{x.text}</div>
                  ))}
                  {lineD.filter((x) => x.type !== "same").length === 0 && <p style={{ color: T.text3 }}>No line differences.</p>}
                </div>
              </BlockCard>
            )}

            {/* Job lens */}
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
              <div style={{ padding: "0.75rem 1rem", background: "rgba(216,64,46,0.14)", border: `2px solid ${MC.redstone}`, borderRadius: 4, fontSize: "0.85rem" }}>AI comparison unavailable — showing the computed metrics and skill diff only.</div>
            )}
            {ai && (ai.dims.length > 0 || ai.suggestion) && (
              <BlockCard tone={isDark ? "stone" : "parchment"} title="6 · Qualitative read (suggestion, not a score)">
                {ai.dims.map((d, i) => (
                  <div key={i} style={{ marginBottom: "12px" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", textTransform: "capitalize" }}>{d.name}</div>
                    <p style={{ fontSize: "0.85rem", color: T.text2, margin: "4px 0" }}>{d.note}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }} className="cmp-grid">
                      <QuoteBlock quote={d.quoteA} source={labelA} /><QuoteBlock quote={d.quoteB} source={labelB} />
                    </div>
                  </div>
                ))}
                {ai.suggestion && <p style={{ fontSize: "0.9rem", marginTop: "8px" }}>🧭 {ai.suggestion}</p>}
              </BlockCard>
            )}
            <p style={{ fontSize: "0.78rem", color: T.text3 }}>AI can be wrong — verify before you use any suggestion. This tool does not rank people or predict hiring outcomes.</p>
          </div>
        )}
      </main>

      <AdvancementToast open={!!toast} title={toast?.title} line={toast?.line} onClose={() => setToast(null)} />
      <style>{`@media (min-width: 860px) { .cmp-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
    </div>
  );
}
