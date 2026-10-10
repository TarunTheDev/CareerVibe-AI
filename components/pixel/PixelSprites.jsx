"use client";

// W4: original inline-SVG pixel sprites (no image API). Blocky Career Craft
// palette, shape-rendering="crispEdges", integer coords on a 24x24 grid,
// transparent background, decorative (aria-hidden). Rendered at integer sizes.

const P = {
  grass: "#5DAA3A", grassDark: "#3F7A27",
  dirt: "#8B5A2B", dirtDark: "#5E3C1C",
  stone: "#8A8A8A", stoneDark: "#4A4A4A", bedrock: "#1B1B1B",
  diamond: "#4FE3E0", gold: "#F5C542", redstone: "#D8402E",
  lapis: "#2F4FBF", emerald: "#3DDC84", skin: "#E8B98A", ink: "#1A1410",
};

const svgProps = (size) => ({
  width: size, height: size, viewBox: "0 0 24 24",
  shapeRendering: "crispEdges", xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": "true", focusable: "false",
  style: { imageRendering: "pixelated", display: "block" },
});

// Shared torso/head so figures read as one art style.
function Body({ shirt = P.lapis }) {
  return (
    <>
      <rect x="8" y="9" width="8" height="8" fill={shirt} />
      <rect x="8" y="9" width="8" height="2" fill={P.ink} opacity="0.18" />
      <rect x="8" y="17" width="3" height="5" fill={P.dirtDark} />
      <rect x="13" y="17" width="3" height="5" fill={P.dirtDark} />
    </>
  );
}
function Head({ hair = P.dirtDark }) {
  return (
    <>
      <rect x="8" y="2" width="8" height="7" fill={P.skin} />
      <rect x="8" y="2" width="8" height="2" fill={hair} />
      <rect x="10" y="5" width="1.5" height="1.5" fill={P.ink} />
      <rect x="13" y="5" width="1.5" height="1.5" fill={P.ink} />
    </>
  );
}

const Builder = (s) => (
  <svg {...svgProps(s)}>
    <rect x="7" y="1" width="10" height="3" fill={P.gold} />
    <Head hair={P.gold} />
    <Body shirt={P.lapis} />
    <rect x="16" y="11" width="5" height="5" fill={P.grass} stroke={P.ink} strokeWidth="0.6" />
    <rect x="3" y="11" width="5" height="5" fill={P.dirt} stroke={P.ink} strokeWidth="0.6" />
  </svg>
);

const Miner = (s) => (
  <svg {...svgProps(s)}>
    <rect x="8" y="2" width="8" height="7" fill={P.skin} />
    <rect x="8" y="2" width="8" height="3" fill={P.stoneDark} />
    <rect x="11" y="0" width="2" height="2" fill={P.gold} />
    <rect x="10" y="6" width="1.5" height="1.5" fill={P.ink} />
    <rect x="13" y="6" width="1.5" height="1.5" fill={P.ink} />
    <Body shirt={P.stone} />
    <rect x="17" y="4" width="1.6" height="12" fill={P.dirt} transform="rotate(20 18 10)" />
    <rect x="14" y="3" width="7" height="2.4" fill={P.diamond} />
  </svg>
);

const Inspector = (s) => (
  <svg {...svgProps(s)}>
    <Head hair={P.stoneDark} />
    <Body shirt={P.grassDark} />
    <circle cx="18" cy="14" r="4" fill="none" stroke={P.diamond} strokeWidth="2" />
    <rect x="20" y="17" width="2" height="4" fill={P.dirt} transform="rotate(-35 21 19)" />
    <circle cx="18" cy="14" r="2" fill={P.diamond} opacity="0.35" />
  </svg>
);

const Shrug = (s) => (
  <svg {...svgProps(s)}>
    <Head hair={P.dirt} />
    <rect x="8" y="9" width="8" height="7" fill={P.diamond} />
    <rect x="3" y="6" width="3" height="6" fill={P.diamond} transform="rotate(-30 4 9)" />
    <rect x="18" y="6" width="3" height="6" fill={P.diamond} transform="rotate(30 19 9)" />
    <rect x="8" y="16" width="3" height="5" fill={P.dirtDark} />
    <rect x="13" y="16" width="3" height="5" fill={P.dirtDark} />
    <rect x="11" y="0" width="2" height="2" fill={P.gold} />
    <rect x="11" y="3" width="2" height="1.4" fill={P.gold} />
  </svg>
);

const Telescope = (s) => (
  <svg {...svgProps(s)}>
    <rect x="4" y="4" width="15" height="4" fill={P.stone} transform="rotate(-24 11 6)" stroke={P.ink} strokeWidth="0.5" />
    <rect x="16" y="1" width="4" height="4" fill={P.diamond} transform="rotate(-24 18 3)" />
    <rect x="10" y="9" width="2" height="12" fill={P.dirt} />
    <rect x="6" y="18" width="3" height="4" fill={P.dirtDark} transform="rotate(20 7 20)" />
    <rect x="14" y="18" width="3" height="4" fill={P.dirtDark} transform="rotate(-20 15 20)" />
  </svg>
);

const Chest = (s) => (
  <svg {...svgProps(s)}>
    <rect x="3" y="10" width="18" height="10" fill={P.dirt} stroke={P.ink} strokeWidth="0.8" />
    <rect x="3" y="6" width="18" height="5" fill={P.dirtDark} stroke={P.ink} strokeWidth="0.8" />
    <rect x="10" y="9" width="4" height="6" fill={P.gold} stroke={P.ink} strokeWidth="0.6" />
    <rect x="11" y="11" width="2" height="2" fill={P.ink} />
  </svg>
);

const Lost = (s) => (
  <svg {...svgProps(s)}>
    <rect x="7" y="3" width="8" height="7" fill={P.skin} transform="rotate(-8 11 6)" />
    <rect x="9" y="6" width="1.5" height="1.5" fill={P.ink} />
    <rect x="12" y="6" width="1.5" height="1.5" fill={P.ink} />
    <rect x="7" y="10" width="8" height="7" fill={P.stoneDark} />
    <rect x="7" y="17" width="3" height="5" fill={P.stone} />
    <rect x="12" y="17" width="3" height="5" fill={P.stone} />
    <rect x="17" y="14" width="5" height="5" fill={P.redstone} stroke={P.ink} strokeWidth="0.6" />
    <line x1="18" y1="15" x2="21" y2="18" stroke={P.ink} strokeWidth="0.8" />
    <line x1="21" y1="15" x2="18" y2="18" stroke={P.ink} strokeWidth="0.8" />
  </svg>
);

export const PIXEL_SPRITES = {
  builder: Builder, miner: Miner, inspector: Inspector,
  shrug: Shrug, telescope: Telescope, chest: Chest, lost: Lost,
};

// Render a named sprite at an integer pixel size.
export function PixelSprite({ name, size = 48, style }) {
  const Cmp = PIXEL_SPRITES[name];
  if (!Cmp) return null;
  const s = Math.max(16, Math.round(size / 8) * 8); // snap to integer multiples of 8
  return <span style={{ display: "inline-block", lineHeight: 0, ...style }}>{Cmp(s)}</span>;
}
