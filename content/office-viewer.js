const STORAGE_KEYS = {
  OFFICE_DARK_MODE: 'officeDarkMode'
};

const DEFAULTS = {
  [STORAGE_KEYS.OFFICE_DARK_MODE]: true
};

const OFFICE_DARK_CSS = `
.punch-viewer, .filmstrip, .slide, .punch-viewer-sidemenu,
.docs-presentation, .docs-presentation-content,
.office-viewer, .PresentationView, .slide-viewer,
[role="presentation"], .slide-content {
  background: #1a1a2e !important;
  color: #eaeaea !important;
}

.slide, .slide-content, .slide-background {
  background: #1a1a2e !important;
  box-shadow: 0 0 20px rgba(0,0,0,0.5) !important;
}

.filmstrip .slide-thumbnail, .punch-filmstrip-slide {
  background: #16213e !important;
  border: 1px solid #2a2a4a !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
}

.filmstrip .slide-thumbnail.selected, .punch-filmstrip-slide.selected {
  border-color: #bb86fc !important;
  box-shadow: 0 0 0 2px #bb86fc, 0 2px 8px rgba(0,0,0,0.3) !important;
}

.punch-viewer-toolbar, .toolbar, .docs-toolbar {
  background: #16213e !important;
  border-bottom: 1px solid #2a2a4a !important;
}

.toolbar-button, .goog-toolbar-button, [role="button"].toolbar-button {
  background: transparent !important;
  color: #eaeaea !important;
}

.toolbar-button:hover, .goog-toolbar-button:hover {
  background: #0f3460 !important;
}

.menubar, .docs-menubar {
  background: #16213e !important;
  border-bottom: 1px solid #2a2a4a !important;
  color: #eaeaea !important;
}

.menu, .goog-menu {
  background: #16213e !important;
  border: 1px solid #2a2a4a !important;
  color: #eaeaea !important;
}

.menu-item:hover, .goog-menuitem:hover {
  background: #0f3460 !important;
}

.sidebar, .punch-viewer-sidemenu, #sidepanel {
  background: #16213e !important;
  border-right: 1px solid #2a2a4a !important;
}

.comment-thread, .comment-bubble {
  background: #1e1e3f !important;
  border-color: #2a2a4a !important;
  color: #eaeaea !important;
}

.speaker-notes, .notes-pane {
  background: #16213e !important;
  color: #eaeaea !important;
}

.speaker-notes textarea, .notes-pane textarea {
  background: #1e1e3f !important;
  border: 1px solid #3a3a5a !important;
  color: #eaeaea !important;
}

.grid-view .slide, .grid-view .slide-thumbnail {
  background: #16213e !important;
  border-color: #2a2a4a !important;
}

.offline-indicator, .sync-status {
  background: #2a1a1a !important;
  color: #ff6b6b !important;
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #1a1a2e; }
::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #666; }

img.slide-image, .slide img {
  filter: brightness(0.95) contrast(1.02) !important;
}
`;

