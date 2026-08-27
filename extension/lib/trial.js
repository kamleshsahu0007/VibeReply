/**
 * VibeReply — trial & usage-quota state (MV3 service worker module)
 *
 * Owns three things in chrome.storage.local:
 *   - installationDate: epoch ms, set once on first install
 *   - dailyUsage: { [YYYY-MM-DD]: { reply, translation, total } }, UTC day buckets
 *
 * Tier is derived, never stored: `pro_trial` for TRIAL_DAYS after install,
 * `free` after that. Quota is enforced against chrome.storage.local only —
 * there's no server-side account/entitlement system yet (identity is just
 * the anonymous deviceId in background.js), so this is a soft, client-side
 * gate rather than real enforcement. It stops accidental overuse, not a
 * user who opens devtools and edits their own storage.
 */

export const TRIAL_DAYS = 7;
export const FREE_DAILY_LIMIT = 5;

// Rough estimate of manual-typing time an AI-assisted reply/translation
// replaces. Used only to compute a real, usage-derived "time saved" figure —
// deliberately not a fixed number shown to every user regardless of whether
// they've used the extension at all.
const ESTIMATED_SECONDS_SAVED_PER_USE = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const USAGE_RETENTION_DAYS = 30;

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

/** Call once from chrome.runtime.onInstalled — idempotent. */
export async function ensureInstallState() {
  const { installationDate } = await chrome.storage.local.get('installationDate');
  if (installationDate) return installationDate;
  const now = Date.now();
  await chrome.storage.local.set({ installationDate: now });
  return now;
}

export async function getTierState() {
  const { installationDate } = await chrome.storage.local.get('installationDate');
  if (!installationDate) {
    // Shouldn't happen once onInstalled has run, but fail closed to `free`
    // rather than silently granting trial access.
    return { tier: 'free', trialActive: false, trialDaysRemaining: 0 };
  }
  const elapsedDays = Math.floor((Date.now() - installationDate) / MS_PER_DAY);
  const trialActive = elapsedDays < TRIAL_DAYS;
  return {
    tier: trialActive ? 'pro_trial' : 'free',
    trialActive,
    trialDaysRemaining: Math.max(0, TRIAL_DAYS - elapsedDays),
  };
}

async function getUsageMap() {
  const { dailyUsage } = await chrome.storage.local.get('dailyUsage');
  return dailyUsage || {};
}

export async function getTodayUsage() {
  const usage = await getUsageMap();
  return usage[dayKey()]?.total || 0;
}

/** Record one AI-assisted use. kind: 'reply' | 'translation'. */
export async function recordUsage(kind = 'reply') {
  const usage = await getUsageMap();
  const key = dayKey();
  const today = usage[key] || { reply: 0, translation: 0, total: 0 };
  today[kind] = (today[kind] || 0) + 1;
  today.total += 1;
  usage[key] = today;

  const cutoff = dayKey(new Date(Date.now() - USAGE_RETENTION_DAYS * MS_PER_DAY));
  for (const k of Object.keys(usage)) {
    if (k < cutoff) delete usage[k];
  }

  await chrome.storage.local.set({ dailyUsage: usage });
  return today;
}

/**
 * Real, usage-derived savings estimate for the trailing 7 days — sums actual
 * recorded uses and multiplies by a per-use time estimate, rather than
 * showing every user the same fixed number regardless of whether they've
 * used the extension at all.
 */
export async function getWeeklyTimeSavedMinutes() {
  const usage = await getUsageMap();
  const cutoff = dayKey(new Date(Date.now() - 7 * MS_PER_DAY));
  let count = 0;
  for (const [key, day] of Object.entries(usage)) {
    if (key >= cutoff) count += day.total || 0;
  }
  return Math.round((count * ESTIMATED_SECONDS_SAVED_PER_USE) / 60);
}

/**
 * Gate to call before generating a reply/translation.
 * Returns { allowed: true, tier, ... } or { allowed: false, tier, reason, ... }.
 */
export async function checkQuota() {
  const { tier, trialActive, trialDaysRemaining } = await getTierState();
  if (trialActive) {
    return { allowed: true, tier, trialDaysRemaining };
  }

  const usedToday = await getTodayUsage();
  if (usedToday >= FREE_DAILY_LIMIT) {
    const minutesSaved = await getWeeklyTimeSavedMinutes();
    return {
      allowed: false,
      tier,
      reason: 'daily_limit_reached',
      usedToday,
      limit: FREE_DAILY_LIMIT,
      minutesSaved,
    };
  }
  return { allowed: true, tier, usedToday, limit: FREE_DAILY_LIMIT };
}
