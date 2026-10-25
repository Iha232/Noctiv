/**
 * Noctiv - office-viewer.js
 *
 * Themes Google Slides, Office Online, OneDrive, and SharePoint viewers.
 *
 * Architecture / Limitations
 * ===========================
 * Google Slides
 *   The presentation editor renders slide thumbnails in the filmstrip and the
 *   main editing canvas via <canvas> elements.  Canvas pixel content is
 *   authored by JavaScript and CANNOT be changed via CSS.  We can:
 *     ✓ Theme the surrounding chrome (toolbar, menubar, sidebar, filmstrip
 *       container, speaker notes area, dialogs).
 *     ✓ Apply a CSS filter to the slide canvas wrappers so the overall tone
 *       of the slide surface is darkened.
 *     ✗ Change individual text colours or background fill colours inside a
 *       canvas-rendered slide.
 *
 * Presentation view (View → Present)
 *   The full-screen presentation view uses a different DOM and also renders
 *   slides as canvas.  We theme the surrounding overlay controls.
 *
 * Office Online / OneDrive / SharePoint
 *   These viewers render document pages partly as canvas, partly as complex
 *   HTML/SVG.  We theme the outer chrome and apply a filter to canvas elements.
 *
 * Same-origin / cross-origin iframes
 *   docs.google.com content scripts run in the same origin as the editor.
 *   Cross-origin iframes (e.g. fonts.googleapis.com resources) are not
 *   accessible and are left untouched.
 *
 * The resulting dark mode is a "best effort" approach:
 *   - The surrounding viewer (toolbars, menus, panels) becomes fully dark.
 *   - The slide surface receives a darkening CSS filter that makes white
 *     backgrounds appear near-black.  Coloured slide elements and images
 *     will have their hues slightly shifted (same limitation as PDF).
 *   - The extension DOES NOT modify the presentation file or cloud storage.
 */

'use strict';

const OFFICE_SK = { OFFICE_DARK_MODE: 'officeDarkMode' };

