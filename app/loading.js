"use client";

// Instant pixel-styled loading screen shown while the main page JS downloads/hydrates.
// This eliminates the white-screen flash that makes the app feel broken.
export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1B1B1B",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        color: "#EAD9B0",
      }}
    >
      {/* Pulsing logo */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "linear-gradient(135deg, #3ED9A8 0%, #2A9D8F 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          animation: "cvPulse 1.2s ease-in-out infinite",
        }}
      >
        ⚡
      </div>

      <p
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "0.7rem",
          letterSpacing: 2,
          color: "#C9B98F",
          animation: "cvPulse 1.2s ease-in-out infinite",
        }}
      >
        Loading CareerVibe...
      </p>

      {/* Pixel-style progress bar */}
      <div
        style={{
          width: 200,
          height: 8,
          background: "#333",
          borderRadius: 4,
          overflow: "hidden",
          border: "2px solid #555",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "linear-gradient(90deg, #3ED9A8, #FFC838, #3ED9A8)",
            backgroundSize: "200% 100%",
            animation: "cvSlide 1.5s linear infinite",
            borderRadius: 2,
          }}
        />
      </div>

      <style>{`
        @keyframes cvPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.96); }
        }
        @keyframes cvSlide {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
