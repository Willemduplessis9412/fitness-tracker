// One-off script: renders the Play Store feature graphic (1024x500) by compositing the app's
// ACTUAL logo lockup (public/video-thumbnail.png -- pulse mark + "FIT DATA" wordmark, the same
// asset already used on the live site) onto the app's cream background color (--bg from
// fitness-tracker.jsx). Does not redraw the mark/wordmark -- reuses the real asset as-is.
// Not part of the app bundle -- run manually, output committed as a static PNG for the
// Play Store listing.
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const toPath = (rel) => fileURLToPath(new URL(rel, import.meta.url));

const W = 1024;
const H = 500;

const BG = '#F1F1EE';
const INK_SOFT = '#1E1E1C';
const ACCENT = '#FF4500';

// The source asset is a flattened white-background PNG (no real transparency), so key out
// near-white pixels to transparent before compositing onto the cream background -- otherwise
// it shows up as a visible white card instead of sitting directly on the page like it does
// on the live site.
const { data: rawLogo, info: rawInfo } = await sharp(toPath('../public/video-thumbnail.png'))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
for (let i = 0; i < rawLogo.length; i += 4) {
  if (rawLogo[i] > 245 && rawLogo[i + 1] > 245 && rawLogo[i + 2] > 245) {
    rawLogo[i + 3] = 0;
  }
}
const keyedLogo = sharp(rawLogo, { raw: rawInfo }).png();

const logoHeight = 300;
const logoWidth = Math.round((rawInfo.width / rawInfo.height) * logoHeight);
const logoBuffer = await keyedLogo.resize({ height: logoHeight, kernel: 'lanczos3' }).toBuffer();

const logoLeft = Math.round((W - logoWidth) / 2);
const logoTop = 60;

const overlaySvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <text x="${W / 2}" y="${logoTop + logoHeight + 55}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="26" fill="${INK_SOFT}" opacity="0.75">Workouts, nutrition &amp; progress in one place.</text>
  <rect x="${W / 2 - 32}" y="${logoTop + logoHeight + 78}" width="64" height="5" rx="2.5" fill="${ACCENT}" />
</svg>`;

await sharp({
  create: { width: W, height: H, channels: 4, background: BG }
})
  .composite([
    { input: logoBuffer, left: logoLeft, top: logoTop },
    { input: Buffer.from(overlaySvg), left: 0, top: 0 }
  ])
  .png()
  .toFile(toPath('../assets/feature-graphic.png'));

console.log('wrote assets/feature-graphic.png (1024x500)');
