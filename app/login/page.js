"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "@/lib/firebase";
import { nukeAllResumeData } from "@/lib/userStorage";
import "./auth.css";

// ── SVG Icons ────────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="auth-btn-arrow">
    <path d="M5 12h14m-7-7 7 7-7 7"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="auth-error-icon">
    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
  </svg>
);

const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
  </svg>
);

// ── Error message mapper ──────────────────────────────────────────────────────
function firebaseErrorMsg(code) {
  const map = {
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password. Please check and try again.",
    "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many failed attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your internet connection and try again.",
    "auth/popup-closed-by-user": "Sign-in popup was closed before completing. Please try again.",
    "auth/cancelled-popup-request": "Sign-in was cancelled. Please try again.",
    "auth/operation-not-allowed": "Email/Password sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.",
    "auth/admin-restricted-operation": "This operation is restricted. Please contact the administrator.",
    "auth/popup-blocked": "Sign-in popup was blocked by your browser. Please allow popups for this site.",
    "auth/unauthorized-domain": "This domain is not authorized for Firebase auth. Add it in Firebase Console → Authentication → Authorized domains.",
    "auth/user-disabled": "This account has been disabled. Please contact support.",
    "auth/requires-recent-login": "Please sign in again to complete this action.",
    "auth/credential-already-in-use": "This credential is already associated with a different account.",
    "auth/internal-error": "An internal error occurred. Please try again.",
  };
  if (map[code]) return map[code];
  // Show the actual Firebase error code for debugging
  if (code) return `Authentication error: ${code.replace('auth/', '').replace(/-/g, ' ')}. Please try again.`;
  return "Something went wrong. Please try again.";
}

