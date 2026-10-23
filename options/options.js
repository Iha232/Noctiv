const STORAGE_KEYS = {
  THEME_MODE: 'themeMode',
  CUSTOM_DARK_CSS: 'customDarkCSS',
  CUSTOM_LIGHT_CSS: 'customLightCSS',
  ADBLOCK_ENABLED: 'adblockEnabled',
  ALLOWLIST: 'allowlist',
  PDF_DARK_MODE: 'pdfDarkMode',
  OFFICE_DARK_MODE: 'officeDarkMode',
  PDF_CUSTOM_DARK_CSS: 'pdfCustomDarkCSS',
  PDF_CUSTOM_LIGHT_CSS: 'pdfCustomLightCSS',
  OFFICE_CUSTOM_DARK_CSS: 'officeCustomDarkCSS',
  OFFICE_CUSTOM_LIGHT_CSS: 'officeCustomLightCSS',
  CUSTOM_RULES: 'customRules'
};

const DEFAULTS = {
  [STORAGE_KEYS.THEME_MODE]: 'system',
  [STORAGE_KEYS.CUSTOM_DARK_CSS]: '',
  [STORAGE_KEYS.CUSTOM_LIGHT_CSS]: '',
  [STORAGE_KEYS.ADBLOCK_ENABLED]: true,
  [STORAGE_KEYS.ALLOWLIST]: [],
  [STORAGE_KEYS.PDF_DARK_MODE]: true,
  [STORAGE_KEYS.OFFICE_DARK_MODE]: true,
  [STORAGE_KEYS.PDF_CUSTOM_DARK_CSS]: '',
  [STORAGE_KEYS.PDF_CUSTOM_LIGHT_CSS]: '',
  [STORAGE_KEYS.OFFICE_CUSTOM_DARK_CSS]: '',
  [STORAGE_KEYS.OFFICE_CUSTOM_LIGHT_CSS]: '',
  [STORAGE_KEYS.CUSTOM_RULES]: ''
};

let currentSettings = {};

function getEl(id) {
  return document.getElementById(id);
}

async function loadSettings() {
  const keys = Object.values(STORAGE_KEYS);
  const result = await new Promise(resolve => chrome.storage.sync.get(keys, resolve));
  
  currentSettings = {};
  keys.forEach(key => {
    currentSettings[key] = result[key] ?? DEFAULTS[key];
  });
  
  applySettingsToUI();
}

function applySettingsToUI() {
  const themeMode = currentSettings[STORAGE_KEYS.THEME_MODE];
  const themeRadio = document.querySelector(`input[name="themeMode"][value="${themeMode}"]`);
  if (themeRadio) themeRadio.checked = true;
  
  const adblockEl = getEl('adblockEnabled');
  if (adblockEl) adblockEl.checked = currentSettings[STORAGE_KEYS.ADBLOCK_ENABLED];
  
  const pdfDarkModeEl = getEl('pdfDarkMode');
  if (pdfDarkModeEl) pdfDarkModeEl.checked = currentSettings[STORAGE_KEYS.PDF_DARK_MODE];
  
  const officeDarkModeEl = getEl('officeDarkMode');
  if (officeDarkModeEl) officeDarkModeEl.checked = currentSettings[STORAGE_KEYS.OFFICE_DARK_MODE];
  
  const pdfDarkMode2El = getEl('pdfDarkMode2');
  if (pdfDarkMode2El) pdfDarkMode2El.checked = currentSettings[STORAGE_KEYS.PDF_DARK_MODE];
  
  const officeDarkMode2El = getEl('officeDarkMode2');
  if (officeDarkMode2El) officeDarkMode2El.checked = currentSettings[STORAGE_KEYS.OFFICE_DARK_MODE];
  
  getEl('customDarkCSS').value = currentSettings[STORAGE_KEYS.CUSTOM_DARK_CSS];
  getEl('customLightCSS').value = currentSettings[STORAGE_KEYS.CUSTOM_LIGHT_CSS];
  getEl('pdfCustomDarkCSS').value = currentSettings[STORAGE_KEYS.PDF_CUSTOM_DARK_CSS];
  getEl('pdfCustomLightCSS').value = currentSettings[STORAGE_KEYS.PDF_CUSTOM_LIGHT_CSS];
  getEl('officeCustomDarkCSS').value = currentSettings[STORAGE_KEYS.OFFICE_CUSTOM_DARK_CSS];
  getEl('officeCustomLightCSS').value = currentSettings[STORAGE_KEYS.OFFICE_CUSTOM_LIGHT_CSS];
  getEl('customRules').value = currentSettings[STORAGE_KEYS.CUSTOM_RULES];
  
  renderAllowlist();
}

