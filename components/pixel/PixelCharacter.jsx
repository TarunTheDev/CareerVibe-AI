"use client";

/**
 * PixelCharacter — original blocky characters, hand-authored SVG pixels.
 * No Minecraft IP. Square heads, rectangular bodies, 5-6 colours each.
 * Renders inline SVG with shapeRendering crispEdges & imageRendering pixelated.
 *
 * Characters:
 *  Pip — Miner (hard hat + pickaxe)    Bo — Builder (vest + helmet)
 *  Lumi — Wizard (hat + staff)         Byte — Bot (antenna + panel)
 *  Ren — Courier (cap + scroll)        Fox — square fox   Bird — block bird
 *
 *  Poses: idle (2-frame bob), wave, think, cheer, oops
 */

const PAL = {
  skin: "#E8C9A8",
  skin2: "#D8A882",
  outline: "#1A1410",
  white: "#FFF8EE",
};

const CHAR_DEFS = {
  pip: {
    label: "Pip the Miner",
    colors: { hat: "#F5C542", hat2: "#D4A84B", shirt: "#4D9DE0", pants: "#5DAA3A", pick: "#8A8A8A", pickH: "#8B5A2B" },
  },
  bo: {
    label: "Bo the Builder",
    colors: { hat: "#FF8FAB", vest: "#F5C542", shirt: "#EAD9B0", pants: "#4A4A4A", tool: "#3DDC84" },
  },
  lumi: {
    label: "Lumi the Wizard",
    colors: { hat: "#B79CFF", robe: "#6D4AFF", beard: "#EAD9B0", staff: "#8B5A2B", gem: "#4FE3E0" },
  },
  byte: {
    label: "Byte the Bot",
    colors: { body: "#8A8A8A", body2: "#4A4A4A", face: "#2E2E2E", eye: "#4FE3E0", antenna: "#D8402E" },
  },
  ren: {
    label: "Ren the Courier",
    colors: { cap: "#5DAA3A", shirt: "#FFF8EE", bag: "#8B5A2B", scroll: "#EAD9B0", pants: "#2F4FBF" },
  },
  fox: {
    label: "Fenn the Fox",
    colors: { body: "#E8832A", belly: "#FFF2CC", ear: "#1A1410", tail: "#FFF8EE", nose: "#1A1410" },
  },
  bird: {
    label: "Pippa the Bird",
    colors: { body: "#4FE3E0", belly: "#FFF8EE", beak: "#F5C542", wing: "#2F4FBF", eye: "#1A1410" },
  },
};