// ─── Dark CSS ──────────────────────────────────────────────────────────────────
const OFFICE_DARK_CSS = `
/* === Noctiv Office/Slides Dark Theme === */
:root { color-scheme: dark; }

/* ── Google Slides – outer chrome ── */
/* Main editor background */
.punch-filmstrip-scroll-container,
.punch-layout,
#punch-editor-main,
.docs-ui-unprintable {
  background: #16213e !important;
  color: #eaeaea !important;
}

/* Menubar */
.punch-header-container,
.goog-menubar,
.docs-menubar,
#punch-navbar,
.punch-control-bar {
  background: #16213e !important;
  border-bottom: 1px solid #2a2a4a !important;
  color: #eaeaea !important;
}

/* Menus and dropdowns */
.goog-menu,
.goog-menu-content,
.docs-menu,
.unity-outer-menu {
  background: #16213e !important;
  border: 1px solid #2a2a4a !important;
  color: #eaeaea !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
}

.goog-menuitem:hover,
.goog-menuitem-highlight,
.docs-menu-popup .goog-menuitem:hover {
  background: #0f3460 !important;
  color: #eaeaea !important;
}

.goog-menuseparator { border-top-color: #2a2a4a !important; }

/* Toolbar */
.goog-toolbar,
.docs-toolbar,
.punch-editor-toolbar,
.punch-animation-toolbar,
.punch-presenter-toolbar {
  background: #1a1a2e !important;
  border-bottom: 1px solid #2a2a4a !important;
  color: #eaeaea !important;
}

.goog-toolbar-button:hover,
.goog-toolbar-button-open {
  background: #0f3460 !important;
  border-color: #3a3a5a !important;
}

/* Filmstrip (slide panel on the left) */
.punch-filmstrip,
.punch-filmstrip-scroll,
.punch-filmstrip-scroll-container {
  background: #16213e !important;
  border-right: 1px solid #2a2a4a !important;
}

/* Filmstrip slide thumbnails */
.punch-filmstrip-slide {
  border: 2px solid transparent !important;
}

.punch-filmstrip-slide:hover {
  border-color: #3a3a5a !important;
  background: rgba(255,255,255,0.05) !important;
}

.punch-filmstrip-slide-selected,
.punch-filmstrip-slide[aria-selected="true"] {
  border-color: #bb86fc !important;
  box-shadow: 0 0 0 2px rgba(187,134,252,0.3) !important;
}

/* Slide canvas wrapper – apply filter to darken the canvas surface */
.punch-viewer-shadow-box,
.punch-shadow-box,
.goog-scrollable-panel,
.punch-content-panel {
  background: #1a1a2e !important;
}

/* The slide <canvas> itself: invert + hue-rotate to make white → dark.
   This is the same technique used for PDFs.
   Limitation: coloured content will have hues shifted. */
.punch-slide-canvas-wrapper canvas,
.punch-slide-canvas,
.sketchy-presentation-slide canvas {
  filter: invert(1) hue-rotate(180deg) !important;
}

/* Speaker notes */
.punch-notes-editor,
.punch-notes-container,
.docs-texteventtarget-iframe {
  background: #16213e !important;
  color: #eaeaea !important;
  border-top: 1px solid #2a2a4a !important;
}

/* Sidebar (theme panel, etc.) */
.docs-sidebar,
.sidepanel,
#sidepanel,
.punch-shape-actions-sidebar {
  background: #16213e !important;
  border-left: 1px solid #2a2a4a !important;
  color: #eaeaea !important;
}

/* Dialogs / modals */
.goog-dialog,
.jfk-bubble,
.docs-dialog,
.modal-dialog-content,
.goog-tooltip {
  background: #16213e !important;
  border: 1px solid #2a2a4a !important;
  color: #eaeaea !important;
  box-shadow: 0 4px 24px rgba(0,0,0,0.6) !important;
}

.goog-dialog-title-decoration {
  background: #1a1a2e !important;
  border-bottom-color: #2a2a4a !important;
}

/* Inputs inside dialogs */
.goog-dialog input[type="text"],
.goog-dialog input[type="url"],
.goog-dialog textarea,
.docs-dialog-content input {
  background: #1e1e3f !important;
  border-color: #3a3a5a !important;
  color: #eaeaea !important;
}

/* Buttons */
.goog-button-base,
.jfk-button,
.goog-flat-menu-button {
  background: #2a2a4a !important;
  border-color: #3a3a5a !important;
  color: #eaeaea !important;
}

.goog-button-base:hover,
.jfk-button:hover {
  background: #3a3a5a !important;
}

/* Status bar / page count / zoom */
.punch-statusbar,
.docs-status-bar {
  background: #16213e !important;
  border-top: 1px solid #2a2a4a !important;
  color: #b0b0b0 !important;
}

/* ── Scrollbars ── */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #1a1a2e !important; }
::-webkit-scrollbar-thumb { background: #444466 !important; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #666688 !important; }

/* ── Office Online / OneDrive / SharePoint ── */
.WACStatusBar,
.WACTlbr,
.WACCommandBar,
.ms-toolbar,
.ms-commandBar,
#WACToolbarContainer,
[data-automationid="ShellNavBar"],
.od-TopBar {
  background: #16213e !important;
  border-color: #2a2a4a !important;
  color: #eaeaea !important;
}

/* Office canvas (slide/document pages) */
.WACCanvas,
.WACPageCanvas,
#WACViewPanel canvas,
.ExcelPageCanvas canvas {
  filter: invert(1) hue-rotate(180deg) !important;
}

/* SharePoint viewer */
.ms-rtestate-field,
.od-ItemContent-table {
  background: #1a1a2e !important;
  color: #eaeaea !important;
}
`;

