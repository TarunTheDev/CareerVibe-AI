"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { getUserJSON } from "@/lib/userStorage";
import { normalizeSkill } from "@/lib/skillNormalize.mjs";
import { BlockButton, BlockCard, AdvancementToast, MC } from "@/components/pixel/ui.jsx";
import { McFace } from "@/components/pixel/McCharacter";

const makeT = (isDark) => {
  const ink = isDark ? "#EAD9B0" : "#1A1410";
  return {
    bg: isDark ? "#1B1B1B" : "#EAD9B0", bg2: isDark ? "#262626" : "#F7EED8", bg3: isDark ? "#2E2E2E" : "#F4E8CC",
    text: ink, text2: isDark ? "#C9BFA9" : "#4A3B2A", text3: isDark ? "#9A8C6C" : "#7A6A52",
    accent: isDark ? "#7BC850" : "#5DAA3A", ink, onAccent: isDark ? "#17150F" : "#FFF8EE",
  };
};

// Deterministic keyword grouping into categories.
const CATEGORY_KEYS = {
  frontend: ["react","vue","angular","css","html","javascript","typescript","next","tailwind","redux","svelte","ui","ux","accessibility","webpack"],
  backend: ["node","express","python","java","go","django","flask","spring","api","rest","graphql","sql","mysql","postgresql","mongodb","redis","server","microservice","auth"],
  data: ["machine learning","ml","ai","data","pandas","numpy","tensorflow","pytorch","analytics","spark","etl","statistics","sql"],
  cloud: ["aws","azure","gcp","docker","kubernetes","devops","ci","cd","cloud","terraform","linux","deploy","lambda"],
  tools: ["git","github","jira","figma","testing","jest","cypress","agile","scrum","vscode","npm","webpack","babel"],
};
function categorize(skill) {
  const s = normalizeSkill(skill);
  for (const [cat, keys] of Object.entries(CATEGORY_KEYS)) if (keys.some((k) => s === k || s.includes(k))) return cat;
  return "general";
}
const CAT_COLOR = { frontend: MC.diamond, backend: MC.lapis, data: MC.emerald, cloud: MC.gold, tools: MC.grass, general: MC.stone };

// Synthetic sample (labeled) so the world always renders.
const SAMPLE_SKILLS = ["React","JavaScript","CSS","Node.js","SQL","Git","Docker","Machine Learning"];
const SAMPLE_GAPS = ["TypeScript","GraphQL","AWS","Kubernetes"];

