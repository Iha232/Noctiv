const STORAGE_KEYS = {
  THEME_MODE: 'themeMode',
  CUSTOM_DARK_CSS: 'customDarkCSS',
  CUSTOM_LIGHT_CSS: 'customLightCSS',
  ADBLOCK_ENABLED: 'adblockEnabled',
  PDF_DARK_MODE: 'pdfDarkMode',
  OFFICE_DARK_MODE: 'officeDarkMode',
  ALLOWLIST: 'allowlist'
};

const DEFAULTS = {
  [STORAGE_KEYS.THEME_MODE]: 'system',
  [STORAGE_KEYS.CUSTOM_DARK_CSS]: '',
  [STORAGE_KEYS.CUSTOM_LIGHT_CSS]: '',
  [STORAGE_KEYS.ADBLOCK_ENABLED]: true,
  [STORAGE_KEYS.PDF_DARK_MODE]: true,
  [STORAGE_KEYS.OFFICE_DARK_MODE]: true,
  [STORAGE_KEYS.ALLOWLIST]: []
};

async function get(key) {
  const data = await chrome.storage.sync.get(key);
  return data[key] ?? DEFAULTS[key];
}

async function getAll() {
  const data = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
  return Object.fromEntries(
    Object.entries(STORAGE_KEYS).map(([k, v]) => [k, data[v] ?? DEFAULTS[v]])
  );
}

async function set(key, value) {
  await chrome.storage.sync.set({ [key]: value });
}

async function setMultiple(values) {
  await chrome.storage.sync.set(values);
}

function onChange(callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      callback(changes);
    }
  });
}

export { STORAGE_KEYS, DEFAULTS, get, getAll, set, setMultiple, onChange };