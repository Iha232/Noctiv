/**
 * Noctiv - pdf-viewer.js
 *
 * IMPORTANT – Chrome PDF Viewer Architecture Limitation
 * =====================================================
 * Chrome's built-in PDF viewer is implemented as a separate internal Chrome
 * extension whose ID is "mhjfbmdgcfjbbpaeojofohoefgiehjai".  Its document is
 * loaded inside an <embed> element and runs in an isolated renderer process
 * that is NOT accessible to regular content scripts.
 *
 * This means that:
 *   - We CANNOT inject CSS into the PDF viewer's internal DOM.
 *   - Selectors like #viewer, .pdfViewer, .page, .textLayer do NOT exist in
 *     the outer page's DOM when Chrome's native viewer is used.
 *   - Only PDF.js-based viewers (e.g. Firefox, or sites that bundle PDF.js
 *     themselves) expose those class names to a content script.
 *
 * What we CAN do from a content script:
 *   1. When Chrome opens a PDF *directly* (the page's content type is
 *      application/pdf), the outer document has a simple structure.  We can
 *      apply a CSS filter to the <embed> element that renders the PDF surface.
 *      filter: invert(1) hue-rotate(180deg) turns white pages dark while
 *      keeping text legible.  Colour images will have their hues shifted
 *      (known limitation – no workaround from a content script).
 *
 *   2. For PDF.js-based viewers embedded in a web page we can target the
 *      PDF.js DOM elements (.pdfViewer, .page, .textLayer, etc.).
 *
 * This file implements strategy (1).  Strategy (2) is covered by the
 * base content.js injection which already runs on all pages.
 *
 * If you need full-fidelity PDF dark mode (colour-preserving), the only
 * viable path is a bundled PDF.js custom viewer – which would require
 * significant additional work and packaging.
 */

'use strict';

const PDF_SK = { PDF_DARK_MODE: 'pdfDarkMode' };

// ─── CSS for PDF.js-based viewers (only applies when PDF.js DOM is present) ──

const PDFJS_DARK_CSS = `
/* Noctiv – PDF.js viewer dark mode */
/* Applied when PDF.js selectors are found in the page DOM */

:root {
  color-scheme: dark;
}

/* Viewer chrome */
#outerContainer,
#mainContainer,
#viewerContainer,
#toolbarContainer,
#secondaryToolbar,
#findbar,
#sidebarContainer {
  background-color: #1a1a2e !important;
  color: #eaeaea !important;
  border-color: #2a2a4a !important;
}

/* Individual page wrapper */
.pdfViewer .page {
  border: 1px solid #2a2a4a !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
  /* Do NOT set background here – the canvas itself renders the page */
}

/* Text layer (selectable overlay) */
.pdfViewer .textLayer {
  /* text layer elements are transparent overlays – do not set colour */
}

/* Toolbar inputs and buttons */
.toolbarField,
#toolbarViewer input,
#toolbarViewer select {
  background: #1e1e3f !important;
  border-color: #3a3a5a !important;
  color: #eaeaea !important;
}

.toolbarButton,
.secondaryToolbarButton {
  color: #eaeaea !important;
}

.toolbarButton:hover,
.secondaryToolbarButton:hover,
.toolbarButton:focus,
.secondaryToolbarButton:focus {
  background: #0f3460 !important;
}

/* Find bar */
#findbar input[type="text"] {
  background: #1e1e3f !important;
  border-color: #3a3a5a !important;
  color: #eaeaea !important;
}

/* Sidebar (thumbnails, bookmarks, layers) */
#sidebarContent,
#thumbnailView,
#outlineView,
#attachmentsView,
#layersView {
  background: #16213e !important;
  color: #eaeaea !important;
}

.thumbnail .thumbnailSelectionRing {
  border-color: #bb86fc !important;
}

/* Dialogs */
.dialog {
  background: #16213e !important;
  border-color: #2a2a4a !important;
  color: #eaeaea !important;
}

.dialog input,
.dialog select,
.dialog textarea {
  background: #1e1e3f !important;
  border-color: #3a3a5a !important;
  color: #eaeaea !important;
}

/* Password prompt */
#passwordDialog {
  background: #1a1a2e !important;
  color: #eaeaea !important;
}

/* Annotation links */
.annotationLayer .linkAnnotation > a {
  border-color: rgba(100, 181, 246, 0.4) !important;
}

/* Scrollbars */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #1a1a2e !important; }
::-webkit-scrollbar-thumb { background: #444466 !important; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #666688 !important; }
`;