export default function WorldPage() {
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [learned, setLearned] = useState({});
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const T = makeT(isDark);

  useEffect(() => { try { setIsDark(localStorage.getItem("cv_theme") !== "light"); } catch {} }, []);

  const { skills, gaps, usingSample } = useMemo(() => {
    let skills = [], gaps = [];
    if (user?.uid) {
      const profile = getUserJSON(user.uid, "profile", null);
      if (profile) {
        skills = (profile.topSkills || profile.skills || []).filter(Boolean);
        const cp = (profile.careerPaths || [])[0];
        gaps = (cp?.gapSkills || cp?.missingSkills || profile.gapSkills || []).filter(Boolean);
      }
    }
    if (!skills.length) return { skills: SAMPLE_SKILLS, gaps: SAMPLE_GAPS, usingSample: true };
    return { skills, gaps: [...new Set(gaps)], usingSample: false };
  }, [user]);

  useEffect(() => {
    try { setLearned(JSON.parse(localStorage.getItem("cv_world_v1") || "{}") || {}); } catch { setLearned({}); }
  }, []);

  const towers = useMemo(() => {
    const groups = {};
    skills.forEach((s) => { const c = categorize(s); (groups[c] = groups[c] || []).push(s); });
    return groups;
  }, [skills]);

  const totalBlocks = skills.length + gaps.length;
  const builtBlocks = skills.length + gaps.filter((g) => learned[normalizeSkill(g)]).length;

  const toggleLearned = (skill) => {
    const key = normalizeSkill(skill);
    const next = { ...learned, [key]: !learned[key] };
    setLearned(next);
    try { localStorage.setItem("cv_world_v1", JSON.stringify(next)); } catch {}
    if (next[key]) setToast({ title: "Block placed", line: `${skill} marked as learned.` });
    setSelected(null);
  };

  const Block = ({ color, ghost, onClick, label }) => (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 26, height: 26, cursor: onClick ? "pointer" : "default",
        background: ghost ? "transparent" : color,
        border: ghost ? `2px dashed ${MC.stoneDark}` : `2px solid ${MC.ink}`,
        boxShadow: ghost ? "none" : "inset 2px 2px 0 rgba(255,255,255,0.35), inset -2px -2px 0 rgba(0,0,0,0.3)",
        borderRadius: 3, imageRendering: "pixelated", display: "block",
      }}
    />
  );

  return (
    <div data-theme={isDark ? "dark" : "light"} style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: T.bg2, borderBottom: `3px solid ${T.ink}`, boxShadow: `0 3px 0 ${T.ink}`, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem" }}>
        <Link href="/" style={{ color: T.text2, textDecoration: "none", fontSize: "0.85rem", fontWeight: 700 }}>← Back</Link>
        <McFace id="explorer" size={30} style={{ border: `2px solid ${T.ink}`, borderRadius: 3 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontFamily: MC.display, fontSize: "0.9rem" }}>Voxel Skill World</h1>
          <p style={{ margin: 0, fontSize: "0.75rem", color: T.text3 }}>Structure: {builtBlocks} of {totalBlocks} blocks built{usingSample ? " · Sample data" : ""}</p>
        </div>
        <button onClick={() => setIsDark((d) => { try { localStorage.setItem("cv_theme", d ? "light" : "dark"); } catch {} return !d; })} aria-label="Toggle theme" style={{ width: 36, height: 36, background: T.bg3, border: `2px solid ${T.ink}`, borderRadius: 4, color: T.text, cursor: "pointer", boxShadow: `2px 2px 0 ${T.ink}` }}>{isDark ? "☀" : "☾"}</button>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem 4rem", display: "grid", gridTemplateColumns: "1fr", gap: "24px" }} className="world-grid">
        <BlockCard tone={isDark ? "stone" : "parchment"} title="Your skill terrain">
          {usingSample && <p style={{ fontSize: "0.75rem", color: T.text3, marginTop: 0 }}>Showing a clearly-labeled sample world. Upload a resume on the Home screen to build your own.</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "flex-end" }}>
            {Object.entries(towers).map(([cat, list]) => (
              <div key={cat} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
                  {list.map((s) => (
                    <div key={s} style={{ display: "flex", flexDirection: "column-reverse", gap: 3 }}>
                      <Block color={CAT_COLOR[cat]} label={`Skill: ${s}`} />
                    </div>
                  ))}
                </div>
                <span style={{ fontFamily: MC.display, fontSize: "0.5rem", color: T.text3, textTransform: "uppercase" }}>{cat}</span>
              </div>
            ))}
            {/* Gap ghost blocks */}
            {gaps.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
                  {gaps.map((g) => {
                    const done = learned[normalizeSkill(g)];
                    return <div key={g} style={{ display: "flex", flexDirection: "column-reverse", gap: 3 }}><Block color={done ? MC.emerald : "transparent"} ghost={!done} onClick={() => setSelected(g)} label={done ? `Gap filled: ${g}` : `Gap: ${g} — tap to learn`} /></div>;
                  })}
                </div>
                <span style={{ fontFamily: MC.display, fontSize: "0.5rem", color: T.text3, textTransform: "uppercase" }}>gaps</span>
              </div>
            )}
          </div>
          <p style={{ fontSize: "0.78rem", color: T.text3, marginTop: "16px" }}>Solid blocks are skills found in your resume. Dashed ghost blocks are gaps for your target role — tap one to mark it learned.</p>
        </BlockCard>

        {selected && (
          <BlockCard tone={isDark ? "stone" : "parchment"} title="Skill gap">
            <p style={{ fontSize: "1rem", margin: "0 0 8px" }}><strong>{selected}</strong> is not found in the resume text.</p>
            <p style={{ fontSize: "0.85rem", color: T.text2, marginTop: 0 }}>Free course: search “learn {selected}” on a trusted platform. Marking it learned fills the ghost block and saves locally.</p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" }}>
              <BlockButton variant="grass" onClick={() => toggleLearned(selected)}>Mark as learned</BlockButton>
              <a href={`https://www.google.com/search?q=learn+${encodeURIComponent(selected)}+free`} target="_blank" rel="noopener noreferrer"><BlockButton variant="stone">Find a free course</BlockButton></a>
              <BlockButton variant="redstone" onClick={() => setSelected(null)}>Close</BlockButton>
            </div>
          </BlockCard>
        )}
      </main>

      <AdvancementToast open={!!toast} title={toast?.title} line={toast?.line} onClose={() => setToast(null)} />
      <style>{`@media (min-width: 860px) { .world-grid { grid-template-columns: 2fr 1fr !important; } }`}</style>
    </div>
  );
}
