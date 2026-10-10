/**
 * Helper utility to calculate the age of a job posting in days
 * and return the corresponding CSS classes and human-readable labels.
 */

export function parseDaysAgo(posted) {
  if (!posted) return 999;
  const s = posted.toLowerCase().trim();
  if (/just now|today|1 day|a day/i.test(s)) return 0;
  
  const d = s.match(/(\d+)\s*day/i);
  if (d) return parseInt(d[1], 10);
  
  const w = s.match(/(\d+)\s*week/i);
  if (w) return parseInt(w[1], 10) * 7;
  
  const m = s.match(/(\d+)\s*month/i);
  if (m) return parseInt(m[1], 10) * 30;
  
  return 999;
}

export function getFreshness(posted) {
  const daysAgo = parseDaysAgo(posted);

  let freshnessClass = "stale";
  let freshnessLabel = "🔴 Likely expired";
  let freshnessTooltip = "Posted 30+ days ago — verify before applying";

  if (daysAgo <= 7) {
    freshnessClass = "fresh";
    freshnessLabel = "🟢 Fresh";
    freshnessTooltip = daysAgo <= 1 ? "Posted today" : `Posted ${daysAgo} days ago`;
  } else if (daysAgo <= 30) {
    freshnessClass = "aging";
    freshnessLabel = "🟡 Aging";
    freshnessTooltip = `Posted ${daysAgo} days ago`;
  }

  return {
    daysAgo,
    freshnessClass,
    freshnessLabel,
    freshnessTooltip,
  };
}
