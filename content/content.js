const STORAGE_KEYS = {
  THEME_MODE: 'themeMode',
  CUSTOM_DARK_CSS: 'customDarkCSS',
  CUSTOM_LIGHT_CSS: 'customLightCSS',
  PDF_DARK_MODE: 'pdfDarkMode'
};

const DEFAULTS = {
  [STORAGE_KEYS.THEME_MODE]: 'system',
  [STORAGE_KEYS.CUSTOM_DARK_CSS]: '',
  [STORAGE_KEYS.CUSTOM_LIGHT_CSS]: '',
  [STORAGE_KEYS.PDF_DARK_MODE]: true
};

const DARK_THEME_CSS = `
:root {
  --ext-bg-primary: #1a1a2e !important;
  --ext-bg-secondary: #16213e !important;
  --ext-bg-tertiary: #0f3460 !important;
  --ext-text-primary: #eaeaea !important;
  --ext-text-secondary: #b0b0b0 !important;
  --ext-text-muted: #888 !important;
  --ext-border: #2a2a4a !important;
  --ext-link: #64b5f6 !important;
  --ext-accent: #bb86fc !important;
  --ext-accent-hover: #d0a8fc !important;
  --ext-input-bg: #1e1e3f !important;
  --ext-input-border: #3a3a5a !important;
  --ext-button-bg: #2a2a4a !important;
  --ext-button-hover: #3a3a5a !important;
  --ext-shadow: rgba(0, 0, 0, 0.5) !important;
  --ext-overlay: rgba(0, 0, 0, 0.7) !important;
  --ext-scrollbar-thumb: #444 !important;
  --ext-scrollbar-track: #1a1a2e !important;
  --ext-selection: #bb86fc40 !important;
}

html, body {
  background-color: var(--ext-bg-primary) !important;
  color: var(--ext-text-primary) !important;
  border-color: var(--ext-border) !important;
}

* {
  scrollbar-color: var(--ext-scrollbar-thumb) var(--ext-scrollbar-track) !important;
}

*::selection {
  background: var(--ext-selection) !important;
}

img, video, iframe, canvas, svg {
  filter: brightness(0.9) contrast(1.05) !important;
}

img[src*="logo"], img[src*="icon"], img[src*="avatar"], .logo, .icon, .avatar {
  filter: none !important;
}

a { color: var(--ext-link) !important; }
a:visited { color: var(--ext-accent) !important; }

input, textarea, select, button {
  background-color: var(--ext-input-bg) !important;
  border-color: var(--ext-input-border) !important;
  color: var(--ext-text-primary) !important;
}

button, [role="button"] {
  background-color: var(--ext-button-bg) !important;
}

button:hover, [role="button"]:hover {
  background-color: var(--ext-button-hover) !important;
}

::placeholder { color: var(--ext-text-muted) !important; }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--ext-scrollbar-track); }
::-webkit-scrollbar-thumb { background: var(--ext-scrollbar-thumb); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: #666; }
`;

const LIGHT_THEME_CSS = `
:root {
  --ext-bg-primary: #ffffff !important;
  --ext-bg-secondary: #f5f5f5 !important;
  --ext-bg-tertiary: #e8e8e8 !important;
  --ext-text-primary: #1a1a1a !important;
  --ext-text-secondary: #444 !important;
  --ext-text-muted: #888 !important;
  --ext-border: #ddd !important;
  --ext-link: #1a73e8 !important;
  --ext-accent: #6200ea !important;
  --ext-accent-hover: #7c4dff !important;
  --ext-input-bg: #fff !important;
  --ext-input-border: #ccc !important;
  --ext-button-bg: #f0f0f0 !important;
  --ext-button-hover: #e0e0e0 !important;
  --ext-shadow: rgba(0, 0, 0, 0.1) !important;
  --ext-overlay: rgba(255, 255, 255, 0.9) !important;
  --ext-scrollbar-thumb: #ccc !important;
  --ext-scrollbar-track: #f5f5f5 !important;
  --ext-selection: #6200ea40 !important;
}

html, body {
  background-color: var(--ext-bg-primary) !important;
  color: var(--ext-text-primary) !important;
  border-color: var(--ext-border) !important;
}

* {
  scrollbar-color: var(--ext-scrollbar-thumb) var(--ext-scrollbar-track) !important;
}

*::selection {
  background: var(--ext-selection) !important;
}

a { color: var(--ext-link) !important; }
a:visited { color: var(--ext-accent) !important; }

input, textarea, select, button {
  background-color: var(--ext-input-bg) !important;
  border-color: var(--ext-input-border) !important;
  color: var(--ext-text-primary) !important;
}

button, [role="button"] {
  background-color: var(--ext-button-bg) !important;
}

button:hover, [role="button"]:hover {
  background-color: var(--ext-button-hover) !important;
}

::placeholder { color: var(--ext-text-muted) !important; }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--ext-scrollbar-track); }
::-webkit-scrollbar-thumb { background: var(--ext-scrollbar-thumb); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: #bbb; }
`;