// Build a blocky figure from primitives - all coords in 1px units on a 16x20 canvas
function Figure({ name, pose }) {
  const d = CHAR_DEFS[name] || CHAR_DEFS.pip;
  const c = d.colors;
  const isWave = pose === "wave";
  const isThink = pose === "think";
  const isCheer = pose === "cheer";
  const isOops = pose === "oops";

  // Common pixel rects helper. Key includes a per-figure counter because several
  // rects intentionally share the same x,y (e.g. head + hat), which would
  // otherwise collide and trigger React duplicate-key warnings.
  let _rk = 0;
  const R = (x, y, w, h, fill) => <rect key={`${x}-${y}-${_rk++}`} x={x} y={y} width={w} height={h} fill={fill} shapeRendering="crispEdges" />;

  // Faces - simple eyes
  const eyes = isOops
    ? (<>
        {R(5, 5, 2, 2, PAL.outline)}{R(9, 5, 2, 2, PAL.outline)}
        {R(6, 6, 1, 1, PAL.white)}{R(10, 6, 1, 1, PAL.white)}
        <rect x={7} y={8} width={2} height={1} fill={PAL.outline} shapeRendering="crispEdges" />
      </>)
    : (<>
        {R(5, 6, 2, 2, PAL.outline)}{R(9, 6, 2, 2, PAL.outline)}
        {R(6, 6, 1, 1, PAL.white)}{R(10, 6, 1, 1, PAL.white)}
        {R(7.5, 8.5, 1, 0.6, PAL.outline)}
      </>);

  if (name === "fox") {
    return (
      <g>
        {/* body */}
        {R(2, 10, 12, 6, c.body)}{R(3, 9, 10, 2, c.body)}
        {R(4, 12, 8, 2, c.belly)}
        {/* head */}
        {R(4, 2, 8, 8, c.body)}{R(3, 3, 2, 4, c.body)}{R(11, 3, 2, 4, c.body)}
        {R(4, 3, 1, 1, c.ear)}{R(11, 3, 1, 1, c.ear)}
        {R(6, 6, 1, 1, c.nose)}{R(7, 7, 2, 1, c.nose)}
        {eyes}
        {/* tail */}
        {R(0, 11, 3, 3, c.tail)}{R(1, 10, 2, 1, c.body)}
        {/* pose tweak */}
        {isWave && R(12, 6, 3, 2, c.body)}
        {isCheer && (<>{R(1, 2, 2, 6, c.body)}{R(13, 2, 2, 6, c.body)}</>)}
      </g>
    );
  }
  if (name === "bird") {
    return (
      <g>
        {R(4, 6, 8, 8, c.body)}{R(3, 8, 2, 4, c.belly)}
        {R(4, 4, 8, 4, c.body)}
        {R(0, 7, 4, 3, c.beak)}{R(1, 8, 2, 1, "#E0A500")}
        {R(6, 6, 2, 2, c.eye)}{R(10, 6, 2, 2, c.eye)}
        {R(7, 6, 1, 1, PAL.white)}{R(11, 6, 1, 1, PAL.white)}
        {R(3, 10, 5, 2, c.wing)}
        {isWave && R(10, 3, 4, 2, c.body)}
      </g>
    );
  }

  // Humanoid base
  return (
    <g>
      {/* legs */}
      {R(5, 14, 3, 6, c.pants || c.body)}{R(9, 14, 3, 6, c.pants || c.body)}
      {R(5, 18, 3, 1, PAL.outline)}{R(9, 18, 3, 1, PAL.outline)}
      {/* body */}
      {R(4, 8, 8, 6, c.shirt || c.body || c.robe || c.hat)}
      {name === "lumi" && R(6, 9, 4, 4, c.robe)}
      {name === "bo" && (<>{R(5, 8, 6, 6, c.vest)}{R(6, 10, 4, 2, c.shirt)}</>)}
      {/* arms */}
      {isCheer ? (<>
        {R(1, 1, 3, 8, c.shirt || c.body)}{R(12, 1, 3, 8, c.shirt || c.body)}
      </>) : isWave ? (<>
        {R(1, 8, 3, 4, c.shirt || c.body)}{R(12, 4, 3, 6, c.shirt || c.body)}
      </>) : isThink ? (<>
        {R(1, 8, 3, 4, c.shirt || c.body)}{R(10, 6, 5, 3, c.shirt || c.body)}
      </>) : (<>
        {R(1, 8, 3, 5, c.shirt || c.body)}{R(12, 8, 3, 5, c.shirt || c.body)}
      </>)}
      {/* head */}
      {R(4, 1, 8, 7, PAL.skin)}
      {R(4, 1, 8, 1, c.hat || c.cap || PAL.skin2)}
      {name === "pip" && (<>{R(5, 0, 6, 2, c.hat)}{R(4, 2, 8, 1, c.hat2)}{R(6, 1, 4, 1, c.hat)}</>)}
      {name === "lumi" && (<>{R(5, 0, 6, 3, c.hat)}{R(6, 3, 1, 1, c.gem)}</>)}
      {name === "byte" && (<>{R(7, 0, 2, 2, c.antenna)}{R(7.5, 0, 1, 1, c.eye)}</>)}
      {name === "ren" && R(4, 0, 8, 2, c.cap)}
      {eyes}
      {isThink && R(9, 4, 2, 2, PAL.skin2)}
      {/* accessories */}
      {name === "pip" && R(13, 12, 1, 6, c.pickH)}
      {name === "pip" && R(11, 10, 5, 2, c.pick)}
      {name === "lumi" && R(1, 4, 1, 12, c.staff)}
      {name === "lumi" && R(0, 3, 3, 2, c.gem)}
      {name === "ren" && (<>{R(2, 9, 4, 4, c.bag)}{R(5, 10, 3, 4, c.scroll)}{R(5, 11, 3, 1, PAL.outline)}</>)}
      {name === "byte" && (<>{R(5, 10, 6, 2, c.body2)}{R(7, 11, 2, 1, c.eye)}</>)}
    </g>
  );
}

export default function PixelCharacter({ name = "pip", pose = "idle", size = 48, decorative = false, label, style }) {
  const def = CHAR_DEFS[name] || CHAR_DEFS.pip;
  const isIdle = pose === "idle";
  const h = size;
  const w = Math.round((size * 16) / 20);

  return (
    <span
      role={decorative ? "presentation" : "img"}
      aria-label={decorative ? undefined : label || def.label}
      aria-hidden={decorative ? true : undefined}
      style={{
        display: "inline-block",
        width: w,
        height: h,
        imageRendering: "pixelated",
        lineHeight: 0,
        animation: isIdle ? "pc-bob 900ms steps(2) infinite alternate" : "none",
        ...style,
      }}
    >
      <svg
        width={w}
        height={h}
        viewBox="0 0 16 20"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
        style={{ display: "block", width: w, height: h }}
      >
        {/* outline bg */}
        <rect x={0} y={0} width={16} height={20} fill="transparent" />
        <Figure name={name} pose={pose} />
        {/* crisp outline around entire figure */}
        <rect x={4} y={1} width={8} height={7} fill="none" stroke={PAL.outline} strokeWidth={0.6} shapeRendering="crispEdges" opacity={0.9} />
      </svg>
      <style>{`@media (prefers-reduced-motion: reduce) { span[aria-label] { animation: none !important; } } @keyframes pc-bob { from { transform: translateY(0); } to { transform: translateY(2px); } }`}</style>
    </span>
  );
}

export { CHAR_DEFS };
