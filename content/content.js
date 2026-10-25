/**
 * Noctiv - content.js
 * Injects dark/light/system themes into regular web pages.
 *
 * Design principles:
 *  - Smart theme adaptation: detects whether a page is naturally dark or light.
 *    * If target is DARK and page is light -> invert page to dark.
 *    * If target is DARK and page is already dark -> keep native dark (no inversion).
 *    * If target is LIGHT and page is dark -> invert page to light.
 *    * If target is LIGHT and page is already light -> keep native light (no inversion).
 *  - Re-inverts media (images, videos, canvases, iframes, SVG images) during inversion
 *    so graphics display in their original colors.
 *  - Respects site allowlist ("Disable on this site").
 *  - Supports custom CSS rules defined in options.
 *  - PDF handling via CSS filter on Chrome native PDF embed.
 */

'use strict';

// ─── Storage key constants ────────────────────────────────────────────────────
const SK = {
  THEME_MODE:       'themeMode',
  CUSTOM_DARK_CSS:  'customDarkCSS',
  CUSTOM_LIGHT_CSS: 'customLightCSS',
  PDF_DARK_MODE:    'pdfDarkMode',
  ALLOWLIST:        'allowlist',
};

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULTS = {
  [SK.THEME_MODE]:       'system',
  [SK.CUSTOM_DARK_CSS]:  '',
  [SK.CUSTOM_LIGHT_CSS]: '',
  [SK.PDF_DARK_MODE]:    true,
  [SK.ALLOWLIST]:        [],
};

// ─── CSS Definitions ──────────────────────────────────────────────────────────

// Applied when inverting a naturally LIGHT page into DARK
const INVERT_TO_DARK_CSS = `
/* === Noctiv Dark Theme (Inverted from Light) === */
html {
  filter: invert(1) hue-rotate(180deg) !important;
  background-color: #ffffff !important;
  color-scheme: dark !important;
}

img, video, picture, canvas,
svg image, image,
[style*="background-image"],
.emoji, [class*="emoji"],
[data-emoji],
iframe, embed[type="video"], object {
  filter: invert(1) hue-rotate(180deg) !important;
}

::selection {
  background: rgba(68,121,210,0.5) !important;
  color: #ffffff !important;
}
`;

// Applied when inverting a naturally DARK page into LIGHT
const INVERT_TO_LIGHT_CSS = `
/* === Noctiv Light Theme (Inverted from Dark) === */
html {
  filter: invert(1) hue-rotate(180deg) !important;
  background-color: #000000 !important;
  color-scheme: light !important;
}

img, video, picture, canvas,
svg image, image,
[style*="background-image"],
.emoji, [class*="emoji"],
[data-emoji],
iframe, embed[type="video"], object {
  filter: invert(1) hue-rotate(180deg) !important;
}

::selection {
  background: rgba(98,0,234,0.2) !important;
  color: #000000 !important;
}
`;

// Applied when page is ALREADY naturally dark and target is dark
const NATURAL_DARK_CSS = `
/* === Noctiv Native Dark Theme === */
html {
  filter: none !important;
  color-scheme: dark !important;
}

img, video, picture, canvas,
svg image, image,
[style*="background-image"],
.emoji, [class*="emoji"],
[data-emoji],
iframe, embed[type="video"], object {
  filter: none !important;
}
`;

// Applied when page is ALREADY naturally light and target is light
const NATURAL_LIGHT_CSS = `
/* === Noctiv Native Light Theme === */
html {
  filter: none !important;
  color-scheme: light !important;
}

img, video, picture, canvas,
svg image, image,
[style*="background-image"],
.emoji, [class*="emoji"],
[data-emoji],
iframe, embed[type="video"], object {
  filter: none !important;
}
`;

// ─── PDF Filter CSS ───────────────────────────────────────────────────────────
const PDF_DARK_FILTER_CSS = `
/* === Noctiv PDF Dark Mode === */
html { background: #1a1a2e !important; }
body { background: #1a1a2e !important; }

embed[type="application/pdf"],
embed[src$=".pdf"],
embed {
  filter: invert(1) hue-rotate(180deg) !important;
  border: none !important;
}

#main-plugin,
#content {
  background: #1a1a2e !important;
}
`;

