import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const ART_DIR = path.join(ROOT, 'src', 'art');
const OUT_DIR = path.join(ROOT, 'public', 'generated');

async function readChunk(index) {
  const name = `chunk${String(index).padStart(2, '0')}.ts`;
  const raw = await fs.readFile(path.join(ART_DIR, name), 'utf8');
  const match = raw.match(/export default\s+("(?:[^"\\]|\\.)*")\s*;/s);
  if (!match) throw new Error(`Unable to parse ${name}`);
  return JSON.parse(match[1]);
}

const chunks = await Promise.all(Array.from({ length: 10 }, (_, i) => readChunk(i)));
const atlas = Buffer.from(chunks.join(''), 'base64');

const metadata = await sharp(atlas).metadata();
if (metadata.width !== 512 || metadata.height !== 576) {
  throw new Error(`Unexpected atlas size: ${metadata.width}x${metadata.height}`);
}

await fs.mkdir(OUT_DIR, { recursive: true });

async function renderFrame(name, top, options) {
  const output = path.join(OUT_DIR, `${name}.webp`);
  await sharp(atlas)
    .extract({ left: 0, top, width: 512, height: 288 })
    .resize(1920, 1080, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false
    })
    .modulate({
      brightness: options.brightness,
      saturation: options.saturation
    })
    .linear(options.contrast, options.offset)
    .sharpen({ sigma: options.sharpen })
    .webp({
      quality: 94,
      alphaQuality: 100,
      smartSubsample: true,
      effort: 5
    })
    .toFile(output);

  const stat = await fs.stat(output);
  if (stat.size < 150_000) {
    throw new Error(`${name}.webp is unexpectedly small: ${stat.size} bytes`);
  }
  console.log(`generated ${name}.webp: ${Math.round(stat.size / 1024)} KiB`);
}

await renderFrame('region-hd', 0, {
  brightness: 1.015,
  saturation: 1.045,
  contrast: 1.035,
  offset: -4,
  sharpen: 1.1
});

await renderFrame('battle-hd', 288, {
  brightness: 1.01,
  saturation: 1.055,
  contrast: 1.04,
  offset: -5,
  sharpen: 1.15
});
