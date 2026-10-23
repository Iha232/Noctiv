const STORAGE_KEYS = {
  THEME_MODE: 'themeMode',
  ADBLOCK_ENABLED: 'adblockEnabled',
  ALLOWLIST: 'allowlist',
  PDF_DARK_MODE: 'pdfDarkMode',
  OFFICE_DARK_MODE: 'officeDarkMode'
};

let currentTab = null;
let currentDomain = null;

async function getStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(key, (result) => resolve(result[key]));
  });
}

async function setStorage(key, value) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [key]: value }, resolve);
  });
}

async function init() {
  currentTab = await getCurrentTab();
  if (currentTab?.url) {
    try {
      currentDomain = new URL(currentTab.url).hostname.replace('www.', '');
    } catch (e) {
      currentDomain = 'unknown';
    }
  }
  
  await loadSettings();
  await loadAdblockStats();
  setupEventListeners();
  updateSiteInfo();
}

async function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

async function loadSettings() {
  const [
    themeMode,
    adblockEnabled,
    allowlist,
    pdfDarkMode,
    officeDarkMode
  ] = await Promise.all([
    getStorage(STORAGE_KEYS.THEME_MODE),
    getStorage(STORAGE_KEYS.ADBLOCK_ENABLED),
    getStorage(STORAGE_KEYS.ALLOWLIST),
    getStorage(STORAGE_KEYS.PDF_DARK_MODE),
    getStorage(STORAGE_KEYS.OFFICE_DARK_MODE)
  ]);
  
  document.querySelector(`.theme-btn[data-theme="${themeMode || 'system'}"]`)?.classList.add('active');
  document.getElementById('currentTheme').textContent = formatThemeName(themeMode || 'system');
  
  document.getElementById('adblockToggle').checked = adblockEnabled !== false;
  document.getElementById('pdfToggle').checked = pdfDarkMode !== false;
  document.getElementById('officeToggle').checked = officeDarkMode !== false;
  
  const isAllowed = allowlist?.includes(currentDomain) || false;
  document.getElementById('allowlistToggle').checked = isAllowed;
}

function formatThemeName(theme) {
  const names = { dark: 'Dark', light: 'Light', system: 'System' };
  return names[theme] || theme;
}

async function loadAdblockStats() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getAdblockStats' }, (response) => {
      if (response?.blockedCount !== undefined) {
        document.getElementById('blockedCount').textContent = response.blockedCount.toLocaleString();
      } else {
        document.getElementById('blockedCount').textContent = '--';
      }
      resolve();
    });
  });
}

function setupEventListeners() {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const theme = btn.dataset.theme;
      await setStorage(STORAGE_KEYS.THEME_MODE, theme);
      
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('currentTheme').textContent = formatThemeName(theme);
      
      notifyContentScripts('themeChanged', { theme });
    });
  });
  
  document.getElementById('adblockToggle').addEventListener('change', async (e) => {
    await setStorage(STORAGE_KEYS.ADBLOCK_ENABLED, e.target.checked);
    chrome.runtime.sendMessage({ action: 'adblockToggled', enabled: e.target.checked });
  });
  
  document.getElementById('allowlistToggle').addEventListener('change', async (e) => {
    const { allowlist = [] } = await new Promise(r => chrome.storage.sync.get('allowlist', r));
    let updated = [...allowlist];
    
    if (e.target.checked) {
      if (!updated.includes(currentDomain)) updated.push(currentDomain);
    } else {
      updated = updated.filter(d => d !== currentDomain);
    }
    
    await setStorage(STORAGE_KEYS.ALLOWLIST, updated);
    chrome.runtime.sendMessage({ action: 'toggleAllowlist', domain: currentDomain, add: e.target.checked });
    updateSiteInfo();
  });
  
  document.getElementById('pdfToggle').addEventListener('change', async (e) => {
    await setStorage(STORAGE_KEYS.PDF_DARK_MODE, e.target.checked);
    notifyContentScripts('pdfThemeChanged', { enabled: e.target.checked });
  });
  
  document.getElementById('officeToggle').addEventListener('change', async (e) => {
    await setStorage(STORAGE_KEYS.OFFICE_DARK_MODE, e.target.checked);
    notifyContentScripts('officeThemeChanged', { enabled: e.target.checked });
  });
  
  document.getElementById('optionsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
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

function updateSiteInfo() {
  const el = document.getElementById('siteInfo');
  if (currentDomain) {
    el.textContent = currentDomain;
  } else {
    el.textContent = 'Unable to detect site';
  }
}

document.addEventListener('DOMContentLoaded', init);