"use client";

// Root error boundary — must render its own <html> and <body>.
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#1B1B1B", color: "#EAD9B0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', system-ui, sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 460, textAlign: "center", background: "#262626", border: "4px solid #EAD9B0", boxShadow: "6px 6px 0 #000", borderRadius: 6, padding: "32px 24px" }}>
          <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.9rem", lineHeight: 1.5, margin: "0 0 12px" }}>Something glitched</h1>
          <p style={{ fontSize: "1rem", color: "#C9B98F", margin: "0 0 20px", lineHeight: 1.6 }}>Your data is safe. Reload to continue.</p>
          <button onClick={reset} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.65rem", padding: "14px 18px", background: "#5DAA3A", color: "#17150F", border: "4px solid #1A1410", boxShadow: "4px 4px 0 #000", borderRadius: 4, cursor: "pointer" }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
