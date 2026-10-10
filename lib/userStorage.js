/**
 * User-scoped localStorage helpers.
 *
 * ALL resume/profile/job data MUST be stored through these helpers
 * so every key is namespaced to the logged-in Firebase UID.
 *
 * Keys that are NOT user-specific (theme, notifications) use a global
 * namespace and are excluded from nuclear wipes.
 */

// Keys that are global (not tied to a specific user)
const SAFE_GLOBAL_KEYS = ["cv_theme", "cv_notifications", "cv_reality_v1"];

// All known data keys we store per user
const USER_DATA_KEYS = [
  "session",
  "profile",
  "jobs",
  "saved",
  "resume_filename",
  "resume_text",
  "career_path",
  "analysis",
  "skill_additions",
];

/**
 * Build a UID-scoped localStorage key.
 * @param {string} uid - Firebase user UID
 * @param {string} key - Short key name (e.g. "profile", "jobs")
 * @returns {string} Full scoped key like "cv_abc123_profile"
 */
export function userKey(uid, key) {
  return `cv_${uid}_${key}`;
}

/**
 * Nuclear wipe — removes EVERY cv_* localStorage key that does NOT
 * belong to `keepUid` (or is a safe global like cv_theme).
 * This guarantees no stale data from any previous account can leak.
 *
 * @param {string|null} keepUid - UID whose data to preserve. Pass null to wipe everything.
 */
export function nukeAllResumeData(keepUid) {
  if (typeof window === "undefined") return;
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("cv_")) continue;               // not ours
    if (SAFE_GLOBAL_KEYS.includes(k)) continue;              // theme etc.
    if (keepUid && k.startsWith(`cv_${keepUid}_`)) continue; // belongs to current user
    toRemove.push(k);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
  // Also clear sessionStorage entirely
  try { sessionStorage.clear(); } catch (_) {}
}

/**
 * Wipe all data for a specific UID.
 */
export function clearUserData(uid) {
  if (typeof window === "undefined" || !uid) return;
  USER_DATA_KEYS.forEach((key) => {
    localStorage.removeItem(userKey(uid, key));
  });
}

/**
 * Get a user-scoped value from localStorage.
 */
export function getUserItem(uid, key) {
  if (typeof window === "undefined" || !uid) return null;
  return localStorage.getItem(userKey(uid, key));
}

/**
 * Get a user-scoped JSON value from localStorage.
 */
export function getUserJSON(uid, key, fallback = null) {
  const raw = getUserItem(uid, key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

/**
 * Set a user-scoped value in localStorage.
 */
export function setUserItem(uid, key, value) {
  if (typeof window === "undefined" || !uid) return;
  localStorage.setItem(userKey(uid, key), value);
}

/**
 * Set a user-scoped JSON value in localStorage.
 */
export function setUserJSON(uid, key, value) {
  setUserItem(uid, key, JSON.stringify(value));
}

/**
 * Check if a user has ANY resume data stored.
 */
export function userHasResumeData(uid) {
  if (!uid) return false;
  const profile = getUserJSON(uid, "profile");
  return profile !== null;
}
