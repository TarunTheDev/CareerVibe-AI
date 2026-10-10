// lib/skills/normalize.mjs
// PURE, dependency-free skill canonicalization + the ONE shared match function.
// Every match computation in the app (job card, drawer, profile summary, compare)
// must go through matchFor() so a card can never disagree with its own text.
//
// Shipped as .mjs (see AUDIT.md deviation note) so it is unit-testable with no build step.

// Alias -> canonical. Keys are matched case-insensitively after punctuation is stripped.
// Spec-required equivalences are included (SQL = MySQL = PostgreSQL = SQLite, etc.).
export const CANONICAL_SKILL_ALIASES = {
  // JavaScript family
  js: "javascript",
  javascript: "javascript",
  ecmascript: "javascript",
  es6: "javascript",
  es2015: "javascript",
  ts: "typescript",
  typescript: "typescript",
  // Frontend frameworks
  react: "react",
  "react.js": "react",
  reactjs: "react",
  "react js": "react",
  vue: "vue",
  "vue.js": "vue",
  vuejs: "vue",
  "vue js": "vue",
  angular: "angular",
  angularjs: "angular",
  "angular js": "angular",
  next: "next.js",
  "next.js": "next.js",
  nextjs: "next.js",
  "next js": "next.js",
  // Backend / runtime
  node: "node.js",
  nodejs: "node.js",
  "node.js": "node.js",
  "node js": "node.js",
  express: "express",
  "express.js": "express",
  expressjs: "express",
  python: "python",
  python3: "python",
  py: "python",
  django: "django",
  flask: "flask",
  java: "java",
  "core java": "java",
  spring: "spring",
  "spring boot": "spring",
  springboot: "spring",
  php: "php",
  ruby: "ruby",
  rails: "ruby on rails",
  "ruby on rails": "ruby on rails",
  go: "go",
  golang: "go",
  rust: "rust",
  // Databases — spec: SQL = MySQL = PostgreSQL = SQLite
  sql: "sql",
  mysql: "sql",
  postgresql: "sql",
  postgres: "sql",
  sqlite: "sql",
  "sql server": "sql",
  mssql: "sql",
  "ms sql": "sql",
  tsql: "sql",
  mongodb: "mongodb",
  mongo: "mongodb",
  redis: "redis",
  // Markup / styling
  html: "html",
  html5: "html",
  css: "css",
  css3: "css",
  sass: "sass",
  scss: "sass",
  tailwind: "tailwind css",
  "tailwind css": "tailwind css",
  tailwindcss: "tailwind css",
  // Cloud / DevOps
  aws: "aws",
  "amazon web services": "aws",
  "amazon aws": "aws",
  azure: "azure",
  "microsoft azure": "azure",
  gcp: "google cloud",
  "google cloud": "google cloud",
  "google cloud platform": "google cloud",
  docker: "docker",
  kubernetes: "kubernetes",
  k8s: "kubernetes",
  terraform: "terraform",
  "ci/cd": "ci/cd",
  cicd: "ci/cd",
  "continuous integration": "ci/cd",
  linux: "linux",
  git: "git",
  // Data / ML
  ml: "machine learning",
  "machine learning": "machine learning",
  dl: "deep learning",
  "deep learning": "deep learning",
  ai: "artificial intelligence",
  "artificial intelligence": "artificial intelligence",
  "data analysis": "data analysis",
  "data analytics": "data analysis",
  excel: "excel",
  "ms excel": "excel",
  "microsoft excel": "excel",
  "power bi": "power bi",
  powerbi: "power bi",
  tableau: "tableau",
  // Design
  figma: "figma",
  photoshop: "photoshop",
  "adobe photoshop": "photoshop",
  // Mobile
  "react native": "react native",
  "react-native": "react native",
  flutter: "flutter",
  android: "android",
  swift: "swift",
  kotlin: "kotlin",
  // Misc common
  graphql: "graphql",
  "rest api": "rest api",
  rest: "rest api",
  restful: "rest api",
  "restful api": "rest api",
  redux: "redux",
  webpack: "webpack",
  agile: "agile",
  scrum: "scrum",
  oauth: "oauth",
  microservices: "microservices",
};

const clean = (s) =>
  String(s == null ? "" : s)
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=`~()"'[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Canonical display/name key for a single skill. Unknown skills canonicalize to
 * their cleaned lowercase form (so they still match themselves exactly).
 */
export function canonicalSkill(raw) {
  const c = clean(raw);
  if (!c) return "";
  // Alias values are re-cleaned so the canonical form is always idempotent:
  // e.g. "CICD" and "CI/CD" must land on the same key ("ci cd"), never "ci/cd".
  // try the cleaned form, then a punctuation-stripped form (e.g. "c++" -> "c")
  if (CANONICAL_SKILL_ALIASES[c]) return clean(CANONICAL_SKILL_ALIASES[c]);
  const bare = c.replace(/[^a-z0-9+# ]/g, "").trim();
  if (CANONICAL_SKILL_ALIASES[bare]) return clean(CANONICAL_SKILL_ALIASES[bare]);
  return c;
}

// Build an ordered canonical -> first-display-form map from a list.
export function canonicalSet(list) {
  const map = new Map();
  for (const item of Array.isArray(list) ? list : []) {
    const key = canonicalSkill(item);
    if (key && !map.has(key)) map.set(key, String(item).trim());
  }
  return map;
}

// Combined tokens a candidate lists as ONE skill but which satisfy SEVERAL
// distinct requirements (e.g. "HTML/CSS" covers both an "HTML" and a "CSS" ask).
// Applied only to the candidate/"have" side so a job requirement phrased
// "HTML/CSS" still counts as a single required slot.
const COMBO_ALIASES = {
  "html css": ["html", "css"],
  "ai ml": ["ai", "machine learning", "artificial intelligence"],
  "ai dl": ["ai", "deep learning", "artificial intelligence"],
  "full stack": ["frontend", "backend"],
};

// Like canonicalSet, but expands combined tokens into the extra keys they cover.
export function haveSet(list) {
  const map = canonicalSet(list);
  for (const key of [...map.keys()]) {
    const extra = COMBO_ALIASES[key];
    if (extra) for (const e of extra) if (!map.has(e)) map.set(e, e);
  }
  return map;
}

/**
 * The ONE shared match function. Normalizes BOTH sides before comparing, so
 * "SQL" on the resume counts for a "MySQL" requirement and every percentage on
 * screen equals matched / required from visible data.
 *
 * @param {string[]} profileSkills
 * @param {string[]} jobSkills  (the job's required skills)
 * @returns {{ matched: string[], missing: string[], required: number, pct: number }}
 *   matched/missing are canonical names; required is the deduped count of job
 *   skills; pct = round(matched.length / required * 100), 0 when required is 0.
 */
export function matchFor(profileSkills, jobSkills) {
  const have = haveSet(profileSkills);
  const need = canonicalSet(jobSkills);
  const matched = [];
  const missing = [];
  for (const key of need.keys()) {
    // A combined requirement ("HTML/CSS") is met if the candidate lists the
    // combo or every one of its parts.
    const combo = COMBO_ALIASES[key];
    const ok = have.has(key) || (combo && combo.every((p) => have.has(p)));
    if (ok) matched.push(key);
    else missing.push(key);
  }
  const required = need.size;
  const pct = required === 0 ? 0 : Math.round((matched.length / required) * 100);
  return { matched, missing, required, pct };
}
