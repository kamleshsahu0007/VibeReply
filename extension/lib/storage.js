/**
 * VibeReply — local conversation storage (IndexedDB)
 *
 * Runs inside the content-script's isolated world. IndexedDB is per-origin,
 * so WhatsApp and LinkedIn each get their own separate database automatically
 * — no cross-platform leakage to design around.
 *
 * Messages are keyed by a composite string fingerprint —
 * `${conversationId}::${sender}::${order}::${first 120 chars of text}` —
 * rather than a hash, so a `store.put()` with the same fingerprint is a
 * natural, idempotent dedup (this also folds in `order`/position, fixing the
 * old sender+snippet-only fallback id's collision risk for short messages
 * like "ok"/"yes").
 *
 * Loaded as a plain script (no bundler), before content.js. Exposes a single
 * global, VRStorage.
 */
(function (global) {
  'use strict';

  const DB_NAME = 'vibereply';
  const DB_VERSION = 1;
  const STORE_CONVERSATIONS = 'conversations';
  const STORE_MESSAGES = 'messages';

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
          db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'conversationId' });
        }
        if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
          const store = db.createObjectStore(STORE_MESSAGES, { keyPath: 'fingerprint' });
          store.createIndex('byConversation', 'conversationId', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function requestToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function txDone(t) {
    return new Promise((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('transaction aborted'));
    });
  }

  function computeFingerprint({ conversationId, sender, order, text }) {
    const snippet = (text || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    return `${conversationId}::${sender || ''}::${order ?? ''}::${snippet}`;
  }

  async function getConversation(conversationId) {
    const db = await openDb();
    const t = db.transaction(STORE_CONVERSATIONS, 'readonly');
    return requestToPromise(t.objectStore(STORE_CONVERSATIONS).get(conversationId));
  }

  async function putConversation(record) {
    const db = await openDb();
    const t = db.transaction(STORE_CONVERSATIONS, 'readwrite');
    t.objectStore(STORE_CONVERSATIONS).put({ ...record, lastUpdated: Date.now() });
    return txDone(t);
  }

  // Idempotent upsert — messages sharing a fingerprint with an existing row
  // overwrite it (same message re-scanned), which is the dedup mechanism.
  async function putMessages(conversationId, messages) {
    if (!messages || !messages.length) return;
    const db = await openDb();
    const t = db.transaction(STORE_MESSAGES, 'readwrite');
    const store = t.objectStore(STORE_MESSAGES);
    for (const m of messages) {
      const fingerprint =
        m.fingerprint || computeFingerprint({ conversationId, sender: m.sender, order: m.order, text: m.text });
      store.put({ ...m, conversationId, fingerprint });
    }
    return txDone(t);
  }

  // Returns messages for a conversation sorted by `order` ascending. `limit`
  // keeps only the most recent N (still chronological order).
  async function getMessages(conversationId, { limit } = {}) {
    const db = await openDb();
    const t = db.transaction(STORE_MESSAGES, 'readonly');
    const index = t.objectStore(STORE_MESSAGES).index('byConversation');
    const results = [];
    return new Promise((resolve, reject) => {
      const req = index.openCursor(IDBKeyRange.only(conversationId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          results.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          resolve(limit ? results.slice(-limit) : results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteConversation(conversationId) {
    const db = await openDb();
    const t = db.transaction([STORE_CONVERSATIONS, STORE_MESSAGES], 'readwrite');
    t.objectStore(STORE_CONVERSATIONS).delete(conversationId);
    const index = t.objectStore(STORE_MESSAGES).index('byConversation');
    const req = index.openKeyCursor(IDBKeyRange.only(conversationId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        t.objectStore(STORE_MESSAGES).delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    return txDone(t);
  }

  async function clearAll() {
    const db = await openDb();
    const t = db.transaction([STORE_CONVERSATIONS, STORE_MESSAGES], 'readwrite');
    t.objectStore(STORE_CONVERSATIONS).clear();
    t.objectStore(STORE_MESSAGES).clear();
    return txDone(t);
  }

  global.VRStorage = Object.freeze({
    computeFingerprint,
    getConversation,
    putConversation,
    putMessages,
    getMessages,
    deleteConversation,
    clearAll,
  });
})(typeof window !== 'undefined' ? window : globalThis);
