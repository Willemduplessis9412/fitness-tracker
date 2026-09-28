// Composites the raw app captures in scripts/_raw-*.png into Play-Store-ready marketing
// screenshots: a dark branded headline band (matching the app's own landing-page hero style
// and the palette already used in generate-feature-graphic.mjs) on top, and the actual app
// screen -- cropped to one screen's worth, upscaled 2x, rounded and drop-shadowed like a
// device card -- below. Output: assets/screenshots/*.png, 1080x2050 (within Play's 2:1 max
// ratio), no alpha channel.
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';

const toPath = (rel) => fileURLToPath(new URL(rel, import.meta.url));

const BG = '#F1F1EE';
const BAND_BG = '#141414';
const ACCENT = '#FF4500';
const INK_SOFT = '#1E1E1C';

const CANVAS_W = 1080;
const CANVAS_H = 2050;
const BAND_H = 420;
const FRAME_BOX = { w: 940, h: CANVAS_H - BAND_H - 90 }; // bounding box the screenshot fits inside

const SHOTS = [
  { file: '_raw-dashboard.png', top: 0, height: 1150, out: 'dashboard.png',
    headline: 'Your whole day,\nat a glance' },
  { file: '_raw-log-food.png', top: 0, height: 1147, out: 'food-log.png',
    headline: 'Log meals in\nseconds' },
  { file: '_raw-log-workout.png', top: 0, height: 1025, out: 'workout-log.png',
    headline: 'Every workout,\ntracked' },
  { file: '_raw-log-steps.png', top: 0, height: 1025, out: 'steps.png',
    headline: 'Hit your step\ngoal, daily' },
  { file: '_raw-goals.png', top: 0, height: 1300, out: 'goals.png',
    headline: 'Set goals.\nCrush them.' },
  { file: '_raw-fitness-test.png', top: 0, height: 1200, out: 'fitness-test.png',
    headline: 'Watch your\nstrength climb' },
  { file: '_raw-profile.png', top: 2661, height: 1100, out: 'measurements.png',
    headline: 'Every measurement,\ntrending your way' },
];

// `buffer` must already be exactly width x height -- this only applies the rounded mask,
// it does not resize (an earlier version re-resized here with fit:'cover', which silently
// re-cropped content that the caller had already correctly fitted).
async function roundedCard(buffer, width, height, radius) {
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  );
  return sharp(buffer)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function build(shot) {
  const srcPath = toPath('../scripts/' + shot.file);
  const cropped = await sharp(srcPath)
    .extract({ left: 0, top: shot.top, width: 540, height: shot.height })
    .toBuffer();

  // Upscale 2x. sharp's .metadata() reflects the INPUT image, not queued resize ops, so read
  // the real output size back from toBuffer's info rather than trusting .metadata() here.
  const { data: upscaledBuf, info: upscaledInfo } = await sharp(cropped)
    .resize({ width: 1080, kernel: 'lanczos3' })
    .toBuffer({ resolveWithObject: true });

  // Fit inside the frame bounding box, preserving aspect ratio (no cropping).
  const scale = Math.min(FRAME_BOX.w / upscaledInfo.width, FRAME_BOX.h / upscaledInfo.height, 1);
  const frameW = Math.round(upscaledInfo.width * scale);
  const frameH = Math.round(upscaledInfo.height * scale);

  const fitted = await sharp(upscaledBuf).resize(frameW, frameH, { fit: 'fill' }).toBuffer();
  const card = await roundedCard(fitted, frameW, frameH, 28);

  const frameLeft = Math.round((CANVAS_W - frameW) / 2);
  let frameTop = BAND_H + Math.round((CANVAS_H - BAND_H - frameH) / 2) - 20;
  // Never let the card render above/into the headline band, however tall the source crop is.
  frameTop = Math.max(frameTop, BAND_H + 24);

  // Fake drop shadow: a blurred dark rounded rect, offset down, behind the card.
  const shadowSvg = `
    <svg width="${CANVAS_W}" height="${CANVAS_H}">
      <defs>
        <filter id="b" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18"/>
        </filter>
      </defs>
      <rect x="${frameLeft}" y="${frameTop + 18}" width="${frameW}" height="${frameH}" rx="28" ry="28" fill="#000" opacity="0.28" filter="url(#b)"/>
    </svg>`;

  // Sized to the FULL canvas height (not just BAND_H) even though all its content sits in the
  // top band -- an SVG buffer composited at a size shorter than the canvas it's placed on
  // triggered a stray duplicate render further down the page (some rsvg/sharp rasterization
  // quirk); sizing to the full canvas, matching shadowSvg below, avoids it.
  const lines = shot.headline.split('\n');
  const headlineSvg = `
    <svg width="${CANVAS_W}" height="${CANVAS_H}">
      <text x="60" y="120" font-family="'Space Grotesk', Inter, Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="2" fill="${ACCENT}">FIT DATA</text>
      ${lines.map((line, i) => `<text x="60" y="${210 + i * 66}" font-family="'Space Grotesk', Inter, Arial, sans-serif" font-size="56" font-weight="700" fill="#FFFFFF">${line}</text>`).join('\n')}
      <rect x="60" y="${210 + lines.length * 66 - 40}" width="72" height="6" rx="3" fill="${ACCENT}"/>
    </svg>`;
  const bandSvg = `<svg width="${CANVAS_W}" height="${CANVAS_H}"><rect width="${CANVAS_W}" height="${BAND_H}" fill="${BAND_BG}"/></svg>`;

  // Two separate composite passes, not one array mixing SVG-rendered buffers with the raster
  // card PNG: doing it all in one .composite([...]) call reproducibly bled a fragment of the
  // card (its "Add goal" button) into the band area near the top -- a libvips/sharp quirk when
  // mixing SVG and raster composite inputs together, not a positioning bug. Rendering the SVG
  // background layers to a flattened buffer first, then compositing the card onto that in its
  // own pass, avoids it.
  const background = await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG } })
    .composite([
      { input: Buffer.from(bandSvg), left: 0, top: 0 },
      { input: Buffer.from(headlineSvg), left: 0, top: 0 },
      { input: Buffer.from(shadowSvg), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();

  await sharp(background)
    .composite([{ input: card, left: frameLeft, top: frameTop }])
    .flatten({ background: BG })
    .png()
    .toFile(toPath('../assets/screenshots/' + shot.out));

  console.log(`wrote assets/screenshots/${shot.out} (${CANVAS_W}x${CANVAS_H})`);
}

await mkdir(toPath('../assets/screenshots'), { recursive: true });
for (const shot of SHOTS) await build(shot);
