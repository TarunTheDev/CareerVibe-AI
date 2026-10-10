"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import {
  auth,
  updateProfile,
  signOut,
} from "@/lib/firebase";
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Shield,
  FileText,
  Edit2,
  Check,
  X,
  Trash2,
  Loader2,
  Sparkles,
  LogOut,
} from "lucide-react";
import { McCharacter, McFace, CHARACTERS } from "@/components/pixel/McCharacter";

// ─── Theme factory (mirrors page.js) ──────────────────────────────────────────
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

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const T = makeT(isDark);

  // Edit name state
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");

  // Resume data from localStorage
  const [resumeFileName, setResumeFileName] = useState(null);
  const [profileSummary, setProfileSummary] = useState(null);

  // Chosen Minecraft-style character (original Career Craft sprite)
  const [characterId, setCharacterId] = useState("explorer");

  useEffect(() => {
    const saved = localStorage.getItem("cv_theme");
    if (saved === "light") setIsDark(false);
    const savedChar = localStorage.getItem("cv_character");
    if (savedChar) setCharacterId(savedChar);
  }, []);

  const pickCharacter = (id) => {
    setCharacterId(id);
    try { localStorage.setItem("cv_character", id); } catch (_) {}
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setNewName(user.displayName || "");
    }
    // Load resume info from user-scoped localStorage
    try {
      const uid = user?.uid;
      if (uid) {
        const profileData = JSON.parse(localStorage.getItem(`cv_${uid}_profile`) || "null");
        if (profileData) {
          setProfileSummary(profileData.summary || profileData.objective || null);
        }
        // Resume filename may be stored
        const fileName = localStorage.getItem(`cv_${uid}_resume_filename`);
        if (fileName) setResumeFileName(fileName);
      }
    } catch (_) {}
  }, [user]);

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    setNameLoading(true);
    setNameMsg("");
    try {
      await updateProfile(auth.currentUser, { displayName: newName.trim() });
      setNameMsg("✓ Display name updated!");
      setEditingName(false);
    } catch (e) {
      setNameMsg("Failed to update name: " + (e.message || "Unknown error"));
    } finally {
      setNameLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteMsg("");
    try {
      const provider = user?.providerData?.[0]?.providerId;
      if (provider === "password") {
        if (!deletePassword.trim()) {
          setDeleteMsg("Please enter your password to confirm deletion.");
          setDeleteLoading(false);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email, deletePassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
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
      await deleteUser(auth.currentUser);
      router.replace("/");
    } catch (e) {
      setDeleteMsg(
        e.code === "auth/wrong-password"
          ? "Incorrect password. Please try again."
          : "Deletion failed: " + (e.message || "Please try again.")
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Format date
  const formatDate = (isoString) => {
    if (!isoString) return "Unknown";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (_) {
      return "Unknown";
    }
  };

  const providerLabel = () => {
    const pid = user?.providerData?.[0]?.providerId;
    if (pid === "google.com") return "Google";
    if (pid === "password") return "Email & Password";
    return "Unknown";
  };

  const initials = (user?.displayName || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

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
        <span style={{ color: T.text3, fontSize: "0.8rem" }}>/ Profile</span>
      </nav>

      {/* Main content */}
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "2.5rem 1.25rem 4rem", position: "relative", zIndex: 1 }}>

        {/* Character sheet — Minecraft-style avatar */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ background: T.bg3, borderRadius: 16, border: `2px solid ${T.border}`, boxShadow: T.shadowMd, overflow: "hidden" }}>
            {/* Title bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", borderBottom: `2px solid ${T.border}`, background: T.bg4 }}>
              <div style={{ width: 10, height: 10, background: T.accent, borderRadius: 2 }} />
              <span style={{ fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.875rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>Character Sheet</span>
            </div>

            {/* Character display */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "2rem 1.25rem" }}>
              <div style={{ padding: "0.75rem", background: T.bg2, border: `2px solid ${T.border}`, borderRadius: 12, boxShadow: `0 0 24px ${T.accentDim}`, imageRendering: "pixelated" }}>
                <McCharacter id={characterId} scale={5} height={160} />
              </div>
              <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>
                  {user.displayName || user.email?.split("@")[0] || "User"}
                </h1>
                <p style={{ color: T.text2, fontSize: "0.875rem", margin: "0.25rem 0 0" }}>{user.email}</p>
                <p style={{ color: T.text3, fontSize: "0.75rem", margin: "0.5rem 0 0", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Playing as {CHARACTERS.find((c) => c.id === characterId)?.label || "Steve"}
                </p>
              </div>
            </div>

            {/* Character picker */}
            <div style={{ borderTop: `2px solid ${T.border}`, padding: "1.25rem", background: T.bg4 }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.875rem" }}>Choose your character</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))", gap: "0.625rem" }}>
                {CHARACTERS.map((c) => {
                  const selected = c.id === characterId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => pickCharacter(c.id)}
                      title={c.label}
                      aria-pressed={selected}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem",
                        padding: "0.5rem 0.25rem", borderRadius: 10, cursor: "pointer",
                        background: selected ? T.accentDim : T.bg2,
                        border: `2px solid ${selected ? T.borderA : T.border}`,
                        boxShadow: selected ? `0 0 0 2px ${T.borderA}` : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      <McFace id={c.id} size={40} style={{ borderRadius: 4 }} />
                      <span style={{ fontSize: "0.625rem", color: selected ? T.text : T.text3, fontWeight: selected ? 700 : 500 }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Account info */}
          <div style={{ background: T.bg3, borderRadius: 16, border: `1px solid ${T.border}`, padding: "1.5rem", boxShadow: T.shadow }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.25rem" }}>Account Info</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <InfoRow icon={<Mail size={16} color={T.accent} />} label="Email" value={user.email || "—"} T={T} />
              <InfoRow icon={<Calendar size={16} color={T.accent} />} label="Member since" value={formatDate(user.metadata?.creationTime)} T={T} />
              <InfoRow icon={<Shield size={16} color={T.accent} />} label="Auth provider" value={providerLabel()} T={T} />
            </div>
          </div>

          {/* Resume data */}
          <div style={{ background: T.bg3, borderRadius: 16, border: `1px solid ${T.border}`, padding: "1.5rem", boxShadow: T.shadow }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.25rem" }}>Resume Data</h2>
            {resumeFileName ? (
              <InfoRow icon={<FileText size={16} color={T.accent} />} label="Last resume" value={resumeFileName} T={T} />
            ) : (
              <p style={{ color: T.text3, fontSize: "0.8125rem" }}>No resume uploaded yet.</p>
            )}
            {profileSummary && (
              <div style={{ marginTop: "1rem", background: T.bg2, borderRadius: 10, padding: "1rem", border: `1px solid ${T.border}` }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>AI Profile Summary</p>
                <p style={{ fontSize: "0.8125rem", color: T.text2, lineHeight: 1.65, margin: 0 }}>{profileSummary}</p>
              </div>
            )}
          </div>

          {/* Edit display name */}
          <div style={{ background: T.bg3, borderRadius: 16, border: `1px solid ${T.border}`, padding: "1.5rem", boxShadow: T.shadow }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.25rem" }}>Edit Display Name</h2>
            {editingName ? (
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleUpdateName(); if (e.key === "Escape") setEditingName(false); }}
                  placeholder="Enter display name..."
                  style={{ flex: 1, minWidth: 200, padding: "0.625rem 0.875rem", borderRadius: 10, border: `1.5px solid ${T.borderA}`, background: T.bg2, color: T.text, fontSize: "0.875rem", outline: "none", fontFamily: "inherit" }}
                  autoFocus
                />
                <button onClick={handleUpdateName} disabled={nameLoading} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.625rem 1rem", borderRadius: 10, border: "none", background: T.accent, color: isDark ? "#000" : "#fff", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600, opacity: nameLoading ? 0.7 : 1 }}>
                  {nameLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />} Save
                </button>
                <button onClick={() => { setEditingName(false); setNewName(user.displayName || ""); }} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.625rem 1rem", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.text2, cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500 }}>
                  <X size={14} /> Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ fontSize: "0.9375rem", color: T.text }}>{user.displayName || <span style={{ color: T.text3 }}>No display name set</span>}</span>
                <button onClick={() => setEditingName(true)} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.text2, cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500, transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text2; }}>
                  <Edit2 size={13} /> Edit
                </button>
              </div>
            )}
            {nameMsg && <p style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: nameMsg.startsWith("✓") ? T.accent : "#EF4444" }}>{nameMsg}</p>}
          </div>

          {/* Sign out */}
          <button
            onClick={async () => {
              try { sessionStorage.clear(); } catch (_) {}
              await signOut(auth);
              router.replace("/");
            }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", padding: "0.875rem", borderRadius: 14, border: `1px solid ${T.border}`, background: T.bg3, color: T.text2, cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#EF4444"; e.currentTarget.style.color = "#EF4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text2; }}
          >
            <LogOut size={15} /> Sign Out
          </button>

          {/* Delete account — danger zone */}
          <div style={{ background: isDark ? "rgba(239,68,68,0.05)" : "rgba(239,68,68,0.04)", borderRadius: 16, border: "1px solid rgba(239,68,68,0.2)", padding: "1.5rem" }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>Danger Zone</h2>
            <p style={{ fontSize: "0.8125rem", color: T.text2, marginBottom: "1.25rem", lineHeight: 1.6 }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.25rem", borderRadius: 10, border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#EF4444", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <Trash2 size={15} /> Delete Account
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <p style={{ fontSize: "0.8125rem", color: "#EF4444", fontWeight: 500 }}>
                  Are you sure? Type your password to confirm (if using email/password login):
                </p>
                {user?.providerData?.[0]?.providerId === "password" && (
                  <input
                    type="password"
                    placeholder="Enter your password..."
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    style={{ padding: "0.625rem 0.875rem", borderRadius: 10, border: "1px solid rgba(239,68,68,0.4)", background: T.bg2, color: T.text, fontSize: "0.875rem", outline: "none", fontFamily: "inherit" }}
                  />
                )}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.25rem", borderRadius: 10, border: "none", background: "#EF4444", color: "#fff", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, opacity: deleteLoading ? 0.7 : 1 }}
                  >
                    {deleteLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
                    {deleteLoading ? "Deleting..." : "Yes, Delete My Account"}
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); setDeleteMsg(""); }}
                    style={{ padding: "0.625rem 1.25rem", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.text2, cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}
                  >
                    Cancel
                  </button>
                </div>
                {deleteMsg && <p style={{ fontSize: "0.8125rem", color: "#EF4444" }}>{deleteMsg}</p>}
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { box-shadow: 0 0 0 2px ${T.accentDim}; }
        @media (max-width: 600px) {
          main { padding: 1.5rem 1rem 3rem !important; }
        }
      `}</style>
    </div>
  );
}

function InfoRow({ icon, label, value, T }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: "0.75rem", color: T.text3, fontWeight: 500, marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: "0.9rem", color: T.text, fontWeight: 500, wordBreak: "break-all" }}>{value}</p>
      </div>
    </div>
  );
}
