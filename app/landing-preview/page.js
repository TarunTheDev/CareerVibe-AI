"use client";

// Temporary design-review route: renders the landing page without the auth gate.
import { useState } from "react";
import LandingPage from "@/components/LandingPage";

export default function LandingPreview() {
  const [isDark, setIsDark] = useState(
    () => typeof window !== "undefined" && window.location.search.includes("dark")
  );
  return (
    <LandingPage
      isDark={isDark}
      T={{}}
      onStart={() => {}}
      toggleTheme={() => setIsDark((d) => !d)}
      user={null}
      onSignOut={() => {}}
    />
  );
}
