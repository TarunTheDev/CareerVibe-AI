"use client";

// Renders Minecraft-style characters in the UI.
// Two sources:
//   kind="skin" -> official 64x64 player skin, drawn as a front-facing paper-doll
//                  by cropping UV regions with CSS background-position.
//   kind="ai"   -> original AI-generated full-body pixel sprite, drawn as one image.
// Everything is rendered with image-rendering: pixelated for the blocky look.

// UV regions (x, y, w, h) in skin pixels for the classic 64x64 layout.
const SKIN_UV = {
  wide: {
    head: [8, 8, 8, 8],
    body: [20, 20, 8, 12],
    armR: [44, 20, 4, 12],
    armL: [36, 52, 4, 12],
    legR: [4, 20, 4, 12],
    legL: [20, 52, 4, 12],
    headOv: [40, 8, 8, 8],
    bodyOv: [20, 36, 8, 12],
    armROv: [44, 36, 4, 12],
    armLOv: [52, 52, 4, 12],
    legROv: [4, 36, 4, 12],
    legLOv: [4, 52, 4, 12],
  },
  slim: {
    head: [8, 8, 8, 8],
    body: [20, 20, 8, 12],
    armR: [44, 20, 3, 12],
    armL: [36, 52, 3, 12],
    legR: [4, 20, 4, 12],
    legL: [20, 52, 4, 12],
    headOv: [40, 8, 8, 8],
    bodyOv: [20, 36, 8, 12],
    armROv: [44, 36, 3, 12],
    armLOv: [52, 52, 3, 12],
    legROv: [4, 36, 4, 12],
    legLOv: [4, 52, 4, 12],
  },
};

// Registry of every character available to the UI.
// Original-only cast: the AI-generated Career Craft characters. Official
// Minecraft skins are intentionally excluded (IP rule).
export const CHARACTERS = [
  { id: "explorer", label: "Explorer", kind: "ai", src: "/textures/ai/explorer.png" },
  { id: "mentor", label: "Mentor", kind: "ai", src: "/textures/ai/mentor.png" },
  { id: "engineer", label: "Engineer", kind: "ai", src: "/textures/ai/engineer.png" },
  { id: "analyst", label: "Analyst", kind: "ai", src: "/textures/ai/analyst.png" },
];

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

// One cropped region of a skin, drawn as an absolutely positioned pixel block.
function Part({ src, uv, x, y, scale }) {
  const [ux, uy, uw, uh] = uv;
  return (
    <div
      style={{
        position: "absolute",
        left: x * scale,
        top: y * scale,
        width: uw * scale,
        height: uh * scale,
        backgroundImage: `url(${src})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${64 * scale}px ${64 * scale}px`,
        backgroundPosition: `${-ux * scale}px ${-uy * scale}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}

// Front-facing paper-doll built from a 64x64 skin.
function SkinDoll({ src, model = "wide", scale }) {
  const uv = SKIN_UV[model] || SKIN_UV.wide;
  const armW = model === "slim" ? 3 : 4;
  const totalW = armW + 8 + armW;
  const totalH = 32;
  return (
    <div
      style={{
        position: "relative",
        width: totalW * scale,
        height: totalH * scale,
        imageRendering: "pixelated",
      }}
      aria-hidden="true"
    >
      {/* base layer */}
      <Part src={src} uv={uv.head} x={armW} y={0} scale={scale} />
      <Part src={src} uv={uv.body} x={armW} y={8} scale={scale} />
      <Part src={src} uv={uv.armR} x={0} y={8} scale={scale} />
      <Part src={src} uv={uv.armL} x={armW + 8} y={8} scale={scale} />
      <Part src={src} uv={uv.legR} x={armW} y={20} scale={scale} />
      <Part src={src} uv={uv.legL} x={armW + 4} y={20} scale={scale} />
      {/* overlay layer (hat / jacket) */}
      <Part src={src} uv={uv.headOv} x={armW} y={0} scale={scale} />
      <Part src={src} uv={uv.bodyOv} x={armW} y={8} scale={scale} />
      <Part src={src} uv={uv.armROv} x={0} y={8} scale={scale} />
      <Part src={src} uv={uv.armLOv} x={armW + 8} y={8} scale={scale} />
      <Part src={src} uv={uv.legROv} x={armW} y={20} scale={scale} />
      <Part src={src} uv={uv.legLOv} x={armW + 4} y={20} scale={scale} />
    </div>
  );
}

// Full-body character. scale = pixels per skin unit (ignored for AI sprites,
// which are sized by height instead).
export function McCharacter({ id, scale = 6, height, className, style }) {
  const c = getCharacter(id);
  if (c.kind === "ai") {
    const h = height || scale * 32;
    return (
      <img
        src={c.src}
        alt={c.label}
        className={className}
        style={{
          height: h,
          width: "auto",
          imageRendering: "pixelated",
          display: "block",
          ...style,
        }}
      />
    );
  }
  return (
    <div className={className} style={style}>
      <SkinDoll src={c.src} model={c.model} scale={scale} />
    </div>
  );
}

// Square face avatar. For skins we crop the 8x8 head front; for AI sprites we
// show the whole figure fitted into the square.
export function McFace({ id, size = 40, className, style }) {
  const c = getCharacter(id);
  if (c.kind === "ai") {
    return (
      <img
        src={c.src}
        alt={c.label}
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          objectPosition: "top center",
          imageRendering: "pixelated",
          display: "block",
          ...style,
        }}
      />
    );
  }
  const scale = size / 8;
  return (
    <div
      className={className}
      aria-label={c.label}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${c.src})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${64 * scale}px ${64 * scale}px`,
        backgroundPosition: `${-8 * scale}px ${-8 * scale}px`,
        imageRendering: "pixelated",
        display: "block",
        ...style,
      }}
    />
  );
}
