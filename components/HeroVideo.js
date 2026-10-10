"use client";

import { useEffect, useRef, useState } from "react";

/**
 * HeroVideo — decorative background video for the hero.
 * - poster renders first (LCP); video is progressive enhancement
 * - plays only when hero is in view (IntersectionObserver) + tab visible
 * - disabled when prefers-reduced-motion or navigator.connection.saveData
 * - mobile variant via <source media>
 */
export default function HeroVideo() {
  const videoRef = useRef(null);
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

  return (
    <div className="rv-hero__media" aria-hidden="true">
      {canPlay ? (
        <video
          ref={videoRef}
          className="rv-hero__video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/media/poster.webp"
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
        >
          {/* mobile variant first so media match wins */}
          <source src="/media/hero-mobile.mp4" media="(max-width: 768px)" type="video/mp4" />
          <source src="/media/hero.mp4" type="video/mp4" />
        </video>
      ) : (
        // Reduced-motion / saveData / SSR fallback: poster only, no video element
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="rv-hero__poster"
          src="/media/poster.webp"
          alt=""
          width={1280}
          height={720}
          decoding="async"
          fetchPriority="low"
        />
      )}
      <div className="rv-hero__scrim" aria-hidden="true" />
    </div>
  );
}