function renderAllowlist() {
  const list = getEl('allowlistList');
  const allowlist = currentSettings[STORAGE_KEYS.ALLOWLIST] || [];
  
  if (allowlist.length === 0) {
    list.innerHTML = '<li style="color: var(--opt-text-dim); justify-content: center;">No sites in allowlist</li>';
    return;
  }
  
  list.innerHTML = allowlist.map(domain => `
    <li>
      <span>${escapeHtml(domain)}</span>
      <button data-domain="${escapeHtml(domain)}">Remove</button>
    </li>
  `).join('');
  
  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => removeFromAllowlist(btn.dataset.domain));
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const panels = document.querySelectorAll('.tab-panel');
  
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      panels.forEach(p => p.classList.remove('active'));
      document.getElementById(`tab-${tab}`).classList.add('active');
    });
  });
}

function setupEventListeners() {
  document.querySelectorAll('input[name="themeMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentSettings[STORAGE_KEYS.THEME_MODE] = e.target.value;
      notifyContentScripts('themeChanged', { theme: e.target.value });
    });
  });
  
  getEl('adblockEnabled').addEventListener('change', (e) => {
    currentSettings[STORAGE_KEYS.ADBLOCK_ENABLED] = e.target.checked;
    chrome.runtime.sendMessage({ action: 'adblockToggled', enabled: e.target.checked });
  });
  
  getEl('pdfDarkMode').addEventListener('change', (e) => {
    currentSettings[STORAGE_KEYS.PDF_DARK_MODE] = e.target.checked;
    getEl('pdfDarkMode2').checked = e.target.checked;
    notifyContentScripts('pdfThemeChanged', { enabled: e.target.checked });
  });
  
  getEl('pdfDarkMode2').addEventListener('change', (e) => {
    currentSettings[STORAGE_KEYS.PDF_DARK_MODE] = e.target.checked;
    getEl('pdfDarkMode').checked = e.target.checked;
    notifyContentScripts('pdfThemeChanged', { enabled: e.target.checked });
  });
  
  getEl('officeDarkMode').addEventListener('change', (e) => {
    currentSettings[STORAGE_KEYS.OFFICE_DARK_MODE] = e.target.checked;
    getEl('officeDarkMode2').checked = e.target.checked;
    notifyContentScripts('officeThemeChanged', { enabled: e.target.checked });
  });
  
  getEl('officeDarkMode2').addEventListener('change', (e) => {
    currentSettings[STORAGE_KEYS.OFFICE_DARK_MODE] = e.target.checked;
    getEl('officeDarkMode').checked = e.target.checked;
    notifyContentScripts('officeThemeChanged', { enabled: e.target.checked });
  });
  
  getEl('customDarkCSS').addEventListener('input', (e) => {
    currentSettings[STORAGE_KEYS.CUSTOM_DARK_CSS] = e.target.value;
  });
  
  getEl('customLightCSS').addEventListener('input', (e) => {
    currentSettings[STORAGE_KEYS.CUSTOM_LIGHT_CSS] = e.target.value;
  });
  
  getEl('pdfCustomDarkCSS').addEventListener('input', (e) => {
    currentSettings[STORAGE_KEYS.PDF_CUSTOM_DARK_CSS] = e.target.value;
  });
  
  getEl('pdfCustomLightCSS').addEventListener('input', (e) => {
    currentSettings[STORAGE_KEYS.PDF_CUSTOM_LIGHT_CSS] = e.target.value;
  });
  
  getEl('officeCustomDarkCSS').addEventListener('input', (e) => {
    currentSettings[STORAGE_KEYS.OFFICE_CUSTOM_DARK_CSS] = e.target.value;
  });
  
  getEl('officeCustomLightCSS').addEventListener('input', (e) => {
    currentSettings[STORAGE_KEYS.OFFICE_CUSTOM_LIGHT_CSS] = e.target.value;
  });
  
  getEl('customRules').addEventListener('input', (e) => {
    currentSettings[STORAGE_KEYS.CUSTOM_RULES] = e.target.value;
  });
  
  getEl('addAllowlistBtn').addEventListener('click', addToAllowlist);
  getEl('allowlistInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addToAllowlist();
  });
  
  getEl('saveCustomRules').addEventListener('click', saveCustomRules);
  
  getEl('exportBtn').addEventListener('click', exportSettings);
  getEl('importBtn').addEventListener('click', () => getEl('importFile').click());
  getEl('importFile').addEventListener('change', importSettings);
  
  getEl('resetBtn').addEventListener('click', resetSettings);
  
  getEl('saveAllBtn').addEventListener('click', saveAllSettings);
}

