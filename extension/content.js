/**
 * VibeReply — Universal Content Script
 * Runs on http://* and https://*
 */

(() => {
  'use strict';

  if (window.__vibeReplyMounted) return;
  window.__vibeReplyMounted = true;

  const CONFIG = Object.freeze({
    MAX_CONTEXT_MESSAGES: 30,
    MUTATION_DEBOUNCE_MS: 150,
    REPOSITION_DEBOUNCE_MS: 50,
    LOG_PREFIX: '[VibeReply]',
    DEBUG: false,
  });

  const MSG = Object.freeze({
    GENERATE: 'GENERATE_SUGGESTIONS',
    TRANSLATE: 'TRANSLATE_TEXT',
    FEEDBACK: 'SUGGESTION_FEEDBACK',
    GET_PREFS: 'GET_PREFERENCES',
    LIST_TONES: 'LIST_TONES',
    OPEN_CHECKOUT: 'OPEN_CHECKOUT',
  });

  const log = {
    debug: (...a) => CONFIG.DEBUG && console.debug(CONFIG.LOG_PREFIX, ...a),
    info: (...a) => console.info(CONFIG.LOG_PREFIX, ...a),
    warn: (...a) => console.warn(CONFIG.LOG_PREFIX, ...a),
    error: (...a) => console.error(CONFIG.LOG_PREFIX, ...a),
  };

  // ---------------------------------------------------------------------------
  // Helpers & Utils
  // ---------------------------------------------------------------------------
  function debounce(fn, ms) {
    let timer = null;
    const wrapped = (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn(...args);
      }, ms);
    };
    wrapped.cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    return wrapped;
  }

  function safe(fn, fallback = null) {
    try { return fn(); } catch (e) { return fallback; }
  }

  function querySelectorWithFallback(root, selectorList) {
    const list = Array.isArray(selectorList) ? selectorList : [selectorList];
    for (const sel of list) {
      const el = safe(() => root.querySelector(sel));
      if (el) return el;
    }
    return null;
  }

  const PII_PATTERNS = [
    { re: /\+?\d[\d\s\-().]{8,}\d/g, tag: '[phone]' },
    { re: /[\w.+-]+@[\w-]+\.[\w.-]+/g, tag: '[email]' },
    { re: /\b\d{4,8}\b(?=\s*(otp|code|verification))/gi, tag: '[otp]' },
    { re: /\b(?:\d[ -]?){13,16}\b/g, tag: '[card]' },
  ];
  const scrubPII = (text) =>
    PII_PATTERNS.reduce((acc, { re, tag }) => acc.replace(re, tag), text);

  // ---------------------------------------------------------------------------
  // React/Vue-Safe DOM Insertion
  // ---------------------------------------------------------------------------
  function defaultInsertText(box, text, { replace = false } = {}) {
    if (!box) return false;
    box.focus();

    const isInputOrTextarea = box.tagName === 'INPUT' || box.tagName === 'TEXTAREA';

    if (isInputOrTextarea) {
      if (replace) {
        box.value = '';
      }
      try {
        if (replace) {
          box.select();
        }
        const ok = document.execCommand('insertText', false, text);
        if (ok) return true;
      } catch (e) {
        // execCommand fallback
      }
      
      const start = box.selectionStart || 0;
      const end = box.selectionEnd || 0;
      const val = box.value;
      if (replace) {
        box.value = text;
      } else {
        box.value = val.substring(0, start) + text + val.substring(end);
      }
      
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } else {
      const sel = window.getSelection();
      if (!sel) return false;
      
      if (replace) {
        box.innerHTML = '';
      }
      
      try {
        if (replace) {
          const range = document.createRange();
          range.selectNodeContents(box);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        const ok = document.execCommand('insertText', false, text);
        if (ok) return true;
      } catch (e) {
        // execCommand fallback
      }

      if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        box.innerText = text;
      }
      box.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
  }

  // ---------------------------------------------------------------------------
  // Platform Adapters
  // ---------------------------------------------------------------------------
  function createWhatsAppAdapter() {
    const SELECTORS = Object.freeze({
      main: '#main',
      headerTitle: ['#main header span[title]', '#main header span[dir="auto"]'],
      messagesPane: ['#main div[role="application"]', '#main div.copyable-area', '#main [data-tab="8"]'],
      messageRow: 'div[role="row"]',
      incoming: '.message-in',
      outgoing: '.message-out',
      copyable: '.copyable-text',
      selectableText: 'span.selectable-text',
      quoted: '[data-testid="quoted-message"], .quoted-mention',
      composeBox: 'footer div[contenteditable="true"][role="textbox"]',
    });

    return {
      id: 'whatsapp',
      getComposeBox(el) {
        return document.querySelector(SELECTORS.composeBox);
      },
      insertIntoCompose(box, text, { replace }) {
        return defaultInsertText(box, text, { replace });
      },
      getConversationContext(box) {
        const main = document.querySelector(SELECTORS.main);
        if (!main) return [];
        const pane = querySelectorWithFallback(main, SELECTORS.messagesPane);
        if (!pane) return [];
        const rows = pane.querySelectorAll(SELECTORS.messageRow);
        const out = [];
        const limit = CONFIG.MAX_CONTEXT_MESSAGES;

        for (let i = rows.length - 1; i >= 0 && out.length < limit; i--) {
          const row = rows[i];
          const isIncoming = row.matches?.(SELECTORS.incoming) || row.querySelector(SELECTORS.incoming);
          const isOutgoing = row.matches?.(SELECTORS.outgoing) || row.querySelector(SELECTORS.outgoing);
          const type = isIncoming ? 'incoming' : (isOutgoing ? 'outgoing' : null);
          if (!type) continue;

          const copyable = row.querySelector(SELECTORS.copyable);
          const scope = copyable || row;
          const spans = scope.querySelectorAll(SELECTORS.selectableText);
          const textParts = [];
          for (const span of spans) {
            if (span.closest(SELECTORS.quoted)) continue;
            const t = (span.innerText || span.textContent || '').trim();
            if (t) textParts.push(t);
          }
          const text = textParts.join('\n').trim();
          if (!text) continue;

          const pre = copyable?.getAttribute('data-pre-plain-text');
          let sender = type === 'outgoing' ? 'You' : 'Partner';
          if (pre) {
            const match = pre.match(/^\[([^\]]+)\]\s+(.+?):\s*$/);
            if (match) sender = match[2].trim();
          }

          out.push({
            id: `wa:${i}:${sender}`,
            sender,
            text,
            type,
            timestamp: Date.now()
          });
        }
        return out.reverse();
      }
    };
  }

  function createLinkedInAdapter() {
    const SELECTORS = Object.freeze({
      main: ['.msg-conversation-container', '.scaffold-layout__main', 'main'],
      messagesPane: ['.msg-s-message-list-container', '.msg-s-message-list', '[data-testid="message-list"]'],
      messageRow: 'li.msg-s-message-list__event, div.msg-s-event-listitem',
      messageGroup: '.msg-s-message-group',
      outgoingGroupModifier: 'msg-s-message-group--self',
      senderName: '.msg-s-message-group__name, .msg-s-message-group__profile-link',
      body: '.msg-s-event-listitem__body',
      composeBox: 'div.msg-form__contenteditable[contenteditable="true"]',
    });

    return {
      id: 'linkedin',
      getComposeBox(el) {
        return querySelectorWithFallback(document, SELECTORS.composeBox);
      },
      insertIntoCompose(box, text, { replace }) {
        return defaultInsertText(box, text, { replace });
      },
      getConversationContext(box) {
        const main = querySelectorWithFallback(document, SELECTORS.main);
        if (!main) return [];
        const pane = querySelectorWithFallback(main, SELECTORS.messagesPane);
        if (!pane) return [];
        const rows = pane.querySelectorAll(SELECTORS.messageRow);
        const out = [];
        const limit = CONFIG.MAX_CONTEXT_MESSAGES;

        for (let i = rows.length - 1; i >= 0 && out.length < limit; i--) {
          const row = rows[i];
          const group = row.closest(SELECTORS.messageGroup);
          if (!group) continue;
          const type = group.classList.contains(SELECTORS.outgoingGroupModifier) ? 'outgoing' : 'incoming';
          const body = row.querySelector(SELECTORS.body) || row;
          const text = (body.innerText || body.textContent || '').trim();
          if (!text) continue;

          const nameEl = querySelectorWithFallback(group, SELECTORS.senderName);
          const sender = type === 'outgoing' ? 'You' : (nameEl ? (nameEl.textContent || '').trim() : 'Partner');

          out.push({
            id: `li:${i}:${sender}`,
            sender,
            text,
            type,
            timestamp: Date.now()
          });
        }
        return out.reverse();
      }
    };
  }

  function createGmailAdapter() {
    return {
      id: 'gmail',
      getComposeBox(el) {
        return el.closest('div[role="textbox"][contenteditable="true"]') || el;
      },
      insertIntoCompose(box, text, { replace }) {
        return defaultInsertText(box, text, { replace });
      },
      getConversationContext(box) {
        const emails = document.querySelectorAll('.adn, [role="listitem"]');
        const messages = [];
        const list = Array.from(emails).slice(-5);
        list.forEach((email, idx) => {
          const bodyEl = email.querySelector('.ii.gt, .a3s');
          const senderEl = email.querySelector('.gD');
          if (bodyEl) {
            const sender = senderEl ? (senderEl.getAttribute('name') || senderEl.textContent || '').trim() : (idx % 2 === 0 ? 'Partner' : 'You');
            const text = (bodyEl.innerText || bodyEl.textContent || '').trim();
            const type = senderEl && senderEl.getAttribute('email') === box.closest('form')?.querySelector('input[name="from"]')?.value ? 'outgoing' : 'incoming';
            if (text) {
              messages.push({
                id: `gmail:${idx}`,
                sender,
                text,
                type,
                timestamp: Date.now() - (list.length - idx) * 60000
              });
            }
          }
        });
        return messages;
      }
    };
  }

  function createSlackAdapter() {
    return {
      id: 'slack',
      getComposeBox(el) {
        return el.closest('.ql-editor[contenteditable="true"]') || el.closest('div[role="textbox"]') || el;
      },
      insertIntoCompose(box, text, { replace }) {
        return defaultInsertText(box, text, { replace });
      },
      getConversationContext(box) {
        const msgs = document.querySelectorAll('.c-message_kit__message, [data-qa="message_container"]');
        const messages = [];
        const list = Array.from(msgs).slice(-10);
        list.forEach((msg, idx) => {
          const senderEl = msg.querySelector('.c-message__sender_link, [data-qa="message_sender"]');
          const bodyEl = msg.querySelector('.c-message_kit__blocks, .p-rich_text_block');
          if (bodyEl) {
            const sender = senderEl ? (senderEl.textContent || '').trim() : 'User';
            const text = (bodyEl.innerText || bodyEl.textContent || '').trim();
            const type = msg.querySelector('.c-message--sender-self') ? 'outgoing' : 'incoming';
            if (text) {
              messages.push({
                id: `slack:${idx}`,
                sender,
                text,
                type,
                timestamp: Date.now() - (list.length - idx) * 10000
              });
            }
          }
        });
        return messages;
      }
    };
  }

  function createTeamsAdapter() {
    return {
      id: 'teams',
      getComposeBox(el) {
        return el.closest('div[contenteditable="true"]') || el;
      },
      insertIntoCompose(box, text, { replace }) {
        return defaultInsertText(box, text, { replace });
      },
      getConversationContext(box) {
        const msgs = document.querySelectorAll('[data-tid="chat-pane-message"]');
        const messages = [];
        const list = Array.from(msgs).slice(-10);
        list.forEach((msg, idx) => {
          const senderEl = msg.querySelector('[data-tid="message-author-name"]');
          const bodyEl = msg.querySelector('[data-tid="message-body"]');
          if (bodyEl) {
            const sender = senderEl ? (senderEl.textContent || '').trim() : 'User';
            const text = (bodyEl.innerText || bodyEl.textContent || '').trim();
            const type = msg.classList.contains('me') || msg.querySelector('.me') ? 'outgoing' : 'incoming';
            if (text) {
              messages.push({
                id: `teams:${idx}`,
                sender,
                text,
                type,
                timestamp: Date.now() - (list.length - idx) * 10000
              });
            }
          }
        });
        return messages;
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Generic on-screen message reading (no site-specific selectors)
  //
  // For the five named platforms above, getConversationContext knows the
  // real DOM structure. For every other website there's no such knowledge,
  // so this is a best-effort heuristic: find a chat-shaped region near the
  // compose box, pull short text blocks out of it in on-screen order, and
  // guess incoming/outgoing from left/right alignment (the near-universal
  // convention for "my messages vs their messages" in chat UIs). It won't
  // be perfect on every layout, but it means the extension reads *something*
  // reasonable instead of nothing on sites it has never seen before.
  // ---------------------------------------------------------------------------
  const GENERIC_SCAN = Object.freeze({
    MAX_NODES_SCANNED: 1500,
    MIN_TEXT_LEN: 2,
    MAX_TEXT_LEN: 400,
    SKIP_TAGS: new Set(['script', 'style', 'svg', 'button', 'input', 'textarea', 'select', 'nav', 'header', 'footer', 'option', 'label']),
  });

  function isElementVisible(el) {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    return true;
  }

  // A candidate "message" element: has its own short-ish text, isn't a
  // structural/interactive element, and has no child that itself carries
  // meaningful text (so we pick the innermost text-bearing block rather than
  // also counting its ancestor wrapper as a second "message").
  function isLeafMessageCandidate(el) {
    const tag = el.tagName.toLowerCase();
    if (GENERIC_SCAN.SKIP_TAGS.has(tag)) return false;
    if (el.isContentEditable) return false;
    if (el.closest('nav, header, footer, [role="navigation"], [contenteditable="true"]')) return false;

    const text = (el.innerText || '').trim();
    if (text.length < GENERIC_SCAN.MIN_TEXT_LEN || text.length > GENERIC_SCAN.MAX_TEXT_LEN) return false;

    for (const child of el.children) {
      if ((child.innerText || '').trim().length >= GENERIC_SCAN.MIN_TEXT_LEN) return false;
    }
    return true;
  }

  // Walk up from the compose box looking for a scrollable ancestor (the
  // classic sign of a message list) within a bounded number of hops. Falls
  // back to a moderately-sized wrapping section so a miss doesn't fall all
  // the way back to `document.body` (too broad: picks up nav/footer noise
  // and is expensive to scan on a large page).
  function findChatLikeContainer(fromEl) {
    let node = fromEl;
    let fallback = null;
    for (let hops = 0; hops < 10 && node && node !== document.body; hops++) {
      node = node.parentElement;
      if (!node) break;
      const style = getComputedStyle(node);
      const scrollable = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 20;
      if (scrollable) return node;
      const rect = node.getBoundingClientRect();
      if (!fallback && rect.height >= 150 && rect.height <= window.innerHeight * 0.95) {
        fallback = node;
      }
    }
    return fallback || fromEl.closest('body') || document.body;
  }

  function scanForGenericMessages(container, composeBox) {
    const candidates = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    let scanned = 0;
    while (node && scanned < GENERIC_SCAN.MAX_NODES_SCANNED) {
      scanned++;
      if (
        node !== composeBox &&
        (!composeBox || !node.contains(composeBox)) &&
        isElementVisible(node) &&
        isLeafMessageCandidate(node)
      ) {
        candidates.push(node);
      }
      node = walker.nextNode();
    }

    // Merge adjacent siblings sitting on ~the same line (e.g. a name span +
    // a text span inside one message row) into a single message instead of
    // reporting them as two.
    const containerRect = container.getBoundingClientRect();
    const merged = [];
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      const prev = merged[merged.length - 1];
      if (
        prev &&
        el.parentElement === prev.lastEl.parentElement &&
        Math.abs(rect.top - prev.rect.top) < 4
      ) {
        prev.text += ' ' + (el.innerText || '').trim();
        prev.lastEl = el;
        prev.rect = rect;
      } else {
        merged.push({ text: (el.innerText || '').trim(), rect, lastEl: el, centerX: rect.left + rect.width / 2 });
      }
    }

    const limit = CONFIG.MAX_CONTEXT_MESSAGES;
    return merged.slice(-limit).map((m, i) => ({
      id: `generic:${i}:${m.rect.top}`,
      sender: m.centerX > containerRect.left + containerRect.width / 2 ? 'You' : 'Partner',
      text: m.text,
      type: m.centerX > containerRect.left + containerRect.width / 2 ? 'outgoing' : 'incoming',
      timestamp: Date.now(),
    }));
  }

  function createUniversalAdapter() {
    return {
      id: 'universal',
      getComposeBox(el) {
        return el;
      },
      insertIntoCompose(box, text, { replace }) {
        return defaultInsertText(box, text, { replace });
      },
      getConversationContext(box) {
        // Explicit selection is the strongest signal — if the user
        // highlighted text themselves, trust that over the heuristic scan.
        const selection = window.getSelection().toString().trim();
        if (selection) {
          return [
            {
              id: 'universal-selection',
              sender: 'Partner',
              text: selection,
              type: 'incoming',
              timestamp: Date.now()
            }
          ];
        }

        if (box) {
          const container = findChatLikeContainer(box);
          const found = safe(() => scanForGenericMessages(container, box), []);
          if (found && found.length) return found;
        }
        return [];
      }
    };
  }

  const PLATFORM_ADAPTERS = {
    'web.whatsapp.com': createWhatsAppAdapter,
    'www.linkedin.com': createLinkedInAdapter,
    'mail.google.com': createGmailAdapter,
    'app.slack.com': createSlackAdapter,
    'teams.microsoft.com': createTeamsAdapter,
    'teams.live.com': createTeamsAdapter,
  };

  function getAdapterForHost() {
    const host = location.hostname;
    for (const key of Object.keys(PLATFORM_ADAPTERS)) {
      if (host === key || host.endsWith('.' + key)) {
        return PLATFORM_ADAPTERS[key]();
      }
    }
    return createUniversalAdapter();
  }

  function isEditableElement(el) {
    if (!el) return false;
    const tagName = el.tagName?.toLowerCase();
    if (tagName === 'textarea') return true;
    if (tagName === 'input') {
      const type = el.getAttribute('type')?.toLowerCase() || 'text';
      const editableTypes = ['text', 'email', 'search', 'url', 'tel', 'password'];
      return editableTypes.includes(type);
    }
    if (el.isContentEditable) return true;
    if (el.getAttribute('role') === 'textbox') return true;
    if (el.getAttribute('contenteditable') !== null && el.getAttribute('contenteditable') !== 'false') return true;
    return false;
  }

  // ---------------------------------------------------------------------------
  // Runtime Bridge
  // ---------------------------------------------------------------------------
  function send(type, payload) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type, payload }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response || { ok: false, error: 'no_response' });
        });
      } catch (err) {
        resolve({ ok: false, error: err?.message || 'send_failed' });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Shadow UI Controller & View
  // ---------------------------------------------------------------------------
  class Controller {
    constructor() {
      this.host = null;
      this.shadow = null;
      
      this.activeEditor = null;
      this.activeAdapter = null;
      this.resizeObserver = null;
      this.preferences = null;
      this.tones = [];

      this.floatingIcon = null;
      this.panel = null;

      // "New message" ambient nudge (see _startMessageWatch): tracks the
      // most recent incoming message we've shown the user so a freshly
      // arrived one can gently glow the icon without generating anything
      // or touching the compose box — purely a passive notice.
      this.messageWatchObserver = null;
      this.messageWatchDebounced = null;
      this.lastIncomingFingerprint = null;

      this.state = {
        iconState: 'idle', // 'idle' | 'loading' | 'suggest' | 'error' | 'new'
        panelVisible: false,
        activeTab: 'rewrite', // 'reply' | 'rewrite' | 'translate'
        loading: false,
        statusMessage: null,
        error: null,
        replies: null,
        detectedPartnerTone: null,
        partnerToneOverride: null,
        detectedLanguage: null, // { language, languageCode, confidence } for the partner's latest message
        incomingMeaning: null, // that latest incoming message translated into userLanguage

        languages: [],
        userLanguage: 'en',
        partnerLanguage: null,
        partnerLanguageOverride: null,
        sameLanguage: false,
        translatedText: null, // for translate tab

        sourceLanguage: '',
        targetLanguage: 'es',
        textToTranslate: ''
      };

      this.reposition = debounce(() => this._repositionUI(), CONFIG.REPOSITION_DEBOUNCE_MS);
    }

    async init() {
      this._createShadowRoot();
      this._setupListeners();

      const [prefsRes, tonesRes] = await Promise.all([
        send('GET_PREFERENCES'),
        send('LIST_TONES'),
      ]);
      this.preferences = prefsRes.ok ? prefsRes.data : null;
      this.tones = tonesRes.ok && tonesRes.data?.success
        ? tonesRes.data.tones.filter((t) => t.isActive)
        : [];
      
      this.state.userLanguage = this.preferences?.myLanguage || 'en';
      this.state.languages = (window.VRLanguages && window.VRLanguages.LANGUAGES) || [];
      
      this._renderPanel();
    }

    _createShadowRoot() {
      this.host = document.createElement('div');
      this.host.id = 'vibereply-host';
      this.host.style.cssText = 'all: initial; position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647;';
      document.documentElement.appendChild(this.host);

      this.shadow = this.host.attachShadow({ mode: 'closed' });

      // Load Stylesheet inside Shadow DOM
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('styles.css');
      this.shadow.appendChild(link);

      const style = document.createElement('style');
      style.textContent = SHADOW_CSS;
      this.shadow.appendChild(style);

      const themeContainer = document.createElement('div');
      themeContainer.className = 'vr-theme-container';
      this.shadow.appendChild(themeContainer);
      this.themeContainer = themeContainer;

      // Floating Icon
      this.floatingIcon = document.createElement('div');
      this.floatingIcon.id = 'vr-floating-icon';
      this.floatingIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path class="vr-logo-v" d="M4 6l8 12 8-12"/>
        </svg>
        <div class="vr-spinner"></div>
        <div class="vr-badge vr-badge-suggest"></div>
        <div class="vr-badge vr-badge-error"></div>
        <div class="vr-badge vr-badge-new"></div>
      `;
      this.floatingIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePanel();
      });
      themeContainer.appendChild(this.floatingIcon);

      // Panel
      this.panel = document.createElement('div');
      this.panel.id = 'vr-assistant-panel';
      themeContainer.appendChild(this.panel);
    }

    _setupListeners() {
      // Focus listeners
      document.addEventListener('focusin', (e) => this._handleFocus(e.target), { capture: true });
      document.addEventListener('focusout', (e) => this._handleBlur(e), { capture: true });

      // Position update events
      window.addEventListener('scroll', () => this.reposition(), { passive: true, capture: true });
      window.addEventListener('resize', () => this.reposition(), { passive: true });
      document.addEventListener('input', (e) => {
        if (e.target === this.activeEditor) {
          this.reposition();
        }
      }, { capture: true });

    }

    _handleFocus(el) {
      if (!isEditableElement(el)) return;
      if (el.getRootNode() === this.shadow) return;

      this.activeEditor = el;
      this.activeAdapter = getAdapterForHost();

      // Monitor size changes on editor
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      this.resizeObserver = new ResizeObserver(() => this.reposition());
      this.resizeObserver.observe(el);

      this.state.iconState = 'idle';
      this._updateFloatingIcon();
      this.reposition();
      this._startMessageWatch();
    }

    _handleBlur(e) {
      setTimeout(() => {
        const nextFocused = document.activeElement;
        const root = nextFocused?.getRootNode();

        // If focus shifted inside our Shadow DOM, do not close or hide
        if (nextFocused === this.host || root === this.shadow) {
          return;
        }

        if (this.activeEditor && !isEditableElement(nextFocused)) {
          // If we click completely outside, hide floating icon and panel
          this.activeEditor = null;
          this.state.panelVisible = false;
          if (this.floatingIcon) this.floatingIcon.style.display = 'none';
          if (this.panel) this.panel.style.display = 'none';
          if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
          }
          this._stopMessageWatch();
        }
      }, 150);
    }

    // ---------------------------------------------------------------------
    // "New message" glow — a purely passive, opt-in-by-focus nudge. No
    // network call, no auto-generation: just notices that the visible
    // conversation grew an incoming message since we last looked, and asks
    // the floating icon to glow so the user knows to check back in.
    // ---------------------------------------------------------------------
    _startMessageWatch() {
      this._stopMessageWatch();
      if (!this.activeAdapter || typeof this.activeAdapter.getConversationContext !== 'function') return;

      // Seed the baseline from what's already visible so mount doesn't
      // itself look like "a new message just arrived".
      this.lastIncomingFingerprint = this._latestIncomingFingerprint();

      this.messageWatchDebounced = debounce(() => this._checkForNewIncoming(), 700);
      this.messageWatchObserver = new MutationObserver(() => this.messageWatchDebounced());
      this.messageWatchObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    _stopMessageWatch() {
      if (this.messageWatchObserver) {
        this.messageWatchObserver.disconnect();
        this.messageWatchObserver = null;
      }
      if (this.messageWatchDebounced) {
        this.messageWatchDebounced.cancel();
        this.messageWatchDebounced = null;
      }
      this.lastIncomingFingerprint = null;
    }

    _latestIncomingFingerprint() {
      if (!this.activeAdapter) return null;
      const box = this.activeAdapter.getComposeBox(this.activeEditor);
      const messages = safe(() => this.activeAdapter.getConversationContext(box), []) || [];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === 'incoming') return messages[i].id || `${messages[i].sender}:${messages[i].text}`;
      }
      return null;
    }

    _checkForNewIncoming() {
      if (!this.activeAdapter || this.state.panelVisible) return; // don't interrupt an open panel
      const latest = this._latestIncomingFingerprint();
      if (latest && latest !== this.lastIncomingFingerprint) {
        this.lastIncomingFingerprint = latest;
        if (this.state.iconState === 'idle') {
          this.state.iconState = 'new';
          this._updateFloatingIcon();
        }
      }
    }

    _repositionUI() {
      if (!this.activeEditor || !this.floatingIcon) return;
      const rect = this.activeEditor.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        this.floatingIcon.style.display = 'none';
        this.panel.style.display = 'none';
        return;
      }

      this.floatingIcon.style.display = 'flex';

      // Position floating icon inside editor bottom-right
      let iconWidth = 28;
      let iconHeight = 28;
      let top = rect.bottom - iconHeight - 6;
      let left = rect.right - iconWidth - 6;

      // Handle small inputs
      if (rect.height < 36) {
        top = rect.top + (rect.height - iconHeight) / 2;
      }

      // Constrain inside viewport
      top = Math.max(2, Math.min(top, window.innerHeight - iconHeight - 2));
      left = Math.max(2, Math.min(left, window.innerWidth - iconWidth - 2));

      this.floatingIcon.style.top = `${top}px`;
      this.floatingIcon.style.left = `${left}px`;

      // Reposition panel if visible
      if (this.state.panelVisible) {
        let pWidth = 330;
        let pHeight = this.panel.getBoundingClientRect().height || 420;
        let pTop = rect.bottom + 8;
        let pLeft = rect.right - pWidth;

        // Position above if it overflows bottom
        if (pTop + pHeight > window.innerHeight) {
          pTop = rect.top - pHeight - 8;
        }
        // Boundaries checks
        if (pLeft < 8) pLeft = 8;
        if (pTop < 8) pTop = 8;
        
        pTop = Math.max(8, Math.min(pTop, window.innerHeight - pHeight - 8));
        pLeft = Math.max(8, Math.min(pLeft, window.innerWidth - pWidth - 8));

        this.panel.style.top = `${pTop}px`;
        this.panel.style.left = `${pLeft}px`;
        this.panel.style.display = 'flex';
      }
    }

    _updateFloatingIcon() {
      if (!this.floatingIcon) return;
      this.floatingIcon.setAttribute('data-state', this.state.iconState);
    }

    _togglePanel() {
      this.state.panelVisible = !this.state.panelVisible;
      if (this.state.panelVisible) {
        this.state.error = null;
        this.state.paywall = null;
        this.state.replies = null;
        this.state.translatedText = null;
        if (this.state.iconState === 'new') {
          this.state.iconState = 'idle';
          this._updateFloatingIcon();
        }
        this._renderPanel();
        this.reposition();
        setTimeout(() => this.reposition(), 50); // double check height
      } else {
        this.panel.style.display = 'none';
      }
    }

    _renderPanel() {
      if (!this.panel) return;

      this.panel.innerHTML = `
        <div class="vr-header">
          <div class="vr-header-title">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            <span>VibeReply</span>
          </div>
          <button class="vr-close-btn">&times;</button>
        </div>
        <div class="vr-tabs">
          <button class="vr-tab ${this.state.activeTab === 'reply' ? 'is-active' : ''}" data-tab="reply">Reply</button>
          <button class="vr-tab ${this.state.activeTab === 'rewrite' ? 'is-active' : ''}" data-tab="rewrite">Rewrite</button>
          <button class="vr-tab ${this.state.activeTab === 'translate' ? 'is-active' : ''}" data-tab="translate">Translate</button>
        </div>
        <div class="vr-body"></div>
      `;

      // Header click
      this.panel.querySelector('.vr-close-btn').addEventListener('click', () => {
        this._togglePanel();
      });

      // Tabs click
      const tabs = this.panel.querySelectorAll('.vr-tab');
      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const selected = tab.getAttribute('data-tab');
          if (this.state.activeTab === selected) return;
          this.state.activeTab = selected;
          this.state.error = null;
          this.state.paywall = null;
          this.state.replies = null;
          this.state.translatedText = null;
          this._renderPanel();
          this.reposition();
        });
      });

      this._renderBody();
    }

    _renderBody() {
      const body = this.panel.querySelector('.vr-body');
      if (!body) return;

      if (this.state.loading) {
        body.innerHTML = `
          <div class="vr-skeleton-list">
            <div class="vr-skeleton-card"></div>
            <div class="vr-skeleton-card"></div>
            <div class="vr-skeleton-card"></div>
          </div>
          <div class="vr-status">${this.state.statusMessage || 'Loading...'}</div>
        `;
        return;
      }

      if (this.state.paywall) {
        this._renderPaywall(body, this.state.paywall);
        return;
      }

      if (this.state.error) {
        body.innerHTML = `
          <div class="vr-error">${this.state.error}</div>
          <button class="vr-btn vr-btn-primary vr-act-btn">Retry</button>
        `;
        body.querySelector('.vr-act-btn').addEventListener('click', () => this._generate());
        return;
      }

      if (this.state.activeTab === 'translate') {
        this._renderTranslateBody(body);
        return;
      }

      // Rewrite / Reply layout
      const box = this.activeAdapter ? this.activeAdapter.getComposeBox(this.activeEditor) : this.activeEditor;
      const draft = box ? (box.value || box.innerText || box.textContent || '').trim() : '';

      if (!this.state.replies) {
        let msg = '';
        let btnText = '';
        if (this.state.activeTab === 'rewrite') {
          msg = draft ? 'Ready to rewrite your draft in different tones!' : 'Type or write a draft in the text box first.';
          btnText = 'Rewrite Draft';
        } else {
          msg = 'Generate context-aware suggestions in your tones.';
          btnText = 'Generate Suggestions';
        }
        const canAct = draft || this.state.activeTab === 'reply';
        const pillsHtml = canAct && this.tones.length
          ? `<div class="vr-quick-pills">${this.tones.map((t) => `<button class="vr-pill" data-tone="${t.key}">${t.name}</button>`).join('')}</div>`
          : '';
        body.innerHTML = `
          <div class="vr-empty">${msg}</div>
          ${pillsHtml}
          ${canAct ? `<button class="vr-btn vr-btn-primary vr-act-btn">${btnText}</button>` : ''}
        `;
        const actBtn = body.querySelector('.vr-act-btn');
        if (actBtn) {
          actBtn.addEventListener('click', () => this._generate());
        }
        body.querySelectorAll('.vr-pill').forEach((pill) => {
          pill.addEventListener('click', () => this._quickInsert(pill.dataset.tone, pill));
        });
        return;
      }

      // "What does their message mean" — shown once, above the tone cards,
      // whenever the conversation isn't already in the user's own language.
      if (this.state.activeTab === 'reply' && this.state.detectedLanguage && this.state.detectedLanguage.languageCode !== this.state.userLanguage) {
        const langName = (window.VRLanguages && window.VRLanguages.getLanguageName(this.state.detectedLanguage.languageCode)) || this.state.detectedLanguage.language;
        const meaningBlock = document.createElement('div');
        meaningBlock.className = 'vr-meaning-block';
        meaningBlock.innerHTML = `
          <div class="vr-meaning-label">Their message (${langName}) means:</div>
          <div class="vr-meaning-text">${this.state.incomingMeaning || 'Translating…'}</div>
        `;
        body.appendChild(meaningBlock);
      }

      const partnerLangCode = this.state.detectedLanguage?.languageCode;
      const partnerLangName = partnerLangCode && partnerLangCode !== this.state.userLanguage
        ? (window.VRLanguages && window.VRLanguages.getLanguageName(partnerLangCode)) || partnerLangCode
        : null;

      // Display results
      this.tones.forEach((tone) => {
        const variant = this.state.replies[tone.key];
        if (!variant || !variant.text) return;

        const card = document.createElement('div');
        card.className = 'vr-card';

        const colorMap = {
          funny: 'var(--tone-funny)',
          soft: 'var(--tone-soft)',
          flirty: 'var(--tone-flirty)',
          mature: 'var(--tone-mature)',
          casual: 'var(--tone-casual)'
        };
        const dotColor = colorMap[tone.key] || 'var(--accent)';

        card.innerHTML = `
          <div class="vr-card-tone">
            <span class="vr-card-tone-dot" style="background: ${dotColor}"></span>
            <span>${tone.name}</span>
          </div>
          ${partnerLangName ? '<div class="vr-card-sublabel">Meaning (your language)</div>' : ''}
          <div class="vr-card-text">${variant.text}</div>
          ${variant.translated ? `<div class="vr-card-sublabel">Will be sent in ${partnerLangName}</div><div class="vr-card-translated">${variant.translated}</div>` : ''}
          <div class="vr-card-actions">
            <button class="vr-btn vr-btn-ghost copy-btn">Copy</button>
            <button class="vr-btn vr-btn-primary insert-btn">${this.state.activeTab === 'rewrite' ? 'Use' : 'Insert'}</button>
          </div>
        `;

        card.querySelector('.copy-btn').addEventListener('click', () => {
          navigator.clipboard.writeText(variant.translated || variant.text);
        });

        card.querySelector('.insert-btn').addEventListener('click', () => {
          this._insertText(variant.translated || variant.text);
        });

        body.appendChild(card);
      });

      // Regenerate button at bottom
      const regenBtn = document.createElement('button');
      regenBtn.className = 'vr-btn vr-btn-secondary';
      regenBtn.textContent = 'Regenerate';
      regenBtn.style.marginTop = '8px';
      regenBtn.addEventListener('click', () => this._generate());
      body.appendChild(regenBtn);
    }

    // Free-tier daily limit hit. `info` is the `checkQuota()` result from
    // trial.js: { usedToday, limit, minutesSaved }. minutesSaved is derived
    // from this device's own recorded usage over the last 7 days, not a
    // fixed number shown to everyone regardless of actual use.
    _renderPaywall(body, info) {
      const statHtml = info.minutesSaved > 0
        ? `<div class="vr-paywall-stat">You've saved ~${info.minutesSaved} min this week with AI-assisted replies.</div>`
        : '';
      body.innerHTML = `
        <div class="vr-paywall">
          <div class="vr-paywall-title">Daily free limit reached</div>
          <div class="vr-paywall-body">You've used ${info.usedToday}/${info.limit} free AI replies today. Upgrade to PRO for unlimited replies and translations.</div>
          ${statHtml}
          <button class="vr-btn vr-btn-primary vr-paywall-upgrade">Upgrade to PRO</button>
          <button class="vr-btn vr-btn-ghost vr-paywall-dismiss">Maybe later</button>
        </div>
      `;
      body.querySelector('.vr-paywall-upgrade').addEventListener('click', () => {
        send(MSG.OPEN_CHECKOUT, {});
      });
      body.querySelector('.vr-paywall-dismiss').addEventListener('click', () => {
        this.state.paywall = null;
        this._renderPanel();
        this.reposition();
      });
    }

    _renderTranslateBody(body) {
      const box = this.activeAdapter ? this.activeAdapter.getComposeBox(this.activeEditor) : this.activeEditor;
      const draft = box ? (box.value || box.innerText || box.textContent || '').trim() : '';

      body.innerHTML = `
        <div class="vr-translate-pane">
          <div class="vr-translate-select-row">
            <span>Translate to:</span>
            <select class="vr-select target-lang-select">
              ${this.state.languages.map((l) => `<option value="${l.code}" ${l.code === this.state.targetLanguage ? 'selected' : ''}>${l.name}</option>`).join('')}
            </select>
          </div>
          <button class="vr-btn vr-btn-primary translate-btn">Translate Text</button>
          ${this.state.translatedText ? `
            <div class="vr-card" style="margin-top: 10px;">
              <div class="vr-card-text">${this.state.translatedText}</div>
              <div class="vr-card-actions">
                <button class="vr-btn vr-btn-ghost copy-btn">Copy</button>
                <button class="vr-btn vr-btn-primary insert-btn">Insert</button>
              </div>
            </div>
          ` : ''}
        </div>
      `;

      const select = body.querySelector('.target-lang-select');
      select.addEventListener('change', (e) => {
        this.state.targetLanguage = e.target.value;
      });

      const transBtn = body.querySelector('.translate-btn');
      transBtn.addEventListener('click', () => this._translate(draft));

      if (this.state.translatedText) {
        body.querySelector('.copy-btn').addEventListener('click', () => {
          navigator.clipboard.writeText(this.state.translatedText);
        });
        body.querySelector('.insert-btn').addEventListener('click', () => {
          this._insertText(this.state.translatedText);
        });
      }
    }

    // One-click path: skip the "generate all tones, review cards, then
    // insert" flow entirely — pick a tone pill, get that one tone back,
    // insert it straight into the compose box. No extra clicks, no
    // reload, focus stays wherever the page puts it after insertion.
    async _quickInsert(toneKey, pillEl) {
      if (pillEl) pillEl.setAttribute('aria-busy', 'true');
      this.state.iconState = 'loading';
      this._updateFloatingIcon();

      const box = this.activeAdapter ? this.activeAdapter.getComposeBox(this.activeEditor) : this.activeEditor;
      const draft = box ? (box.value || box.innerText || box.textContent || '').trim() : '';
      let messages = [];
      if (this.activeAdapter && typeof this.activeAdapter.getConversationContext === 'function') {
        messages = this.activeAdapter.getConversationContext(box);
      }

      if (this.state.activeTab === 'reply' && messages.length === 0) {
        if (pillEl) pillEl.setAttribute('aria-busy', 'false');
        this.state.iconState = 'error';
        this.state.error = 'No conversation context detected. Try highlighting incoming message text first.';
        this._updateFloatingIcon();
        this._renderPanel();
        return;
      }

      const payload = {
        task: this.state.activeTab,
        userLanguage: this.state.userLanguage,
        toneKeys: [toneKey],
      };
      const scrubbedMessages = messages.map((m) => ({ sender: m.sender, text: scrubPII(m.text), type: m.type }));
      if (this.state.activeTab === 'rewrite') {
        payload.draft = draft;
        payload.messages = scrubbedMessages;
      } else {
        payload.messages = scrubbedMessages;
      }

      const res = await send(MSG.GENERATE, payload);
      if (pillEl) pillEl.setAttribute('aria-busy', 'false');

      if (!res.ok && res.error === 'paywall') {
        this.state.iconState = 'error';
        this.state.paywall = res.data;
        this._updateFloatingIcon();
        this._renderPanel();
        return;
      }
      if (!res.ok) {
        this.state.iconState = 'error';
        this.state.error = res.error || 'Failed to generate a reply';
        this._updateFloatingIcon();
        this._renderPanel();
        return;
      }

      const variant = res.data?.replies?.[toneKey];
      const text = variant?.translated || variant?.text;
      if (!text) {
        this.state.iconState = 'error';
        this.state.error = 'No reply received for that tone.';
        this._updateFloatingIcon();
        this._renderPanel();
        return;
      }

      this.state.iconState = 'idle';
      this._updateFloatingIcon();
      this._insertText(text); // closes the panel on success, same as the card Insert/Use button
    }

    async _generate() {
      this.state.loading = true;
      this.state.error = null;
      this.state.paywall = null;
      this.state.replies = null;
      this.state.detectedLanguage = null;
      this.state.incomingMeaning = null;
      this.state.statusMessage = 'Reading context...';
      this.state.iconState = 'loading';
      this._updateFloatingIcon();
      this._renderPanel();

      const box = this.activeAdapter ? this.activeAdapter.getComposeBox(this.activeEditor) : this.activeEditor;
      const draft = box ? (box.value || box.innerText || box.textContent || '').trim() : '';

      // Context messages
      let messages = [];
      if (this.activeAdapter && typeof this.activeAdapter.getConversationContext === 'function') {
        messages = this.activeAdapter.getConversationContext(box);
      }

      if (this.state.activeTab === 'reply' && messages.length === 0) {
        this.state.loading = false;
        this.state.iconState = 'error';
        this.state.error = 'No conversation context detected. Try highlighting incoming message text first.';
        this._updateFloatingIcon();
        this._renderPanel();
        return;
      }

      const payload = {
        task: this.state.activeTab,
        userLanguage: this.state.userLanguage,
      };

      if (this.state.activeTab === 'reply') {
        payload.messages = messages.map(m => ({
          sender: m.sender,
          text: scrubPII(m.text),
          type: m.type
        }));
      } else {
        payload.draft = draft;
        payload.messages = messages.map(m => ({
          sender: m.sender,
          text: scrubPII(m.text),
          type: m.type
        }));
      }

      this.state.statusMessage = 'Vibing replies...';
      this._renderPanel();

      const res = await send(MSG.GENERATE, payload);
      this.state.loading = false;

      if (!res.ok && res.error === 'paywall') {
        this.state.paywall = res.data;
        this.state.iconState = 'error';
      } else if (!res.ok) {
        this.state.error = res.error || 'Failed to generate replies';
        this.state.iconState = 'error';
      } else {
        this.state.replies = res.data?.replies;
        this.state.iconState = 'suggest';

        // "What does their message mean" — translate the partner's latest
        // message into the user's own language, using the same language
        // the backend already auto-detected for this exchange. This is a
        // second, separate request (not blocking the replies above) so a
        // slow/failed translation never holds up showing the suggestions.
        const detected = res.data?.meta?.detectedLanguage;
        this.state.detectedLanguage = detected || null;
        if (detected && detected.languageCode && detected.languageCode !== this.state.userLanguage) {
          const lastIncoming = [...messages].reverse().find((m) => m.type === 'incoming');
          if (lastIncoming) {
            this._fetchIncomingMeaning(scrubPII(lastIncoming.text));
          }
        }
      }
      this._updateFloatingIcon();
      this._renderPanel();
      this.reposition();
    }

    async _fetchIncomingMeaning(text) {
      const res = await send(MSG.TRANSLATE, { text, targetLanguage: this.state.userLanguage });
      if (res.ok && res.data?.translatedText) {
        this.state.incomingMeaning = res.data.translatedText;
        this._renderPanel();
        this.reposition();
      }
    }

    async _translate(text) {
      if (!text) {
        this.state.error = 'Please enter some text to translate first.';
        this._renderPanel();
        return;
      }

      this.state.loading = true;
      this.state.error = null;
      this.state.paywall = null;
      this.state.translatedText = null;
      this.state.statusMessage = 'Translating...';
      this.state.iconState = 'loading';
      this._updateFloatingIcon();
      this._renderPanel();

      const res = await send(MSG.TRANSLATE, {
        text: text,
        targetLanguage: this.state.targetLanguage
      });
      this.state.loading = false;

      if (!res.ok && res.error === 'paywall') {
        this.state.paywall = res.data;
        this.state.iconState = 'error';
      } else if (!res.ok) {
        this.state.error = res.error || 'Failed to translate';
        this.state.iconState = 'error';
      } else {
        this.state.translatedText = res.data?.translatedText;
        this.state.iconState = 'idle';
      }
      this._updateFloatingIcon();
      this._renderPanel();
      this.reposition();
    }

    _insertText(text) {
      if (!this.activeEditor) return;
      const box = this.activeAdapter ? this.activeAdapter.getComposeBox(this.activeEditor) : this.activeEditor;
      const ok = this.activeAdapter ? this.activeAdapter.insertIntoCompose(box, text, { replace: this.state.activeTab === 'rewrite' }) : defaultInsertText(box, text, { replace: this.state.activeTab === 'rewrite' });
      if (!ok) {
        this.state.error = 'Failed to insert text into compose box.';
        this._renderPanel();
      } else {
        this._togglePanel();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Stylesheet definition
  // ---------------------------------------------------------------------------
  const SHADOW_CSS = `
    .vr-theme-container {
      all: initial;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    #vr-floating-icon {
      position: fixed;
      z-index: 2147483647;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(22, 27, 34, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05);
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, border-color 0.2s;
    }
    #vr-floating-icon:hover {
      background: rgba(30, 36, 46, 0.95);
      border-color: #8b5cf6;
      transform: scale(1.1) rotate(5deg);
    }
    #vr-floating-icon:active {
      transform: scale(0.95);
    }
    
    .vr-logo-v {
      fill: none;
      stroke: #8b5cf6;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: stroke 0.2s;
    }
    #vr-floating-icon:hover .vr-logo-v {
      stroke: #a78bfa;
    }
    
    .vr-badge {
      position: absolute;
      top: 0px;
      right: 0px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: none;
    }
    #vr-floating-icon[data-state="suggest"] .vr-badge-suggest {
      display: block;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: vr-pulse 2s infinite;
    }
    #vr-floating-icon[data-state="error"] .vr-badge-error {
      display: block;
      background: #ef4444;
      box-shadow: 0 0 8px #ef4444;
    }
    
    @keyframes vr-pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    /* "New message" nudge — a soft ambient glow around the whole icon
       rather than a corner dot, since this is meant to be noticed at a
       glance without demanding attention like an error/alert would. */
    #vr-floating-icon[data-state="new"] {
      animation: vr-glow 2.4s ease-in-out infinite;
    }
    @keyframes vr-glow {
      0%, 100% { box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 0 0 0 rgba(139, 92, 246, 0.45); }
      50% { box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 0 14px 4px rgba(139, 92, 246, 0.55); }
    }

    .vr-spinner {
      display: none;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-top-color: #8b5cf6;
      border-radius: 50%;
      animation: vr-spin 0.8s linear infinite;
    }
    #vr-floating-icon[data-state="loading"] .vr-spinner {
      display: block;
    }
    #vr-floating-icon[data-state="loading"] svg {
      display: none;
    }
    
    @keyframes vr-spin {
      to { transform: rotate(360deg); }
    }
    
    #vr-assistant-panel {
      position: fixed;
      z-index: 2147483647;
      width: 340px;
      background: rgba(13, 17, 23, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
      display: none;
      flex-direction: column;
      overflow: hidden;
      color: #e6edf3;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      animation: vr-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    
    @keyframes vr-fade-in {
      from { opacity: 0; transform: scale(0.95) translateY(12px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    
    .vr-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(22, 27, 34, 0.4);
    }
    .vr-header-title {
      font-weight: 600;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      letter-spacing: -0.01em;
    }
    .vr-close-btn {
      all: unset;
      cursor: pointer;
      font-size: 20px;
      color: #8b949e;
      padding: 0 4px;
      line-height: 1;
      border-radius: 6px;
      transition: background 0.2s, color 0.2s;
    }
    .vr-close-btn:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
    }
    
    .vr-tabs {
      display: flex;
      padding: 6px 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(22, 27, 34, 0.4);
      gap: 6px;
    }
    .vr-tab {
      all: unset;
      cursor: pointer;
      padding: 6px 12px 10px;
      font-size: 12.5px;
      color: #8b949e;
      border-bottom: 2px solid transparent;
      transition: color 0.2s, border-bottom-color 0.2s;
    }
    .vr-tab:hover {
      color: #fff;
    }
    .vr-tab.is-active {
      color: #8b5cf6;
      border-bottom-color: #8b5cf6;
      font-weight: 600;
    }
    
    .vr-body {
      padding: 14px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: transparent;
      max-height: 360px;
    }
    .vr-body::-webkit-scrollbar {
      width: 6px;
    }
    .vr-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
    }
    
    .vr-card {
      background: rgba(22, 27, 34, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.2s, background 0.2s;
    }
    .vr-card:hover {
      border-color: rgba(139, 92, 246, 0.2);
      background: rgba(30, 36, 46, 0.7);
    }
    .vr-card-tone {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .vr-card-tone-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .vr-card-text {
      font-size: 12.5px;
      line-height: 1.5;
      white-space: pre-wrap;
      color: #e6edf3;
    }
    .vr-card-translated {
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      color: #8b949e;
      border-top: 1px dashed rgba(255, 255, 255, 0.08);
      padding-top: 8px;
      margin-top: 2px;
    }
    .vr-card-sublabel {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #6e7681;
      margin-top: 2px;
    }
    .vr-meaning-block {
      background: rgba(6, 182, 212, 0.06);
      border: 1px solid rgba(6, 182, 212, 0.2);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 4px;
    }
    .vr-meaning-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #06b6d4;
      margin-bottom: 4px;
    }
    .vr-meaning-text {
      font-size: 12.5px;
      line-height: 1.5;
      color: #e6edf3;
      white-space: pre-wrap;
    }
    .vr-card-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 6px;
    }
    
    .vr-btn {
      all: unset;
      cursor: pointer;
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      transition: background 0.2s, transform 0.1s;
      text-align: center;
    }
    .vr-btn:active {
      transform: scale(0.97);
    }
    .vr-btn-primary {
      background: #8b5cf6;
      color: #fff;
      box-shadow: 0 4px 10px rgba(139, 92, 246, 0.25);
    }
    .vr-btn-primary:hover {
      background: #a78bfa;
    }
    .vr-btn-secondary {
      background: rgba(33, 38, 45, 0.7);
      color: #c9d1d9;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .vr-btn-secondary:hover {
      background: rgba(48, 54, 61, 0.9);
      border-color: rgba(255, 255, 255, 0.1);
    }
    .vr-btn-ghost {
      color: #8b949e;
    }
    .vr-btn-ghost:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
    
    .vr-error {
      color: #ef4444;
      font-size: 12px;
      text-align: center;
      padding: 10px;
      line-height: 1.4;
    }
    .vr-empty {
      color: #8b949e;
      font-size: 12px;
      text-align: center;
      padding: 16px 8px;
      line-height: 1.4;
    }

    .vr-paywall {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 4px 2px 2px;
      text-align: center;
    }
    .vr-paywall-title {
      font-size: 13px;
      font-weight: 700;
      color: #e6edf3;
    }
    .vr-paywall-body {
      font-size: 12px;
      line-height: 1.5;
      color: #8b949e;
    }
    .vr-paywall-stat {
      font-size: 11.5px;
      color: #a78bfa;
      background: rgba(139, 92, 246, 0.12);
      border-radius: 8px;
      padding: 6px 8px;
      line-height: 1.4;
    }
    .vr-paywall-upgrade {
      margin-top: 4px;
    }

    /* One-click tone pills — pick a tone, get it inserted, done. No
       intermediate "review the cards" step. */
    .vr-quick-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
      padding: 0 4px 4px;
    }
    .vr-pill {
      all: unset;
      cursor: pointer;
      padding: 5px 11px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      color: #c9d1d9;
      background: rgba(139, 92, 246, 0.12);
      border: 1px solid rgba(139, 92, 246, 0.3);
      transition: background 0.15s, border-color 0.15s, transform 0.1s;
    }
    .vr-pill:hover {
      background: rgba(139, 92, 246, 0.22);
      border-color: rgba(139, 92, 246, 0.55);
    }
    .vr-pill:active {
      transform: scale(0.96);
    }
    .vr-pill[aria-busy="true"] {
      opacity: 0.55;
      pointer-events: none;
    }

    .vr-skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .vr-skeleton-card {
      height: 60px;
      border-radius: 10px;
      background: linear-gradient(90deg, rgba(22, 27, 34, 0.6) 0%, rgba(33, 38, 45, 0.8) 50%, rgba(22, 27, 34, 0.6) 100%);
      background-size: 200% 100%;
      animation: vr-shimmer 1.5s infinite linear;
    }
    @keyframes vr-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .vr-status {
      font-size: 11px;
      color: #8b949e;
      text-align: center;
      padding: 4px;
    }
    
    .vr-translate-pane {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .vr-translate-select-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: #8b949e;
      padding: 2px 4px;
    }
    .vr-select {
      background: rgba(33, 38, 45, 0.7);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      font-size: 11.5px;
      padding: 4px 8px;
      outline: none;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .vr-select:focus {
      border-color: #8b5cf6;
    }
    
    /* Neon variables used in HSL colors */
    .vr-theme-container {
      --tone-funny: #eab308;
      --tone-soft: #3b82f6;
      --tone-flirty: #ec4899;
      --tone-mature: #a855f7;
      --tone-casual: #10b981;
    }
  `;

  // Start the controller
  const controller = new Controller();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => controller.init(), { once: true });
  } else {
    controller.init();
  }

  // ---------------------------------------------------------------------------
  // Popup / background bridge — the toolbar popup has no DOM access of its
  // own, so it asks the content script (via chrome.tabs.sendMessage) to read
  // or write the page on its behalf. The in-page panel above talks to
  // `activeEditor`/`activeAdapter` tracked from focus events; these handlers
  // re-derive the adapter and compose box independently since the popup can
  // be opened without the compose box ever having been focused.
  // ---------------------------------------------------------------------------
  function handleExternalMessage(message, sendResponse) {
    switch (message?.type) {
      case 'PREFERENCES_UPDATED': {
        controller.preferences = message.payload;
        controller.state.userLanguage = controller.preferences?.myLanguage || 'en';
        controller._renderPanel();
        return false;
      }
      case 'CLEAR_CONVERSATION_DATA':
      case 'VIBEREPLY_CLEAR_CONVERSATION': {
        Promise.resolve(window.VRStorage && window.VRStorage.clearAll())
          .then(() => sendResponse({ ok: true }))
          .catch((err) => sendResponse({ ok: false, error: err?.message || 'clear_failed' }));
        return true;
      }
      case 'VIBEREPLY_GET_MESSAGES': {
        try {
          const adapter = getAdapterForHost();
          const box = adapter.getComposeBox(document.activeElement);
          const messages = (adapter.getConversationContext(box) || []).map((m) => ({
            sender: m.sender,
            text: scrubPII(m.text),
            type: m.type,
          }));
          sendResponse({ ok: true, messages });
        } catch (err) {
          sendResponse({ ok: false, error: err?.message || 'read_failed' });
        }
        return false;
      }
      case 'VIBEREPLY_GET_DRAFT': {
        try {
          const adapter = getAdapterForHost();
          const box = adapter.getComposeBox(document.activeElement);
          const draft = box ? (box.value || box.innerText || box.textContent || '').trim() : '';
          sendResponse({ ok: true, draft });
        } catch (err) {
          sendResponse({ ok: false, error: err?.message || 'read_failed' });
        }
        return false;
      }
      case 'VIBEREPLY_INSERT_TEXT': {
        try {
          const adapter = getAdapterForHost();
          const box = adapter.getComposeBox(document.activeElement);
          const ok = box
            ? adapter.insertIntoCompose(box, message.payload?.text || '', { replace: !!message.payload?.replace })
            : false;
          sendResponse({ ok });
        } catch (err) {
          sendResponse({ ok: false, error: err?.message || 'insert_failed' });
        }
        return false;
      }
      default:
        return false;
    }
  }

  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      return handleExternalMessage(message, sendResponse);
    });
  }
})();
