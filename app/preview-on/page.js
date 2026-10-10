"use client";
// Dev-only helper: flips on the mock-user preview flag, then you can visit
// /profile, /settings, or / (dashboard). Safe to delete after QA.
import { useEffect, useState } from "react";

export default function PreviewOn() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("cv_preview_user", "1");
      const params = new URLSearchParams(window.location.search);
      if (params.has("light")) localStorage.setItem("cv_theme", "light");
      if (params.has("dark")) localStorage.setItem("cv_theme", "dark");
    } catch (_) {}
    setReady(true);
  }, []);
  return (
    <div style={{ fontFamily: "monospace", padding: 40 }}>
      {ready ? "preview user ENABLED — open /profile, /settings, or /" : "…"}
    </div>
  );
}