// ─── Light CSS ─────────────────────────────────────────────────────────────────
const OFFICE_LIGHT_CSS = `
/* === Noctiv Office/Slides Light Theme – restore defaults === */
:root { color-scheme: light; }

.punch-filmstrip-scroll-container,
.punch-layout,
#punch-editor-main,
.punch-header-container,
.goog-menubar,
.docs-menubar,
.goog-toolbar,
.docs-toolbar,
.punch-editor-toolbar,
.punch-filmstrip,
.punch-filmstrip-scroll,
.goog-menu,
.goog-menu-content,
.punch-notes-editor,
.punch-notes-container,
.docs-sidebar,
.sidepanel,
#sidepanel,
.punch-statusbar,
.docs-status-bar {
  background: revert !important;
  color: revert !important;
  border-color: revert !important;
}

/* Remove the slide canvas filter */
.punch-slide-canvas-wrapper canvas,
.punch-slide-canvas,
.sketchy-presentation-slide canvas,
.WACCanvas,
.WACPageCanvas,
#WACViewPanel canvas,
.ExcelPageCanvas canvas {
  filter: none !important;
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #f5f5f5 !important; }
::-webkit-scrollbar-thumb { background: #cccccc !important; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #bbbbbb !important; }
`;

// ─── State ────────────────────────────────────────────────────────────────────
let officeDarkEnabled = true;

// ─── Selectors that indicate an office/slides viewer is present ───────────────
const OFFICE_SELECTORS = [
  '#punch-editor-main',
  '.punch-filmstrip',
  '.punch-header-container',
  '.docs-menubar',
  '#WACToolbarContainer',
  '.WACStatusBar',
  '.od-TopBar',
  '[data-automationid="ShellNavBar"]',
];

function hasOfficeDOM() {
  return OFFICE_SELECTORS.some(sel => !!document.querySelector(sel));
}

// ─── Inject / remove ──────────────────────────────────────────────────────────
function injectOfficeTheme(dark) {
  const css = dark ? OFFICE_DARK_CSS : OFFICE_LIGHT_CSS;
  let el = document.getElementById('noctiv-office-theme');
  if (!el) {
    el = document.createElement('style');
    el.id = 'noctiv-office-theme';
    el.setAttribute('data-noctiv', 'office');
    (document.head || document.documentElement).prepend(el);
  }
  if (el.textContent !== css) el.textContent = css;
  document.documentElement.dataset.noctivOffice = dark ? 'dark' : 'light';
}

// ─── Try to apply; wait for DOM if needed ────────────────────────────────────
function tryApplyOffice() {
  if (hasOfficeDOM()) {
    injectOfficeTheme(officeDarkEnabled);
    return true;
  }
  return false;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const stored = await new Promise(r =>
    chrome.storage.sync.get(OFFICE_SK.OFFICE_DARK_MODE, d => r(d[OFFICE_SK.OFFICE_DARK_MODE]))
  );
  officeDarkEnabled = stored ?? true;

  if (!tryApplyOffice()) {
    // Wait for the office viewer DOM to appear (SPA navigation / lazy load)
    let attempts = 0;
    const obs = new MutationObserver(() => {
      attempts++;
      if (tryApplyOffice() || attempts > 600) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 20000);
  }

  // Live switching
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes[OFFICE_SK.OFFICE_DARK_MODE]) return;
    officeDarkEnabled = changes[OFFICE_SK.OFFICE_DARK_MODE].newValue ?? true;
    if (hasOfficeDOM()) injectOfficeTheme(officeDarkEnabled);
  });
}

init();

// ─── Message listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'ping') {
    sendResponse({ status: 'office-ready', dark: officeDarkEnabled });
  }
  if (msg.action === 'officeThemeChanged') {
    officeDarkEnabled = msg.enabled;
    if (hasOfficeDOM()) injectOfficeTheme(officeDarkEnabled);
    sendResponse({ ok: true });
  }
  return false;
});