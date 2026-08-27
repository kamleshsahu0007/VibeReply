/**
 * VibeReply — trial, usage-quota, and habit-stats state (MV3 service worker module)
 *
 * Owns in chrome.storage.local:
 *   - installationDate: epoch ms, set once on first install
 *   - dailyUsage: { [YYYY-MM-DD]: { reply, translation, total, words } }, UTC day buckets
 *   - lifetimeTotals: { words, generations } — never pruned, unlike dailyUsage
 *
 * Tier is derived, never stored: `pro_trial` for TRIAL_DAYS after install,
 * `free` after that. Quota is enforced against chrome.storage.local only —
 * there's no server-side account/entitlement system yet (identity is just
 * the anonymous deviceId in background.js), so this is a soft, client-side
 * gate rather than real enforcement. It stops accidental overuse, not a
 * user who opens devtools and edits their own storage.
 */

export const TRIAL_DAYS = 30;
export const FREE_DAILY_LIMIT = 5;

// Rough estimate of manual-typing time an AI-assisted reply/translation
// replaces (~1 minute/use). Used only to compute a real, usage-derived
// "time saved" figure — deliberately not a fixed number shown to every user
// regardless of whether they've used the extension at all. Shared by the
// paywall's savings message and the habit stats card so the number the user
// sees is always the same figure, never two different estimates.
const ESTIMATED_SECONDS_SAVED_PER_USE = 60;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Long enough that a real daily-streak habit doesn't quietly get truncated —
// unlimitedStorage is already declared in the manifest, so retaining a
// year-plus of small day-bucket records costs effectively nothing.
const USAGE_RETENTION_DAYS = 400;

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

/** Record one AI-assisted use. kind: 'reply' | 'translation'. wordCount: words in the generated text. */
export async function recordUsage(kind = 'reply', wordCount = 0) {
  const usage = await getUsageMap();
  const key = dayKey();
  const today = usage[key] || { reply: 0, translation: 0, total: 0, words: 0 };
  today[kind] = (today[kind] || 0) + 1;
  today.total += 1;
  today.words = (today.words || 0) + wordCount;
  usage[key] = today;

  const cutoff = dayKey(new Date(Date.now() - USAGE_RETENTION_DAYS * MS_PER_DAY));
  for (const k of Object.keys(usage)) {
    if (k < cutoff) delete usage[k];
  }

  await chrome.storage.local.set({ dailyUsage: usage });

  const { lifetimeTotals } = await chrome.storage.local.get('lifetimeTotals');
  const totals = lifetimeTotals || { words: 0, generations: 0 };
  totals.words += wordCount;
  totals.generations += 1;
  await chrome.storage.local.set({ lifetimeTotals: totals });

  return today;
}

/**
 * Consecutive-day usage streak, Duolingo-style: counts backward from today
 * while each day has at least one recorded use. If today has no usage yet,
 * counting starts from yesterday instead — using the extension today
 * doesn't retroactively need to happen before "5-day streak" is still true
 * from yesterday's perspective; it only breaks once a full day is skipped.
 */
export async function getStreak() {
  const usage = await getUsageMap();
  let streak = 0;
  let cursor = new Date();
  if (!(usage[dayKey(cursor)]?.total > 0)) {
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }
  while (usage[dayKey(cursor)]?.total > 0) {
    streak += 1;
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }
  return streak;
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

/**
 * Everything the popup's habit-stats card needs, in one call:
 * streak, lifetime words generated, and hours/minutes saved this week.
 * e.g. "🔥 5-Day Streak | ⏱️ 2 Hours Saved This Week".
 */
export async function getStats() {
  const { lifetimeTotals } = await chrome.storage.local.get('lifetimeTotals');
  const totals = lifetimeTotals || { words: 0, generations: 0 };
  const [streak, minutesSavedThisWeek] = await Promise.all([
    getStreak(),
    getWeeklyTimeSavedMinutes(),
  ]);
  return {
    streak,
    totalWordsGenerated: totals.words,
    totalGenerations: totals.generations,
    minutesSavedThisWeek,
  };
}
