/**
 * Noctiv - options.js
 * Full settings page logic.
 */

'use strict';

const SK = {
  THEME_MODE:            'themeMode',
  CUSTOM_DARK_CSS:       'customDarkCSS',
  CUSTOM_LIGHT_CSS:      'customLightCSS',
  ADBLOCK_ENABLED:       'adblockEnabled',
  ALLOWLIST:             'allowlist',
  PDF_DARK_MODE:         'pdfDarkMode',
  OFFICE_DARK_MODE:      'officeDarkMode',
  PDF_CUSTOM_DARK_CSS:   'pdfCustomDarkCSS',
  PDF_CUSTOM_LIGHT_CSS:  'pdfCustomLightCSS',
  OFFICE_CUSTOM_DARK_CSS:'officeCustomDarkCSS',
  OFFICE_CUSTOM_LIGHT_CSS:'officeCustomLightCSS',
  CUSTOM_RULES:          'customRules',
};

const DEFAULTS = {
  [SK.THEME_MODE]:             'system',
  [SK.CUSTOM_DARK_CSS]:        '',
  [SK.CUSTOM_LIGHT_CSS]:       '',
  [SK.ADBLOCK_ENABLED]:        true,
  [SK.ALLOWLIST]:              [],
  [SK.PDF_DARK_MODE]:          true,
  [SK.OFFICE_DARK_MODE]:       true,
  [SK.PDF_CUSTOM_DARK_CSS]:    '',
  [SK.PDF_CUSTOM_LIGHT_CSS]:   '',
  [SK.OFFICE_CUSTOM_DARK_CSS]: '',
  [SK.OFFICE_CUSTOM_LIGHT_CSS]:'',
  [SK.CUSTOM_RULES]:           '',
};

let currentSettings = {};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

