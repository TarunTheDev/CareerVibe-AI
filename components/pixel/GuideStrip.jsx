"use client";

import { useMemo } from "react";
import PixelCharacter from "@/components/pixel/PixelCharacter";
import { BlockButton, MC } from "@/components/pixel/ui.jsx";

// Deterministic "next step" — no AI, no invented data. Chosen purely from the
// real dashboard state. Returns { text, cta, action } where action is a key the
// parent maps to a handler.
export function computeNextStep({ hasProfile, savedCount, appliedCount, staleApplied }) {
  if (!hasProfile) return { key: "upload", text: "Upload your resume to get started.", cta: "Upload resume" };
  if ((savedCount || 0) === 0) return { key: "save", text: "Save 3 jobs you actually like.", cta: "Browse jobs" };
  if ((appliedCount || 0) === 0) return { key: "apply", text: "Apply to your best match.", cta: "Open My Jobs" };
  if ((staleApplied || 0) > 0) return { key: "followup", text: `Follow up on ${staleApplied} application${staleApplied > 1 ? "s" : ""} older than 7 days.`, cta: "Open My Jobs" };
  return { key: "review", text: "Sharpen your resume with an honest review.", cta: "Review resume" };
}

export default function GuideStrip({ hasProfile, savedCount = 0, appliedCount = 0, staleApplied = 0, onAction, style }) {
  const step = useMemo(
    () => computeNextStep({ hasProfile, savedCount, appliedCount, staleApplied }),
    [hasProfile, savedCount, appliedCount, staleApplied]
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        background: "var(--bg2, #F7EED8)",
        border: `3px solid ${MC.ink}`,
        borderRadius: 6,
        boxShadow: "4px 4px 0 " + MC.ink,
        flexWrap: "wrap",
        ...style,
      }}
    >
      <PixelCharacter name="pip" pose="wave" size={48} decorative />
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontFamily: MC.display, fontSize: "0.55rem", color: MC.grassDark, letterSpacing: "0.04em" }}>NEXT STEP</div>
        <div style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: 2 }}>{step.text}</div>
      </div>
      <BlockButton variant="grass" onClick={() => onAction?.(step.key)}>{step.cta}</BlockButton>
    </div>
  );
}
