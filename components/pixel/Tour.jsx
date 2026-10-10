"use client";

import { useEffect, useState, useCallback } from "react";
import PixelCharacter from "@/components/pixel/PixelCharacter";
import { BlockButton, MC } from "@/components/pixel/ui.jsx";

// Lightweight, keyboard-accessible product tour. 4 steps, skippable, replayable.
// First-run auto-show is owned by the parent (user-scoped cv_<uid>_onboard_v1,
// W-5). Uses a centered dialog (not positioned coach marks) so it never
// mis-anchors on the monolith.
const STEPS = [
  { who: "pip", title: "Find Jobs", body: "Upload your resume and CareerVibe matches you to real roles, showing exactly which skills line up." },
  { who: "ren", title: "My Jobs", body: "Saved, Applied, Interview and Offer all live here as tabs — your whole pipeline in one place." },
  { who: "bo", title: "Career Path", body: "Pick any target role to see your match score, the gaps in the way, and a three-step plan to close them." },
  { who: "lumi", title: "Resume Lab", body: "Review one resume honestly, or compare two versions of yours. No fake scores — just specific, checkable feedback." },
];

export default function Tour({ open: openProp, onClose }) {
  const [step, setStep] = useState(0);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;

  // Persistence of the "seen" flag is owned by the parent (user-scoped
  // cv_<uid>_onboard_v1, written the moment the popup is shown — see W-5).
  const close = useCallback(() => {
    setInternalOpen(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" || e.key === "Enter") setStep((s) => Math.min(STEPS.length - 1, s + 1));
      else if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Product tour"
      onClick={close}
      style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(440px, 100%)", background: "#F7EED8", color: MC.ink, border: `4px solid ${MC.ink}`, boxShadow: "8px 8px 0 rgba(0,0,0,0.5)", borderRadius: 6, padding: 20 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <PixelCharacter name={s.who} pose="wave" size={56} decorative />
          <div>
            <div style={{ fontFamily: MC.display, fontSize: "0.6rem", color: MC.grassDark }}>{s.title}</div>
            <div style={{ fontSize: "0.7rem", color: MC.dirtDark, marginTop: 4 }}>Step {step + 1} of {STEPS.length}</div>
          </div>
        </div>
        <p style={{ fontSize: "1rem", lineHeight: 1.6, margin: "0 0 16px" }}>{s.body}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <button onClick={close} style={{ background: "none", border: "none", color: MC.dirtDark, cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 }}>Skip tour</button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && <BlockButton variant="stone" onClick={() => setStep((x) => x - 1)}>Back</BlockButton>}
            <BlockButton variant="grass" onClick={() => (last ? close() : setStep((x) => x + 1))}>{last ? "Start exploring" : "Next"}</BlockButton>
          </div>
        </div>
      </div>
    </div>
  );
}