/**
 * Send a message to all open http/https tabs. Errors from restricted pages
 * (chrome://, extension pages) are silently ignored.
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

// ─── Load settings ────────────────────────────────────────────────────────────
async function loadSettings() {
  const keys   = Object.values(SK);
  const stored = await new Promise(r => chrome.storage.sync.get(keys, r));

  currentSettings = {};
  for (const key of keys) {
    currentSettings[key] = stored[key] ?? DEFAULTS[key];
  }

  applySettingsToUI();
}

// ─── Apply to UI ──────────────────────────────────────────────────────────────
function applySettingsToUI() {
  // Theme radio
  const themeRadio = document.querySelector(
    `input[name="themeMode"][value="${currentSettings[SK.THEME_MODE]}"]`
  );
  if (themeRadio) themeRadio.checked = true;

  // Checkboxes
  [
    ['adblockEnabled',  SK.ADBLOCK_ENABLED],
    ['pdfDarkMode',     SK.PDF_DARK_MODE],
    ['officeDarkMode',  SK.OFFICE_DARK_MODE],
    ['pdfDarkMode2',    SK.PDF_DARK_MODE],
    ['officeDarkMode2', SK.OFFICE_DARK_MODE],
  ].forEach(([id, key]) => {
    const e = el(id);
    if (e) e.checked = !!currentSettings[key];
  });

  // Textareas (guard against missing elements)
  const textareas = [
    ['customDarkCSS',      SK.CUSTOM_DARK_CSS],
    ['customLightCSS',     SK.CUSTOM_LIGHT_CSS],
    ['pdfCustomDarkCSS',   SK.PDF_CUSTOM_DARK_CSS],
    ['pdfCustomLightCSS',  SK.PDF_CUSTOM_LIGHT_CSS],
    ['officeCustomDarkCSS',SK.OFFICE_CUSTOM_DARK_CSS],
    ['officeCustomLightCSS',SK.OFFICE_CUSTOM_LIGHT_CSS],
    ['customRules',        SK.CUSTOM_RULES],
  ];
  for (const [id, key] of textareas) {
    const e = el(id);
    if (e) e.value = currentSettings[key] ?? '';
  }

  renderAllowlist();
}

// ─── Allowlist ────────────────────────────────────────────────────────────────
function renderAllowlist() {
  const list      = el('allowlistList');
  const allowlist = currentSettings[SK.ALLOWLIST] ?? [];

  if (allowlist.length === 0) {
    list.innerHTML = '<li style="color:var(--opt-text-dim);justify-content:center;">No sites in allowlist</li>';
    return;
  }

  list.innerHTML = allowlist.map(domain => `
    <li>
      <span>${escapeHtml(domain)}</span>
      <button data-domain="${escapeHtml(domain)}" aria-label="Remove ${escapeHtml(domain)}">Remove</button>
    </li>
  `).join('');

  list.querySelectorAll('button[data-domain]').forEach(btn => {
    btn.addEventListener('click', () => removeFromAllowlist(btn.dataset.domain));
  });
}

async function addToAllowlist() {
  const input  = el('allowlistInput');
  const domain = input.value.trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  if (!domain) return;

  const allowlist = currentSettings[SK.ALLOWLIST] ?? [];
  if (allowlist.includes(domain)) {
    showSaveStatus('Domain already in allowlist', false, true);
    return;
  }

  allowlist.push(domain);
  currentSettings[SK.ALLOWLIST] = allowlist;

  await chrome.storage.sync.set({ [SK.ALLOWLIST]: allowlist });
  chrome.runtime.sendMessage({ action: 'toggleAllowlist', domain, add: true }).catch(() => {});
  renderAllowlist();
  input.value = '';
  showSaveStatus('Added to allowlist');
}

async function removeFromAllowlist(domain) {
  const allowlist = (currentSettings[SK.ALLOWLIST] ?? []).filter(d => d !== domain);
  currentSettings[SK.ALLOWLIST] = allowlist;

  await chrome.storage.sync.set({ [SK.ALLOWLIST]: allowlist });
  chrome.runtime.sendMessage({ action: 'toggleAllowlist', domain, add: false }).catch(() => {});
  renderAllowlist();
  showSaveStatus('Removed from allowlist');
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const panels  = document.querySelectorAll('.tab-panel');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b  => b.classList.remove('active'));
      panels.forEach(p   => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add('active');
    });
  });
}

// ─── Event listeners ──────────────────────────────────────────────────────────
function setupEventListeners() {
  // Theme radio
  document.querySelectorAll('input[name="themeMode"]').forEach(radio => {
    radio.addEventListener('change', e => {
      currentSettings[SK.THEME_MODE] = e.target.value;
      broadcastToTabs('themeChanged', { theme: e.target.value });
    });
  });

  // Ad block
  el('adblockEnabled').addEventListener('change', e => {
    currentSettings[SK.ADBLOCK_ENABLED] = e.target.checked;
    chrome.runtime.sendMessage({ action: 'adblockToggled', enabled: e.target.checked }).catch(() => {});
  });

  // PDF dark mode (two checkboxes – keep in sync)
  el('pdfDarkMode').addEventListener('change', e => {
    currentSettings[SK.PDF_DARK_MODE] = e.target.checked;
    el('pdfDarkMode2').checked = e.target.checked;
    broadcastToTabs('pdfThemeChanged', { enabled: e.target.checked });
  });
  el('pdfDarkMode2').addEventListener('change', e => {
    currentSettings[SK.PDF_DARK_MODE] = e.target.checked;
    el('pdfDarkMode').checked = e.target.checked;
    broadcastToTabs('pdfThemeChanged', { enabled: e.target.checked });
  });

  // Office dark mode (two checkboxes – keep in sync)
  el('officeDarkMode').addEventListener('change', e => {
    currentSettings[SK.OFFICE_DARK_MODE] = e.target.checked;
    el('officeDarkMode2').checked = e.target.checked;
    broadcastToTabs('officeThemeChanged', { enabled: e.target.checked });
  });
  el('officeDarkMode2').addEventListener('change', e => {
    currentSettings[SK.OFFICE_DARK_MODE] = e.target.checked;
    el('officeDarkMode').checked = e.target.checked;
    broadcastToTabs('officeThemeChanged', { enabled: e.target.checked });
  });

  // Textarea updates (track in currentSettings for Save All)
  const textareaMap = [
    ['customDarkCSS',       SK.CUSTOM_DARK_CSS],
    ['customLightCSS',      SK.CUSTOM_LIGHT_CSS],
    ['pdfCustomDarkCSS',    SK.PDF_CUSTOM_DARK_CSS],
    ['pdfCustomLightCSS',   SK.PDF_CUSTOM_LIGHT_CSS],
    ['officeCustomDarkCSS', SK.OFFICE_CUSTOM_DARK_CSS],
    ['officeCustomLightCSS',SK.OFFICE_CUSTOM_LIGHT_CSS],
    ['customRules',         SK.CUSTOM_RULES],
  ];
  for (const [id, key] of textareaMap) {
    el(id)?.addEventListener('input', e => { currentSettings[key] = e.target.value; });
  }

  // Allowlist
  el('addAllowlistBtn').addEventListener('click', addToAllowlist);
  el('allowlistInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') addToAllowlist();
  });

  // Custom rules
  el('saveCustomRules').addEventListener('click', saveCustomRules);

  // Import / Export
  el('exportBtn').addEventListener('click', exportSettings);
  el('importBtn').addEventListener('click', () => el('importFile').click());
  el('importFile').addEventListener('change', importSettings);

  // Reset
  el('resetBtn').addEventListener('click', resetSettings);

  // Save all
  el('saveAllBtn').addEventListener('click', saveAllSettings);
}

// ─── Custom rules ─────────────────────────────────────────────────────────────
async function saveCustomRules() {
  const text = el('customRules').value.trim();
  currentSettings[SK.CUSTOM_RULES] = text;

  if (!text) {
    showSaveStatus('Custom rules cleared');
    return;
  }

  try {
    const parsed = JSON.parse(text);
    const rules  = Array.isArray(parsed) ? parsed : [parsed];

    // Validate required fields minimally
    for (const r of rules) {
      if (!r.id || !r.action || !r.condition) throw new Error('Rules must have id, action, condition');
    }

    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules });
    showSaveStatus('Custom rules saved');
  } catch (e) {
    showSaveStatus(`Error: ${e.message}`, true);
  }
}

// ─── Save all ─────────────────────────────────────────────────────────────────
async function saveAllSettings() {
  const toSave = {};
  for (const [key] of Object.entries(SK)) {
    const storageKey = SK[key];
    if (currentSettings[storageKey] !== undefined) {
      toSave[storageKey] = currentSettings[storageKey];
    }
  }

  await new Promise(r => chrome.storage.sync.set(toSave, r));

  // Notify open tabs about theme change in case it was updated via radio
  broadcastToTabs('themeChanged', { theme: currentSettings[SK.THEME_MODE] });

  showSaveStatus('All settings saved!');
}

// ─── Status indicator ─────────────────────────────────────────────────────────
function showSaveStatus(message, isError = false, isWarn = false) {
  const status = el('saveStatus');
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? 'var(--opt-danger)'
                     : isWarn  ? 'var(--opt-accent)'
                     : 'var(--opt-success)';
  clearTimeout(status._timer);
  status._timer = setTimeout(() => { status.textContent = ''; }, 3500);
}

// ─── Export / Import ──────────────────────────────────────────────────────────
function exportSettings() {
  const blob = new Blob(
    [JSON.stringify({ version: '1.0.0', timestamp: Date.now(), settings: currentSettings }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `noctiv-settings-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showSaveStatus('Settings exported');
}

function importSettings(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async event => {
    try {
      const data = JSON.parse(event.target.result);
      if (!data?.settings) throw new Error('Invalid settings file – missing "settings" key');

      currentSettings = { ...DEFAULTS, ...data.settings };
      await saveAllSettings();
      applySettingsToUI();
      showSaveStatus('Settings imported successfully');
    } catch (err) {
      showSaveStatus(`Import failed: ${err.message}`, true);
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

// ─── Reset ────────────────────────────────────────────────────────────────────
async function resetSettings() {
  if (!confirm('Reset all settings to defaults?\nThis cannot be undone.')) return;

  currentSettings = { ...DEFAULTS };
  await new Promise(r => chrome.storage.sync.clear(r));
  await new Promise(r => chrome.storage.sync.set({ ...DEFAULTS }, r));
  applySettingsToUI();
  broadcastToTabs('themeChanged', { theme: DEFAULTS[SK.THEME_MODE] });
  showSaveStatus('Settings reset to defaults');
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupNavigation();
  setupEventListeners();

  const manifest = chrome.runtime.getManifest();
  el('extVersion').textContent = manifest.version;
});