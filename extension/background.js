/**
 * VibeReply — Service Worker (MV3)
 * Single source of truth for network, identity, and cross-context messaging.
 * Stateless across SW restarts; durable state lives in chrome.storage.
 */

import * as VRTrial from './lib/trial.js';

const CONFIG = {
  // Override locally via chrome.storage.local.set({ apiBase: 'http://localhost:3000' })
  API_BASE: 'https://vibe-reply-seven.vercel.app',
  ENDPOINTS: {
    generate: '/api/generate-replies',
    tones: '/api/tones',
    feedback: '/api/v1/suggestions/feedback',
  },
  REQUEST_TIMEOUT_MS: 20_000,
  RATE_LIMIT: { capacity: 5, refillPerSec: 0.5 }, // 5 burst, ~1 every 2s

  // Placeholder — replace with a real Stripe Payment Link (or a backend
  // endpoint that creates a Checkout Session). There's no billing backend
  // in this repo yet, so this is unwired until one exists.
  STRIPE_CHECKOUT_URL: 'https://buy.stripe.com/REPLACE_ME',
};

// Lets a developer point the extension at a local backend without editing
// this file — chrome.storage.local.set({ apiBase: 'http://localhost:3000' }).
let apiBaseOverride = null;
async function getApiBase() {
  if (apiBaseOverride !== null) return apiBaseOverride || CONFIG.API_BASE;
  const { apiBase } = await chrome.storage.local.get('apiBase');
  apiBaseOverride = apiBase || '';
  return apiBaseOverride || CONFIG.API_BASE;
}

// Every platform the content script knows how to run on. Used both to
// broadcast preference updates and (in the popup) to find a usable tab.
const SUPPORTED_PLATFORMS = [
  { id: 'whatsapp', label: 'WhatsApp Web', urlPattern: 'https://web.whatsapp.com/*', openUrl: 'https://web.whatsapp.com/' },
  { id: 'linkedin', label: 'LinkedIn', urlPattern: 'https://www.linkedin.com/*', openUrl: 'https://www.linkedin.com/messaging/' },
];

const MSG = Object.freeze({
  GENERATE: 'GENERATE_SUGGESTIONS',
  TRANSLATE: 'TRANSLATE_TEXT',
  FEEDBACK: 'SUGGESTION_FEEDBACK',
  GET_PREFS: 'GET_PREFERENCES',
  SET_PREFS: 'SET_PREFERENCES',
  LIST_TONES: 'LIST_TONES',
  SAVE_TONE: 'SAVE_TONE',
  DELETE_TONE: 'DELETE_TONE',
  CLEAR_ALL_CONVERSATIONS: 'CLEAR_ALL_CONVERSATIONS',
  OPEN_CHECKOUT: 'OPEN_CHECKOUT',
  GET_STATS: 'GET_STATS',
  PING: 'PING',
});

/* ----------------------------- Token bucket ----------------------------- */
class TokenBucket {
  constructor({ capacity, refillPerSec }) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  take() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSec);
    this.lastRefill = now;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}
const limiter = new TokenBucket(CONFIG.RATE_LIMIT);

/* ------------------------------- Identity -------------------------------- */
// Anonymous, device-scoped identity — no login/account system yet. This id
// is what tone-profile customization is keyed to on the backend.
async function getDeviceId() {
  const { deviceId } = await chrome.storage.sync.get('deviceId');
  if (deviceId) return deviceId;
  const fresh = crypto.randomUUID();
  await chrome.storage.sync.set({ deviceId: fresh });
  return fresh;
}