const PDF_DARK_CSS = `
#viewer, .viewer, .pdfViewer, #outerContainer, .pdfViewer .page,
#viewerContainer, #viewerContainer > *,
.page, .page[style*="background"] {
  background: #1a1a2e !important;
  color: #eaeaea !important;
}

.page, .page[style*="background"] {
  background: #1a1a2e !important;
  box-shadow: 0 0 10px rgba(0,0,0,0.5) !important;
}

.textLayer {
  color: #eaeaea !important;
  text-shadow: 0 0 1px rgba(0,0,0,0.3) !important;
}

.annotationLayer .linkAnnotation {
  border-color: #64b5f6 !important;
}

.toolbar, .toolbarField, #toolbarViewer, .toolbarButton,
#toolbarViewer *, .toolbarButton * {
  background: #16213e !important;
  border-color: #2a2a4a !important;
  color: #eaeaea !important;
}

.toolbarButton:hover, .toolbarButton:focus {
  background: #0f3460 !important;
}

.doorhanger, .dialog, .overlay {
  background: #16213e !important;
  border: 1px solid #2a2a4a !important;
  color: #eaeaea !important;
}

.findbar, #findbar {
  background: #16213e !important;
  border-top: 1px solid #2a2a4a !important;
}

.findbar input, .findbar select {
  background: #1e1e3f !important;
  border: 1px solid #3a3a5a !important;
  color: #eaeaea !important;
}

.sidebar, #sidebar, #sidebarContent {
  background: #16213e !important;
  border-right: 1px solid #2a2a4a !important;
}

.thumbnail, .outline-item {
  border-color: #2a2a4a !important;
}

.thumbnail:hover, .outline-item:hover {
  background: #0f3460 !important;
}

.thumbnail.selected, .outline-item.selected {
  background: #bb86fc30 !important;
  border-color: #bb86fc !important;
}

.loadingInProgress .page {
  background: #1e1e3f !important;
}

.passwordPrompt, .errorMessage {
  background: #2a1a1a !important;
  border-color: #ff6b6b !important;
  color: #ff6b6b !important;
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #1a1a2e; }
::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #666; }
`;

const PDF_LIGHT_CSS = `
#viewer, .viewer, .pdfViewer, #outerContainer, .pdfViewer .page,
#viewerContainer, #viewerContainer > *,
.page, .page[style*="background"] {
  background: #ffffff !important;
  color: #1a1a1a !important;
}

.page, .page[style*="background"] {
  background: #ffffff !important;
  box-shadow: 0 0 10px rgba(0,0,0,0.1) !important;
}

.textLayer {
  color: #1a1a1a !important;
}

.annotationLayer .linkAnnotation {
  border-color: #1a73e8 !important;
}

.toolbar, .toolbarField, #toolbarViewer, .toolbarButton,
#toolbarViewer *, .toolbarButton * {
  background: #f5f5f5 !important;
  border-color: #ddd !important;
  color: #1a1a1a !important;
}

.toolbarButton:hover, .toolbarButton:focus {
  background: #e8e8e8 !important;
}

.doorhanger, .dialog, .overlay {
  background: #fff !important;
  border: 1px solid #ddd !important;
  color: #1a1a1a !important;
}

.findbar, #findbar {
  background: #f5f5f5 !important;
  border-top: 1px solid #ddd !important;
}

.findbar input, .findbar select {
  background: #fff !important;
  border: 1px solid #ccc !important;
  color: #1a1a1a !important;
}

.sidebar, #sidebar, #sidebarContent {
  background: #f5f5f5 !important;
  border-right: 1px solid #ddd !important;
}

.thumbnail, .outline-item {
  border-color: #ddd !important;
}

.thumbnail:hover, .outline-item:hover {
  background: #e8e8e8 !important;
}

.thumbnail.selected, .outline-item.selected {
  background: #6200ea20 !important;
  border-color: #6200ea !important;
}

.loadingInProgress .page {
  background: #f5f5f5 !important;
}

.passwordPrompt, .errorMessage {
  background: #fff0f0 !important;
  border-color: #e53935 !important;
  color: #e53935 !important;
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #f5f5f5; }
::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #bbb; }
`;

let currentTheme = 'system';
let customDarkCSS = '';
let customLightCSS = '';
let pdfDarkModeEnabled = true;
let themeInitialized = false;

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getEffectiveTheme() {
  if (currentTheme === 'system') return getSystemTheme();
  return currentTheme;
}

function buildThemeCSS(theme) {
  const baseCSS = theme === 'dark' ? DARK_THEME_CSS : LIGHT_THEME_CSS;
  const customCSS = theme === 'dark' ? customDarkCSS : customLightCSS;
  return baseCSS + (customCSS ? `\n/* Custom CSS */\n${customCSS}` : '');
}

function buildPDFCSS(dark) {
  return dark ? PDF_DARK_CSS : PDF_LIGHT_CSS;
}

