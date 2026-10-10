"use client";

// Temporary design-review harness for auth.css — renders the login/signup
// markup without the Firebase auth gate. Delete after QA.
import { useState } from "react";
import "../login/auth.css";

const Sparkles = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
);
const Mail = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>);
const Lock = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>);
const Arrow = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="auth-btn-arrow"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>);
const Moon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>);
const Google = () => (<svg viewBox="0 0 24 24" width="20" height="20"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>);

export default function LoginPreview() {
  const [isDark, setIsDark] = useState(
    () => typeof window !== "undefined" && window.location.search.includes("dark")
  );
  const signup = typeof window !== "undefined" && window.location.search.includes("signup");

  return (
    <div data-theme={isDark ? "dark" : "light"} className="auth-shell">
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <div className="auth-brand-logo-icon"><Sparkles /></div>
            <span className="auth-brand-logo-text">CareerVibe</span>
          </div>
          <h1 className="auth-brand-headline">Your AI-powered<br /><span className="auth-accent">career starts here</span></h1>
          <p className="auth-brand-subtitle">Turn any resume into a real career plan — skills extracted, match scored, gaps mapped.</p>
          <div className="auth-features">
            <div className="auth-feature-card"><div className="auth-feature-icon">⚡</div><div><div className="auth-feature-title">Instant AI Resume Analysis</div><div className="auth-feature-desc">Actionable feedback on your resume in seconds.</div></div></div>
            <div className="auth-feature-card"><div className="auth-feature-icon">🎯</div><div><div className="auth-feature-title">Personalized Job Matches</div><div className="auth-feature-desc">Opportunities aligned with your skills.</div></div></div>
            <div className="auth-feature-card"><div className="auth-feature-icon">📊</div><div><div className="auth-feature-title">Skill Gap Roadmap</div><div className="auth-feature-desc">Clear learning paths to your dream role.</div></div></div>
          </div>
          <div className="auth-brand-footer">© 2026 CareerVibe AI. All rights reserved.</div>
        </div>
      </div>
      <div className="auth-form-panel">
        <button className="auth-theme-toggle" onClick={() => setIsDark((d) => !d)}><Moon /></button>
        <div className="auth-form-wrapper">
          <div className="auth-mobile-logo"><div className="auth-mobile-logo-icon"><Sparkles /></div><span className="auth-mobile-logo-text">CareerVibe</span></div>
          <h2 className="auth-heading">{signup ? "Create Account" : "Welcome Back"}</h2>
          <p className="auth-subheading">{signup ? "Start your journey to a better career." : "Sign in to continue your journey."}</p>
          <button className="auth-google-btn"><Google /> {signup ? "Sign up with Google" : "Continue with Google"}</button>
          <div className="auth-divider"><div className="auth-divider-line" /><span className="auth-divider-text">or</span><div className="auth-divider-line" /></div>
          {signup && (
            <div className="auth-input-group"><div className="auth-input-label-row"><label className="auth-input-label">Full Name</label></div><div className="auth-input-row"><span className="auth-input-icon"><Mail /></span><input className="auth-input-field" placeholder="John Doe" /></div></div>
          )}
          <div className="auth-input-group"><div className="auth-input-label-row"><label className="auth-input-label">Email Address</label></div><div className="auth-input-row"><span className="auth-input-icon"><Mail /></span><input className="auth-input-field" placeholder="name@company.com" /></div></div>
          <div className="auth-input-group"><div className="auth-input-label-row"><label className="auth-input-label">Password</label>{!signup && <button className="auth-forgot-link">Forgot password?</button>}</div><div className="auth-input-row"><span className="auth-input-icon"><Lock /></span><input className="auth-input-field" type="password" placeholder="••••••••" /></div></div>
          <button className="auth-submit-btn">{signup ? "Create Account" : "Sign In"} <Arrow /></button>
          <div className="auth-switch">{signup ? "Already have an account?" : "Don't have an account?"}<button className="auth-switch-link">{signup ? "Sign In" : "Sign Up"}</button></div>
          <div className="auth-privacy">By continuing, you agree to our <a href="#">Terms of Service</a> & <a href="#">Privacy Policy</a></div>
        </div>
      </div>
    </div>
  );
}