/* ----------------------------- HTTP client ------------------------------ */
async function authHeaders() {
  const { accessToken } = await chrome.storage.session.get('accessToken');
  const deviceId = await getDeviceId();
  return {
    'X-Device-Id': deviceId,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function apiFetch(path, { method = 'POST', body, signal } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), CONFIG.REQUEST_TIMEOUT_MS);
  const composedSignal = signal
    ? anySignal([signal, controller.signal])
    : controller.signal;

  try {
    const apiBase = await getApiBase();
    const res = await fetch(`${apiBase}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Client': 'vibereply-ext/1.0.0',
        ...(await authHeaders()),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: composedSignal,
      credentials: 'omit',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ApiError(res.status, text || res.statusText);
    }
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

function anySignal(signals) {
  const ctrl = new AbortController();
  const onAbort = (reason) => ctrl.abort(reason);
  for (const s of signals) {
    if (s.aborted) onAbort(s.reason);
    else s.addEventListener('abort', () => onAbort(s.reason), { once: true });
  }
  return ctrl.signal;
}

function countWords(text) {
  return typeof text === 'string' ? (text.trim().match(/\S+/g) || []).length : 0;
}

/* --------------------------- Request handlers --------------------------- */

// payload: { task: 'reply'|'rewrite', messages, draft?, partnerTone?, toneKeys?, userLanguage?, partnerLanguage? }
async function handleGenerate(payload) {
  if (!limiter.take()) {
    return { ok: false, error: 'rate_limited', retryAfterMs: 2000 };
  }

  const quota = await VRTrial.checkQuota();
  if (!quota.allowed) {
    return { ok: false, error: 'paywall', data: quota };
  }

  const body = {
    task: payload?.task === 'rewrite' ? 'rewrite' : 'reply',
    messages: Array.isArray(payload?.messages) ? payload.messages : [],
    draft: payload?.draft,
    partnerTone: payload?.partnerTone,
    toneKeys: payload?.toneKeys,
    userLanguage: payload?.userLanguage,
    partnerLanguage: payload?.partnerLanguage,
  };

  try {
    const res = await apiFetch(CONFIG.ENDPOINTS.generate, { body });
    const data = await res.json();
    if (!data?.success) {
      return { ok: false, error: data?.error?.message || 'generation_failed' };
    }
    const wordCount = Object.values(data.replies || {}).reduce(
      (sum, variant) => sum + countWords(variant?.text),
      0
    );
    await VRTrial.recordUsage('reply', wordCount);
    return { ok: true, data }; // data: { success, replies, meta }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await chrome.storage.session.remove('accessToken');
      return { ok: false, error: 'auth_required' };
    }
    return { ok: false, error: err?.message || 'network_error' };
  }
}

// payload: { text, sourceLanguage?, targetLanguage }
async function handleTranslate(payload) {
  if (!payload?.text || !payload?.targetLanguage) {
    return { ok: false, error: 'invalid_payload' };
  }
  if (!limiter.take()) {
    return { ok: false, error: 'rate_limited', retryAfterMs: 2000 };
  }

  const quota = await VRTrial.checkQuota();
  if (!quota.allowed) {
    return { ok: false, error: 'paywall', data: quota };
  }

  const body = {
    task: 'translate',
    text: payload.text,
    sourceLanguage: payload.sourceLanguage,
    targetLanguage: payload.targetLanguage,
  };

  try {
    const res = await apiFetch(CONFIG.ENDPOINTS.generate, { body });
    const data = await res.json();
    if (!data?.success) {
      return { ok: false, error: data?.error?.message || 'translation_failed' };
    }
    await VRTrial.recordUsage('translation', countWords(data.translatedText));
    return { ok: true, data }; // data: { success, translatedText, meta }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await chrome.storage.session.remove('accessToken');
      return { ok: false, error: 'auth_required' };
    }
    return { ok: false, error: err?.message || 'network_error' };
  }
}

async function handleFeedback(payload) {
  try {
    await apiFetch(CONFIG.ENDPOINTS.feedback, { body: payload });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'network_error' };
  }
}

// The content script runs on every open tab across the whole browser (by
// design — this is meant to work like Grammarly, on any site), and each one
// asks for the tone list on load. Without caching that means one backend
// call per tab, not per user. The service worker is the one thing shared
// across all of them, so a short-lived cache here turns "N tabs open" back
// into "~1 backend call per TTL window" regardless of how many sites/tabs
// are open. chrome.storage.session (not .local) so it clears with the
// browser session rather than lingering indefinitely.
const TONES_CACHE_TTL_MS = 5 * 60 * 1000;
let tonesCacheMemo = null; // { data, fetchedAt } — fast path once the SW is warm

async function getCachedTones() {
  const now = Date.now();
  if (tonesCacheMemo && now - tonesCacheMemo.fetchedAt < TONES_CACHE_TTL_MS) {
    return tonesCacheMemo.data;
  }
  const { tonesCache } = await chrome.storage.session.get('tonesCache');
  if (tonesCache && now - tonesCache.fetchedAt < TONES_CACHE_TTL_MS) {
    tonesCacheMemo = tonesCache;
    return tonesCache.data;
  }
  return null;
}

async function setCachedTones(data) {
  tonesCacheMemo = { data, fetchedAt: Date.now() };
  await chrome.storage.session.set({ tonesCache: tonesCacheMemo });
}

async function invalidateTonesCache() {
  tonesCacheMemo = null;
  await chrome.storage.session.remove('tonesCache');
}

async function handleListTones() {
  const cached = await getCachedTones();
  if (cached) return { ok: true, data: cached };

  try {
    const res = await apiFetch(CONFIG.ENDPOINTS.tones, { method: 'GET' });
    const data = await res.json();
    if (data?.success) await setCachedTones(data);
    return { ok: true, data }; // data: { success, tones }
  } catch (err) {
    return { ok: false, error: err?.message || 'network_error' };
  }
}

// payload: ToneProfileInput (see src/lib/validation/schemas.ts on the backend)
async function handleSaveTone(payload) {
  try {
    const res = await apiFetch(CONFIG.ENDPOINTS.tones, { method: 'POST', body: payload });
    const data = await res.json();
    if (!data?.success) return { ok: false, error: data?.error?.message || 'save_failed' };
    await invalidateTonesCache();
    return { ok: true, data }; // data: { success, tone }
  } catch (err) {
    return { ok: false, error: err?.message || 'network_error' };
  }
}

// payload: { key }
async function handleDeleteTone(payload) {
  try {
    await apiFetch(`${CONFIG.ENDPOINTS.tones}/${encodeURIComponent(payload?.key || '')}`, {
      method: 'DELETE',
    });
    await invalidateTonesCache();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'network_error' };
  }
}

/* ------------------------------ Preferences ----------------------------- */
const DEFAULT_PREFS = Object.freeze({
  defaultTones: ['casual', 'soft', 'funny'],
  panelEnabled: true,
  zeroRetention: false,

  // Language settings (§26 of the multilingual assistant spec).
  myLanguage: 'en',
  autoDetectPartnerLanguage: true,
  showTranslationAutomatically: true,
  showOriginalMessage: true,

  // Conversation history settings (§27).
  storeConversationLocally: true,
  maxStoredHistory: 500, // 100 | 500 | 1000 | 'all'
  autoLoadOlderMessages: false,
});

async function getPreferences() {
  const stored = await chrome.storage.sync.get('preferences');
  return { ...DEFAULT_PREFS, ...(stored.preferences || {}) };
}

async function setPreferences(patch) {
  const current = await getPreferences();
  const next = { ...current, ...patch };
  await chrome.storage.sync.set({ preferences: next });
  await broadcastToTabs({ type: 'PREFERENCES_UPDATED', payload: next });
  return next;
}

async function broadcastToTabs(message) {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  await Promise.allSettled(
    tabs.map((t) => t.id && chrome.tabs.sendMessage(t.id, message))
  );
}

// Privacy control (§28): "Clear all stored conversations" in the popup can't
// reach into every open tab's IndexedDB directly, so it's relayed here — each
// content script clears its own origin's database on receipt. A platform
// with no open tab simply isn't cleared until it's next opened.
async function handleClearAllConversations() {
  await broadcastToTabs({ type: 'CLEAR_CONVERSATION_DATA', payload: { scope: 'all' } });
  return { ok: true };
}

async function handleOpenCheckout() {
  await chrome.tabs.create({ url: CONFIG.STRIPE_CHECKOUT_URL });
  return { ok: true };
}

// Habit-analytics stats card (streak, words generated, time saved) — pure
// chrome.storage.local reads via VRTrial, no network call.
async function handleGetStats() {
  try {
    const data = await VRTrial.getStats();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err?.message || 'stats_failed' };
  }
}

/* --------------------------- Message dispatcher ------------------------- */
const ROUTES = {
  [MSG.GENERATE]: (p) => handleGenerate(p),
  [MSG.TRANSLATE]: (p) => handleTranslate(p),
  [MSG.FEEDBACK]: (p) => handleFeedback(p),
  [MSG.GET_PREFS]: () => getPreferences().then((data) => ({ ok: true, data })),
  [MSG.SET_PREFS]: (p) => setPreferences(p).then((data) => ({ ok: true, data })),
  [MSG.LIST_TONES]: () => handleListTones(),
  [MSG.SAVE_TONE]: (p) => handleSaveTone(p),
  [MSG.DELETE_TONE]: (p) => handleDeleteTone(p),
  [MSG.CLEAR_ALL_CONVERSATIONS]: () => handleClearAllConversations(),
  [MSG.OPEN_CHECKOUT]: () => handleOpenCheckout(),
  [MSG.GET_STATS]: () => handleGetStats(),
  [MSG.PING]: () => ({ ok: true, data: { pong: Date.now() } }),
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') {
    sendResponse({ ok: false, error: 'invalid_message' });
    return false;
  }
  const handler = ROUTES[message.type];
  if (!handler) {
    sendResponse({ ok: false, error: 'unknown_message_type' });
    return false;
  }

  Promise.resolve()
    .then(() => handler(message.payload))
    .then((result) => sendResponse(result))
    .catch((err) => sendResponse({ ok: false, error: err?.message || 'handler_error' }));

  return true; // keep channel open for async response
});

/* ------------------------------ Lifecycle ------------------------------- */
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    await chrome.storage.sync.set({ preferences: DEFAULT_PREFS });
    await getDeviceId(); // seed identity up-front
    await VRTrial.ensureInstallState(); // starts the PRO trial clock (VRTrial.TRIAL_DAYS)
  }
});

self.addEventListener('activate', () => {
  // No-op; SW is event-driven
});
