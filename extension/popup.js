/**
 * VibeReply — Popup
 *
 * Flow (Reply mode):
 *   1. On open, find the active supported tab (WhatsApp / LinkedIn).
 *   2. Ask the content script for the currently visible messages.
 *   3. Forward them to the service worker for a single backend call
 *      that returns one reply per active tone.
 *   4. Render one card per tone, with Copy + Use actions.
 *
 * Flow (Rewrite mode):
 *   1. Ask the content script for the current compose-box draft.
 *   2. Forward it to the service worker with task=rewrite.
 *   3. Render one restyled version per active tone; "Use" replaces the draft.
 *
 * Settings view: list/edit/create/delete tone profiles (backed by
 * GET/POST/DELETE /api/tones on the backend, proxied through the service
 * worker so this file never talks to the network directly).
 */

(() => {
  'use strict';

  const DEFAULT_TONE_KEYS = ['funny', 'soft', 'flirty', 'mature', 'casual'];
  const PARTNER_TONES = [
    'formal', 'friendly', 'angry', 'frustrated', 'urgent',
    'casual', 'direct', 'confused', 'professional', 'neutral',
  ];

  const MSG = Object.freeze({
    GENERATE: 'GENERATE_SUGGESTIONS',
    GET_MESSAGES: 'VIBEREPLY_GET_MESSAGES',
    GET_DRAFT: 'VIBEREPLY_GET_DRAFT',
    INSERT_TEXT: 'VIBEREPLY_INSERT_TEXT',
    CLEAR_CONVERSATION: 'VIBEREPLY_CLEAR_CONVERSATION',
    LIST_TONES: 'LIST_TONES',
    SAVE_TONE: 'SAVE_TONE',
    DELETE_TONE: 'DELETE_TONE',
    GET_PREFS: 'GET_PREFERENCES',
    SET_PREFS: 'SET_PREFERENCES',
    CLEAR_ALL_CONVERSATIONS: 'CLEAR_ALL_CONVERSATIONS',
    GET_STATS: 'GET_STATS',
    PING: 'PING',
  });

  const SUPPORTED_PLATFORMS = [
    { id: 'whatsapp', label: 'WhatsApp Web', hostname: 'web.whatsapp.com', urlPattern: 'https://web.whatsapp.com/*', openUrl: 'https://web.whatsapp.com/' },
    { id: 'linkedin', label: 'LinkedIn', hostname: 'www.linkedin.com', urlPattern: 'https://www.linkedin.com/*', openUrl: 'https://www.linkedin.com/messaging/' },
  ];

  // ---------------------------------------------------------------------------
  // DOM refs
  // ---------------------------------------------------------------------------

  const $ = (id) => document.getElementById(id);
  const els = {
    statusDot:    $('status-dot'),
    statusBar:    $('status-bar'),
    statsCard:    $('stats-card'),
    statsStreakValue: $('stats-streak-value'),
    statsTimeSavedValue: $('stats-time-saved-value'),
    refreshBtn:   $('refresh-btn'),
    settingsBtn:  $('settings-btn'),
    openPlatform: $('open-platform'),
    retryBtn:     $('retry-btn'),
    errorMessage: $('error-message'),
    footerMeta:   $('footer-meta'),
    toast:        $('toast'),

    modeTabs:     $('mode-tabs'),
    tabReply:     $('tab-reply'),
    tabRewrite:   $('tab-rewrite'),
    partnerToneBar: $('partner-tone-bar'),
    partnerToneSelect: $('partner-tone-select'),

    stateEmpty:   $('state-empty'),
    stateError:   $('state-error'),
    stateLoading: $('state-loading'),
    stateReplies: $('state-replies'),

    replyList:    $('reply-list'),
    cardTemplate: $('reply-card-template'),

    main:         $('main'),
    settingsView: $('settings-view'),
    toneList:     $('tone-list'),
    toneEditTemplate: $('tone-edit-template'),
    newToneName:  $('new-tone-name'),
    newToneDesc:  $('new-tone-desc'),
    addToneBtn:   $('add-tone-btn'),
    backBtn:      $('back-btn'),

    myLanguageSelect: $('my-language-select'),
    autoDetectPartnerLanguage: $('auto-detect-partner-language'),
    showTranslationAuto: $('show-translation-auto'),
    showOriginalMessage: $('show-original-message'),
    storeConversationLocally: $('store-conversation-locally'),
    maxStoredHistorySelect: $('max-stored-history-select'),
    autoLoadOlderMessages: $('auto-load-older-messages'),
    clearConversationBtn: $('clear-conversation-btn'),
    clearAllConversationsBtn: $('clear-all-conversations-btn'),
  };

  // ---------------------------------------------------------------------------
  // App state
  // ---------------------------------------------------------------------------

  const state = {
    activeTabId: null,
    platform: null, // matched SUPPORTED_PLATFORMS entry | null
    view: 'main', // 'main' | 'settings'
    mode: 'reply', // 'reply' | 'rewrite'
    messages: [],
    draft: '',
    tones: [], // ToneProfile[]
    replies: null,
    detectedPartnerTone: null,
    partnerToneOverride: null,
    loadingAll: false,
    regenerating: new Set(),
    preferences: null, // loaded from background on init
  };

  function toneLabel(key) {
    return state.tones.find((t) => t.key === key)?.name || key;
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  function setStatus(s) {
    els.statusDot.dataset.state = s;
    els.statusDot.title = s === 'ok' ? 'Connected' : s === 'down' ? 'Disconnected' : 'Checking…';
  }

  function showStatusBar(text) {
    if (!text) {
      els.statusBar.dataset.visible = 'false';
      els.statusBar.textContent = '';
      return;
    }
    els.statusBar.textContent = text;
    els.statusBar.dataset.visible = 'true';
  }

  function showState(name) {
    for (const key of ['stateEmpty', 'stateError', 'stateLoading', 'stateReplies']) {
      els[key].dataset.visible = 'false';
    }
    const map = {
      empty:   els.stateEmpty,
      error:   els.stateError,
      loading: els.stateLoading,
      replies: els.stateReplies,
    };
    const target = map[name];
    if (target) target.dataset.visible = 'true';
  }

  let toastTimer = null;
  function toast(text, variant = 'success', ms = 1600) {
    els.toast.textContent = text;
    els.toast.dataset.variant = variant;
    els.toast.dataset.visible = 'true';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.dataset.visible = 'false';
    }, ms);
  }

  function setFooterMeta(text) {
    els.footerMeta.textContent = text || '';
  }

  // ---------------------------------------------------------------------------
  // IPC — service worker
  // ---------------------------------------------------------------------------

  function sendToBackground(type, payload) {
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
  // IPC — content script (active tab)
  // ---------------------------------------------------------------------------

  function sendToTab(tabId, message) {
    return new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
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

  async function findActiveSupportedTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const byHostname = (url) => SUPPORTED_PLATFORMS.find((p) => url?.includes(p.hostname));

    if (tab?.url) {
      const platform = byHostname(tab.url);
      if (platform) return { tab, platform };
    }
    // Fall back to any open supported tab.
    for (const platform of SUPPORTED_PLATFORMS) {
      const tabs = await chrome.tabs.query({ url: platform.urlPattern });
      if (tabs[0]) return { tab: tabs[0], platform };
    }
    return { tab: null, platform: null };
  }

  // ---------------------------------------------------------------------------
  // Rendering — replies
  // ---------------------------------------------------------------------------

  function activeTones() {
    return state.tones.filter((t) => t.isActive);
  }

  // `replies[key]` is a ReplyVariant `{ text, translated? }` (translated is
  // in the partner's language — the popup is a single-language surface, so it
  // only ever shows `text`; the full dual-language view lives in the in-page
  // panel injected by content.js).
  function replyText(replies, toneKey) {
    const variant = replies?.[toneKey];
    return (typeof variant === 'string' ? variant : variant?.text) || '';
  }

  function renderRepliesFull(replies) {
    els.replyList.replaceChildren();
    const tones = activeTones();
    const list = tones.length ? tones : DEFAULT_TONE_KEYS.map((key) => ({ key, name: key }));
    for (const tone of list) {
      els.replyList.appendChild(buildCard(tone.key, replyText(replies, tone.key)));
    }
    showState('replies');
  }

  function updateCard(toneKey, text) {
    const card = els.replyList.querySelector(`.reply-card[data-tone='${toneKey}']`);
    if (!card) return;
    const p = card.querySelector('.reply-text');
    if (p) p.textContent = text;
  }

  function buildCard(toneKey, text) {
    const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.tone = toneKey;
    node.querySelector('.tone-name').textContent = toneLabel(toneKey);
    node.querySelector('.reply-text').textContent = text;

    const copyBtn = node.querySelector('.copy-btn');
    const regenBtn = node.querySelector('.regenerate-btn');
    const useBtn = node.querySelector('.use-btn');
    useBtn.textContent = state.mode === 'rewrite' ? 'Use' : 'Insert';

    copyBtn.addEventListener('click', () => handleCopy(toneKey, copyBtn));
    regenBtn.addEventListener('click', () => handleRegenerate(toneKey));
    useBtn.addEventListener('click', () => handleUse(toneKey));

    return node;
  }

  function setCardState(toneKey, cardState) {
    const card = els.replyList.querySelector(`.reply-card[data-tone='${toneKey}']`);
    if (!card) return;
    card.dataset.state = cardState;
    const regen = card.querySelector('.regenerate-btn');
    if (regen) regen.setAttribute('aria-busy', cardState === 'regenerating' ? 'true' : 'false');
  }

  function renderPartnerToneBar() {
    if (state.mode !== 'reply') {
      els.partnerToneBar.dataset.visible = 'false';
      return;
    }
    els.partnerToneBar.dataset.visible = 'true';
    els.partnerToneSelect.value = state.partnerToneOverride || '';
  }

  // ---------------------------------------------------------------------------
  // Rendering — settings (tone profiles)
  // ---------------------------------------------------------------------------

  function renderToneSettings() {
    els.toneList.replaceChildren();
    for (const tone of state.tones) {
      els.toneList.appendChild(buildToneEditRow(tone));
    }
  }

  function buildToneEditRow(tone) {
    const node = els.toneEditTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.key = tone.key;

    const nameInput = node.querySelector('.tone-name-input');
    const descInput = node.querySelector('.tone-desc-input');
    const activeInput = node.querySelector('.tone-active-input');
    const saveBtn = node.querySelector('.tone-save-btn');
    const deleteBtn = node.querySelector('.tone-delete-btn');
    const customBadge = node.querySelector('.tone-custom-badge');

    nameInput.value = tone.name;
    descInput.value = tone.description;
    activeInput.checked = tone.isActive;
    customBadge.style.display = tone.isCustom ? '' : 'none';
    deleteBtn.textContent = tone.isCustom ? 'Delete' : 'Reset';

    saveBtn.addEventListener('click', () => handleSaveTone(tone.key, {
      name: nameInput.value.trim(),
      description: descInput.value.trim(),
      isActive: activeInput.checked,
    }));
    activeInput.addEventListener('change', () => handleSaveTone(tone.key, {
      name: nameInput.value.trim(),
      description: descInput.value.trim(),
      isActive: activeInput.checked,
    }));
    deleteBtn.addEventListener('click', () => handleDeleteTone(tone.key));

    return node;
  }

  // ---------------------------------------------------------------------------
  // Handlers — replies
  // ---------------------------------------------------------------------------

  async function handleCopy(toneKey, btn) {
    const card = els.replyList.querySelector(`.reply-card[data-tone='${toneKey}']`);
    const text = card?.querySelector('.reply-text')?.textContent || '';
    if (!text.trim()) {
      toast('Nothing to copy', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      btn.dataset.copied = 'true';
      toast(`${toneLabel(toneKey)} reply copied`, 'success');
      setTimeout(() => { btn.dataset.copied = 'false'; }, 900);
    } catch {
      toast('Copy failed', 'error');
    }
  }

  async function handleUse(toneKey) {
    const card = els.replyList.querySelector(`.reply-card[data-tone='${toneKey}']`);
    const text = card?.querySelector('.reply-text')?.textContent || '';
    if (!text.trim() || !state.activeTabId) return;

    const res = await sendToTab(state.activeTabId, {
      type: MSG.INSERT_TEXT,
      payload: { text, replace: state.mode === 'rewrite' },
    });
    if (res.ok) {
      toast(`${toneLabel(toneKey)} inserted`, 'success');
      window.close();
    } else {
      toast('Could not insert — compose box not found', 'error');
    }
  }

  async function handleRegenerate(toneKey) {
    if (state.regenerating.has(toneKey)) return;
    if (state.mode === 'reply' && !state.messages.length) return;
    if (state.mode === 'rewrite' && !state.draft) return;

    state.regenerating.add(toneKey);
    setCardState(toneKey, 'regenerating');

    const payload = {
      task: state.mode,
      messages: state.messages,
      toneKeys: [toneKey],
      partnerTone: state.partnerToneOverride || undefined,
      userLanguage: state.preferences?.myLanguage || 'en',
    };
    if (state.mode === 'rewrite') payload.draft = state.draft;

    const res = await sendToBackground(MSG.GENERATE, payload);

    state.regenerating.delete(toneKey);
    setCardState(toneKey, 'idle');

    if (!res.ok) {
      toast(friendlyError(res.error), 'error');
      return;
    }

    const next = replyText(res.data?.replies, toneKey);
    if (next.trim()) {
      state.replies = { ...(state.replies || {}), [toneKey]: res.data.replies[toneKey] };
      updateCard(toneKey, next);
      toast(`${toneLabel(toneKey)} regenerated`, 'success');
    } else {
      toast('No new reply received', 'error');
    }
  }

  async function handleRefresh() {
    els.refreshBtn.setAttribute('aria-busy', 'true');
    try {
      await loadAndGenerate();
    } finally {
      els.refreshBtn.setAttribute('aria-busy', 'false');
    }
  }

  async function handleRetry() {
    await loadAndGenerate();
  }

  async function handleOpenPlatform() {
    const platform = state.platform || SUPPORTED_PLATFORMS[0];
    const tabs = await chrome.tabs.query({ url: platform.urlPattern });
    if (tabs[0]?.id) {
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: platform.openUrl });
    }
    window.close();
  }

  async function handleModeChange(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    els.tabReply.classList.toggle('is-active', mode === 'reply');
    els.tabRewrite.classList.toggle('is-active', mode === 'rewrite');
    state.replies = null;
    renderPartnerToneBar();
    await loadAndGenerate();
  }

  async function handlePartnerToneChange() {
    state.partnerToneOverride = els.partnerToneSelect.value || null;
    await loadAndGenerate();
  }

  // ---------------------------------------------------------------------------
  // Handlers — settings
  // ---------------------------------------------------------------------------

  async function refreshTones() {
    const res = await sendToBackground(MSG.LIST_TONES);
    if (res.ok && res.data?.success) {
      state.tones = res.data.tones;
    }
  }

  async function handleSaveTone(key, patch) {
    const res = await sendToBackground(MSG.SAVE_TONE, { key, ...patch });
    if (!res.ok) {
      toast('Could not save tone', 'error');
      return;
    }
    await refreshTones();
    renderToneSettings();
    toast('Tone saved', 'success');
  }

  async function handleDeleteTone(key) {
    const res = await sendToBackground(MSG.DELETE_TONE, { key });
    if (!res.ok) {
      toast('Could not update tone', 'error');
      return;
    }
    await refreshTones();
    renderToneSettings();
    toast('Tone reset', 'success');
  }

  async function handleAddTone() {
    const name = els.newToneName.value.trim();
    const description = els.newToneDesc.value.trim();
    if (!name || !description) {
      toast('Name and description are required', 'error');
      return;
    }
    const res = await sendToBackground(MSG.SAVE_TONE, { name, description });
    if (!res.ok) {
      toast('Could not create tone', 'error');
      return;
    }
    els.newToneName.value = '';
    els.newToneDesc.value = '';
    await refreshTones();
    renderToneSettings();
    toast('Custom tone created', 'success');
  }

  // ---------------------------------------------------------------------------
  // Handlers — language / history / privacy settings
  // ---------------------------------------------------------------------------

  function populateLanguageSelect() {
    const languages = (window.VRLanguages && window.VRLanguages.LANGUAGES) || [{ code: 'en', name: 'English' }];
    els.myLanguageSelect.replaceChildren();
    for (const lang of languages) {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = lang.name;
      els.myLanguageSelect.appendChild(opt);
    }
  }

  function renderSettingsControls() {
    const p = state.preferences;
    if (!p) return;
    els.myLanguageSelect.value = p.myLanguage;
    els.autoDetectPartnerLanguage.checked = p.autoDetectPartnerLanguage;
    els.showTranslationAuto.checked = p.showTranslationAutomatically;
    els.showOriginalMessage.checked = p.showOriginalMessage;
    els.storeConversationLocally.checked = p.storeConversationLocally;
    els.maxStoredHistorySelect.value = String(p.maxStoredHistory);
    els.autoLoadOlderMessages.checked = p.autoLoadOlderMessages;
  }

  async function handleSettingChange(patch) {
    const res = await sendToBackground(MSG.SET_PREFS, patch);
    if (res.ok && res.data) {
      state.preferences = res.data;
      toast('Setting saved', 'success');
    } else {
      toast('Could not save setting', 'error');
    }
  }

  async function handleClearConversation() {
    if (!state.activeTabId) {
      toast('Open a supported chat first', 'error');
      return;
    }
    const res = await sendToTab(state.activeTabId, { type: MSG.CLEAR_CONVERSATION });
    toast(res.ok ? 'Conversation history cleared' : 'Could not clear conversation', res.ok ? 'success' : 'error');
  }

  async function handleClearAllConversations() {
    const res = await sendToBackground(MSG.CLEAR_ALL_CONVERSATIONS);
    toast(res.ok ? 'All stored conversations cleared' : 'Could not clear conversations', res.ok ? 'success' : 'error');
  }

  function openSettings() {
    state.view = 'settings';
    els.main.dataset.visible = 'false';
    els.settingsView.dataset.visible = 'true';
    renderToneSettings();
    renderSettingsControls();
  }

  function closeSettings() {
    state.view = 'main';
    els.settingsView.dataset.visible = 'false';
    els.main.dataset.visible = 'true';
  }

  // ---------------------------------------------------------------------------
  // Flow
  // ---------------------------------------------------------------------------

  function friendlyError(code) {
    switch (code) {
      case 'rate_limited':   return 'Slow down — try again in a few seconds.';
      case 'auth_required':  return 'Please sign in to continue.';
      case 'network_error':  return 'Network error. Check your connection.';
      case 'no_response':    return 'Could not reach the extension service.';
      default:               return code || 'Something went wrong.';
    }
  }

  function showErrorState(message) {
    els.errorMessage.textContent = message;
    showState('error');
  }

  async function loadAndGenerate() {
    if (state.loadingAll) return;
    state.loadingAll = true;

    try {
      const { tab, platform } = await findActiveSupportedTab();
      if (!tab?.id || !platform) {
        state.platform = null;
        showState('empty');
        setFooterMeta('Open WhatsApp Web or LinkedIn to begin');
        return;
      }
      state.platform = platform;
      state.activeTabId = tab.id;

      showState('loading');
      renderPartnerToneBar();

      if (state.mode === 'reply') {
        setFooterMeta('Reading visible messages…');
        const msgRes = await sendToTab(tab.id, { type: MSG.GET_MESSAGES });
        if (!msgRes.ok || !Array.isArray(msgRes.messages)) {
          showErrorState('Could not read messages. Open a chat and try again.');
          setFooterMeta('');
          return;
        }
        const messages = msgRes.messages
          .map((m) => ({ sender: m.sender, text: m.text, type: m.type }))
          .filter((m) => m.text);
        state.messages = messages;

        if (!messages.length) {
          showErrorState('No visible messages in this chat. Scroll into a conversation and try again.');
          setFooterMeta('');
          return;
        }
      } else {
        setFooterMeta('Reading your draft…');
        const draftRes = await sendToTab(tab.id, { type: MSG.GET_DRAFT });
        const draft = draftRes.ok ? (draftRes.draft || '').trim() : '';
        state.draft = draft;
        if (!draft) {
          showErrorState('Write a draft in the compose box first.');
          setFooterMeta('');
          return;
        }
      }

      setFooterMeta('Generating…');

      const payload = {
        task: state.mode,
        messages: state.mode === 'reply' ? state.messages : [],
        partnerTone: state.partnerToneOverride || undefined,
        userLanguage: state.preferences?.myLanguage || 'en',
      };
      if (state.mode === 'rewrite') payload.draft = state.draft;

      const genRes = await sendToBackground(MSG.GENERATE, payload);
      if (!genRes.ok) {
        showErrorState(friendlyError(genRes.error));
        setFooterMeta('');
        return;
      }
      const { replies, meta } = genRes.data;
      if (!replies) {
        showErrorState('Unexpected response from server.');
        setFooterMeta('');
        return;
      }

      state.replies = replies;
      state.detectedPartnerTone = meta?.detectedPartnerTone || null;
      renderRepliesFull(replies);
      renderPartnerToneBar();
      loadStats(); // this generation just moved the streak/time-saved numbers

      setFooterMeta(
        [meta?.model, meta?.latencyMs ? `${meta.latencyMs} ms` : null].filter(Boolean).join(' • ')
      );
    } catch (err) {
      showErrorState(err?.message || 'Unexpected error');
      setFooterMeta('');
    } finally {
      state.loadingAll = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Wire-up
  // ---------------------------------------------------------------------------

  function wire() {
    els.refreshBtn.addEventListener('click', handleRefresh);
    els.openPlatform.addEventListener('click', handleOpenPlatform);
    els.retryBtn.addEventListener('click', handleRetry);
    els.settingsBtn.addEventListener('click', openSettings);
    els.backBtn.addEventListener('click', closeSettings);
    els.addToneBtn.addEventListener('click', handleAddTone);
    els.tabReply.addEventListener('click', () => handleModeChange('reply'));
    els.tabRewrite.addEventListener('click', () => handleModeChange('rewrite'));
    els.partnerToneSelect.addEventListener('change', handlePartnerToneChange);

    populateLanguageSelect();
    els.myLanguageSelect.addEventListener('change', () =>
      handleSettingChange({ myLanguage: els.myLanguageSelect.value })
    );
    els.autoDetectPartnerLanguage.addEventListener('change', () =>
      handleSettingChange({ autoDetectPartnerLanguage: els.autoDetectPartnerLanguage.checked })
    );
    els.showTranslationAuto.addEventListener('change', () =>
      handleSettingChange({ showTranslationAutomatically: els.showTranslationAuto.checked })
    );
    els.showOriginalMessage.addEventListener('change', () =>
      handleSettingChange({ showOriginalMessage: els.showOriginalMessage.checked })
    );
    els.storeConversationLocally.addEventListener('change', () =>
      handleSettingChange({ storeConversationLocally: els.storeConversationLocally.checked })
    );
    els.maxStoredHistorySelect.addEventListener('change', () => {
      const raw = els.maxStoredHistorySelect.value;
      handleSettingChange({ maxStoredHistory: raw === 'all' ? 'all' : Number(raw) });
    });
    els.autoLoadOlderMessages.addEventListener('change', () =>
      handleSettingChange({ autoLoadOlderMessages: els.autoLoadOlderMessages.checked })
    );
    els.clearConversationBtn.addEventListener('click', handleClearConversation);
    els.clearAllConversationsBtn.addEventListener('click', handleClearAllConversations);

    const optAuto = document.createElement('option');
    optAuto.value = '';
    optAuto.textContent = 'Auto-detect';
    els.partnerToneSelect.appendChild(optAuto);
    PARTNER_TONES.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t[0].toUpperCase() + t.slice(1);
      els.partnerToneSelect.appendChild(opt);
    });
  }

  function formatTimeSaved(minutes) {
    if (!minutes) return 'No time saved yet';
    if (minutes < 60) return `${minutes}m Saved This Week`;
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return `${hours}h${rem ? ` ${rem}m` : ''} Saved This Week`;
  }

  async function loadStats() {
    const res = await sendToBackground(MSG.GET_STATS);
    if (!res.ok || !res.data) return;
    const { streak, minutesSavedThisWeek } = res.data;
    els.statsStreakValue.textContent = streak > 0 ? `${streak}-Day Streak` : 'Start your streak today';
    els.statsTimeSavedValue.textContent = formatTimeSaved(minutesSavedThisWeek);
    els.statsCard.dataset.visible = 'true';
  }

  async function init() {
    setStatus('unknown');
    setFooterMeta('');
    wire();

    const ping = await sendToBackground(MSG.PING);
    setStatus(ping.ok ? 'ok' : 'down');

    const prefsRes = await sendToBackground(MSG.GET_PREFS);
    if (prefsRes.ok) state.preferences = prefsRes.data;

    await refreshTones();
    loadStats(); // fire-and-forget, doesn't block the main reply/rewrite flow
    await loadAndGenerate();
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
})();
