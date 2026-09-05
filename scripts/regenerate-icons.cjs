/**
 * Regenerate PWA / favicon PNGs as full-bleed opaque squares.
 * Transparent rounded corners anti-alias to a white fringe on dark taskbars.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const BG = "#09090b";
const FG = "#fafafa";

function logoSvg(size, insetRatio = 0.22) {
  const inset = Math.round(size * insetRatio);
  const mark = size - inset * 2;
  const scale = mark / 24;
  const tx = inset + mark / 2;
  const ty = inset + mark / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${tx} ${ty}) scale(${scale}) translate(-12 -12)" stroke="${FG}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
  </g>
</svg>`;
}

async function renderPng(size, insetRatio) {
  // Flatten + removeAlpha: Sharp's SVG renderer can leave a 1px fringe otherwise.
  return sharp(Buffer.from(logoSvg(size, insetRatio)), { density: 288 })
    .resize(size, size, { fit: "fill" })
    .flatten({ background: BG })
    .removeAlpha()
    .png({ compressionLevel: 9, force: true })
    .toBuffer();
}

async function writePng(filePath, size, insetRatio) {
  const rendered = await renderPng(size, insetRatio);
  fs.writeFileSync(filePath, rendered);
  console.log("wrote", path.relative(ROOT, filePath), `${size}x${size}`, `${rendered.length} bytes`);
}

/** Minimal multi-size ICO with embedded PNGs (Vista+) — no extra dependency. */
function pngToIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries = [];
  for (const png of pngBuffers) {
    const w = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19];
    const h = (png[20] << 24) | (png[21] << 16) | (png[22] << 8) | png[23];
    entries.push({
      width: w >= 256 ? 0 : w,
      height: h >= 256 ? 0 : h,
      size: png.length,
      offset,
      png,
    });
    offset += png.length;
  }
  const out = Buffer.alloc(offset);
  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(count, 4);
  let entryOffset = 6;
  for (const e of entries) {
    out[entryOffset++] = e.width;
    out[entryOffset++] = e.height;
    out[entryOffset++] = 0;
    out[entryOffset++] = 0;
    out.writeUInt16LE(1, entryOffset);
    entryOffset += 2;
    out.writeUInt16LE(32, entryOffset);
    entryOffset += 2;
    out.writeUInt32LE(e.size, entryOffset);
    entryOffset += 4;
    out.writeUInt32LE(e.offset, entryOffset);
    entryOffset += 4;
  }
  for (const e of entries) {
    e.png.copy(out, e.offset);
  }
  return out;
}

async function main() {
  await writePng(path.join(ROOT, "public/icon-192x192.png"), 192, 0.2);
  await writePng(path.join(ROOT, "public/icon-512x512.png"), 512, 0.2);
  await writePng(path.join(ROOT, "public/apple-icon.png"), 180, 0.18);
  await writePng(path.join(ROOT, "public/utility-logo-og.png"), 512, 0.2);
  await writePng(path.join(ROOT, "public/utility-logo.png"), 512, 0.2);
  await writePng(path.join(ROOT, "src/app/icon.png"), 32, 0.18);
  await writePng(path.join(ROOT, "src/app/apple-icon.png"), 180, 0.18);

  const ico = pngToIco([
    await renderPng(16, 0.12),
    await renderPng(32, 0.18),
    await renderPng(48, 0.18),
  ]);
  fs.writeFileSync(path.join(ROOT, "public/favicon.ico"), ico);
  console.log("wrote public/favicon.ico", `${ico.length} bytes`);

  await sharp(Buffer.from(logoSvg(512, 0.2)))
    .flatten({ background: BG })
    .webp({ quality: 90 })
    .toFile(path.join(ROOT, "public/utility-logo.webp"));
  console.log("wrote public/utility-logo.webp");

  fs.writeFileSync(
    path.join(ROOT, "public/utility-logo.svg"),
    logoSvg(512, 0.22).replace('<?xml version="1.0" encoding="UTF-8"?>\n', "") + "\n",
  );
  console.log("updated public/utility-logo.svg");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
