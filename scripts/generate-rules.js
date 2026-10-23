const fs = require('fs');
const path = require('path');
const https = require('https');

const RULES_DIR = path.join(__dirname, 'rules');
const EASYLIST_URL = 'https://easylist.to/easylist/easylist.txt';
const EASYPRIVACY_URL = 'https://easylist.to/easylist/easyprivacy.txt';

const MAX_STATIC_RULES = 30000;
const MAX_DYNAMIC_RULES = 5000;

function downloadList(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseFilterList(text) {
  const lines = text.split('\n');
  const rules = [];
  let ruleId = 1;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) continue;
    
    if (trimmed.startsWith('@@')) continue;
    
    let urlFilter = trimmed;
    let options = {};
    
    if (trimmed.includes('$')) {
      const parts = trimmed.split('$');
      urlFilter = parts[0];
      const opts = parts[1].split(',');
      for (const opt of opts) {
        if (opt === 'script') options.resourceTypes = ['script'];
        else if (opt === 'image') options.resourceTypes = ['image'];
        else if (opt === 'stylesheet') options.resourceTypes = ['stylesheet'];
        else if (opt === 'xmlhttprequest') options.resourceTypes = ['xmlhttprequest'];
        else if (opt === 'subdocument') options.resourceTypes = ['sub_frame'];
        else if (opt === 'third-party') options.domainType = 'thirdParty';
        else if (opt.startsWith('domain=')) {
          const domains = opt.slice(7).split('|');
          options.initiatorDomains = domains.filter(d => !d.startsWith('~'));
          options.excludedInitiatorDomains = domains.filter(d => d.startsWith('~')).map(d => d.slice(1));
        }
      }
    }
    
    urlFilter = urlFilter
      .replace(/\^\|$/, '')
      .replace(/\|\|/g, '||')
      .replace(/\|/g, '')
      .replace(/\^/g, '')
      .replace(/\*+/g, '*');
    
    if (!urlFilter || urlFilter.length < 2) continue;
    
    const rule = {
      id: ruleId++,
      priority: 1,
      action: { type: 'block' },
      condition: { urlFilter, ...options }
    };
    
    if (options.resourceTypes) {
      rule.condition.resourceTypes = options.resourceTypes;
    }
    if (options.initiatorDomains) {
      rule.condition.initiatorDomains = options.initiatorDomains;
    }
    if (options.excludedInitiatorDomains) {
      rule.condition.excludedInitiatorDomains = options.excludedInitiatorDomains;
    }
    
    rules.push(rule);
    
    if (rules.length >= MAX_STATIC_RULES) break;
  }
  
  return rules;
}

async function generateRules() {
  console.log('Downloading EasyList...');
  const easylistText = await downloadList(EASYLIST_URL);
  console.log('Downloading EasyPrivacy...');
  const easyprivacyText = await downloadList(EASYPRIVACY_URL);
  
  console.log('Parsing EasyList...');
  const adRules = parseFilterList(easylistText);
  console.log(`Generated ${adRules.length} ad rules`);
  
  console.log('Parsing EasyPrivacy...');
  const trackerRules = parseFilterList(easyprivacyText);
  console.log(`Generated ${trackerRules.length} tracker rules`);
  
  if (!fs.existsSync(RULES_DIR)) {
    fs.mkdirSync(RULES_DIR, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(RULES_DIR, 'adblock-rules.json'),
    JSON.stringify(adRules, null, 2)
  );
  
  fs.writeFileSync(
    path.join(RULES_DIR, 'tracker-rules.json'),
    JSON.stringify(trackerRules, null, 2)
  );
  
  console.log('Rules written to rules/ directory');
  console.log('Done!');
}

generateRules().catch(console.error);