const PDF_LIGHT_FILTER_CSS = `
/* === Noctiv PDF Light Mode === */
html { background: revert !important; }
body { background: revert !important; }
embed[type="application/pdf"],
embed[src$=".pdf"],
embed {
  filter: none !important;
}
#main-plugin, #content { background: revert !important; }
`;

// ─── State ────────────────────────────────────────────────────────────────────
let currentTheme     = 'system';
let customDarkCSS    = '';
let customLightCSS   = '';
let pdfDarkMode      = true;
let allowlist        = [];
let themeInitialized = false;

// ─── Color & Brightness Helpers ───────────────────────────────────────────────
function parseRGB(str) {
  if (!str || str === 'transparent' || str === 'inherit') return null;
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!m) return null;
  return {
    r: parseInt(m[1], 10),
    g: parseInt(m[2], 10),
    b: parseInt(m[3], 10),
    a: m[4] !== undefined ? parseFloat(m[4]) : 1,
  };
}

function getLuminance(rgb) {
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

/**
 * Checks if the page naturally has a dark background/theme.
 */
function isPageNaturallyDark() {
  const root = document.documentElement;
  const body = document.body;

  // 1. Explicit dark class names on html or body (e.g. ChatGPT, Tailwind, Bootstrap, etc.)
  const classNames = ((root?.className || '') + ' ' + (body?.className || '')).toLowerCase();
  if (/\b(dark|theme-dark|dark-theme|dark-mode|vscode-dark)\b/.test(classNames)) {
    return true;
  }
  if (/\b(light|theme-light|light-theme|light-mode|vscode-light)\b/.test(classNames)) {
    return false;
  }

  // 2. Explicit data attributes on html or body
  const attrs = [
    root?.getAttribute('data-theme'),
    root?.getAttribute('data-color-mode'),
    root?.getAttribute('data-bs-theme'),
    root?.getAttribute('data-mode'),
    body?.getAttribute('data-theme'),
    body?.getAttribute('data-color-mode'),
    body?.getAttribute('data-bs-theme'),
  ];
  for (const a of attrs) {
    if (a === 'dark') return true;
    if (a === 'light') return false;
  }

  // 3. Computed background colors
  const candidates = [
    root,
    body,
    document.querySelector('#root'),
    document.querySelector('#__next'),
    document.querySelector('#app'),
    document.querySelector('main'),
    body?.firstElementChild,
  ].filter(Boolean);

  for (const el of candidates) {
    try {
      const bg = window.getComputedStyle(el).backgroundColor;
      const rgb = parseRGB(bg);
      if (rgb && rgb.a > 0.4) {
        return getLuminance(rgb) < 128;
      }
    } catch (_) {}
  }

  // 4. Computed text color (light text implies dark background)
  if (body) {
    try {
      const color = window.getComputedStyle(body).color;
      const rgb = parseRGB(color);
      if (rgb && rgb.a > 0.5) {
        const lum = getLuminance(rgb);
        if (lum > 170) return true;
        if (lum < 85) return false;
      }
    } catch (_) {}
  }

  // 5. Default web pages are light
  return false;
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getEffectiveTheme() {
  return currentTheme === 'system' ? getSystemTheme() : currentTheme;
}

function isAllowlisted() {
  if (!allowlist || !Array.isArray(allowlist)) return false;
  const hostname = window.location.hostname.replace(/^www\./, '');
  if (!hostname) return false;
  return allowlist.some(domain => {
    const clean = domain.replace(/^www\./, '');
    return hostname === clean || hostname.endsWith('.' + clean);
  });
}

function storageGet(key) {
  return new Promise(resolve => {
    chrome.storage.sync.get(key, result => resolve(result[key]));
  });
}

function isNativePDFPage() {
  return (
    document.contentType === 'application/pdf' ||
    /\.pdf(\?.*)?$/i.test(window.location.pathname)
  );
}

// ─── Style Injection ──────────────────────────────────────────────────────────

/** Inject or update the main theme <style> element. */
function injectTheme() {
  if (isAllowlisted()) {
    removeTheme();
    return;
  }

  const effectiveTheme = getEffectiveTheme();
  const pageDark = isPageNaturallyDark();

  let baseCSS = '';
  if (effectiveTheme === 'dark') {
    // If the page is already dark, keep it dark; if light, invert to dark
    baseCSS = pageDark ? NATURAL_DARK_CSS : INVERT_TO_DARK_CSS;
  } else {
    // effectiveTheme === 'light'
    // If the page is naturally dark, invert to light; if already light, keep it light
    baseCSS = pageDark ? INVERT_TO_LIGHT_CSS : NATURAL_LIGHT_CSS;
  }

  const custom = effectiveTheme === 'dark' ? customDarkCSS : customLightCSS;
  const css = baseCSS + (custom ? `\n/* === Custom CSS ===\n${custom}\n*/` : '');

  let el = document.getElementById('noctiv-theme');
  if (!el) {
    el = document.createElement('style');
    el.id = 'noctiv-theme';
    el.setAttribute('data-noctiv', 'theme');
    (document.head || document.documentElement).prepend(el);
  }
  if (el.textContent !== css) el.textContent = css;
  document.documentElement.dataset.noctivTheme = effectiveTheme;
  document.documentElement.dataset.noctivMode  = currentTheme;
}

/** Remove the main theme <style> element. */
function removeTheme() {
  document.getElementById('noctiv-theme')?.remove();
  delete document.documentElement.dataset.noctivTheme;
  delete document.documentElement.dataset.noctivMode;
}

/** Inject or update the PDF filter <style> element. */
function injectPDFFilter(dark) {
  const css = dark ? PDF_DARK_FILTER_CSS : PDF_LIGHT_FILTER_CSS;

  let el = document.getElementById('noctiv-pdf-theme');
  if (!el) {
    el = document.createElement('style');
    el.id = 'noctiv-pdf-theme';
    el.setAttribute('data-noctiv', 'pdf');
    (document.head || document.documentElement).prepend(el);
  }
  if (el.textContent !== css) el.textContent = css;
  document.documentElement.dataset.noctivPdf = dark ? 'dark' : 'light';
}

/** Remove the PDF filter <style> element. */
function removePDFFilter() {
  document.getElementById('noctiv-pdf-theme')?.remove();
  delete document.documentElement.dataset.noctivPdf;
}

// ─── Observers ────────────────────────────────────────────────────────────────
let headObserver = null;
function ensureThemeInHead() {
  const head = document.head;
  if (!head) return;

  const themeEl = document.getElementById('noctiv-theme');
  if (themeEl && themeEl.parentNode !== head) head.prepend(themeEl);

  const pdfEl = document.getElementById('noctiv-pdf-theme');
  if (pdfEl && pdfEl.parentNode !== head) head.prepend(pdfEl);
}

function startHeadObserver() {
  if (headObserver || !document.head) return;
  headObserver = new MutationObserver(ensureThemeInHead);
  headObserver.observe(document.head, { childList: true });
}

let domObserver = null;
function startDomObserver() {
  if (domObserver) return;
  domObserver = new MutationObserver(mutations => {
    let reevaluate = false;
    for (const m of mutations) {
      if (m.type === 'attributes' && (
        m.attributeName === 'class' ||
        m.attributeName === 'data-theme' ||
        m.attributeName === 'data-color-mode' ||
        m.attributeName === 'data-bs-theme' ||
        m.attributeName === 'style'
      )) {
        reevaluate = true;
        break;
      }
    }
    if (reevaluate) {
      injectTheme();
    }
  });

  if (document.documentElement) {
    domObserver.observe(document.documentElement, { attributes: true });
  }
  if (document.body) {
    domObserver.observe(document.body, { attributes: true });
  }
}

// ─── Initialisation ───────────────────────────────────────────────────────────
async function init() {
  if (themeInitialized) return;
  themeInitialized = true;

  // Load settings
  const [themeMode, darkCSS, lightCSS, pdfDarkModeVal, allowlistVal] = await Promise.all([
    storageGet(SK.THEME_MODE),
    storageGet(SK.CUSTOM_DARK_CSS),
    storageGet(SK.CUSTOM_LIGHT_CSS),
    storageGet(SK.PDF_DARK_MODE),
    storageGet(SK.ALLOWLIST),
  ]);

  currentTheme   = themeMode      ?? DEFAULTS[SK.THEME_MODE];
  customDarkCSS  = darkCSS        ?? DEFAULTS[SK.CUSTOM_DARK_CSS];
  customLightCSS = lightCSS       ?? DEFAULTS[SK.CUSTOM_LIGHT_CSS];
  pdfDarkMode    = pdfDarkModeVal ?? DEFAULTS[SK.PDF_DARK_MODE];
  allowlist      = allowlistVal   ?? DEFAULTS[SK.ALLOWLIST];

  // Apply theme immediately
  injectTheme();

  // Apply PDF filter if this page IS a raw PDF
  if (isNativePDFPage() && pdfDarkMode) {
    injectPDFFilter(true);
  }

  // Keep styles in <head>
  startHeadObserver();
  startDomObserver();

  // Re-check once DOM is fully ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureThemeInHead();
      startHeadObserver();
      startDomObserver();
      injectTheme();
    });
  }

  // Re-check after all stylesheets and subresources have finished loading
  window.addEventListener('load', () => {
    injectTheme();
  });

  // React to system colour scheme changes
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    if (currentTheme === 'system') injectTheme();
  });

  // React to storage changes (live switching from popup / options)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;

    let needsThemeUpdate = false;

    if (changes[SK.THEME_MODE]) {
      currentTheme = changes[SK.THEME_MODE].newValue;
      needsThemeUpdate = true;
    }
    if (changes[SK.CUSTOM_DARK_CSS]) {
      customDarkCSS = changes[SK.CUSTOM_DARK_CSS].newValue ?? '';
      if (getEffectiveTheme() === 'dark') needsThemeUpdate = true;
    }
    if (changes[SK.CUSTOM_LIGHT_CSS]) {
      customLightCSS = changes[SK.CUSTOM_LIGHT_CSS].newValue ?? '';
      if (getEffectiveTheme() === 'light') needsThemeUpdate = true;
    }
    if (changes[SK.ALLOWLIST]) {
      allowlist = changes[SK.ALLOWLIST].newValue ?? [];
      needsThemeUpdate = true;
    }
    if (needsThemeUpdate) injectTheme();

    if (changes[SK.PDF_DARK_MODE]) {
      pdfDarkMode = changes[SK.PDF_DARK_MODE].newValue;
      if (isNativePDFPage()) {
        if (pdfDarkMode) injectPDFFilter(true);
        else             removePDFFilter();
      }
    }
  });
}

// Run as early as possible (document_start)
init();

// ─── Message handler (from popup / options) ───────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.action) {
    case 'ping':
      sendResponse({
        status: 'ready',
        theme:  document.documentElement.dataset.noctivTheme,
        mode:   document.documentElement.dataset.noctivMode,
        pdf:    document.documentElement.dataset.noctivPdf,
      });
      break;

    case 'themeChanged':
      currentTheme = message.theme;
      injectTheme();
      sendResponse({ ok: true });
      break;

    case 'toggleAllowlist':
      if (message.domain) {
        if (message.add && !allowlist.includes(message.domain)) allowlist.push(message.domain);
        if (!message.add) allowlist = allowlist.filter(d => d !== message.domain);
        injectTheme();
      }
      sendResponse({ ok: true });
      break;

    case 'pdfThemeChanged':
      pdfDarkMode = message.enabled;
      if (isNativePDFPage()) {
        if (pdfDarkMode) injectPDFFilter(true);
        else             removePDFFilter();
      }
      sendResponse({ ok: true });
      break;
  }
  return false;
});