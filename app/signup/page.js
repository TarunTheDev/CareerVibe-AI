"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "@/lib/firebase";
import { auth } from "@/lib/firebase";

// The signup page simply redirects to /login?mode=signup
// The login page handles both login and signup via mode toggle
export default function SignupRedirect() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/");
      } else {
        router.replace("/login?mode=signup");
      }
    });
    return () => unsub();
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F9FAFB",  // Light background
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        width: 40, height: 40,
        border: "3px solid transparent",
        borderTopColor: "#F97316",  // Orange
        borderRightColor: "#F97316",
        borderRadius: "50%",
        animation: "rotate 0.7s linear infinite",
      }} />
    </div>
  );
}
