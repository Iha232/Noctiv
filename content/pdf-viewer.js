const STORAGE_KEYS = {
  PDF_DARK_MODE: 'pdfDarkMode'
};

const DEFAULTS = {
  [STORAGE_KEYS.PDF_DARK_MODE]: true
};

const PDF_DARK_CSS = `
#viewer, .viewer, .pdfViewer, #outerContainer, .pdfViewer .page {
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

.toolbar, .toolbarField, #toolbarViewer, .toolbarButton {
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
#viewer, .viewer, .pdfViewer, #outerContainer, .pdfViewer .page {
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

.toolbar, .toolbarField, #toolbarViewer, .toolbarButton {
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

let pdfDarkModeEnabled = true;
let currentStyleEl = null;

function injectPDFTheme(dark) {
  const css = dark ? PDF_DARK_CSS : PDF_LIGHT_CSS;
  
  if (currentStyleEl) {
    currentStyleEl.remove();
  }
  
  currentStyleEl = document.createElement('style');
  currentStyleEl.id = 'ext-pdf-theme';
  currentStyleEl.textContent = css;
  (document.head || document.documentElement).prepend(currentStyleEl);
  
  document.documentElement.setAttribute('data-ext-pdf-theme', dark ? 'dark' : 'light');
}

function tryInjectPDFTheme() {
  if (document.getElementById('viewer') || document.querySelector('.pdfViewer') || document.querySelector('#outerContainer')) {
    injectPDFTheme(pdfDarkModeEnabled);
    return true;
  }
  return false;
}

async function getStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(key, (result) => resolve(result[key]));
  });
}

async function init() {
  pdfDarkModeEnabled = await getStorage(STORAGE_KEYS.PDF_DARK_MODE);
  if (pdfDarkModeEnabled === undefined) pdfDarkModeEnabled = DEFAULTS[STORAGE_KEYS.PDF_DARK_MODE];
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  if (!tryInjectPDFTheme()) {
    const observer = new MutationObserver(() => {
      if (tryInjectPDFTheme()) {
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    
    setTimeout(() => observer.disconnect(), 10000);
  }
  
  mediaQuery.addEventListener('change', (e) => {
    if (pdfDarkModeEnabled === 'system') {
      injectPDFTheme(e.matches);
    }
  });
  
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes[STORAGE_KEYS.PDF_DARK_MODE]) {
      pdfDarkModeEnabled = changes[STORAGE_KEYS.PDF_DARK_MODE].newValue;
      injectPDFTheme(pdfDarkModeEnabled);
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
    sendResponse({ status: 'ready', pdfTheme: pdfDarkModeEnabled ? 'dark' : 'light' });
  }
  if (message.action === 'pdfThemeChanged') {
    pdfDarkModeEnabled = message.enabled;
    injectPDFTheme(pdfDarkModeEnabled);
  }
  return true;
});