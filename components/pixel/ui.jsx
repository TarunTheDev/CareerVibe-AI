"use client";

// CAREER CRAFT pixel UI primitives. Reused across the app.
// Hard pixel offsets only (no blur), bevelled block borders, pixel fonts on
// labels/numbers. Status is always icon + text, never color alone.

export const MC = {
  grass: "#5DAA3A",
  grassDark: "#3F7A27",
  dirt: "#8B5A2B",
  dirtDark: "#5E3C1C",
  stone: "#8A8A8A",
  stoneDark: "#4A4A4A",
  bedrock: "#1B1B1B",
  diamond: "#4FE3E0",
  gold: "#F5C542",
  redstone: "#D8402E",
  lapis: "#2F4FBF",
  emerald: "#3DDC84",
  parchment: "#EAD9B0",
  ink: "#1A1410",
  display: "'Press Start 2P', 'Space Grotesk', system-ui, monospace",
  body: "'VT323', 'Space Grotesk', system-ui, monospace",
};

const bevel = (base, light, dark) => ({
  border: `3px solid ${base}`,
  boxShadow: `inset 2px 2px 0 ${light}, inset -2px -2px 0 ${dark}, 4px 4px 0 ${MC.ink}`,
});

// ── BlockButton ──────────────────────────────────────────────────────────
export function BlockButton({ variant = "grass", children, onClick, disabled, style, type = "button", ariaLabel }) {
  const pal =
    variant === "grass"
      ? { bg: MC.grass, light: "#7BC850", dark: MC.grassDark, fg: "#0E2A06" }
      : variant === "redstone"
      ? { bg: MC.redstone, light: "#F0685A", dark: "#9C2C20", fg: "#FFF3F1" }
      : { bg: MC.stone, light: "#B0B0B0", dark: MC.stoneDark, fg: "#141414" };
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      style={{
        fontFamily: MC.display,
        fontSize: "0.7rem",
        lineHeight: 1.4,
        padding: "0.75rem 1.1rem",
        background: pal.bg,
        color: pal.fg,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        imageRendering: "pixelated",
        ...bevel(pal.dark, pal.light, pal.dark),
        transition: "transform 0.05s, box-shadow 0.05s",
        ...style,
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translate(4px,4px)";
        e.currentTarget.style.boxShadow = `inset 2px 2px 0 ${pal.light}, inset -2px -2px 0 ${pal.dark}, 0 0 0 ${MC.ink}`;
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {children}
    </button>
  );
}

// ── BlockCard ────────────────────────────────────────────────────────────
export function BlockCard({ title, children, style, tone = "parchment" }) {
  const bg = tone === "parchment" ? "#F7EED8" : tone === "stone" ? "#2E2E2E" : "#262626";
  const fg = tone === "parchment" ? MC.ink : MC.parchment;
  return (
    <div
      style={{
        background: bg,
        color: fg,
        borderRadius: 4,
        ...bevel(MC.ink, "#FFFDF2", "#C9B98F"),
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 0.9rem",
            borderBottom: `3px solid ${MC.ink}`,
            background: MC.grass,
            color: "#0E2A06",
            fontFamily: MC.display,
            fontSize: "0.65rem",
            borderRadius: "4px 4px 0 0",
          }}
        >
          <span style={{ width: 10, height: 10, background: MC.gold, border: `2px solid ${MC.ink}` }} />
          {title}
        </div>
      )}
      <div style={{ padding: "1rem" }}>{children}</div>
    </div>
  );
}

// ── SkillChip / ItemSlot ─────────────────────────────────────────────────
export function SkillChip({ label, state = "matched" }) {
  const matched = state === "matched";
  return (
    <span
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.4rem 0.6rem",
        fontFamily: MC.body,
        fontSize: "1rem",
        background: matched ? "#123B2A" : MC.bedrock,
        color: matched ? MC.emerald : "#8A8A8A",
        border: matched ? `3px solid ${MC.emerald}` : `3px dashed ${MC.stoneDark}`,
        boxShadow: matched ? `0 0 8px ${MC.emerald}66, 3px 3px 0 ${MC.ink}` : `3px 3px 0 ${MC.ink}`,
        borderRadius: 3,
      }}
    >
      <span aria-hidden="true">{matched ? "◆" : "🔒"}</span>
      {label}
      <span style={{ fontSize: "0.75rem", opacity: 0.85 }}>{matched ? "matched" : "missing"}</span>
    </span>
  );
}

