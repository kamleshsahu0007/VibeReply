/**
 * VibeReply — Service Worker (MV3)
 * Single source of truth for network, identity, and cross-context messaging.
 * Stateless across SW restarts; durable state lives in chrome.storage.
 */

const CONFIG = {
  // Override locally via chrome.storage.local.set({ apiBase: 'http://localhost:3000' })
  API_BASE: 'http://localhost:3000',
  ENDPOINTS: {
    generate: '/api/generate-replies',
    tones: '/api/tones',
    feedback: '/api/v1/suggestions/feedback',
  },
  REQUEST_TIMEOUT_MS: 20_000,
  RATE_LIMIT: { capacity: 5, refillPerSec: 0.5 }, // 5 burst, ~1 every 2s
};

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
    const res = await fetch(`${CONFIG.API_BASE}${path}`, {
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

/* --------------------------- Request handlers --------------------------- */

// payload: { task: 'reply'|'rewrite', messages, draft?, partnerTone?, toneKeys?, userLanguage?, partnerLanguage? }
async function handleGenerate(payload) {
  if (!limiter.take()) {
    return { ok: false, error: 'rate_limited', retryAfterMs: 2000 };
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

async function handleListTones() {
  try {
    const res = await apiFetch(CONFIG.ENDPOINTS.tones, { method: 'GET' });
    const data = await res.json();
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
  }
});

self.addEventListener('activate', () => {
  // No-op; SW is event-driven
});
