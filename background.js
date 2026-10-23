chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.sync.set({
    adblockEnabled: true,
    themeMode: 'system',
    customDarkCSS: '',
    customLightCSS: '',
    pdfDarkMode: true,
    officeDarkMode: true,
    allowlist: []
  }, () => {
    console.log('Noctiv: Default settings initialized');
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.adblockEnabled) {
    updateAdblockState(changes.adblockEnabled.newValue);
  }
});

async function updateAdblockState(enabled) {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enabled ? ['ruleset_1', 'ruleset_2'] : [],
      disableRulesetIds: enabled ? [] : ['ruleset_1', 'ruleset_2']
    });
  } catch (e) {
    console.error('Failed to update adblock state:', e);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getAdblockStats') {
    chrome.declarativeNetRequest.getMatchedRules({}, (rules) => {
      sendResponse({ blockedCount: rules.length });
    });
    return true;
  }
  if (message.action === 'toggleAllowlist') {
    toggleAllowlist(message.domain, message.add);
    sendResponse({ success: true });
    return true;
  }
});

async function toggleAllowlist(domain, add) {
  const { allowlist = [] } = await chrome.storage.sync.get('allowlist');
  let updated = [...allowlist];
  if (add) {
    if (!updated.includes(domain)) updated.push(domain);
  } else {
    updated = updated.filter(d => d !== domain);
  }
  await chrome.storage.sync.set({ allowlist: updated });
  await updateDynamicAllowlistRules(updated);
}

async function updateDynamicAllowlistRules(allowlist) {
  const rules = allowlist.map((domain, index) => ({
    id: index + 10000,
    priority: 1,
    action: { type: 'allow' },
    condition: { urlFilter: `||${domain}^`, resourceTypes: ['main_frame', 'sub_frame', 'script', 'xmlhttprequest', 'image', 'stylesheet'] }
  }));
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from({ length: allowlist.length }, (_, i) => i + 10000),
      addRules: rules
    });
  } catch (e) {
    console.error('Failed to update allowlist rules:', e);
  }
}

chrome.runtime.onStartup.addListener(async () => {
  const { adblockEnabled = true } = await chrome.storage.sync.get('adblockEnabled');
  updateAdblockState(adblockEnabled);
  const { allowlist = [] } = await chrome.storage.sync.get('allowlist');
  updateDynamicAllowlistRules(allowlist);
});