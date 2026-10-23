const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'icons');

function createMinimalPNG(size) {
  const header = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  ]);
  
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(size, 8);
  ihdr.writeUInt32BE(size, 12);
  ihdr[16] = 8;
  ihdr[17] = 2;
  ihdr[18] = 0;
  ihdr[19] = 0;
  ihdr[20] = 0;
  const crc1 = crc32(ihdr.slice(4));
  ihdr.writeUInt32BE(crc1, 21);
  
  const pixels = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x - size/2;
      const cy = y - size/2;
      const dist = Math.sqrt(cx*cx + cy*cy);
      const radius = size * 0.45;
      const innerRadius = size * 0.25;
      
      let r, g, b;
      if (dist < innerRadius) {
        r = 255; g = 255; b = 255;
      } else if (dist < radius) {
        const t = (dist - innerRadius) / (radius - innerRadius);
        r = Math.round(98 + (187 - 98) * t);
        g = Math.round(0 + (134 - 0) * t);
        b = Math.round(234 + (252 - 234) * t);
      } else {
        const t = (dist - radius) / (size * 0.5 - radius);
        r = Math.round(98 + (255 - 98) * t);
        g = Math.round(0 + (255 - 0) * t);
        b = Math.round(234 + (255 - 234) * t);
      }
      
      const idx = (y * size + x) * 3;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
    }
  }
  
  const idatData = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    idatData[y * (1 + size * 3)] = 0;
    pixels.copy(idatData, y * (1 + size * 3) + 1, y * size * 3, (y + 1) * size * 3);
  }
  
  const compressed = zlib.deflateSync(idatData);
  const idat = Buffer.alloc(12 + compressed.length);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const crc2 = crc32(idat.slice(4, 8 + compressed.length));
  idat.writeUInt32BE(crc2, 8 + compressed.length);
  
  const iend = Buffer.from([0,0,0,0, 0x49,0x45,0x4E,0x44, 0xAE,0x42,0x60,0x82]);
  
  return Buffer.concat([header, ihdr, idat, iend]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const zlib = require('zlib');

[16, 32, 48, 128].forEach(size => {
  try {
    const png = createMinimalPNG(size);
    fs.writeFileSync(path.join(ICONS_DIR, `icon${size}.png`), png);
    console.log(`Created icon${size}.png (${png.length} bytes)`);
  } catch (e) {
    console.error(`Failed to create icon${size}.png:`, e.message);
  }
});