// ── Email validation helper ──────────────────────────────────────────────────
function isValidEmail(email) {
  // Standard RFC 5322-ish email regex — rejects "abc", "user@", "@domain" etc.
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [isDark, setIsDark] = useState(false);  // Default to light theme
  const [mode, setMode] = useState(initialMode); // "login" | "signup" | "forgot"
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/");
      } else {
        setCheckingAuth(false);
      }
    });
    return () => unsub();
  }, [router]);

  // Sync theme with localStorage
  useEffect(() => {
    const saved = localStorage.getItem("cv_theme");
    if (saved === "light") setIsDark(false);
  }, []);

  const toggleTheme = () => {
    setIsDark((d) => {
      localStorage.setItem("cv_theme", d ? "light" : "dark");
      return !d;
    });
  };

  const clearForm = () => {
    setError("");
    setSuccess("");
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
  };

  const switchMode = (newMode) => {
    clearForm();
    setMode(newMode);
  };

  // ── Google Sign In ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const gUser = result.user;

      // Fix 1: Detect first-time Google sign-in (created just now)
      const created = new Date(gUser.metadata.creationTime).getTime();
      const lastLogin = new Date(gUser.metadata.lastSignInTime).getTime();
      const isNewAccount = Math.abs(lastLogin - created) < 10000;

      // Fix 1+4: Nuclear wipe — remove ALL data not belonging to this user
      // For new accounts, pass null to wipe everything.
      // For returning users, preserve their own data.
      nukeAllResumeData(isNewAccount ? null : gUser.uid);

      router.replace("/");
    } catch (err) {
      console.error("Google Sign-In Error:", err.code, err.message, err);
      setError(firebaseErrorMsg(err.code));
      setGoogleLoading(false);
    }
  };

  // ── Email/Password Sign In ──────────────────────────────────────────────────
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (!isValidEmail(email)) { setError("Please enter a valid email address (e.g. name@example.com)."); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/");
    } catch (err) {
      console.error("[Auth] Email Sign-In Error:", err.code, err.message, err);
      setError(firebaseErrorMsg(err.code));
      setLoading(false);
    }
  };

  // ── Sign Up ─────────────────────────────────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password || !confirmPassword) { setError("Please fill in all fields."); return; }
    if (!isValidEmail(email)) { setError("Please enter a valid email address (e.g. name@example.com)."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      // Fix 1: Nuclear wipe — pass null so ALL cv_* data is removed.
      // Brand-new account must NEVER see data from a previous user/session.
      nukeAllResumeData(null);

      router.replace("/");
    } catch (err) {
      console.error("[Auth] Signup Error:", err.code, err.message, err);
      setError(firebaseErrorMsg(err.code));
      setLoading(false);
    }
  };

  // ── Forgot Password ────────────────────────────────────────────────────────
  const handleForgot = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email) { setError("Please enter your email address."); return; }
    if (!isValidEmail(email)) { setError("Please enter a valid email address (e.g. name@example.com)."); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset link sent! Check your inbox.");
      setLoading(false);
    } catch (err) {
      setError(firebaseErrorMsg(err.code));
      setLoading(false);
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (checkingAuth) {
    return (
      <div data-theme={isDark ? "dark" : "light"} className="auth-loading-overlay">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  const theme = isDark ? "dark" : "light";

  return (
    <div data-theme={theme} className="auth-shell">
      {/* ── LEFT BRANDING PANEL ──────────────────────────────────────────── */}
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <div className="auth-brand-logo-icon"><SparklesIcon /></div>
            <span className="auth-brand-logo-text">CareerVibe</span>
          </div>

          <h1 className="auth-brand-headline">
            Your AI-powered<br />
            <span className="auth-accent">career starts here</span>
          </h1>

          <p className="auth-brand-subtitle">
            Join thousands of professionals accelerating their growth with intelligent insights and personalized opportunities.
          </p>

          <div className="auth-features">
            <div className="auth-feature-card">
              <div className="auth-feature-icon">⚡</div>
              <div>
                <div className="auth-feature-title">Instant AI Resume Analysis</div>
                <div className="auth-feature-desc">Get actionable feedback on your resume in seconds.</div>
              </div>
            </div>
            <div className="auth-feature-card">
              <div className="auth-feature-icon">🎯</div>
              <div>
                <div className="auth-feature-title">Personalized Job Matches</div>
                <div className="auth-feature-desc">Opportunities aligned with your unique skills and experience.</div>
              </div>
            </div>
            <div className="auth-feature-card">
              <div className="auth-feature-icon">📊</div>
              <div>
                <div className="auth-feature-title">Skill Gap Roadmap</div>
                <div className="auth-feature-desc">Clear learning paths to reach your dream role.</div>
              </div>
            </div>
          </div>

          <div className="auth-brand-footer">© 2026 CareerVibe AI. All rights reserved.</div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ─────────────────────────────────────────────── */}
      <div className="auth-form-panel">
        <button className="auth-theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>

        <div className="auth-form-wrapper">
          {/* Mobile logo */}
          <div className="auth-mobile-logo">
            <div className="auth-mobile-logo-icon"><SparklesIcon /></div>
            <span className="auth-mobile-logo-text">CareerVibe</span>
          </div>

          {/* ── LOGIN MODE ──────────────────────────────────────────────── */}
          {mode === "login" && (
            <>
              <h2 className="auth-heading">Welcome Back</h2>
              <p className="auth-subheading">Sign in to continue your journey.</p>

              {error && <div className="auth-error"><AlertIcon /><span>{error}</span></div>}

              <button className="auth-google-btn" onClick={handleGoogle} disabled={googleLoading}>
                {googleLoading ? <div className="auth-spinner" style={{borderTopColor:"#1f2937",borderRightColor:"#1f2937"}} /> : <><GoogleIcon /> Continue with Google</>}
              </button>

              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span className="auth-divider-text">or</span>
                <div className="auth-divider-line" />
              </div>

              <form onSubmit={handleEmailLogin}>
                <div className="auth-input-group">
                  <div className="auth-input-label-row"><label className="auth-input-label">Email Address</label></div>
                  <div className="auth-input-row">
                    <span className="auth-input-icon"><MailIcon /></span>
                    <input className="auth-input-field" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  </div>
                </div>

                <div className="auth-input-group">
                  <div className="auth-input-label-row">
                    <label className="auth-input-label">Password</label>
                    <button type="button" className="auth-forgot-link" onClick={() => switchMode("forgot")}>Forgot password?</button>
                  </div>
                  <div className="auth-input-row">
                    <span className="auth-input-icon"><LockIcon /></span>
                    <input className="auth-input-field" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                    <button type="button" className="auth-input-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? <div className="auth-spinner" /> : <>Sign In <ArrowIcon /></>}
                </button>
              </form>

              <div className="auth-switch">
                Don&apos;t have an account?
                <button className="auth-switch-link" onClick={() => switchMode("signup")}>Sign Up</button>
              </div>
            </>
          )}

          {/* ── SIGNUP MODE ─────────────────────────────────────────────── */}
          {mode === "signup" && (
            <>
              <h2 className="auth-heading">Create Account</h2>
              <p className="auth-subheading">Start your journey to a better career.</p>

              {error && <div className="auth-error"><AlertIcon /><span>{error}</span></div>}

              <button className="auth-google-btn" onClick={handleGoogle} disabled={googleLoading}>
                {googleLoading ? <div className="auth-spinner" style={{borderTopColor:"#1f2937",borderRightColor:"#1f2937"}} /> : <><GoogleIcon /> Sign up with Google</>}
              </button>

              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span className="auth-divider-text">or</span>
                <div className="auth-divider-line" />
              </div>

              <form onSubmit={handleSignUp}>
                <div className="auth-input-group">
                  <div className="auth-input-label-row"><label className="auth-input-label">Full Name</label></div>
                  <div className="auth-input-row">
                    <span className="auth-input-icon"><UserIcon /></span>
                    <input className="auth-input-field" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  </div>
                </div>

                <div className="auth-input-group">
                  <div className="auth-input-label-row"><label className="auth-input-label">Email Address</label></div>
                  <div className="auth-input-row">
                    <span className="auth-input-icon"><MailIcon /></span>
                    <input className="auth-input-field" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  </div>
                </div>

                <div className="auth-input-group">
                  <div className="auth-input-label-row"><label className="auth-input-label">Password</label></div>
                  <div className="auth-input-row">
                    <span className="auth-input-icon"><LockIcon /></span>
                    <input className="auth-input-field" type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                    <button type="button" className="auth-input-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <div className="auth-input-group">
                  <div className="auth-input-label-row"><label className="auth-input-label">Confirm Password</label></div>
                  <div className="auth-input-row">
                    <span className="auth-input-icon"><LockIcon /></span>
                    <input className="auth-input-field" type={showConfirm ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                    <button type="button" className="auth-input-toggle" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? <div className="auth-spinner" /> : <>Create Account <ArrowIcon /></>}
                </button>
              </form>

              <div className="auth-switch">
                Already have an account?
                <button className="auth-switch-link" onClick={() => switchMode("login")}>Sign In</button>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD MODE ────────────────────────────────────── */}
          {mode === "forgot" && (
            <>
              <h2 className="auth-heading">Reset Password</h2>
              <p className="auth-subheading">Enter your email and we&apos;ll send you a reset link.</p>

              {error && <div className="auth-error"><AlertIcon /><span>{error}</span></div>}
              {success && <div className="auth-success"><CheckIcon /><span>{success}</span></div>}

              <form onSubmit={handleForgot}>
                <div className="auth-input-group">
                  <div className="auth-input-label-row"><label className="auth-input-label">Email Address</label></div>
                  <div className="auth-input-row">
                    <span className="auth-input-icon"><MailIcon /></span>
                    <input className="auth-input-field" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? <div className="auth-spinner" /> : <>Send Reset Link <ArrowIcon /></>}
                </button>
              </form>

              <div className="auth-switch">
                Remember your password?
                <button className="auth-switch-link" onClick={() => switchMode("login")}>Sign In</button>
              </div>
            </>
          )}

          {/* Privacy */}
          <div className="auth-privacy">
            By continuing, you agree to our{" "}
            <a href="#">Terms of Service</a> &{" "}
            <a href="#">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense because useSearchParams requires it in Next.js
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid transparent', borderTopColor: '#F97316', borderRightColor: '#F97316', borderRadius: '50%', animation: 'rotate 0.7s linear infinite' }} />
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
