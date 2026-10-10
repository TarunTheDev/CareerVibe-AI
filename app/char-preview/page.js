"use client";

import { McCharacter, McFace, CHARACTERS } from "@/components/pixel/McCharacter";
import PixelCharacter from "@/components/pixel/PixelCharacter";

const PC_NAMES = ["pip", "bo", "lumi", "byte", "ren", "fox", "bird"];
const PC_POSES = ["idle", "wave", "think", "cheer", "oops"];

// Visual gallery of every Minecraft-style character (official skins + AI characters).
export default function CharPreview() {
  return (
    <div style={{ minHeight: "100vh", background: "#161310", color: "#F4ECDD", padding: "2rem", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Character Preview</h1>
      <p style={{ color: "#8F8672", marginBottom: "2rem", fontSize: "0.875rem" }}>
        Original Career Craft characters (transparent sprites).
      </p>

      <h2 style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8F8672", marginBottom: "1rem" }}>Full body</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "flex-end", marginBottom: "3rem" }}>
        {CHARACTERS.map((c) => (
          <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ background: "#221E18", border: "2px solid #F4ECDD", borderRadius: 8, padding: "0.5rem" }}>
              <McCharacter id={c.id} scale={5} height={160} />
            </div>
            <span style={{ fontSize: "0.75rem", color: "#C9BFA9" }}>{c.label}</span>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8F8672", marginBottom: "1rem" }}>Face avatars</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {CHARACTERS.map((c) => (
          <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
            <McFace id={c.id} size={48} style={{ border: "2px solid #F4ECDD", borderRadius: 6 }} />
            <span style={{ fontSize: "0.625rem", color: "#8F8672" }}>{c.label}</span>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8F8672", margin: "2rem 0 1rem" }}>Original characters (poses)</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {PC_NAMES.map((n) => (
          <div key={n} style={{ display: "flex", alignItems: "flex-end", gap: "1.25rem" }}>
            <span style={{ width: 64, fontSize: "0.75rem", color: "#C9BFA9", textTransform: "capitalize" }}>{n}</span>
            {PC_POSES.map((p) => (
              <PixelCharacter key={p} name={n} pose={p} size={56} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
