"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowRight, ArrowDown, FileText, Brain, Target, Sparkles, Check, X,
  Sun, Moon, Upload, Zap, TrendingUp, Clock, Shield, Eye, Menu,
  Github, Twitter, Star, Heart, Compass, Send, BadgeCheck, Lock,
} from "lucide-react";
import { McCharacter } from "@/components/pixel/McCharacter";
import { PixelSprite } from "@/components/pixel/PixelSprites";
import HeroVideo from "@/components/HeroVideo";
import "./landing-retro.css";

// ════════════════════════════════════════════════════════════════════════════
// CAREERVIBE LANDING — RETRO EDITION
// Honest copy, loud design. Every claim on this page is real.
// ════════════════════════════════════════════════════════════════════════════

// ─── Small building blocks ──────────────────────────────────────────────────

/** Wrapper that gently pulls its child toward the cursor. */
function Magnetic({ children, strength = 0.22, style }) {
  const ref = useRef(null);

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }, [strength]);

  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = "translate(0px, 0px)";
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        display: "inline-block",
        transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Number that counts up when `active` flips true. */
function CountUp({ target, active, suffix = "", duration = 1100 }) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let start = null;
    const tick = (ts) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, target, duration]);

  return <>{value}{suffix}</>;
}

/** Rotating word in the headline. */
function FlipWords({ words, interval = 2600 }) {
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState(null);
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setIndex((i) => {
        setPrev(i);
        return (i + 1) % words.length;
      });
    }, interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  return (
    <span className="rv-flip" aria-live="polite">
      {/* invisible sizer keeps layout stable across words */}
      <span style={{ visibility: "hidden", position: "static", opacity: 1, transform: "none" }} aria-hidden="true">
        <span className="rv-mark rv-mark-orange">{longest}</span>
      </span>
      {words.map((w, i) => (
        <span
          key={w}
          aria-hidden={i !== index}
          className={i === index ? "rv-flip-active" : i === prev ? "rv-flip-exit" : ""}
        >
          <span className="rv-mark rv-mark-orange">{w}</span>
        </span>
      ))}
    </span>
  );
}