function injectTheme() {
  const theme = getEffectiveTheme();
  const css = buildThemeCSS(theme);
  
  let styleEl = document.getElementById('ext-theme-injector');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'ext-theme-injector';
    styleEl.setAttribute('data-ext-theme', theme);
    (document.head || document.documentElement).prepend(styleEl);
  }
  styleEl.textContent = css;
  styleEl.setAttribute('data-ext-theme', theme);
  document.documentElement.setAttribute('data-ext-theme', theme);
}

function injectPDFTheme(dark) {
  const css = buildPDFCSS(dark);
  
  let styleEl = document.getElementById('ext-pdf-theme');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'ext-pdf-theme';
    (document.head || document.documentElement).prepend(styleEl);
  }
  styleEl.textContent = css;
  document.documentElement.setAttribute('data-ext-pdf-theme', dark ? 'dark' : 'light');
}

function removeTheme() {
  const styleEl = document.getElementById('ext-theme-injector');
  if (styleEl) styleEl.remove();
  document.documentElement.removeAttribute('data-ext-theme');
}

async function getStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(key, (result) => resolve(result[key]));
  });
}

function isPDFPage() {
  return window.location.href.endsWith('.pdf') || 
         document.contentType === 'application/pdf' ||
         document.querySelector('embed[type="application/pdf"]') ||
         document.querySelector('#viewer') ||
         document.querySelector('.pdfViewer') ||
         document.querySelector('#outerContainer');
}

async function init() {
  if (themeInitialized) return;
  themeInitialized = true;
  
  const [themeMode, darkCSS, lightCSS, pdfDarkMode] = await Promise.all([
    getStorage(STORAGE_KEYS.THEME_MODE),
    getStorage(STORAGE_KEYS.CUSTOM_DARK_CSS),
    getStorage(STORAGE_KEYS.CUSTOM_LIGHT_CSS),
    getStorage(STORAGE_KEYS.PDF_DARK_MODE)
  ]);
  
  currentTheme = themeMode || DEFAULTS[STORAGE_KEYS.THEME_MODE];
  customDarkCSS = darkCSS || DEFAULTS[STORAGE_KEYS.CUSTOM_DARK_CSS];
  customLightCSS = lightCSS || DEFAULTS[STORAGE_KEYS.CUSTOM_LIGHT_CSS];
  pdfDarkModeEnabled = pdfDarkMode !== false;
  
  injectTheme();
  
  if (isPDFPage() && pdfDarkModeEnabled) {
    injectPDFTheme(true);
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (currentTheme === 'system') injectTheme();
    if (pdfDarkModeEnabled === 'system' && isPDFPage()) injectPDFTheme(mediaQuery.matches);
  });
  
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    
    if (changes[STORAGE_KEYS.THEME_MODE]) {
      currentTheme = changes[STORAGE_KEYS.THEME_MODE].newValue;
      injectTheme();
    }
    if (changes[STORAGE_KEYS.CUSTOM_DARK_CSS]) {
      customDarkCSS = changes[STORAGE_KEYS.CUSTOM_DARK_CSS].newValue;
      if (getEffectiveTheme() === 'dark') injectTheme();
    }
    if (changes[STORAGE_KEYS.CUSTOM_LIGHT_CSS]) {
      customLightCSS = changes[STORAGE_KEYS.CUSTOM_LIGHT_CSS].newValue;
      if (getEffectiveTheme() === 'light') injectTheme();
    }
    if (changes[STORAGE_KEYS.PDF_DARK_MODE]) {
      pdfDarkModeEnabled = changes[STORAGE_KEYS.PDF_DARK_MODE].newValue;
      if (isPDFPage()) injectPDFTheme(pdfDarkModeEnabled);
    }
  });
  
  const observer = new MutationObserver(() => {
    const styleEl = document.getElementById('ext-theme-injector');
    if (styleEl && styleEl.parentNode !== document.head) {
      (document.head || document.documentElement).prepend(styleEl);
    }
    const pdfStyleEl = document.getElementById('ext-pdf-theme');
    if (pdfStyleEl && pdfStyleEl.parentNode !== document.head) {
      (document.head || document.documentElement).prepend(pdfStyleEl);
    }
    
    if (isPDFPage() && pdfDarkModeEnabled && !document.getElementById('ext-pdf-theme')) {
      injectPDFTheme(true);
    }
  });
  
  observer.observe(document.documentElement, { childList: true, subtree: true });
  
  document.addEventListener('DOMContentLoaded', () => {
    const styleEl = document.getElementById('ext-theme-injector');
    if (styleEl && styleEl.parentNode !== document.head) {
      (document.head || document.documentElement).prepend(styleEl);
    }
    if (isPDFPage() && pdfDarkModeEnabled) {
      injectPDFTheme(true);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ 
      status: 'ready', 
      theme: document.documentElement.getAttribute('data-ext-theme'),
      pdfTheme: document.documentElement.getAttribute('data-ext-pdf-theme')
    });
  }
  if (message.action === 'themeChanged') {
    currentTheme = message.theme;
    injectTheme();
  }
  if (message.action === 'pdfThemeChanged') {
    pdfDarkModeEnabled = message.enabled;
    if (isPDFPage()) injectPDFTheme(pdfDarkModeEnabled);
  }
  return true;
});