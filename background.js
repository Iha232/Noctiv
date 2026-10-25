/**
 * Noctiv - background.js (Service Worker)
 *
 * Responsibilities:
 *  - Initialize default settings on install.
 *  - Enable/disable DNR rulesets for ad blocking.
 *  - Manage the per-site allowlist via dynamic DNR rules.
 *  - Inject PDF dark/light mode CSS via scripting.insertCSS.
 *    This approach is used instead of a content script because:
 *      a) file:// PDFs require "Allow access to file URLs" for content scripts,
 *         but chrome.scripting.insertCSS works with host_permissions: <all_urls>
 *      b) The scripting API can target the tab directly, bypassing content-
 *         script injection restrictions on PDF pages.
 */

'use strict';

const ALLOWLIST_RULE_ID_BASE = 10000;
const MAX_ALLOWLIST_ENTRIES  = 500;

// CSS injected via scripting.insertCSS for PDF dark mode.
// Chrome's built-in PDF viewer renders the PDF inside an <embed> element.
// A CSS filter on that element darkens the rendered PDF surface.
// The html/body background fills the area around the PDF pages.
// Note: colours in images/diagrams will be hue-shifted (inversion side-effect).
const PDF_DARK_CSS = `
  html, body {
    background: #1a1a2e !important;
    margin: 0 !important;
  }
  /* Chrome's native PDF embed element */
  embed[type="application/x-google-chrome-pdf"],
  embed[type="application/pdf"],
  embed {
    filter: invert(1) hue-rotate(180deg) !important;
  }
  /* Fallback: if the whole page is a PDF frame */
  #main-plugin,
  #plugin {
    filter: invert(1) hue-rotate(180deg) !important;
  }
`;