// ── PixelProgress (segmented XP bar) ─────────────────────────────────────
export function PixelProgress({ value = 0, max = 100, blocks = 10, label }) {
  const pct = Math.max(0, Math.min(1, value / (max || 1)));
  const filled = Math.round(pct * blocks);
  return (
    <div role="img" aria-label={label || `${Math.round(pct * 100)} percent`}>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: blocks }).map((_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 14,
              background: i < filled ? MC.grass : "#3A3A3A",
              border: `2px solid ${MC.ink}`,
              boxShadow: i < filled ? `inset 0 2px 0 #7BC850` : "none",
            }}
          />
        ))}
      </div>
      {label && (
        <span style={{ fontFamily: MC.display, fontSize: "0.6rem", color: MC.parchment }}>{label}</span>
      )}
    </div>
  );
}

// ── HeartsMeter (always alongside a number) ──────────────────────────────
export function HeartsMeter({ value = 0, max = 10, number }) {
  const hearts = Math.round((value / (max || 1)) * 5);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }} aria-label={`${number ?? value} of ${max}`}>
      <span aria-hidden="true" style={{ letterSpacing: 2, color: MC.redstone, fontSize: "0.9rem" }}>
        {"♥".repeat(hearts)}
        <span style={{ color: "#4A4A4A" }}>{"♥".repeat(5 - hearts)}</span>
      </span>
      {number != null && (
        <span style={{ fontFamily: MC.display, fontSize: "0.7rem", color: MC.parchment }}>{number}</span>
      )}
    </span>
  );
}

// ── AdvancementToast ─────────────────────────────────────────────────────
export function AdvancementToast({ open, title, line, onClose }) {
  if (!open) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 1000,
        display: "flex",
        gap: "0.75rem",
        alignItems: "center",
        padding: "0.75rem 1rem",
        background: "#2E2E2E",
        color: MC.parchment,
        borderRadius: 4,
        ...bevel(MC.ink, "#5A5A5A", "#111"),
        animation: "mc-toast-in 0.25s steps(4) both",
        maxWidth: 320,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: "1.4rem" }}>🏆</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: MC.display, fontSize: "0.65rem", color: MC.gold }}>{title}</div>
        <div style={{ fontFamily: MC.body, fontSize: "1rem" }}>{line}</div>
      </div>
      <button onClick={onClose} aria-label="Dismiss notification" style={{ background: "none", border: "none", color: MC.parchment, cursor: "pointer", fontSize: "1rem" }}>
        ✕
      </button>
      <style>{`@keyframes mc-toast-in { from { transform: translateX(120%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
}

// ── MiningLoader (crack-stage block) ─────────────────────────────────────
export function MiningLoader({ label = "Mining…" }) {
  return (
    <div role="status" aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem" }}>
      <span
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          background: MC.stone,
          border: `3px solid ${MC.ink}`,
          boxShadow: `inset 2px 2px 0 #B0B0B0, inset -2px -2px 0 ${MC.stoneDark}`,
          animation: "mc-crack 1s steps(4) infinite",
        }}
      />
      <span style={{ fontFamily: MC.display, fontSize: "0.65rem", color: MC.parchment }}>{label}</span>
      <style>{`@keyframes mc-crack { 0%{filter:brightness(1)} 50%{filter:brightness(0.7)} 100%{filter:brightness(1)} }`}</style>
    </div>
  );
}

// ── CheckSlot (one review check row) ─────────────────────────────────────
export function CheckSlot({ status = "pass", label, detail }) {
  const icon = status === "pass" ? "✔" : status === "warn" ? "!" : "✕";
  const word = status === "pass" ? "Passed" : status === "warn" ? "Warning" : "Failed";
  const color = status === "pass" ? MC.emerald : status === "warn" ? MC.gold : MC.redstone;
  return (
    <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", padding: "0.5rem", border: `2px solid ${MC.stoneDark}`, borderRadius: 3, background: "#262626" }}>
      <span aria-hidden="true" style={{ color, fontFamily: MC.display, fontSize: "0.7rem", width: 18, textAlign: "center" }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: MC.body, fontSize: "1.05rem", color: MC.parchment }}>
          {label} <span style={{ color, fontSize: "0.85rem" }}>({word})</span>
        </div>
        {detail && <div style={{ fontFamily: MC.body, fontSize: "0.95rem", color: "#9A8C6C" }}>{detail}</div>}
      </div>
    </div>
  );
}

// ── QuoteBlock (parchment book page) ─────────────────────────────────────
export function QuoteBlock({ quote, source }) {
  return (
    <blockquote
      style={{
        margin: 0,
        padding: "0.6rem 0.8rem",
        background: MC.parchment,
        color: MC.ink,
        border: `3px solid ${MC.ink}`,
        borderLeft: `8px solid ${MC.dirt}`,
        borderRadius: 3,
        fontFamily: MC.body,
        fontSize: "1.05rem",
        boxShadow: `3px 3px 0 ${MC.ink}`,
      }}
    >
      “{quote}”
      {source && (
        <footer style={{ fontFamily: MC.display, fontSize: "0.55rem", marginTop: "0.4rem", color: MC.dirtDark }}>
          — {source}
        </footer>
      )}
    </blockquote>
  );
}
