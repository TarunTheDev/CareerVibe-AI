"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { auth, sendPasswordResetEmail } from "@/lib/firebase";
import {
  ArrowLeft,
  Moon,
  Sun,
  Bell,
  BellOff,
  Key,
  Database,
  Trash2,
  Check,
  Loader2,
  Sparkles,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";

// ─── Theme factory ─────────────────────────────────────────────────────────────
// Retro neobrutalist palette — cream paper, ink borders, hard offset shadows.
const makeT = (isDark) => {
  const ink = isDark ? "#EAD9B0" : "#1A1410";
  return {
    bg: isDark ? "#1B1B1B" : "#EAD9B0",
    bg2: isDark ? "#262626" : "#F7EED8",
    bg3: isDark ? "#2E2E2E" : "#F4E8CC",
    bg4: isDark ? "#212121" : "#E2CFA4",
    text: ink,
    text2: isDark ? "#C9B98F" : "#4A3B2A",
    text3: isDark ? "#9A8C6C" : "#7A6A52",
    accent: isDark ? "#7BC850" : "#5DAA3A",
    accent2: "#3DDC84",
    accentDim: isDark ? "rgba(93,170,58,0.18)" : "rgba(93,170,58,0.14)",
    border: ink,
    borderA: isDark ? "#7BC850" : "#5DAA3A",
    shadow: `2px 2px 0 ${ink}`,
    shadowMd: `4px 4px 0 ${ink}`,
  };
};

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Theme — synced with the app
  const [isDark, setIsDark] = useState(true);
  const T = makeT(isDark);

  // Notification toggle — persisted to localStorage
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Password reset
  const [pwResetLoading, setPwResetLoading] = useState(false);
  const [pwResetMsg, setPwResetMsg] = useState("");

  // Clear data
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearMsg, setClearMsg] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("cv_theme");
    if (saved === "light") setIsDark(false);
    const notif = localStorage.getItem("cv_notifications");
    setNotificationsEnabled(notif === "true");
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem("cv_theme", newDark ? "dark" : "light");
  };

  const toggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    localStorage.setItem("cv_notifications", String(next));
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setPwResetLoading(true);
    setPwResetMsg("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setPwResetMsg("✓ Password reset email sent! Check your inbox.");
    } catch (e) {
      setPwResetMsg("Failed to send reset email: " + (e.message || "Please try again."));
    } finally {
      setPwResetLoading(false);
    }
  };

  const handleClearData = () => {
    // Clear user-scoped data
    const uid = user?.uid;
    if (uid) {
      [`cv_${uid}_profile`, `cv_${uid}_jobs`, `cv_${uid}_saved`, `cv_${uid}_session`, `cv_${uid}_resume_filename`].forEach(
        (k) => localStorage.removeItem(k)
      );
    }
    // Also clear legacy non-scoped keys
    ["cv_profile", "cv_jobs", "cv_saved", "cv_session", "cv_resume_filename"].forEach(
      (k) => localStorage.removeItem(k)
    );
    setClearConfirm(false);
    setClearMsg("✓ All resume and analysis data cleared.");
    setTimeout(() => setClearMsg(""), 4000);
  };

  const isEmailProvider = user?.providerData?.[0]?.providerId === "password";

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} color={T.accent} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        transition: "background 0.3s, color 0.3s",
      }}
    >
      {/* Retro paper grid */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `linear-gradient(${isDark ? "rgba(244,236,221,0.05)" : "rgba(23,21,15,0.05)"} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? "rgba(244,236,221,0.05)" : "rgba(23,21,15,0.05)"} 1px, transparent 1px)`, backgroundSize: "32px 32px", pointerEvents: "none", zIndex: 0 }} />

      {/* Navbar */}
      <nav style={{ background: T.bg2, borderBottom: `1px solid ${T.border}`, padding: "0.875rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", position: "sticky", top: 0, zIndex: 100, boxShadow: T.shadow }}>
        <button
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, padding: "0.5rem 0.875rem", color: T.text2, cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500, transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text2; }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={12} color="#000" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.9rem" }}>CareerVibe</span>
        </div>
        <span style={{ color: T.text3, fontSize: "0.8rem" }}>/ Settings</span>

        {/* Back to Dashboard */}
        <button
          onClick={() => router.push("/")}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem", background: T.accentDim, border: `1.5px solid ${T.borderA}`, borderRadius: 10, padding: "0.5rem 0.875rem", color: T.accent, cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600, transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)"; }}
        >
          <LayoutDashboard size={14} /> Dashboard
        </button>
      </nav>

      {/* Page heading */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1.25rem 0", position: "relative", zIndex: 1 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>Settings</h1>
        <p style={{ color: T.text2, fontSize: "0.875rem" }}>Manage your app preferences and account options.</p>
      </div>

      {/* Main content */}
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 1.25rem 4rem", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* ─── Appearance ─────────────────────────────────────────────────────── */}
        <SettingsCard title="Appearance" T={T}>
          <SettingRow
            icon={isDark ? <Moon size={18} color={T.accent} /> : <Sun size={18} color={T.accent} />}
            label="Theme"
            description={isDark ? "Dark mode is active" : "Light mode is active"}
            T={T}
          >
            <Toggle on={isDark} onChange={toggleTheme} T={T} labelOn="Dark" labelOff="Light" />
          </SettingRow>
        </SettingsCard>

        {/* ─── Notifications ──────────────────────────────────────────────────── */}
        <SettingsCard title="Notifications" T={T}>
          <SettingRow
            icon={notificationsEnabled ? <Bell size={18} color={T.accent} /> : <BellOff size={18} color={T.text3} />}
            label="Email Notifications"
            description="Receive updates about new job matches and career tips"
            T={T}
          >
            <Toggle on={notificationsEnabled} onChange={toggleNotifications} T={T} labelOn="On" labelOff="Off" />
          </SettingRow>
        </SettingsCard>

        {/* ─── Account ────────────────────────────────────────────────────────── */}
        <SettingsCard title="Account" T={T}>
          {isEmailProvider ? (
            <SettingRow
              icon={<Key size={18} color={T.accent} />}
              label="Change Password"
              description="Send a password reset link to your email"
              T={T}
            >
              <button
                onClick={handlePasswordReset}
                disabled={pwResetLoading}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: 10, border: `1px solid ${T.border}`, background: T.bg2, color: T.text, cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500, whiteSpace: "nowrap", transition: "all 0.2s", opacity: pwResetLoading ? 0.7 : 1 }}
                onMouseEnter={(e) => { if (!pwResetLoading) { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text; }}
              >
                {pwResetLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <ChevronRight size={13} />}
                {pwResetLoading ? "Sending..." : "Send Reset Email"}
              </button>
            </SettingRow>
          ) : (
            <div style={{ padding: "0.75rem 0", color: T.text3, fontSize: "0.8125rem" }}>
              Password change is not available for Google-authenticated accounts.
            </div>
          )}
          {pwResetMsg && (
            <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", borderRadius: 10, background: pwResetMsg.startsWith("✓") ? T.accentDim : "rgba(239,68,68,0.08)", border: `1px solid ${pwResetMsg.startsWith("✓") ? T.borderA : "rgba(239,68,68,0.2)"}`, color: pwResetMsg.startsWith("✓") ? T.accent : "#EF4444", fontSize: "0.8125rem", fontWeight: 500 }}>
              {pwResetMsg}
            </div>
          )}
        </SettingsCard>

        {/* ─── Data & Privacy ─────────────────────────────────────────────────── */}
        <SettingsCard title="Data & Privacy" T={T}>
          <SettingRow
            icon={<Database size={18} color={T.accent} />}
            label="Clear Resume Data"
            description="Wipe locally stored resume, analysis results, and saved jobs"
            T={T}
          >
            {!clearConfirm ? (
              <button
                onClick={() => setClearConfirm(true)}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#EF4444", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <Trash2 size={13} /> Clear Data
              </button>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  onClick={handleClearData}
                  style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", borderRadius: 10, border: "none", background: "#EF4444", color: "#fff", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600 }}
                >
                  <Check size={13} /> Confirm
                </button>
                <button
                  onClick={() => setClearConfirm(false)}
                  style={{ padding: "0.5rem 0.875rem", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.text2, cursor: "pointer", fontSize: "0.8125rem" }}
                >
                  Cancel
                </button>
              </div>
            )}
          </SettingRow>
          {clearMsg && (
            <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", borderRadius: 10, background: T.accentDim, border: `1.5px solid ${T.borderA}`, color: T.accent, fontSize: "0.8125rem", fontWeight: 500 }}>
              {clearMsg}
            </div>
          )}
        </SettingsCard>

        {/* ─── About ──────────────────────────────────────────────────────────── */}
        <SettingsCard title="About" T={T}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles size={18} color="#000" strokeWidth={2.5} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.9375rem" }}>CareerVibe</p>
              <p style={{ fontSize: "0.8125rem", color: T.text3 }}>AI-Powered Career Intelligence · v1.0</p>
            </div>
          </div>
        </SettingsCard>

      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @media (max-width: 600px) {
          main { padding: 1rem 1rem 3rem !important; }
          .setting-row { flex-direction: column !important; align-items: flex-start !important; gap: 0.75rem !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SettingsCard({ title, children, T }) {
  return (
    <div style={{ background: T.bg3, borderRadius: 16, border: `1px solid ${T.border}`, padding: "1.5rem", boxShadow: T.shadow }}>
      <h2 style={{ fontSize: "0.8125rem", fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.25rem" }}>{title}</h2>
      {children}
    </div>
  );
}

function SettingRow({ icon, label, description, children, T }) {
  return (
    <div className="setting-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem", flex: 1, minWidth: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: "0.9rem", color: T.text }}>{label}</p>
          <p style={{ fontSize: "0.8rem", color: T.text3, marginTop: 2, lineHeight: 1.5 }}>{description}</p>
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, T, labelOn, labelOff }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span style={{ fontSize: "0.75rem", color: T.text3, fontWeight: 500, minWidth: 28, textAlign: "right" }}>
        {on ? labelOn : labelOff}
      </span>
      <div style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: on ? T.accent : T.bg4,
        border: `1px solid ${on ? T.borderA : T.border}`,
        position: "relative",
        transition: "background 0.2s, border-color 0.2s",
        flexShrink: 0,
      }}>
        <div style={{
          position: "absolute",
          top: 3,
          left: on ? "calc(100% - 20px)" : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: on ? (T.accent === "#FF7A3D" ? "#17150F" : "#FFF8EE") : T.text3,
          transition: "left 0.2s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        }} />
      </div>
    </button>
  );
}
