// Dev-only image tool (allowed by the polish spec). One-off: strip the cream
// background from the AI character sprites so they sit directly on the page.
// Approach: flood-fill from the border inward over near-background pixels ->
// alpha 0 (so tan skin inside the figure is never punched out), then crop to
// the opaque bounding box and nearest-neighbour downscale to a crisp pixel grid.
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const DIR = path.join(__dirname, "..", "public", "textures", "ai");
const TARGET_H = 256; // native-ish pixel scale; CSS renders at integer sizes
const TOL = 48; // per-channel distance to count as "background"

function dist2(a, b) {
  const r = a[0] - b[0], g = a[1] - b[1], bb = a[2] - b[2];
  return r * r + g * g + bb * bb;
}

function process(file) {
  const png = PNG.sync.read(fs.readFileSync(path.join(DIR, file)));
  const { width: W, height: H, data } = png;
  const idx = (x, y) => (y * W + x) * 4;
  const px = (x, y) => [data[idx(x, y)], data[idx(x, y) + 1], data[idx(x, y) + 2]];

  // background reference = average of the four corners
  const corners = [px(0, 0), px(W - 1, 0), px(0, H - 1), px(W - 1, H - 1)];
  const bg = [0, 1, 2].map((i) => corners.reduce((s, c) => s + c[i], 0) / 4);
  const tol2 = TOL * TOL * 3;

  const isBg = (x, y) => dist2(px(x, y), bg) <= tol2;

  // BFS flood fill from every border pixel that is background
  const seen = new Uint8Array(W * H);
  const q = [];
  const push = (x, y) => {
    const p = y * W + x;
    if (!seen[p] && isBg(x, y)) { seen[p] = 1; q.push(p); }
  };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (q.length) {
    const p = q.pop();
    const x = p % W, y = (p - x) / W;
    if (x > 0) push(x - 1, y);
    if (x < W - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < H - 1) push(x, y + 1);
  }
  // apply alpha
  for (let p = 0; p < W * H; p++) {
    if (seen[p]) data[p * 4 + 3] = 0;
  }

  // bounding box of opaque pixels
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (data[idx(x, y) + 3] > 10) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
  const pad = Math.round((maxX - minX) * 0.04) + 2;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;

  // nearest-neighbour downscale to TARGET_H (keep aspect)
  const scale = TARGET_H / ch;
  const ow = Math.max(1, Math.round(cw * scale)), oh = TARGET_H;
  const out = new PNG({ width: ow, height: oh });
  for (let y = 0; y < oh; y++) {
    const sy = minY + Math.min(ch - 1, Math.floor(y / scale));
    for (let x = 0; x < ow; x++) {
      const sx = minX + Math.min(cw - 1, Math.floor(x / scale));
      const si = idx(sx, sy), oi = (y * ow + x) * 4;
      out.data[oi] = data[si]; out.data[oi + 1] = data[si + 1];
      out.data[oi + 2] = data[si + 2]; out.data[oi + 3] = data[si + 3];
    }
  }
  fs.writeFileSync(path.join(DIR, file), PNG.sync.write(out));
  console.log(`${file}: ${W}x${H} -> ${ow}x${oh} (bg removed, cropped)`);
}

for (const f of ["explorer.png", "mentor.png", "engineer.png", "analyst.png"]) {
  process(f);
}
