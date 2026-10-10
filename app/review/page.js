"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { runResumeChecks, quoteIsInSource } from "@/lib/resumeChecks.mjs";
import { normalizeSkillList } from "@/lib/skillNormalize.mjs";
import { BlockButton, BlockCard, CheckSlot, QuoteBlock, AdvancementToast, MiningLoader, MC } from "@/components/pixel/ui.jsx";
import { McFace } from "@/components/pixel/McCharacter";

// Synthetic, clearly-labeled sample resume. Never presented as real.
const SAMPLE_RESUME = `Priya Sharma
priya.sharma@example.com | +91 98765 43210 | linkedin.com/in/priyasharma

Summary
Frontend engineer with 2 years building responsive web apps in React.

Skills
React, JavaScript, CSS, HTML, Git

Experience
Frontend Intern, Acme Studio
- Built a customer dashboard in React used by 3 teams
- Improved page load time by 35% by lazy-loading images
- Responsible for working on the marketing site
- Helped with bug fixes

Education
B.Tech, Computer Science, Example University, 2023`;

const makeT = (isDark) => {
  const ink = isDark ? "#EAD9B0" : "#1A1410";
  return {
    bg: isDark ? "#1B1B1B" : "#EAD9B0",
    bg2: isDark ? "#262626" : "#F7EED8",
    bg3: isDark ? "#2E2E2E" : "#F4E8CC",
    text: ink,
    text2: isDark ? "#C9B98F" : "#4A3B2A",
    text3: isDark ? "#9A8C6C" : "#7A6A52",
    accent: isDark ? "#7BC850" : "#5DAA3A",
    accent2: "#3DDC84",
    gold: "#F5C542",
    redstone: "#D8402E",
    border: ink,
    onAccent: isDark ? "#17150F" : "#FFF8EE",
    hard: `4px 4px 0 ${ink}`,
    ink,
  };
};

// Pull the first JSON object out of a model response (models sometimes add prose).
function extractJson(str) {
  if (!str) return null;
  const start = str.indexOf("{");
  const end = str.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(str.slice(start, end + 1)); } catch { return null; }
}