async function addToAllowlist() {
  const input = getEl('allowlistInput');
  const domain = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  
  if (!domain) return;
  
  const allowlist = currentSettings[STORAGE_KEYS.ALLOWLIST] || [];
  if (!allowlist.includes(domain)) {
    allowlist.push(domain);
    currentSettings[STORAGE_KEYS.ALLOWLIST] = allowlist;
    await chrome.runtime.sendMessage({ action: 'toggleAllowlist', domain, add: true });
    renderAllowlist();
    input.value = '';
    showSaveStatus('Added to allowlist');
  }
}

async function removeFromAllowlist(domain) {
  const allowlist = (currentSettings[STORAGE_KEYS.ALLOWLIST] || []).filter(d => d !== domain);
  currentSettings[STORAGE_KEYS.ALLOWLIST] = allowlist;
  await chrome.runtime.sendMessage({ action: 'toggleAllowlist', domain, add: false });
  renderAllowlist();
  showSaveStatus('Removed from allowlist');
}

async function saveCustomRules() {
  const rulesText = getEl('customRules').value.trim();
  currentSettings[STORAGE_KEYS.CUSTOM_RULES] = rulesText;
  
  try {
    if (rulesText) {
      const rules = JSON.parse(rulesText);
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: Array.isArray(rules) ? rules : [rules]
      });
    }
    showSaveStatus('Custom rules saved');
  } catch (e) {
    showSaveStatus('Invalid JSON: ' + e.message, true);
  }
}

function notifyContentScripts(action, data) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action, ...data }).catch(() => {});
      }
    });
  });
}

async function saveAllSettings() {
  const toSave = {};
  Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
    if (currentSettings[storageKey] !== undefined) {
      toSave[storageKey] = currentSettings[storageKey];
    }
  });
  
  await new Promise(resolve => chrome.storage.sync.set(toSave, resolve));
  showSaveStatus('All settings saved!');
}

function showSaveStatus(message, isError = false) {
  const status = getEl('saveStatus');
  status.textContent = message;
  status.style.color = isError ? 'var(--opt-danger)' : 'var(--opt-success)';
  setTimeout(() => { status.textContent = ''; }, 3000);
}

function exportSettings() {
  const exportData = {
    version: '1.0.0',
    timestamp: Date.now(),
    settings: currentSettings
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `noctiv-settings-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showSaveStatus('Settings exported');
}

function importSettings(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.settings) {
        currentSettings = { ...DEFAULTS, ...data.settings };
        await saveAllSettings();
        applySettingsToUI();
        showSaveStatus('Settings imported successfully');
      } else {
        throw new Error('Invalid settings file format');
      }
    } catch (err) {
      showSaveStatus('Import failed: ' + err.message, true);
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

async function resetSettings() {
  if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
  
  currentSettings = { ...DEFAULTS };
  await new Promise(resolve => chrome.storage.sync.clear(resolve));
  await new Promise(resolve => chrome.storage.sync.set(DEFAULTS, resolve));
  applySettingsToUI();
  showSaveStatus('Settings reset to defaults');
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupNavigation();
  setupEventListeners();
  getEl('extVersion').textContent = chrome.runtime.getManifest().version;
});