import { get, onChange, STORAGE_KEYS } from './storage.js';

let currentTheme = 'system';
let customDarkCSS = '';
let customLightCSS = '';

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

function removeTheme() {
  const styleEl = document.getElementById('ext-theme-injector');
  if (styleEl) styleEl.remove();
  document.documentElement.removeAttribute('data-ext-theme');
}

async function init() {
  const settings = await get(STORAGE_KEYS.THEME_MODE);
  currentTheme = settings;
  customDarkCSS = await get(STORAGE_KEYS.CUSTOM_DARK_CSS);
  customLightCSS = await get(STORAGE_KEYS.CUSTOM_LIGHT_CSS);
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectTheme);
  } else {
    injectTheme();
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (currentTheme === 'system') injectTheme();
  });
  
  onChange((changes) => {
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
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { injectTheme, removeTheme, getEffectiveTheme };