const OFFICE_LIGHT_CSS = `
.punch-viewer, .filmstrip, .slide, .punch-viewer-sidemenu,
.docs-presentation, .docs-presentation-content,
.office-viewer, .PresentationView, .slide-viewer,
[role="presentation"], .slide-content {
  background: #ffffff !important;
  color: #1a1a1a !important;
}

.slide, .slide-content, .slide-background {
  background: #ffffff !important;
  box-shadow: 0 0 20px rgba(0,0,0,0.1) !important;
}

.filmstrip .slide-thumbnail, .punch-filmstrip-slide {
  background: #f5f5f5 !important;
  border: 1px solid #ddd !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
}

.filmstrip .slide-thumbnail.selected, .punch-filmstrip-slide.selected {
  border-color: #6200ea !important;
  box-shadow: 0 0 0 2px #6200ea, 0 2px 8px rgba(0,0,0,0.1) !important;
}

.punch-viewer-toolbar, .toolbar, .docs-toolbar {
  background: #f5f5f5 !important;
  border-bottom: 1px solid #ddd !important;
}

.toolbar-button, .goog-toolbar-button, [role="button"].toolbar-button {
  background: transparent !important;
  color: #1a1a1a !important;
}

.toolbar-button:hover, .goog-toolbar-button:hover {
  background: #e8e8e8 !important;
}

.menubar, .docs-menubar {
  background: #f5f5f5 !important;
  border-bottom: 1px solid #ddd !important;
  color: #1a1a1a !important;
}

.menu, .goog-menu {
  background: #fff !important;
  border: 1px solid #ddd !important;
  color: #1a1a1a !important;
}

.menu-item:hover, .goog-menuitem:hover {
  background: #e8e8e8 !important;
}

.sidebar, .punch-viewer-sidemenu, #sidepanel {
  background: #f5f5f5 !important;
  border-right: 1px solid #ddd !important;
}

.comment-thread, .comment-bubble {
  background: #fff !important;
  border-color: #ddd !important;
  color: #1a1a1a !important;
}

.speaker-notes, .notes-pane {
  background: #f5f5f5 !important;
  color: #1a1a1a !important;
}

.speaker-notes textarea, .notes-pane textarea {
  background: #fff !important;
  border: 1px solid #ccc !important;
  color: #1a1a1a !important;
}

.grid-view .slide, .grid-view .slide-thumbnail {
  background: #f5f5f5 !important;
  border-color: #ddd !important;
}

.offline-indicator, .sync-status {
  background: #fff0f0 !important;
  color: #e53935 !important;
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #f5f5f5; }
::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #bbb; }

img.slide-image, .slide img {
  filter: none !important;
}
`;

let officeDarkModeEnabled = true;
let currentStyleEl = null;

function injectOfficeTheme(dark) {
  const css = dark ? OFFICE_DARK_CSS : OFFICE_LIGHT_CSS;
  
  if (currentStyleEl) {
    currentStyleEl.remove();
  }
  
  currentStyleEl = document.createElement('style');
  currentStyleEl.id = 'ext-office-theme';
  currentStyleEl.textContent = css;
  (document.head || document.documentElement).prepend(currentStyleEl);
  
  document.documentElement.setAttribute('data-ext-office-theme', dark ? 'dark' : 'light');
}

function tryInjectOfficeTheme() {
  const selectors = [
    '.punch-viewer', '.filmstrip', '.docs-presentation',
    '.office-viewer', '.PresentationView', '.slide-viewer',
    '[role="presentation"]', '#sidepanel', '.punch-viewer-sidemenu'
  ];
  
  for (const sel of selectors) {
    if (document.querySelector(sel)) {
      injectOfficeTheme(officeDarkModeEnabled);
      return true;
    }
  }
  return false;
}

async function getStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(key, (result) => resolve(result[key]));
  });
}

async function init() {
  officeDarkModeEnabled = await getStorage(STORAGE_KEYS.OFFICE_DARK_MODE);
  if (officeDarkModeEnabled === undefined) officeDarkModeEnabled = DEFAULTS[STORAGE_KEYS.OFFICE_DARK_MODE];
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  if (!tryInjectOfficeTheme()) {
    const observer = new MutationObserver(() => {
      if (tryInjectOfficeTheme()) {
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    
    setTimeout(() => observer.disconnect(), 15000);
  }
  
  mediaQuery.addEventListener('change', (e) => {
    if (officeDarkModeEnabled === 'system') {
      injectOfficeTheme(e.matches);
    }
  });
  
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes[STORAGE_KEYS.OFFICE_DARK_MODE]) {
      officeDarkModeEnabled = changes[STORAGE_KEYS.OFFICE_DARK_MODE].newValue;
      injectOfficeTheme(officeDarkModeEnabled);
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
    sendResponse({ status: 'ready', officeTheme: officeDarkModeEnabled ? 'dark' : 'light' });
  }
  if (message.action === 'officeThemeChanged') {
    officeDarkModeEnabled = message.enabled;
    injectOfficeTheme(officeDarkModeEnabled);
  }
  return true;
});