const PDF_LIGHT_CSS = `
  html, body {
    background: revert !important;
  }
  embed[type="application/x-google-chrome-pdf"],
  embed[type="application/pdf"],
  embed,
  #main-plugin,
  #plugin {
    filter: none !important;
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPDFUrl(url) {
  if (!url) return false;
  // Matches file:///path/to.pdf and https://site.com/path.pdf
  // Also catches PDF URLs with query strings: .pdf?page=2
  return /\.pdf(\?[^#]*)?(#.*)?$/i.test(url.split('?')[0]) ||
         url.includes('application/pdf');
}

async function getSettings(...keys) {
  return chrome.storage.sync.get(keys);
}

// ─── PDF theming via scripting API ───────────────────────────────────────────

/**
 * Injects or removes PDF dark/light CSS for a given tab using the scripting
 * API. This works even on file:// URLs where content scripts may not run.
 */
async function applyPDFThemeToTab(tabId, url, pdfDarkMode) {
  if (!isPDFUrl(url)) return;

  const cssToInject = pdfDarkMode ? PDF_DARK_CSS : PDF_LIGHT_CSS;

  try {
    // Remove any previously injected PDF CSS first to avoid accumulation
    // (scripting.removeCSS needs the exact CSS string that was inserted)
    try {
      await chrome.scripting.removeCSS({
        target: { tabId, allFrames: true },
        css: PDF_DARK_CSS,
      });
    } catch (_) { /* ignore – may not have been injected yet */ }
    try {
      await chrome.scripting.removeCSS({
        target: { tabId, allFrames: true },
        css: PDF_LIGHT_CSS,
      });
    } catch (_) { /* ignore */ }

    await chrome.scripting.insertCSS({
      target: { tabId, allFrames: true },
      css: cssToInject,
    });

    console.log(`[Noctiv] PDF ${pdfDarkMode ? 'dark' : 'light'} mode applied to tab ${tabId}`);
  } catch (e) {
    // This can happen on restricted pages – log and move on
    console.warn(`[Noctiv] Could not inject PDF CSS into tab ${tabId}:`, e.message);
  }
}

/**
 * Scan all currently open tabs and apply PDF theming to any PDF tabs.
 * Called when pdfDarkMode setting changes or on startup.
 */
async function applyPDFThemeToAllPDFTabs(pdfDarkMode) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && isPDFUrl(tab.url)) {
      await applyPDFThemeToTab(tab.id, tab.url, pdfDarkMode);
    }
  }
}

// ─── Install / startup ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.sync.set({
      themeMode:      'system',
      customDarkCSS:  '',
      customLightCSS: '',
      pdfDarkMode:    true,
      officeDarkMode: true,
      adblockEnabled: true,
      allowlist:      [],
    });
    console.log('[Noctiv] Default settings initialized.');
  }

  const { adblockEnabled = true } = await getSettings('adblockEnabled');
  await applyAdblockState(adblockEnabled);

  const { allowlist = [] } = await getSettings('allowlist');
  await applyAllowlistRules(allowlist);
});

chrome.runtime.onStartup.addListener(async () => {
  const { adblockEnabled = true } = await getSettings('adblockEnabled');
  await applyAdblockState(adblockEnabled);

  const { allowlist = [] } = await getSettings('allowlist');
  await applyAllowlistRules(allowlist);

  // Re-apply PDF theme to any PDF tabs open at startup
  const { pdfDarkMode = true } = await getSettings('pdfDarkMode');
  await applyPDFThemeToAllPDFTabs(pdfDarkMode);
});

// ─── Tab detection: inject PDF CSS when a PDF tab finishes loading ────────────

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only act when the tab has fully loaded and has a URL
  if (changeInfo.status !== 'complete' || !tab.url) return;
  if (!isPDFUrl(tab.url)) return;

  const { pdfDarkMode = true } = await getSettings('pdfDarkMode');
  await applyPDFThemeToTab(tabId, tab.url, pdfDarkMode);
});

// ─── Storage changes ──────────────────────────────────────────────────────────

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'sync') return;

  if (changes.adblockEnabled) {
    await applyAdblockState(changes.adblockEnabled.newValue ?? true);
  }

  if (changes.pdfDarkMode) {
    // Update all currently open PDF tabs immediately
    await applyPDFThemeToAllPDFTabs(changes.pdfDarkMode.newValue ?? true);
  }
});

// ─── Ad blocking ──────────────────────────────────────────────────────────────

async function applyAdblockState(enabled) {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds:  enabled ? ['ruleset_1', 'ruleset_2'] : [],
      disableRulesetIds: enabled ? [] : ['ruleset_1', 'ruleset_2'],
    });
  } catch (e) {
    console.error('[Noctiv] Failed to update adblock rulesets:', e);
  }
}

// ─── Allowlist ────────────────────────────────────────────────────────────────

async function applyAllowlistRules(allowlist) {
  const removeIds = Array.from(
    { length: MAX_ALLOWLIST_ENTRIES },
    (_, i) => ALLOWLIST_RULE_ID_BASE + i
  );

  const addRules = allowlist.slice(0, MAX_ALLOWLIST_ENTRIES).map((domain, i) => ({
    id:       ALLOWLIST_RULE_ID_BASE + i,
    priority: 2,
    action:   { type: 'allow' },
    condition: {
      urlFilter:     `||${domain}^`,
      resourceTypes: ['main_frame', 'sub_frame', 'script', 'xmlhttprequest',
                      'image', 'stylesheet', 'font', 'media', 'websocket'],
    },
  }));

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules });
  } catch (e) {
    console.error('[Noctiv] Failed to update allowlist rules:', e);
  }
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'getAdblockStats': {
          chrome.declarativeNetRequest.getMatchedRules({}, (result) => {
            if (chrome.runtime.lastError) {
              sendResponse({ blockedCount: null, error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ blockedCount: result?.rulesMatchedInfo?.length ?? 0 });
            }
          });
          return; // sendResponse called in callback
        }

        case 'adblockToggled': {
          await applyAdblockState(message.enabled ?? true);
          sendResponse({ ok: true });
          break;
        }

        case 'toggleAllowlist': {
          const { allowlist = [] } = await getSettings('allowlist');
          let updated = [...allowlist];
          if (message.add) {
            if (!updated.includes(message.domain)) updated.push(message.domain);
          } else {
            updated = updated.filter(d => d !== message.domain);
          }
          await chrome.storage.sync.set({ allowlist: updated });
          await applyAllowlistRules(updated);
          sendResponse({ ok: true });
          break;
        }

        case 'pdfThemeChanged': {
          // Also triggered from popup/options; update open PDF tabs immediately
          const enabled = message.enabled ?? true;
          await applyPDFThemeToAllPDFTabs(enabled);
          sendResponse({ ok: true });
          break;
        }

        default:
          sendResponse({ ok: false, error: 'Unknown action' });
      }
    } catch (err) {
      console.error('[Noctiv] Message handler error:', err);
      sendResponse({ ok: false, error: err.message });
    }
  })();

  return true;
});