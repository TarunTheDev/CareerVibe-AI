"use client";

// Resume Lab section switcher — sits at the top of both /review and /compare so
// the two surfaces read as tabs of one "Resume Lab" area. Blocky MC styling,
// keyboard-focusable, aria-current on the active tab. Nav only; the single page
// <h1> still lives in each page's <main> (W-3a).

import Link from "next/link";
import { FileText, Columns } from "lucide-react";
import { MC } from "@/components/pixel/ui.jsx";

const TABS = [
  { id: "review", label: "Resume Reviewer", href: "/review", Icon: FileText },
  { id: "compare", label: "Resume Comparison", href: "/compare", Icon: Columns },
];

export default function ResumeLabTabs({ active, T }) {
  return (
    <nav
      aria-label="Resume Lab"
      style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}
    >
      {TABS.map(({ id, label, href, Icon }) => {
        const on = id === active;
        const style = {
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          minHeight: 44,
          padding: "0.5rem 1rem",
          fontFamily: MC.display,
          fontSize: "0.65rem",
          letterSpacing: "0.02em",
          textDecoration: "none",
          borderRadius: 4,
          cursor: on ? "default" : "pointer",
          background: on ? MC.grass : T.bg3,
          color: on ? "#0E2A06" : T.text2,
          border: `3px solid ${MC.ink}`,
          boxShadow: on
            ? `inset 2px 2px 0 #7BC850, inset -2px -2px 0 ${MC.grassDark}, 3px 3px 0 ${MC.ink}`
            : `3px 3px 0 ${MC.ink}`,
          transform: on ? "translate(2px,2px)" : "none",
        };
        return on ? (
          <span key={id} aria-current="page" style={style}>
            <Icon size={15} aria-hidden="true" /> {label}
          </span>
        ) : (
          <Link key={id} href={href} style={style}>
            <Icon size={15} aria-hidden="true" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
