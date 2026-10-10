"use client";

import { useEffect } from "react";
import { BlockButton } from "@/components/pixel/ui.jsx";
import { PixelSprite } from "@/components/pixel/PixelSprites";

// Pixel-styled error boundary for every route under the app layout.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("[CareerVibe] route error:", error?.message || error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1B1B1B",
        color: "#EAD9B0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 460,
          width: "100%",
          textAlign: "center",
          background: "#262626",
          border: "4px solid #EAD9B0",
          boxShadow: "6px 6px 0 #000",
          borderRadius: 6,
          padding: "32px 24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <PixelSprite name="lost" size={64} />
        </div>
        <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 12px" }}>
          Something glitched
        </h1>
        <p style={{ fontSize: "1rem", color: "#C9B98F", margin: "0 0 20px", lineHeight: 1.6 }}>
          Your data is safe — nothing was lost. You can reload the page to continue.
        </p>
        <BlockButton variant="grass" onClick={reset}>Reload</BlockButton>
      </div>
    </div>
  );
}
