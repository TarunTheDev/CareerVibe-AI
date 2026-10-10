# CareerVibe — Final-Pass Audit & Progress Ledger

This file is the progress tracker and honesty ledger for the final pass before judging.
It is updated as work proceeds. Re-read the mission prompt from the top and resume at the
first unchecked item if context is lost.

---

## Method & Environment (READ FIRST — honesty about what was and wasn't verified)

**Machine:** Windows (win32), Git Bash. Repo root: `Cv-main/Cv-main/`.

**What IS runnable here:**
- A Node.js runtime via the `node-repl` MCP tool (Node works, `node:assert` works, local
  `.mjs` modules can be imported and reloaded). Used to run **real unit-test assertions**
  for every pure module.
- Git 2.55 (repo initialized this pass; one commit per fix group).

**What is NOT runnable in this environment (hard blockers):**
- **No `node`/`npm` on PATH and no `node_modules`.** Therefore `npm install`, `next build`,
  `next dev`, ESLint, `tsc`, and Playwright **cannot be run**. The mission's "production
  build after every part" and all browser/Lighthouse verification are **impossible here**.
- **No `.env.local`, no `GEMINI_API_KEY` / `GROQ_API_KEY` / `GOOGLE_API_KEY`.** AI features
  run on the existing local template fallback only. **Real job capture for the offline
  dataset (Part 8) is blocked** — the mission says never invent postings, so this is flagged
  rather than faked. (User indicated they will provide a key.)
- **No original hero-video source and no confirmed ffmpeg** → the Part 1.3 "re-grade the
  clip" branch cannot be done; only the CSS/opacity fix is applied.

