// One-off script: makes the existing screenshots in public/screenshots Play-Store-compliant.
// Play rejects screenshots that (a) carry an alpha channel, or (b) have an aspect ratio taller
// than 2:1. These are raw RGBA captures at up to 1080x2275 (ratio 2.11), so: flatten onto white
// (the app's --paper background) to drop the alpha channel, then crop from the top down to a
// safe 1080x2050 (ratio 1.9) where needed. Does not regenerate or redesign the screenshots.
import sharp from 'sharp';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';

const dir = fileURLToPath(new URL('../public/screenshots/', import.meta.url));
const outDir = fileURLToPath(new URL('../assets/screenshots/', import.meta.url));
await import('fs/promises').then(fs => fs.mkdir(outDir, { recursive: true }));

const MAX_RATIO = 1.9;

for (const file of readdirSync(dir).filter(f => f.endsWith('.png'))) {
  const img = sharp(dir + file);
  const meta = await img.metadata();
  const maxHeight = Math.floor(meta.width * MAX_RATIO);
  const targetHeight = Math.min(meta.height, maxHeight);

  await sharp(dir + file)
    .flatten({ background: '#FFFFFF' })
    .extract({ left: 0, top: 0, width: meta.width, height: targetHeight })
    .png()
    .toFile(outDir + file);

  console.log(`${file}: ${meta.width}x${meta.height} -> ${meta.width}x${targetHeight}`);
}