export default function ReviewPage() {
  const [isDark, setIsDark] = useState(true);
  const [text, setText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [fileName, setFileName] = useState("");
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [toast, setToast] = useState(null);
  const T = makeT(isDark);

  useEffect(() => {
    try { setIsDark(localStorage.getItem("cv_theme") !== "light"); } catch {}
  }, []);

  const { checks, summary } = useMemo(() => runResumeChecks(text), [text]);

  // Lines that any check or AI item quotes -> highlighted in the resume book.
  const highlighted = useMemo(() => {
    const set = new Set();
    checks.forEach((c) => c.quotes.forEach((q) => set.add(q.trim().toLowerCase())));
    (ai?.strengths || []).forEach((s) => set.add(String(s.quote).trim().toLowerCase()));
    (ai?.improvements || []).forEach((s) => set.add(String(s.quote).trim().toLowerCase()));
    return set;
  }, [checks, ai]);

  const readFile = useCallback((file) => {
    if (!file) return;
    setFileName(file.name);
    if (/\.(txt|md|csv)$/i.test(file.name) || file.type.startsWith("text/")) {
      const reader = new FileReader();
      reader.onload = () => setText(String(reader.result || ""));
      reader.readAsText(file);
    } else {
      setText("");
      setToast({ title: "Paste your text", line: `${file.name} isn't plain text — paste it below, or upload PDF/DOCX on the Home screen first.` });
    }
  }, []);

  const clearAll = () => {
    setText(""); setTargetRole(""); setFileName(""); setAi(null); setAiUnavailable(false);
    try { localStorage.removeItem("cv_review_v1"); } catch {}
  };

  const runAi = async () => {
    if (!text.trim()) return;
    setAiLoading(true); setAiUnavailable(false); setAi(null);
    const roleLine = targetRole.trim()
      ? `Target role: "${targetRole.trim()}". Only if relevant, list roleGaps as skills "not found in the resume text" (never say the user lacks a skill).`
      : "No target role given — return roleGaps as an empty array.";
    const prompt = `You are an honest resume reviewer, NOT a hiring predictor. Return ONLY minified JSON, no prose, matching exactly:
{"strengths":[{"point":"...","quote":"..."}],"improvements":[{"issue":"...","quote":"...","suggestion":"...","rewrite":"..."}],"roleGaps":[{"skill":"...","note":"..."}]}
Rules: every "quote" MUST be copied EXACTLY (verbatim substring) from the resume. "rewrite" must NOT add any fact, tool, number, outcome or employer absent from the resume — use a placeholder like [add your real number] where a metric belongs. ${roleLine}
Resume:
"""\n${text}\n"""`;

    let parsed = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      try {
        const res = await fetch("/api/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, maxTokens: 900 }),
        });
        const data = await res.json();
        parsed = extractJson(data?.text || "");
      } catch { parsed = null; }
    }

    if (!parsed) { setAiLoading(false); setAiUnavailable(true); return; }

    // Verify every quote is a real substring of the resume; drop failures.
    const strengths = (Array.isArray(parsed.strengths) ? parsed.strengths : [])
      .filter((s) => s && s.point && quoteIsInSource(s.quote, text));
    const improvements = (Array.isArray(parsed.improvements) ? parsed.improvements : [])
      .filter((s) => s && s.issue && quoteIsInSource(s.quote, text));
    const roleGaps = (Array.isArray(parsed.roleGaps) ? parsed.roleGaps : [])
      .filter((g) => g && g.skill);
    setAi({ strengths, improvements, roleGaps });
    setAiLoading(false);
    setToast({ title: "Review complete", line: `${summary.passed} of ${summary.total} automatic checks passed.` });
  };

  const resumeLines = text.split(/\r?\n/);

  return (
    <div data-theme={isDark ? "dark" : "light"} style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: T.bg2, borderBottom: `3px solid ${T.ink}`, boxShadow: `0 3px 0 ${T.ink}`, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem" }}>
        <Link href="/" style={{ color: T.text2, textDecoration: "none", fontSize: "0.85rem", fontWeight: 700 }}>← Back</Link>
        <McFace id="mentor" size={30} style={{ border: `2px solid ${T.ink}`, borderRadius: 3 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontFamily: MC.display, fontSize: "0.9rem", letterSpacing: "0.02em" }}>The Anvil</h1>
          <p style={{ margin: 0, fontSize: "0.75rem", color: T.text3 }}>Resume reviewer — honest, specific feedback. No ATS score, no hiring prediction.</p>
        </div>
        <button onClick={() => setIsDark((d) => { try { localStorage.setItem("cv_theme", d ? "light" : "dark"); } catch {} return !d; })} aria-label="Toggle theme" style={{ width: 36, height: 36, background: T.bg3, border: `2px solid ${T.ink}`, borderRadius: 4, color: T.text, cursor: "pointer", boxShadow: `2px 2px 0 ${T.ink}` }}>{isDark ? "☀" : "☾"}</button>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
        {/* Input */}
        <BlockCard tone={isDark ? "stone" : "parchment"} title="1 · Your resume" style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "12px" }}>
            <label style={{ position: "relative" }}>
              <input type="file" accept=".txt,.md,.csv,.pdf,.docx,text/*" onChange={(e) => readFile(e.target.files?.[0])} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} aria-label="Upload resume text file" />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.5rem 0.9rem", background: T.bg3, border: `2px solid ${T.ink}`, borderRadius: 4, fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", boxShadow: `2px 2px 0 ${T.ink}` }}>Upload (.txt)</span>
            </label>
            <BlockButton variant="stone" onClick={() => { setText(SAMPLE_RESUME); setFileName("sample-resume.txt"); }}>Use sample resume</BlockButton>
            <span style={{ fontSize: "0.8rem", color: T.text3 }}>{fileName ? `Loaded: ${fileName}` : "Paste, upload, or use the sample."}</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your resume text here…"
            aria-label="Resume text"
            style={{ width: "100%", minHeight: 180, boxSizing: "border-box", padding: "0.75rem", background: T.bg2, color: T.text, border: `2px solid ${T.ink}`, borderRadius: 4, fontFamily: "inherit", fontSize: "0.95rem", lineHeight: 1.6 }}
          />
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
            <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Target role (optional)" aria-label="Target role" style={{ flex: 1, minWidth: 200, padding: "0.6rem 0.75rem", background: T.bg2, color: T.text, border: `2px solid ${T.ink}`, borderRadius: 4, fontFamily: "inherit", fontSize: "0.9rem" }} />
            <BlockButton variant="grass" onClick={runAi} disabled={!text.trim() || aiLoading}>{aiLoading ? "Reviewing…" : "Run full review"}</BlockButton>
            <BlockButton variant="redstone" onClick={clearAll} disabled={!text && !ai}>Clear everything</BlockButton>
          </div>
          <p style={{ fontSize: "0.72rem", color: T.text3, marginTop: "10px", lineHeight: 1.5 }}>
            Privacy: your text stays in this browser tab. Only the AI step sends it to the model provider (via /api/chat) to generate suggestions. Nothing here is saved to storage by default.
          </p>
        </BlockCard>

        {text.trim() && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: "24px" }} className="review-grid">
            {/* Left: resume book */}
            <BlockCard tone={isDark ? "stone" : "parchment"} title="Resume (highlights = flagged lines)">
              <div style={{ background: MC.parchment, color: MC.ink, border: `3px solid ${MC.ink}`, borderLeft: `8px solid ${MC.dirt}`, borderRadius: 3, padding: "0.9rem", maxHeight: 460, overflowY: "auto", fontFamily: "'VT323', monospace", fontSize: "1.05rem", lineHeight: 1.6 }}>
                {resumeLines.map((ln, i) => {
                  const flagged = highlighted.has(ln.trim().toLowerCase());
                  return (
                    <div key={i} style={{ padding: "1px 4px", borderRadius: 3, background: flagged ? "rgba(245,197,66,0.45)" : "transparent", marginBottom: 2 }}>
                      {ln || "\u00A0"}
                    </div>
                  );
                })}
              </div>
            </BlockCard>

            {/* Right: checks + AI */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <BlockCard tone={isDark ? "stone" : "parchment"} title={`Automatic checks — ${summary.passed} of ${summary.total} passed`}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {checks.map((c) => <CheckSlot key={c.id} status={c.status} label={c.label} detail={c.detail} />)}
                </div>
              </BlockCard>

              {aiLoading && (
                <BlockCard tone={isDark ? "stone" : "parchment"} title="AI feedback"><div style={{ padding: "1rem 0" }}><MiningLoader label="The anvil is heating up…" /></div></BlockCard>
              )}

              {aiUnavailable && (
                <div style={{ padding: "0.75rem 1rem", background: "rgba(216,64,46,0.14)", border: `2px solid ${MC.redstone}`, borderRadius: 4, color: T.text, fontSize: "0.85rem" }}>
                  AI feedback unavailable — showing automatic checks only.
                </div>
              )}

              {ai && (
                <>
                  {ai.strengths.length > 0 && (
                    <BlockCard tone={isDark ? "stone" : "parchment"} title="AI strengths">
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {ai.strengths.map((s, i) => (
                          <div key={i}><p style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>✓ {s.point}</p><QuoteBlock quote={s.quote} source="Your resume" /></div>
                        ))}
                      </div>
                    </BlockCard>
                  )}
                  {ai.improvements.length > 0 && (
                    <BlockCard tone={isDark ? "stone" : "parchment"} title="AI improvements">
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {ai.improvements.map((s, i) => (
                          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>⚠ {s.issue}</p>
                            <QuoteBlock quote={s.quote} source="Your resume" />
                            {s.suggestion && <p style={{ margin: 0, fontSize: "0.85rem", color: T.text2 }}>💡 {s.suggestion}</p>}
                            {s.rewrite && (
                              <div style={{ padding: "0.5rem 0.6rem", background: T.bg3, border: `2px dashed ${T.ink}`, borderRadius: 3, fontSize: "0.85rem" }}>
                                <span style={{ fontFamily: MC.display, fontSize: "0.55rem", color: T.text3 }}>SUGGESTED REWRITE — ONLY USE IT IF TRUE</span>
                                <div style={{ marginTop: 4 }}>{s.rewrite}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </BlockCard>
                  )}
                  {targetRole.trim() && ai.roleGaps.length > 0 && (
                    <BlockCard tone={isDark ? "stone" : "parchment"} title={`Role gaps — not found in the resume text`}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {ai.roleGaps.map((g, i) => (
                          <span key={i} title={g.note || ""} style={{ padding: "0.3rem 0.6rem", background: MC.bedrock, color: "#8A8A8A", border: `2px dashed ${MC.stoneDark}`, borderRadius: 3, fontSize: "0.85rem" }}>🔒 {g.skill}</span>
                        ))}
                      </div>
                      <p style={{ fontSize: "0.75rem", color: T.text3, marginTop: "8px" }}>These terms were not found in the resume text — that is not proof you lack them.</p>
                    </BlockCard>
                  )}
                </>
              )}

              <p style={{ fontSize: "0.78rem", color: T.text3 }}>AI can be wrong — verify before you use any suggestion.</p>
            </div>
          </div>
        )}
      </main>

      <AdvancementToast open={!!toast} title={toast?.title} line={toast?.line} onClose={() => setToast(null)} />

      <style>{`
        @media (min-width: 900px) { .review-grid { grid-template-columns: 1fr 1fr !important; } }
      `}</style>
    </div>
  );
}
