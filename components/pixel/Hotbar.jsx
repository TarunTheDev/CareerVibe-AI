"use client";

import { Search, Briefcase, TrendingUp, FileText } from "lucide-react";
import { MC } from "@/components/pixel/ui";

// 4-item hotbar — mobile bottom nav. Matches AppNavbar NAV.
const SLOTS = [
  { id: "find", label: "Find Jobs", icon: Search, desc: "Browse roles matched to your resume" },
  { id: "saved", label: "My Jobs", icon: Briefcase, desc: "Saved / Applied / Interview / Offer" },
  { id: "career", label: "Career Path", icon: TrendingUp, desc: "Match score, gaps & 3-step plan" },
  { id: "resumelab", label: "Resume Lab", icon: FileText, desc: "Review or compare resumes" },
];

export default function Hotbar({ activeId, onNavigate }) {
  const handle = (s) => {
    if (s.id === "resumelab") { window.location.href = "/review"; return; }
    onNavigate?.(s.id);
  };
  return (
    <nav
      aria-label="Primary"
      className="md:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 900,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 4,
        padding: 6,
        paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
        background: "#2E2E2E",
        borderTop: `3px solid ${MC.ink}`,
        boxShadow: `0 -4px 0 ${MC.ink}`,
      }}
    >
      {SLOTS.map((s) => {
        const Icon = s.icon;
        const active = activeId === s.id || (s.id === "saved" && (activeId === "saved" || activeId === "applied" || activeId === "myjobs"));
        return (
          <button
            key={s.id}
            onClick={() => handle(s)}
            aria-label={`${s.label}: ${s.desc}`}
            aria-current={active ? "page" : undefined}
            title={s.desc}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              minHeight: 54,
              background: active ? MC.grass : "#3A3A3A",
              color: active ? "#0E2A06" : MC.parchment,
              border: `2px solid ${active ? MC.grassDark : MC.stoneDark}`,
              boxShadow: active ? `inset 0 2px 0 #7BC850` : `inset 0 2px 0 #4A4A4A`,
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            <Icon size={17} strokeWidth={2.5} aria-hidden="true" />
            <span style={{ fontFamily: MC.display, fontSize: "0.38rem", lineHeight: 1 }}>{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
