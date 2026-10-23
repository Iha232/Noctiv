const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'icons');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6200ea"/>
      <stop offset="100%" style="stop-color:#bb86fc"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#bg)"/>
  <circle cx="64" cy="64" r="40" fill="none" stroke="white" stroke-width="6"/>
  <path d="M64 16v20M64 92v20M16 64h20M92 64h20M28.5 28.5l14 14M85.5 85.5l14 14M28.5 99.5l14-14M85.5 42.5l14-14" stroke="white" stroke-width="5" stroke-linecap="round"/>
</svg>`;

function createSimplePNG(size) {
  const canvas = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6200ea"/>
      <stop offset="100%" style="stop-color:#bb86fc"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.1875)}" fill="url(#bg)"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.3125}" fill="none" stroke="white" stroke-width="${Math.max(1, size * 0.047)}"/>
  <path d="M${size/2} ${size*0.125}v${size*0.156}M${size/2} ${size*0.719}v${size*0.156}M${size*0.125} ${size/2}h${size*0.156}M${size*0.719} ${size/2}h${size*0.156}M${size*0.223} ${size*0.223}l${size*0.109} ${size*0.109}M${size*0.668} ${size*0.668}l${size*0.109} ${size*0.109}M${size*0.223} ${size*0.777}l${size*0.109} -${size*0.109}M${size*0.668} ${size*0.332}l${size*0.109} -${size*0.109}" stroke="white" stroke-width="${Math.max(1, size * 0.039)}" stroke-linecap="round"/>
</svg>`;
  
  fs.writeFileSync(path.join(ICONS_DIR, `icon${size}.svg`), canvas);
  console.log(`Created icon${size}.svg`);
}

[16, 32, 48, 128].forEach(createSimplePNG);

console.log('SVG icons created. Convert to PNG using an image converter or browser.');