const PDFJS_LIGHT_CSS = `
/* Noctiv – PDF.js viewer light mode (restore defaults) */
:root { color-scheme: light; }

#outerContainer,
#mainContainer,
#viewerContainer,
#toolbarContainer,
#secondaryToolbar,
#findbar,
#sidebarContainer {
  background-color: revert !important;
  color: revert !important;
  border-color: revert !important;
}

.toolbarField,
#toolbarViewer input,
#toolbarViewer select {
  background: revert !important;
  border-color: revert !important;
  color: revert !important;
}

#sidebarContent,
#thumbnailView,
#outlineView {
  background: revert !important;
  color: revert !important;
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #f5f5f5 !important; }
::-webkit-scrollbar-thumb { background: #cccccc !important; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #bbbbbb !important; }
`;

// ─── State ────────────────────────────────────────────────────────────────────
let pdfDarkEnabled = true;

// ─── Helper: check if PDF.js viewer DOM is present ───────────────────────────
function hasPDFJsDOM() {
  return !!(
    document.getElementById('outerContainer') ||
    document.getElementById('viewerContainer') ||
    document.querySelector('.pdfViewer')
  );
}

// ─── Inject PDF.js viewer CSS ─────────────────────────────────────────────────
function injectPDFJsTheme(dark) {
  const css = dark ? PDFJS_DARK_CSS : PDFJS_LIGHT_CSS;
  let el = document.getElementById('noctiv-pdfjs-theme');
  if (!el) {
    el = document.createElement('style');
    el.id = 'noctiv-pdfjs-theme';
    el.setAttribute('data-noctiv', 'pdfjs');
    (document.head || document.documentElement).prepend(el);
  }
  if (el.textContent !== css) el.textContent = css;
  document.documentElement.dataset.noctivPdfJs = dark ? 'dark' : 'light';
}

// ─── Try to apply, wait for DOM if needed ────────────────────────────────────
function tryApply() {
  if (hasPDFJsDOM()) {
    injectPDFJsTheme(pdfDarkEnabled);
    return true;
  }
  return false;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const stored = await new Promise(r =>
    chrome.storage.sync.get(PDF_SK.PDF_DARK_MODE, d => r(d[PDF_SK.PDF_DARK_MODE]))
  );
  pdfDarkEnabled = stored ?? true;

  if (!tryApply()) {
    // Wait for PDF.js DOM to appear (for sites that lazy-load the viewer)
    let attempts = 0;
    const obs = new MutationObserver(() => {
      attempts++;
      if (tryApply() || attempts > 500) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    // Safety: disconnect after 15 s
    setTimeout(() => obs.disconnect(), 15000);
  }

  // Live switching
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes[PDF_SK.PDF_DARK_MODE]) return;
    pdfDarkEnabled = changes[PDF_SK.PDF_DARK_MODE].newValue ?? true;
    if (hasPDFJsDOM()) injectPDFJsTheme(pdfDarkEnabled);
  });
}

init();

// Message listener
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'ping') {
    sendResponse({ status: 'pdfjs-ready', dark: pdfDarkEnabled });
  }
  if (msg.action === 'pdfThemeChanged') {
    pdfDarkEnabled = msg.enabled;
    if (hasPDFJsDOM()) injectPDFJsTheme(pdfDarkEnabled);
    sendResponse({ ok: true });
  }
  return false;
});