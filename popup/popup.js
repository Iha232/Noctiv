/**
 * Noctiv - popup.js
 * Controls the browser-action popup UI.
 */

'use strict';

const SK = {
  THEME_MODE:     'themeMode',
  ADBLOCK_ENABLED:'adblockEnabled',
  ALLOWLIST:      'allowlist',
  PDF_DARK_MODE:  'pdfDarkMode',
  OFFICE_DARK_MODE:'officeDarkMode',
};

let currentTab    = null;
let currentDomain = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function storageGet(key) {
  return new Promise(resolve => chrome.storage.sync.get(key, r => resolve(r[key])));
}

function storageSet(key, value) {
  return new Promise(resolve => chrome.storage.sync.set({ [key]: value }, resolve));
}

function getCurrentTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0] ?? null));
  });
}

function formatThemeName(t) {
  return { dark: 'Dark', light: 'Light', system: 'System' }[t] ?? t;
}

/**
 * Broadcast a message to all tabs. Silently ignores tabs that reject it
 * (e.g. chrome://, extension pages, restricted URLs).
 */
function broadcastToTabs(action, data = {}) {
  chrome.tabs.query({}, tabs => {
    for (const tab of tabs) {
      if (tab.id && tab.url && /^(https?|file):/.test(tab.url)) {
        chrome.tabs.sendMessage(tab.id, { action, ...data }).catch(() => {});
      }
    }
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  currentTab = await getCurrentTab();
  if (currentTab?.url) {
    try {
      const u = new URL(currentTab.url);
      currentDomain = u.hostname.replace(/^www\./, '');
    } catch {
      currentDomain = null;
    }
  }

  await loadSettings();
  loadAdblockStats();   // fire-and-forget; UI updates when response arrives
  setupEventListeners();
  updateSiteInfo();
}

// ─── Load and render settings ─────────────────────────────────────────────────
async function loadSettings() {
  const [themeMode, adblockEnabled, allowlist, pdfDarkMode, officeDarkMode] =
    await Promise.all([
      storageGet(SK.THEME_MODE),
      storageGet(SK.ADBLOCK_ENABLED),
      storageGet(SK.ALLOWLIST),
      storageGet(SK.PDF_DARK_MODE),
      storageGet(SK.OFFICE_DARK_MODE),
    ]);

  const theme = themeMode ?? 'system';

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.theme-btn[data-theme="${theme}"]`)?.classList.add('active');
  document.getElementById('currentTheme').textContent = formatThemeName(theme);

  // Toggles
  setChecked('adblockToggle',   adblockEnabled !== false);
  setChecked('pdfToggle',       pdfDarkMode    !== false);
  setChecked('officeToggle',    officeDarkMode !== false);

  // Allowlist toggle
  const onAllowlist = Array.isArray(allowlist) && currentDomain
    ? allowlist.includes(currentDomain)
    : false;
  setChecked('allowlistToggle', onAllowlist);
}

function setChecked(id, value) {
  const el = document.getElementById(id);
  if (el) el.checked = !!value;
}

// ─── Ad-block statistics ──────────────────────────────────────────────────────
function loadAdblockStats() {
  chrome.runtime.sendMessage({ action: 'getAdblockStats' }, response => {
    // Suppress "channel closed" errors that occur when the SW is idle
    if (chrome.runtime.lastError) return;
    const el = document.getElementById('blockedCount');
    if (!el) return;
    if (response?.blockedCount != null) {
      el.textContent = response.blockedCount.toLocaleString();
    } else {
      el.textContent = '—';
      el.title = 'Count unavailable (requires recent browser activity)';
    }
  });
}

// ─── Event listeners ──────────────────────────────────────────────────────────
function setupEventListeners() {
  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const theme = btn.dataset.theme;
      await storageSet(SK.THEME_MODE, theme);
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('currentTheme').textContent = formatThemeName(theme);
      broadcastToTabs('themeChanged', { theme });
    });
  });

  // Ad block toggle
  document.getElementById('adblockToggle').addEventListener('change', async e => {
    const enabled = e.target.checked;
    await storageSet(SK.ADBLOCK_ENABLED, enabled);
    chrome.runtime.sendMessage({ action: 'adblockToggled', enabled }).catch(() => {});
  });

  // Current-site allowlist toggle
  document.getElementById('allowlistToggle').addEventListener('change', async e => {
    if (!currentDomain) return;
    const add = e.target.checked;
    const allowlist = (await storageGet(SK.ALLOWLIST)) ?? [];
    const updated = add
      ? [...new Set([...allowlist, currentDomain])]
      : allowlist.filter(d => d !== currentDomain);
    await storageSet(SK.ALLOWLIST, updated);
    chrome.runtime.sendMessage({ action: 'toggleAllowlist', domain: currentDomain, add }).catch(() => {});
    broadcastToTabs('toggleAllowlist', { domain: currentDomain, add });
    updateSiteInfo();
  });

  // PDF dark-mode toggle
  document.getElementById('pdfToggle').addEventListener('change', async e => {
    await storageSet(SK.PDF_DARK_MODE, e.target.checked);
    // Notify background so it can re-apply CSS to open PDF tabs via scripting API
    chrome.runtime.sendMessage({ action: 'pdfThemeChanged', enabled: e.target.checked }).catch(() => {});
    // Also broadcast to content scripts (for PDF.js-based viewers)
    broadcastToTabs('pdfThemeChanged', { enabled: e.target.checked });
  });

  // Office/slides dark-mode toggle
  document.getElementById('officeToggle').addEventListener('change', async e => {
    await storageSet(SK.OFFICE_DARK_MODE, e.target.checked);
    broadcastToTabs('officeThemeChanged', { enabled: e.target.checked });
  });

  // Open full settings
  document.getElementById('optionsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// ─── Site info display ────────────────────────────────────────────────────────
function updateSiteInfo() {
  const el = document.getElementById('siteInfo');
  el.textContent = currentDomain || 'Unable to detect site';
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);