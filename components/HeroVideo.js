"use client";

import { useEffect, useRef, useState } from "react";

/**
 * HeroVideo — decorative cinematic background for the hero.
 * - poster renders first (LCP); video is progressive enhancement
 * - plays only when hero is in view (IntersectionObserver) + tab visible
 * - disabled when prefers-reduced-motion or navigator.connection.saveData
 * - mobile variant via <source media>
 *
 * Cinematic layer (all decorative, aria-hidden, pointer-events:none):
 * - pointer-parallax camera drift + scroll-parallax depth on the footage
 * - slow Ken-Burns "breathing" so the shot feels alive even when idle
 * - colour grade, volumetric light rays, pointer-following sun glow,
 *   film grain and vignette to read as a graded cinematic frame
 * All motion is skipped under reduced-motion / saveData.
 */
export default function HeroVideo() {
  const videoRef = useRef(null);
  const mediaRef = useRef(null);
  const [canPlay, setCanPlay] = useState(false);
  const inViewRef = useRef(true);

  // Decide whether video is allowed at all (client only)
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    if (reduced || saveData) {
      setCanPlay(false);
      return;
    }
    setCanPlay(true);

    // Re-evaluate if user toggles reduced-motion at runtime
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e) => {
      if (e.matches) {
        setCanPlay(false);
        try { videoRef.current && videoRef.current.pause(); } catch {}
      } else if (!saveData) {
        setCanPlay(true);
      }
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  // In-view + visibility play/pause
  useEffect(() => {
    if (!canPlay) return;
    const v = videoRef.current;
    if (!v) return;

    const tryPlay = () => {
      if (!inViewRef.current) return;
      if (document.hidden) return;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    const tryPause = () => {
      try { v.pause(); } catch {}
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) tryPlay();
        else tryPause();
      },
      { threshold: 0.15, rootMargin: "0px" }
    );
    io.observe(v);

    const onVis = () => {
      if (document.hidden) tryPause();
      else if (inViewRef.current) tryPlay();
    };
    document.addEventListener("visibilitychange", onVis);

    // Initial: if already in view, ensure playing
    // (IO fires async, so also check after mount)
    if (inViewRef.current && !document.hidden) tryPlay();

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [canPlay]);

  // Interactive cinematic camera: pointer-parallax drift + scroll depth +
  // pointer-following sun glow. Event-driven (no perpetual rAF loop); the
  // natural glide comes from a CSS transition on the footage transform.
  // Skipped entirely when motion is disallowed.
  useEffect(() => {
    if (!canPlay) return;
    const el = mediaRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let px = 0, py = 0; // pointer-driven camera offsets (px)
    const apply = () => {
      const sy = Math.min(window.scrollY || 0, 700);
      el.style.setProperty("--rv-px", px.toFixed(2) + "px");
      el.style.setProperty("--rv-py", (py + sy * 0.16).toFixed(2) + "px");
    };
    const onPointer = (e) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      px = ((e.clientX / w) - 0.5) * 2 * -18;
      py = ((e.clientY / h) - 0.5) * 2 * -12;
      el.style.setProperty("--rv-gx", ((e.clientX / w) * 100).toFixed(1) + "%");
      el.style.setProperty("--rv-gy", ((e.clientY / h) * 100).toFixed(1) + "%");
      apply();
    };
    const onScroll = () => apply();

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [canPlay]);

  return (
    <div className="rv-hero__media" ref={mediaRef} aria-hidden="true">
      <div className="rv-hero__footage">
        {canPlay ? (
          <video
            ref={videoRef}
            className="rv-hero__video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/media/poster-cinematic.jpg"
            disablePictureInPicture
            aria-hidden="true"
            tabIndex={-1}
          >
            {/* mobile variant first so media match wins */}
            <source src="/media/hero-mobile.mp4" media="(max-width: 768px)" type="video/mp4" />
            <source src="/media/hero.mp4" type="video/mp4" />
          </video>
        ) : (
          // Reduced-motion / saveData / SSR fallback: cinematic still only, no video element
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="rv-hero__poster"
            src="/media/poster-cinematic.jpg"
            alt=""
            width={1200}
            height={686}
            decoding="async"
            fetchPriority="low"
          />
        )}
      </div>
      {/* Cinematic lens layers (decorative) */}
      <div className="rv-hero__grade" aria-hidden="true" />
      <div className="rv-hero__rays" aria-hidden="true" />
      <div className="rv-hero__glow" aria-hidden="true" />
      <div className="rv-hero__grain" aria-hidden="true" />
      <div className="rv-hero__vignette" aria-hidden="true" />
      <div className="rv-hero__scrim" aria-hidden="true" />
    </div>
  );
}