/** Hand-drawn squiggle underline. */
function Squiggle({ children }) {
  return (
    <span className="rv-squiggle">
      {children}
      <svg viewBox="0 0 220 14" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M3 10 C 30 2, 55 12, 82 7 S 140 2, 165 8 S 205 10, 217 5"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Spinning circular badge with text on a path. */
function OrbitBadge({ style }) {
  return (
    <div className="rv-orbit" style={style} aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <defs>
          <path id="rv-orbit-path" d="M 60,60 m -44,0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0" />
        </defs>
        <text style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.22em", fill: "currentColor", textTransform: "uppercase" }}>
          <textPath href="#rv-orbit-path">
            Free during beta · No credit card ·
          </textPath>
        </text>
      </svg>
      <div className="rv-orbit-core">
        <Sparkles size={26} />
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage({ isDark, T, onStart, toggleTheme, user, onSignOut }) {
  const theme = isDark ? "dark" : "light";
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [demoTab, setDemoTab] = useState(0);
  const [demoSeen, setDemoSeen] = useState(false);
  const revealRefs = useRef([]);
  const demoRef = useRef(null);
  const heroRef = useRef(null);

  // P3-2 hero pointer parallax — desktop only, rAF-throttled, off under
  // reduced-motion and on touch. Sets --px/--py (-1..1) consumed by CSS.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    let raf = 0, tx = 0, ty = 0;
    const apply = () => { el.style.setProperty("--px", tx.toFixed(3)); el.style.setProperty("--py", ty.toFixed(3)); raf = 0; };
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(apply); };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => { el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // Scroll progress + nav elevation
  useEffect(() => {
    const onScroll = () => {
      setNavScrolled(window.scrollY > 24);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reveal-on-scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("rv-in"); }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Kick off demo animations once the window scrolls into view
  useEffect(() => {
    if (!demoRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setDemoSeen(true); },
      { threshold: 0.3 }
    );
    obs.observe(demoRef.current);
    return () => obs.disconnect();
  }, []);

  const addReveal = (el) => { if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el); };
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  // ── Content (all honest, no invented numbers) ─────────────────────────
  const navItems = [
    ["features", "Features"],
    ["how-it-works", "How it works"],
    ["pricing", "Pricing"],
    ["faq", "FAQ"],
  ];

  const marqueeItems = [
    "AI resume parser", "Career path simulator", "Skill gap analysis",
    "3-step action plans", "Free during beta", "PDF · DOCX · TXT",
  ];

  const faqs = [
    { q: "Is CareerVibe really free?", a: "Yes, completely free during beta. No credit card required. When we launch paid features, beta users will get early pricing." },
    { q: "What does CareerVibe actually do right now?", a: "CareerVibe parses your resume (PDF/DOCX/TXT) to extract your skills, experience, and education. Then you can enter a target job title to get a career path analysis with skill gaps, match score, and a 3-step action plan. It's an early MVP focused on career exploration." },
    { q: "Does it find me jobs?", a: "Not yet. Job matching is on the roadmap. Right now, CareerVibe helps you understand what skills you need for your target role, not match you to specific job listings." },
    { q: "Is there an ATS score checker?", a: "Not yet. ATS scoring is on the roadmap. Currently, CareerVibe focuses on resume parsing and career path analysis." },
    { q: "What about interview prep?", a: "Interview prep is planned but not built yet. Check the roadmap for what's coming." },
    { q: "Is my data safe?", a: "Your resume is processed securely and stored in your account. We don't sell your data. You can clear all your data from Settings at any time." },
    { q: "Who built this?", a: "CareerVibe is built by a four-person team that got tired of bad career advice. Shipping in public, one feature at a time." },
    { q: "What file formats are supported?", a: "PDF, DOCX, and TXT files are all supported for resume upload and parsing." },
  ];

  const demoTabs = [
    { label: "Parse", icon: <FileText size={14} /> },
    { label: "Simulate", icon: <Target size={14} /> },
    { label: "Close the gap", icon: <TrendingUp size={14} /> },
  ];

  const ctaHref = user ? undefined : "/signup";
  const ctaAction = user ? onStart : undefined;

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="rv-root" data-theme={theme}>
      <div className="rv-grain" aria-hidden="true" />
      <div className="rv-progress" style={{ width: `${scrollProgress}%` }} aria-hidden="true" />

      {/* ── Mobile menu ─────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="rv-mobile-menu" role="dialog" aria-modal="true">
          <button className="rv-mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
            <X size={22} />
          </button>
          {navItems.map(([id, label]) => (
            <button key={id} className="rv-nav-link" onClick={() => scrollTo(id)}>{label}</button>
          ))}
          {user ? (
            <button onClick={onStart} className="rv-btn rv-btn-primary rv-btn-lg" style={{ marginTop: "1rem" }}>
              Open dashboard <ArrowRight size={18} className="rv-arrow" />
            </button>
          ) : (
            <a href="/signup" className="rv-btn rv-btn-primary rv-btn-lg" style={{ marginTop: "1rem" }}>
              Join the beta <ArrowRight size={18} className="rv-arrow" />
            </a>
          )}
        </div>
      )}

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <div className="rv-nav-wrap">
        <nav className={`rv-nav${navScrolled ? " rv-nav-scrolled" : ""}`} aria-label="Main">
          <a href="/" className="rv-logo">
            <span className="rv-logo-badge"><Sparkles size={17} strokeWidth={2.5} /></span>
            CareerVibe
          </a>

          <div className="rv-nav-links">
            {navItems.map(([id, label]) => (
              <button key={id} className="rv-nav-link" onClick={() => scrollTo(id)}>{label}</button>
            ))}
          </div>

          <div className="rv-nav-actions">
            <button className="rv-theme-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {user ? (
              <>
                <button onClick={onSignOut} className="rv-btn rv-btn-sm rv-btn-ghost-hide">Sign out</button>
                <button onClick={onStart} className="rv-btn rv-btn-sm rv-btn-primary">Dashboard</button>
              </>
            ) : (
              <>
                <a href="/login" className="rv-btn rv-btn-sm rv-btn-ghost-hide">Log in</a>
                <a href="/signup" className="rv-btn rv-btn-sm rv-btn-primary">Join beta</a>
              </>
            )}
            <button className="rv-hamburger" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
              <Menu size={19} />
            </button>
          </div>
        </nav>
      </div>

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="rv-hero rv-hero--video" id="hero">
        <HeroVideo />
        {/* floating stickers */}
        <div className="rv-sticker rv-sticker-round" style={{ "--rv-tilt": "-8deg", top: "22%", left: "6%", width: 74, height: 74, background: "var(--rv-lilac)", animationDelay: "0.4s" }}>
          <Compass size={30} color="#17150F" />
        </div>
        <div className="rv-sticker rv-sticker-square" style={{ "--rv-tilt": "7deg", top: "18%", right: "7%", width: 70, height: 70, background: "var(--rv-mint)", animationDelay: "1.6s" }}>
          <FileText size={28} color="#17150F" />
        </div>
        <div className="rv-sticker rv-sticker-square" style={{ "--rv-tilt": "-5deg", top: "48%", right: "3.5%", width: 62, height: 62, background: "var(--rv-pink)", animationDelay: "0.9s" }}>
          <Heart size={26} color="#17150F" />
        </div>
        <div className="rv-sticker rv-sticker-round" style={{ "--rv-tilt": "5deg", top: "52%", left: "3.5%", width: 64, height: 64, background: "var(--rv-yellow)", animationDelay: "2.2s" }}>
          <Zap size={26} color="#17150F" />
        </div>

        <div className="rv-container">
          <div className="rv-hero-inner">
            <div ref={addReveal} className="rv-reveal rv-hero-badge">
              <span className="rv-kicker-dot" /> Now in public beta — everything below is live
            </div>

            <h1 ref={addReveal} className="rv-reveal rv-d1 rv-hero-title">
              <span className="rv-line">Turn your resume</span>
              <span className="rv-line">into a <FlipWords words={["career plan", "skill map", "match score", "game plan"]} /></span>
            </h1>

            <p ref={addReveal} className="rv-reveal rv-d2 rv-hero-sub">
              CareerVibe reads your resume like a senior recruiter — pulls out your real skills,
              scores you against your target role, and hands you a{" "}
              <strong>3-step plan</strong> to close the gap. No templates. No fluff.
            </p>

            <div ref={addReveal} className="rv-reveal rv-d3 rv-hero-ctas">
              <Magnetic>
                <a href={ctaHref} onClick={ctaAction} className="rv-btn rv-btn-primary rv-btn-lg" style={{ cursor: "pointer" }}>
                  <Upload size={19} /> Upload your resume — free
                </a>
              </Magnetic>
              <Magnetic strength={0.15}>
                <button onClick={() => scrollTo("features")} className="rv-btn rv-btn-lg">
                  See what it does <ArrowDown size={17} className="rv-arrow" />
                </button>
              </Magnetic>
            </div>

            <div ref={addReveal} className="rv-reveal rv-d4 rv-trust-row">
              <span className="rv-trust-chip"><Check size={13} strokeWidth={3} /> Free during beta</span>
              <span className="rv-trust-chip"><Check size={13} strokeWidth={3} /> No credit card</span>
              <span className="rv-trust-chip"><Check size={13} strokeWidth={3} /> Results in seconds</span>
            </div>

            {/* ── Your career party (Minecraft-style characters) ── */}
            <div ref={addReveal} className="rv-reveal rv-d4" aria-hidden="true" style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "12px", marginTop: "1.5rem", marginBottom: "-10px", position: "relative", zIndex: 2, flexWrap: "wrap" }}>
              {["explorer", "mentor", "engineer", "analyst"].map((id) => (
                <McCharacter key={id} id={id} scale={3} height={96} />
              ))}
            </div>

            {/* ── Interactive demo window ── */}
            <div ref={addReveal} className="rv-reveal rv-d5" style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
              <OrbitBadge style={{ top: -60, right: -8, color: "var(--rv-ink)" }} />
              <div className="rv-window" ref={demoRef}>
                <div className="rv-window-bar">
                  <span className="rv-window-dot" style={{ background: "var(--rv-orange)" }} />
                  <span className="rv-window-dot" style={{ background: "var(--rv-yellow)" }} />
                  <span className="rv-window-dot" style={{ background: "var(--rv-mint)" }} />
                  <span className="rv-window-url">careervibe.app — your resume, decoded</span>
                </div>

                <div className="rv-demo-tabs" role="tablist" aria-label="Product demo">
                  {demoTabs.map((t, i) => (
                    <button
                      key={t.label}
                      role="tab"
                      aria-selected={demoTab === i}
                      className={`rv-demo-tab${demoTab === i ? " rv-active" : ""}`}
                      onClick={() => setDemoTab(i)}
                    >
                      {t.icon} {String(i + 1).padStart(2, "0")} · {t.label}
                    </button>
                  ))}
                </div>

                <div className="rv-demo-body">
                  {/* Pane 1 — Parse */}
                  {demoTab === 0 && (
                    <div className="rv-demo-pane rv-demo-grid">
                      <div className="rv-demo-card">
                        <div className="rv-demo-label">Drop your resume</div>
                        <div className="rv-dropzone">
                          <Upload size={30} style={{ color: "var(--rv-orange)", margin: "0 auto 0.6rem", display: "block" }} />
                          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Drag &amp; drop it here</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--rv-ink-faint)", marginTop: "0.3rem" }}>
                            PDF, DOCX or TXT — parsed in seconds
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.9rem", flexWrap: "wrap" }}>
                          <span className="rv-chip rv-chip-orange">PDF</span>
                          <span className="rv-chip rv-chip-yellow">DOCX</span>
                          <span className="rv-chip rv-chip-mint">TXT</span>
                        </div>
                      </div>
                      <div className="rv-demo-card">
                        <div className="rv-demo-label">What the AI extracts</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                          <div>
                            <div style={{ fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--rv-ink-faint)" }}>SKILLS</div>
                            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                              <span className="rv-chip rv-chip-yellow">React</span>
                              <span className="rv-chip rv-chip-mint">Python</span>
                              <span className="rv-chip rv-chip-lilac">SQL</span>
                              <span className="rv-chip rv-chip-pink">Figma</span>
                              <span className="rv-chip">+ 12 more</span>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--rv-ink-faint)" }}>EXPERIENCE &amp; EDUCATION</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                              <div className="rv-scan-row" style={{ width: "92%" }} />
                              <div className="rv-scan-row" style={{ width: "74%", animationDelay: "0.2s" }} />
                              <div className="rv-scan-row" style={{ width: "84%", animationDelay: "0.4s" }} />
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.8rem", fontWeight: 700, color: "var(--rv-mint)" }}>
                            <BadgeCheck size={16} /> Profile extracted — name, summary, skills, industries
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pane 2 — Simulate */}
                  {demoTab === 1 && (
                    <div className="rv-demo-pane rv-demo-grid">
                      <div className="rv-demo-card" style={{ textAlign: "center" }}>
                        <div className="rv-demo-label">Match vs. “Product Designer”</div>
                        <div className="rv-score-num" style={{ color: "var(--rv-ink-green)" }}>
                          <CountUp target={78} active={demoSeen} suffix="%" />
                        </div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--rv-ink-faint)", margin: "0.4rem 0 1rem" }}>
                          match score from your real skills
                        </div>
                        <div className="rv-meter">
                          <div className="rv-meter-fill" style={{ width: demoSeen ? "78%" : "0%" }} />
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem", marginTop: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
                          <span className="rv-chip rv-chip-mint">~6 mo transition</span>
                          <span className="rv-chip rv-chip-yellow">High demand</span>
                        </div>
                      </div>
                      <div className="rv-demo-card">
                        <div className="rv-demo-label">Transferable strengths</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                          {[
                            ["Design systems thinking", "Figma + component libraries"],
                            ["User empathy", "3 yrs of customer-facing work"],
                            ["Prototyping speed", "React fundamentals carry over"],
                          ].map(([title, sub]) => (
                            <div key={title} className="rv-plan-step">
                              <span style={{ color: "var(--rv-mint)", flexShrink: 0, marginTop: 2 }}><Check size={17} strokeWidth={3} /></span>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>{title}</div>
                                <div style={{ fontSize: "0.78rem", color: "var(--rv-ink-faint)" }}>{sub}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pane 3 — Close the gap */}
                  {demoTab === 2 && (
                    <div className="rv-demo-pane rv-demo-grid">
                      <div className="rv-demo-card">
                        <div className="rv-demo-label">Skill gaps found</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                          {[
                            ["Interaction design", 40, ""],
                            ["User research", 55, "rv-meter-mint"],
                            ["Portfolio storytelling", 25, "rv-meter-lilac"],
                          ].map(([skill, pct, cls]) => (
                            <div key={skill}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                                <span>{skill}</span>
                                <span style={{ color: "var(--rv-ink-faint)" }}>{pct}% there</span>
                              </div>
                              <div className="rv-meter" style={{ height: 12 }}>
                                <div className={`rv-meter-fill ${cls}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rv-demo-card">
                        <div className="rv-demo-label">Your 3-step action plan</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                          {[
                            "Ship 2 case studies that show your design process end-to-end",
                            "Run 5 usability tests and document what changed because of them",
                            "Rewrite your summary around outcomes, not job duties",
                          ].map((step, i) => (
                            <div key={i} className="rv-plan-step">
                              <span className="rv-plan-num">{i + 1}</span>
                              <div style={{ fontSize: "0.865rem", fontWeight: 600, lineHeight: 1.5 }}>{step}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ MARQUEE ═══════════════════════════════════════════════════ */}
      <div className="rv-marquee" aria-hidden="true">
        <div className="rv-marquee-track">
          {[0, 1].map((dup) => (
            <div key={dup} className="rv-marquee-item">
              {marqueeItems.map((item) => (
                <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: "2.5rem" }}>
                  {item} <Star size={15} fill="currentColor" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ══ FOUNDER NOTE ══════════════════════════════════════════════ */}
      <section className="rv-section">
        <div className="rv-container">
          <div ref={addReveal} className="rv-reveal rv-postcard">
            <div className="rv-postcard-tape" />
            <p className="rv-postcard-quote">
              “We applied to <span className="rv-mark">200+ jobs</span> and got 3 callbacks.
              Every resume builder felt like a template factory. Every career tool gave generic advice.
              So we built the tool we wish we had — honest, AI-powered feedback on our <em>actual</em> resumes.”
            </p>
            <div className="rv-postcard-sig">
              <div className="rv-avatar">T</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>Team CareerVibe</div>
                <div style={{ fontSize: "0.82rem", color: "var(--rv-ink-faint)", fontWeight: 600 }}>
                  A four-person team, shipping in public
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════════ */}
      <section className="rv-section rv-section-alt" id="features">
        <div className="rv-container">
          <div ref={addReveal} className="rv-reveal rv-center" style={{ marginBottom: "4rem" }}>
            <div className="rv-kicker"><span className="rv-kicker-dot" /> Features</div>
            <h2 className="rv-h2">
              What CareerVibe does <Squiggle>today</Squiggle>
            </h2>
            <p className="rv-section-sub">
              v1 does a few things really well. No vaporware — if it&apos;s on this page, it works right now.
            </p>
          </div>

          <div className="rv-bento">
            <div ref={addReveal} className="rv-reveal rv-card rv-card-wide">
              <span className="rv-card-tag rv-chip rv-chip-yellow">Live</span>
              <div className="rv-card-icon" style={{ background: "var(--rv-orange)" }}><FileText size={23} /></div>
              <h3 className="rv-card-title">AI Resume Parser</h3>
              <p className="rv-card-desc">
                Upload a PDF, DOCX, or TXT and get your professional profile extracted instantly — name,
                summary, categorized skills, education, work history, and industry tags. Structured data,
                not a wall of text.
              </p>
              <div style={{ marginTop: "1.35rem", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
                {["Name & contact info", "Professional summary", "Skills with categories", "Experience & education"].map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.865rem", fontWeight: 600, color: "var(--rv-ink-soft)" }}>
                    <Check size={15} strokeWidth={3} style={{ color: "var(--rv-orange)", flexShrink: 0 }} /> {item}
                  </div>
                ))}
              </div>
            </div>

            <div ref={addReveal} className="rv-reveal rv-d1 rv-card">
              <span className="rv-card-tag rv-chip rv-chip-yellow">Live</span>
              <div className="rv-card-icon" style={{ background: "var(--rv-mint)" }}><Target size={23} /></div>
              <h3 className="rv-card-title">Career Path Simulator</h3>
              <p className="rv-card-desc">
                Type any target job title. Get a match score, transition timeline, market demand rating,
                salary range, and a 3-step action plan built from your actual skills.
              </p>
              <div style={{ marginTop: "1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                  <span>Match score</span><span style={{ color: "var(--rv-ink-green)" }}>78%</span>
                </div>
                <div className="rv-meter" style={{ height: 13 }}>
                  <div className="rv-meter-fill" style={{ width: "78%" }} />
                </div>
              </div>
            </div>

            <div ref={addReveal} className="rv-reveal rv-d1 rv-card">
              <span className="rv-card-tag rv-chip rv-chip-yellow">Live</span>
              <div className="rv-card-icon" style={{ background: "var(--rv-lilac)" }}><Brain size={23} /></div>
              <h3 className="rv-card-title">Skill Gap Analysis</h3>
              <p className="rv-card-desc">
                See exactly which skills stand between you and the role you want — with market demand
                and learning priorities for each one.
              </p>
              <div style={{ marginTop: "1.2rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                <span className="rv-chip rv-chip-lilac">React</span>
                <span className="rv-chip rv-chip-mint">TypeScript</span>
                <span className="rv-chip rv-chip-pink">System design</span>
              </div>
            </div>

            <div ref={addReveal} className="rv-reveal rv-d2 rv-card">
              <span className="rv-card-tag rv-chip rv-chip-yellow">Live</span>
              <div className="rv-card-icon" style={{ background: "var(--rv-pink)" }}><Eye size={23} /></div>
              <h3 className="rv-card-title">Profile & Privacy</h3>
              <p className="rv-card-desc">
                Edit your profile, control your data, wipe everything with one click. Dark and light retro
                themes for late-night job hunts.
              </p>
            </div>

            <div ref={addReveal} className="rv-reveal rv-d3 rv-card">
              <span className="rv-card-tag rv-chip rv-chip-yellow">Live</span>
              <div className="rv-card-icon" style={{ background: "var(--rv-yellow)" }}><Shield size={23} /></div>
              <h3 className="rv-card-title">Quick Sign Up</h3>
              <p className="rv-card-desc">
                Email + password or Google, then straight to the upload screen. No 12-step onboarding
                quiz. You&apos;re analyzing your resume in under a minute.
              </p>
            </div>
          </div>

          <div ref={addReveal} className="rv-reveal rv-soon-strip">
            <span style={{ fontSize: "0.875rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Coming next →
            </span>
            <span className="rv-chip">Interview prep</span>
            <span className="rv-chip">Resume tailoring</span>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════ */}
      <section className="rv-section" id="how-it-works">
        <div className="rv-container">
          <div ref={addReveal} className="rv-reveal rv-center" style={{ marginBottom: "4.5rem" }}>
            <div className="rv-kicker"><span className="rv-kicker-dot" /> How it works</div>
            <h2 className="rv-h2">
              Three steps. <span className="rv-mark rv-mark-mint">Zero fluff.</span>
            </h2>
            <p className="rv-section-sub">No lengthy setup. No credit card. Just upload and explore.</p>
          </div>

          <div className="rv-steps">
            {[
              { num: "01", bg: "var(--rv-orange)", sprite: "builder", icon: <Upload size={22} />, title: "Upload your resume", desc: "Drag in a PDF, DOCX, or TXT. The AI extracts your skills, experience, education, and industry tags automatically." },
              { num: "02", bg: "var(--rv-yellow)", sprite: "inspector", icon: <Brain size={22} />, title: "Get the honest read", desc: "Your profile, broken into structured data. See your strengths and how you're actually positioned — not how a template says you are." },
              { num: "03", bg: "var(--rv-mint)", sprite: "miner", icon: <TrendingUp size={22} />, title: "Follow the plan", desc: "Enter a target role for a match score, skill gaps, transition timeline, and a personalized 3-step action plan." },
            ].map((step, i) => (
              <div key={step.num} ref={addReveal} className={`rv-reveal rv-d${i + 1} rv-step`}>
                <div className="rv-step-num" style={{ background: step.bg }}>{step.num}</div>
                <PixelSprite name={step.sprite} size={32} style={{ position: "absolute", right: 16, bottom: 12, opacity: 0.9 }} />
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.8rem", color: "var(--rv-ink-soft)" }}>
                  {step.icon}
                </div>
                <h3 className="rv-step-title">{step.title}</h3>
                <p className="rv-card-desc">{step.desc}</p>
                {i < 2 && (
                  <span className="rv-step-arrow" aria-hidden="true">
                    <svg width="42" height="24" viewBox="0 0 42 24" fill="none">
                      <path d="M2 12 C 12 4, 24 20, 34 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M29 6 L 36 11.5 L 28 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ═══════════════════════════════════════════════════ */}
      <section className="rv-section rv-section-alt" id="pricing">
        <div className="rv-container">
          <div ref={addReveal} className="rv-reveal rv-center" style={{ marginBottom: "4.5rem" }}>
            <div className="rv-kicker"><span className="rv-kicker-dot" /> Pricing</div>
            <h2 className="rv-h2">
              Free now. <Squiggle>Fair later.</Squiggle>
            </h2>
            <p className="rv-section-sub">
              No credit card. No surprise charges. Beta users lock in early rates when paid plans arrive.
            </p>
          </div>

          <div className="rv-pricing">
            <div ref={addReveal} className="rv-reveal rv-price-card rv-featured">
              <span className="rv-price-sticker">★ Available now</span>
              <div className="rv-price-name">Beta Access</div>
              <div className="rv-price-amount">$0</div>
              <p className="rv-price-desc">Everything we&apos;ve built, completely free. Try it and tell us what&apos;s missing.</p>
              <ul className="rv-price-feats">
                {["Unlimited resume uploads", "Full AI profile extraction", "Career path simulation", "Skill gap analysis", "Dark / light retro themes", "Priority support (every email gets read)"].map((f) => (
                  <li key={f} className="rv-price-feat"><Check size={16} strokeWidth={3} /> {f}</li>
                ))}
              </ul>
              <a href={ctaHref} onClick={ctaAction} className="rv-btn rv-btn-primary rv-btn-lg" style={{ width: "100%", cursor: "pointer" }}>
                Join the beta <ArrowRight size={18} className="rv-arrow" />
              </a>
            </div>

            <div ref={addReveal} className="rv-reveal rv-d1 rv-price-card">
              <div className="rv-price-name">Early Supporter</div>
              <div className="rv-price-amount">$5<span className="rv-price-period">/mo</span></div>
              <p className="rv-price-desc">Support the build and get every new feature before anyone else.</p>
              <ul className="rv-price-feats">
                {["Everything in Beta", "Early access to new features", "Direct founder access", "Shape the roadmap"].map((f) => (
                  <li key={f} className="rv-price-feat"><Check size={16} strokeWidth={3} /> {f}</li>
                ))}
              </ul>
              <button disabled className="rv-btn rv-btn-lg" style={{ width: "100%" }}>Coming soon</button>
            </div>

            <div ref={addReveal} className="rv-reveal rv-d2 rv-price-card">
              <div className="rv-price-name">Pro</div>
              <div className="rv-price-amount">TBD</div>
              <p className="rv-price-desc">The full career toolkit. Priced when the features actually ship — not before.</p>
              <ul className="rv-price-feats">
                {["Job matching", "Interview prep", "Resume strength checks", "Resume tailoring"].map((f) => (
                  <li key={f} className="rv-price-feat"><Check size={16} strokeWidth={3} /> {f}</li>
                ))}
              </ul>
              <button disabled className="rv-btn rv-btn-lg" style={{ width: "100%" }}>Notify me</button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════════════ */}
      <section className="rv-section" id="faq">
        <div className="rv-container">
          <div ref={addReveal} className="rv-reveal rv-center" style={{ marginBottom: "3.5rem" }}>
            <div className="rv-kicker"><span className="rv-kicker-dot" /> FAQ</div>
            <h2 className="rv-h2">
              <span className="rv-mark rv-mark-lilac">Honest</span> answers
            </h2>
            <p className="rv-section-sub">Including the ones that admit what&apos;s not built yet.</p>
          </div>

          <div className="rv-faq-list">
            {faqs.map((faq, i) => (
              <div key={i} ref={addReveal} className={`rv-reveal rv-d${(i % 3) + 1}`}>
                <div className={`rv-faq${faqOpen === i ? " rv-open" : ""}`}>
                  <button className="rv-faq-q" onClick={() => setFaqOpen(faqOpen === i ? null : i)} aria-expanded={faqOpen === i}>
                    <span>{faq.q}</span>
                    <span className="rv-faq-toggle"><X size={15} strokeWidth={3} style={{ transform: "rotate(45deg)" }} /></span>
                  </button>
                  <div className="rv-faq-a">
                    <div className="rv-faq-a-inner"><div>{faq.a}</div></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ═════════════════════════════════════════════════ */}
      <section className="rv-section" style={{ paddingTop: "2rem" }}>
        <div className="rv-container">
          <div ref={addReveal} className="rv-reveal rv-cta-block">
            <svg className="rv-cta-doodle" style={{ top: "16px", left: "16px", width: 140, height: 140 }} viewBox="0 0 100 100" fill="none" aria-hidden="true">
              <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 8" />
            </svg>
            <svg className="rv-cta-doodle" style={{ bottom: "16px", right: "16px", width: 150, height: 150 }} viewBox="0 0 100 100" fill="none" aria-hidden="true">
              <path d="M10 55 Q 30 20, 50 50 T 92 45" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" strokeDasharray="3 6" />
            </svg>

            <h2 className="rv-cta-title">
              <span className="rv-line">Stop sending</span>
              <span className="rv-line">resumes into</span>
              <span className="rv-line">the void.</span>
            </h2>
            <p className="rv-cta-sub">
              Get an honest AI read on your resume, see your real match score, and leave with a plan —
              in about the time it took to read this page.
            </p>
            <Magnetic>
              <a href={ctaHref} onClick={ctaAction} className="rv-btn rv-btn-ink rv-btn-lg" style={{ cursor: "pointer" }}>
                <Upload size={19} /> Upload your resume — free
              </a>
            </Magnetic>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.6rem", flexWrap: "wrap", marginTop: "1.8rem", position: "relative", zIndex: 1 }}>
              {[
                [<Lock size={13} key="l" />, "Secure processing"],
                [<Eye size={13} key="e" />, "Your data stays yours"],
                [<Clock size={13} key="c" />, "Results in seconds"],
              ].map(([icon, label]) => (
                <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8125rem", fontWeight: 700, opacity: 0.92 }}>
                  {icon} {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════ */}
      <footer className="rv-footer">
        <div className="rv-container">
          <div className="rv-footer-grid">
            <div>
              <a href="/" className="rv-logo" style={{ marginBottom: "1rem", display: "inline-flex" }}>
                <span className="rv-logo-badge"><Sparkles size={17} strokeWidth={2.5} /></span>
                CareerVibe
              </a>
              <p style={{ fontSize: "0.9rem", color: "var(--rv-ink-soft)", lineHeight: 1.65, maxWidth: 300, margin: "0.9rem 0 0" }}>
                AI-powered career path exploration. Built with honesty, shipping in public.
              </p>
            </div>
            <div>
              <h4 className="rv-footer-col-title">Product</h4>
              <button onClick={() => scrollTo("features")} className="rv-footer-link">Features</button>
              <button onClick={() => scrollTo("how-it-works")} className="rv-footer-link">How it works</button>
              <button onClick={() => scrollTo("pricing")} className="rv-footer-link">Pricing</button>
            </div>
            <div>
              <h4 className="rv-footer-col-title">Resources</h4>
              <button onClick={() => scrollTo("faq")} className="rv-footer-link">FAQ</button>
              <a href="/signup" className="rv-footer-link">Sign up</a>
              <a href="/login" className="rv-footer-link">Log in</a>
            </div>
            <div>
              <h4 className="rv-footer-col-title">Legal</h4>
              <span className="rv-footer-link" style={{ opacity: 0.5, cursor: "default" }}>Privacy — coming soon</span>
              <span className="rv-footer-link" style={{ opacity: 0.5, cursor: "default" }}>Terms — coming soon</span>
            </div>
          </div>

          <div className="rv-wordmark" aria-hidden="true">CAREERVIBE</div>

          <div className="rv-footer-bottom">
            <p style={{ margin: 0, fontWeight: 600 }}>
              © 2026 CareerVibe — built by Team CareerVibe, shipping in public.
            </p>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <a href="https://github.com/TarunTheDev" target="_blank" rel="noopener noreferrer" className="rv-social" aria-label="GitHub">
                <Github size={17} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="rv-social" aria-label="Twitter">
                <Twitter size={17} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