**Consequence for this ledger:** every finding below is marked either
- **[RUN-VERIFIED]** — proven by executing real assertions in the Node runtime, or
- **[CODE-REVIEW ONLY, not visually verified]** — the fix is correct by inspection but was
  NOT opened in a browser (per the mission's own instruction to label these honestly).

Nothing is claimed as "tested in browser" unless it was. No page was opened in a browser
because no browser could be run.

### Deviations from the prompt (documented, deliberate)
1. **`lib/salary.mjs` instead of `lib/salary.ts`.** The repo's other pure-logic modules
   (`lib/resumeChecks.mjs`, `lib/skillNormalize.mjs`) are `.mjs` precisely so `node --test`
   can run them with no build step. TypeScript cannot be compiled or executed in this
   environment (no toolchain), so shipping `.ts` would mean shipping **untested** logic.
   `.mjs` matches the existing convention and is genuinely unit-tested here. Rename to
   `.ts` is trivial once a real toolchain is available. Same reasoning will apply to
   `lib/skills/normalize` and `lib/realityScore`.
2. Dead alternate components (`DashboardWrapper.jsx` → `JobsListView.jsx` → `JobCardNew.jsx`,
   and the `ModernDashboardLayout` import in `app/page.js`) are **not rendered** anywhere.
   Money surfaces inside them were intentionally left untouched (see Part 7 cleanup list).

---

## Progress Checklist (copied from the mission's BUILD ORDER)

- [x] **0. Setup & inspection** — repo inspected, git initialized, AUDIT.md created,
      Node runtime confirmed, environment blockers recorded.
- [x] **1. `lib/salary` + wire every money surface + unit tests (P0)** — see Finding P0-1.
- [x] **2. Dashboard bottom-clipping fix + hero video visibility fix (P0)** — Findings P0-2, P0-3 (code-review only; browser verification blocked in this env).
- [ ] **3. FileDropZone + Reviewer upgrade**
- [ ] **4. Compare upgrade (A/B, verdict, best-of-both)**
- [ ] **5. Agent runtime: types, event log, miner + scout, missions module**
- [ ] **6. Courier + coach + bard agents; forge-kit mission end to end**
- [ ] **7. Mission Control UI (nodes, tool chips, log, summary, speech bubbles)**
- [ ] **8. Kit tab (diff, emails, quest, prep sheet, copy/download/print) + golden cache**
- [x] **9. Truth layer: normalization, shared matchFor, Reality Score + filter** — see Finding T-1.
      Logic **[RUN-VERIFIED]**; UI wiring **[CODE-REVIEW ONLY]**.
- [ ] **10. Minecraft polish (XP bars, chest save, block toasts, loaders, empty states, torch)**
- [ ] **11. Demo Mode + offline dataset + sample resumes + error boundary + /api/health**
- [ ] **12. Full audit sweep (7.1–7.8) and P0/P1 fix loop**
- [ ] **13. README, LICENSE, OG images, feedback route, final QA sweep**

---

## Findings

Severity: **P0** = broken flow / crash / data loss / security / unreadable core UI /
misleading number. **P1** = serious usability / a11y / mobile breakage. **P2** = polish.
**P3** = nice-to-have.

| ID | Route / component | Viewport | Theme | Problem | Evidence | Severity | Status |
|----|-------------------|----------|-------|---------|----------|----------|--------|
| P0-1 | RightSidebar "Salary Intelligence" (also job card, career path) | all | both | Salary showed "₹21000L – ₹96L per annum": a monthly figure labeled as lakhs, and the two bounds normalized on different scales. | `components/RightSidebar.js:29` old `fmtSalary`; render `:1281` | P0 | **FIXED [RUN-VERIFIED]** |
| P0-2 | Dashboard (`.dashboard-center` scroll container) | 360–768 | both | Last job card / list footer / pipeline end covered by the fixed mobile hotbar. | `app/globals.css:1147`, `components/MobileBottomBar.js:21` | P0 | **FIXED [CODE-REVIEW ONLY]** |
| P0-3 | Landing hero | all | both | Hero video barely visible — smothered by a full-screen cream/ink wash. | `components/landing-retro.css:395` `.rv-hero__scrim` | P0 | **FIXED [CODE-REVIEW ONLY]** |
| T-1 | Job card + drawer + modal skill match; results filter | all | both | Match logic was duplicated 3× with divergent rules (`skillKey` vs inline `norm`, different "total" sources), so a card's chips could disagree with its own count; no alias canonicalization (SQL≠MySQL); no trust signal for scam/thin listings. | `app/page.js` old `deriveSkillData` + JobCard inline `norm` (~:1548) | P1 | **FIXED — logic [RUN-VERIFIED], UI [CODE-REVIEW ONLY]** |

### P0-1 — Salary Intelligence (detail)

**Root cause (found, as the mission predicted):**
1. `parseSalary` in the API route (`app/api/[[...path]]/route.js:2660`) reduces every salary
   to a bare number and **discards period + currency metadata**, so the client cannot know
   whether `21000` is monthly or annual.
2. The client formatter `fmtSalary` (`components/RightSidebar.js:29`) divided by 100000
   **only when `n >= 100000`**. A monthly `21000` therefore rendered as `₹21000L` (a lakh
   label glued to a rupee-scale number), while a differently-scaled max rendered `₹96L`.
3. The two bounds were formatted independently, so one range could mix a monthly-derived and
   an annual-derived value — "₹21000L – ₹96L per annum".

**Actual salary shapes returned by the jobs layer (for the record):**
- Every adapter emits `salaryMin` / `salaryMax` as **plain numbers**, no period, no currency
  (route.js: `2745` Adzuna, `3051` JSearch, `3201` USAJOBS annual ranges, `2686`/`3022`/
  `3317`/`3374` XML/other feeds via `parseSalary`). Many adapters emit `0` when unknown.
- Adzuna `salary_min/max` and USAJOBS `MinimumRange/MaximumRange` are annual by convention;
  some XML/DevITjobs/WhatJobs feeds carry monthly figures — indistinguishable after
  `parseSalary` strips the text. Hence a **per-bound heuristic** is required.

**Fix (one pure module, used by every live money surface):**
- New `lib/salary.mjs` exporting `parseSalaryRange(raw, hints)` and `formatSalary(parsed)`
  (+ `salaryLabel`, `isEstimated`).
  - Period metadata → convert (×12 / ×52 / ×260 / ×2080). No metadata → per-bound rupee
    heuristic: `<= 100000` = monthly (×12); `100000 < v <= 20000000` = annual; marks
    `confidence: "estimated"` whenever the heuristic decided, `"metadata"` otherwise.
  - Both bounds normalized to annual **before** display (never mixes periods).
  - INR `>= 1 lakh` → "₹2.5–₹11.5 LPA" (en-IN, max 1 decimal); `< 1 lakh` → "₹X per year";
    USD → "$85k–$130k per year"; none → "Salary not listed". Memoized → identical input
    always yields the identical string (no hydration flicker).
- Wired into: `components/RightSidebar.js` (Salary Intelligence panel now normalizes each job
  to annual, then aggregates; hovered-job line; highest-paying line), `app/page.js` job card,
  `components/CareerChangePaths.js` career-path estimate (USD/annual).
- Removed the buggy local `fmtSalary` / `trimNumber`.

**Verification [RUN-VERIFIED] — real assertions executed in the Node runtime:**
`tests/salary.test.mjs` (15 cases) + wiring scenarios all pass:
- `{min:21000,max:96000}` monthly → **₹2.5–₹11.5 LPA** (matches the mission's target string).
- `{min:21000}` no period → ₹2.5 LPA, confidence `estimated`.
- `96000` monthly → ₹11.5 LPA · `450000` annual → ₹4.5 LPA · `2500000` annual → ₹25 LPA.
- USD `{85000,130000}` → $85k–$130k per year · `"$120,000 - $150,000 per year"` → parsed.
- `"8 - 12 LPA"` → ₹8–₹12 LPA · `"₹25,000 per month"` → ₹3 LPA · `"₹12,00,000 per year"` → ₹12 LPA.
- single bound, missing/zero → "Salary not listed"; deterministic (same input → same string);
  periods never mixed in one range.
- Regex guard asserts output can **never** match `₹<4+ digits>L` (the "₹21000L" class of bug).

**Not visually verified:** the rendered panel was not opened in a browser (no browser here).
Logic + string output are run-verified; pixel layout is **[CODE-REVIEW ONLY]**.

---

### P0-2 — Dashboard bottom clipping (detail)

**Root cause (reported, as the mission asked):** the fixed mobile hotbar overlaps the end of
the scroll content, and the reserved space was too small.
- `.dashboard-center` (`app/globals.css:945`) is the real scroll container (`.app-shell` and
  `.dashboard-main` are `height:100vh; overflow:hidden`). At ≤768px it reserved a fixed
  `padding-bottom: 64px` (was `globals.css:1148`).
- `.mobile-bottom-bar` is `position:fixed; height:60px` **plus**
  `padding-bottom: env(safe-area-inset-bottom)` (`components/MobileBottomBar.js:21-22`). On a
  home-indicator device the bar is ~94px tall, so ~30px of the last card/footer was covered.
  Even with no safe-area, 4px clearance clipped card shadows/focus rings.
- `.dashboard-layout.upload-mode .dashboard-center { padding: 24px }` (higher specificity)
  also **overrode** the mobile bottom padding entirely in upload mode.

**Fix:** at ≤768px the center now reserves
`padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px))` (60px bar + 24px breathing
room + safe-area) and the same value as `scroll-padding-bottom` (so `scrollIntoView`/anchor
jumps clear the bar). Added a matching override for upload mode. One fix on the shared scroll
container covers the job list, the list footer, and the pipeline end uniformly.

**Status: [CODE-REVIEW ONLY, not visually verified]** — correct by inspection; could not open
a browser to run the scroll-to-bottom bounding-box assertion the mission specifies. That
automation is **not run** in this environment.

### P0-3 — Faint hero video (detail)

**Root cause (reported):** `.rv-hero__scrim` (`components/landing-retro.css:395`) was a
**full-screen wash** — a `linear-gradient` of cream at **0.92 → 0.68 opacity** (light) /
ink at **0.88 → 0.66** (dark) covering the entire hero, plus a second radial gradient. The
`<video>` element itself had **no opacity override** (it was already 1); the scrim alone was
smothering it. No ffmpeg re-grade was needed for the visibility problem.

**Fix (localized treatment only, per the mission):**
- Video stays `opacity: 1`; the full-screen wash is **removed**.
- `.rv-hero__scrim` is now an **edge-only vignette** (transparent center → ~0.22/0.34 alpha at
  the outer edges; slightly stronger in dark theme) — "light vignette at the outer edges only".
- Text legibility moved to a **localized chunky panel** on `.rv-hero-inner` (parchment
  `rgba(247,238,216,0.94)` in light, ink `rgba(24,24,24,0.92)` in dark) with the retro bevel
  (`--rv-bw`/`--rv-line`/`--rv-shadow`), `max-width: min(780px, 92vw)`, centered. The floating
  stickers sit at the hero edges (outside the panel) so the video reads clearly around and
  behind the content in both themes.

**Not done:** the "re-grade the clip from the original with ffmpeg" branch — there is no
original source in the repo (only the exported `hero.mp4` / `hero-mobile.mp4` / `poster.webp`)
and ffmpeg is not confirmed in this environment. Existing exports already meet the size targets
(hero.mp4 ≈ 860 KB ≤ 2.5 MB, hero-mobile ≈ 291 KB, poster.webp ≈ 55 KB) and HeroVideo.js
already pauses offscreen/tab-hidden and uses poster-only for reduced-motion/Save-Data.

**Status: [CODE-REVIEW ONLY, not visually verified]** — could not sample rendered frames or
measure text-over-video contrast (AA) without a browser. The mission's Part 7 re-audit of this
fix is therefore **pending a real browser**.

---

### T-1 — Truth layer: shared `matchFor`, canonical skills, Reality Score (detail)

**Root cause (found):** the client computed skill match **three different ways** that could
disagree with each other on the same card:
1. `deriveSkillData(job, profile)` (module-level) built `requiredSkills` from
   required+matched+missing+tags+inferred and matched against `profile.topSkills` via a local
   `skillKey` (`s.toLowerCase().replace(/\.js/,"js")…`) with hand-written special cases for
   "html css" / "ai ml".
2. The live `JobCard` had its **own inline `norm`** (a near-copy of `skillKey`) and a
   **different "total"** (`requiredSkills + tags` only), so its "matched of total" text and gap
   chips could contradict the drawer/modal, which use `deriveSkillData`.
3. Neither canonicalized aliases: **"SQL" did not count for a "MySQL" requirement**, and
   `MySQL` + `PostgreSQL` + `SQLite` were counted as three separate required slots, deflating %.

**Fix (one pure module + one pure scorer, both `.mjs`, both unit-tested):**
- New `lib/skills/normalize.mjs`:
  - `canonicalSkill(raw)` — case/punctuation-insensitive alias map (~120 aliases →
    ~70 canonical families: SQL=MySQL=PostgreSQL=SQLite= MSSQL→`sql`; JS=ES6→`javascript`;
    React.js=ReactJS→`react`; Node.js→`node js`; AWS=Amazon Web Services→`aws`; CSS3→`css`; …).
    Unknown skills canonicalize to their cleaned form (still match themselves). **Idempotent**
    (re-canonicalizing a canonical value is a no-op — asserted over every alias). `C++` preserved.
  - `canonicalSet(list)` — canonical→first-display-form map (dedupes aliases, keeps phrasing).
  - `haveSet(list)` — candidate side; expands combined tokens (`HTML/CSS`→ also `html`,`css`;
    `AI/ML`→ also `ai`,`machine learning`) so one resume line satisfies several asks. Preserves
    the old special-casing, now centralized + tested.
  - **`matchFor(profileSkills, jobSkills)` — the ONE shared matcher.** Returns
    `{matched, missing, required, pct}`; `required` is the deduped canonical count and
    `pct = required===0 ? 0 : round(matched/required*100)`. A combined *requirement*
    ("HTML/CSS") counts as one slot and is met by having both parts.
- New `lib/realityScore.mjs` — **pure, client-side, zero-API** trust score from *visible* data
  only (no invented statistics): freshness (`daysAgo` parses "Today"/"3 days ago"/ISO/…),
  source tier (direct career site +30 / Internshala·Wellfound +25 / aggregator +15),
  responsibilities present +15, salary +10, skills +10, **red-flag phrases −20 each**
  ("registration fee", "earn daily", "whatsapp group", "instant joining", …), clamped 0–100.
  `level` = verified≥80 / good≥60 / caution≥40 / danger. `isSuspicious(job)` = score < 40.
  Every point becomes a human-readable `reason` (so the number is explainable, per the thesis).
- **Wired into `app/page.js`:**
  - `deriveSkillData` now calls `matchFor`; `uniqueSkills` dedupes by `canonicalSkill`; the
    JobCard's inline `norm` block is **deleted** and replaced by `deriveSkillData` output, so
    card text + chips + drawer + modal all come from one function. The modal chip-equality check
    now uses `canonicalSkill` too. The old `skillKey` helper is removed.
  - Results toolbar: **"Hide suspicious: On/Off"** toggle (default ON) filters `displayed` by
    `!isSuspicious(job)`; persisted in the global key **`cv_reality_v1`** ("1"/"0"), registered
    in `SAFE_GLOBAL_KEYS` so it survives the account-switch nuclear wipe.
  - Job card: a **Reality Score shield** (`level · score`) colored by level, `title` tooltip
    lists the reasons. The server-side holistic `job.matchScore` (AI blend + role/location
    bonuses in `route.js`) is **left untouched** — no API/contract change.

**Verification [RUN-VERIFIED] — `tests/truth.test.mjs`, 18 assertion groups, all pass in the
Node runtime:**
- Acceptance: `matchFor(['SQL'],['MySQL'])` → `{matched:['sql'],required:1,pct:100}`.
- Alias family dedupe: `['sql']` vs `['MySQL','PostgreSQL','SQLite']` → `required:1, pct:100`.
- **Every `pct` equals `round(matched/required*100)`** and `matched+missing === required`
  across 4 mixed cases (the "card can't disagree with its own text" guarantee).
- No-requirement → `pct:0`, never NaN/div-by-zero. `canonicalSkill` idempotent over all aliases.
  `C++` preserved. Unknown skills self-match. `canonicalSet` dedupes to first display form.
  Order-independent. `HTML/CSS` satisfies separate `HTML`+`CSS` (pct 100) and a combined
  `HTML/CSS` ask is met by having both parts (1 slot).
- `daysAgo`: Today/Just posted=0, Yesterday=1, "3 days ago"=3, "2 weeks ago"=14,
  "1 month ago"=30, "5 hours ago"≈0.208, null/junk=null.
- `realityScore`: a rich/fresh/direct listing → 90 `verified`; a red-flag scam → 0 `danger`,
  `isSuspicious=true`; a thin aggregator listing → `danger`, suspicious. Score always clamped
  0–100, `level` always derived from the score, and deterministic for identical input.

**Bugs found & fixed while testing (both were real, both now covered by a test):**
- Alias *values* were returned un-cleaned, so `CICD`→`ci/cd` but `CI/CD`→`ci cd` (they failed to
  match). Fixed by re-cleaning alias values → canonical form is idempotent.
- `daysAgo` unit regexes used `\b` right after the unit, so **plurals failed** ("3 days ago",
  "5 hours ago" → null). Fixed to `(?:days?|d)\b` etc.

**Status: [CODE-REVIEW ONLY, not visually verified]** — the toggle, the shield badge, and the
re-filtered list were **not opened in a browser** (no browser/build here). The matching and
scoring logic they render is run-verified.

---

## Terminology table (Part 7.2 — fill during audit)

| Concept | Canonical term | Capitalization | Banned variants |
|---------|----------------|----------------|-----------------|
| (to be completed in Part 7) | | | |

## Competitor comparison (Part 9 — evidence only)

| Competitor | Operating? (URL + date) | Notes |
|------------|-------------------------|-------|
| (to be completed in Part 9) | | |

## Lighthouse before/after (Part 7.6)

**Blocked** — cannot run Lighthouse/Chrome in this environment. Record as "not run".

## localStorage keys (inventory — Part 7.8)

Global (not user-scoped): `cv_theme`, `cv_notifications`, `cv_tour_v1`, `cv_reported_jobs`,
`cv_job_statuses`, `cv_preview_user` (dev only). `cv_reality_v1` is now registered in
`SAFE_GLOBAL_KEYS` (`lib/userStorage.js:12`) so the Reality-Score filter preference survives
the account-switch nuclear wipe.
User-scoped (`cv_<uid>_*` via `lib/userStorage.js`): `session`, `profile`, `jobs`, `saved`,
`resume_filename`, `resume_text`, `career_path`, `analysis`, `skill_additions`, plus
`applied` and `learning_plan` written by `app/page.js`.
New keys this pass (mission-permitted): `cv_agent_v1`, `cv_compare_v1`, `cv_demo_v1`,
`cv_reality_v1`.

> **Known bug (data-leak):** `applied` and `learning_plan` are written under `cv_<uid>_*` but
> are **not** in `USER_DATA_KEYS` (`lib/userStorage.js:15`), so `clearUserData()` ("Clear my
> data") never removes them. Tracked as P1 (Part 7.8). Not yet fixed.

## Needs-my-decision list (surfaced at the end per the mission)
- Team name / attribution line in README.
- Landing testimonial (flag, do not edit).
- "200+ jobs" claim (flag, do not edit).
- Gemini key env var value (user said they will provide) — required for real job capture.
