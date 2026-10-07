import fs from 'node:fs';
import { chromium } from 'playwright-core';

const candidates = [
  process.env.CHROME_BIN,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);

const executablePath = candidates.find((p) => fs.existsSync(p));
if (!executablePath) {
  throw new Error('No Chromium/Chrome executable found on runner');
}

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1
});
const page = await context.newPage();

const runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
});

await page.goto('http://127.0.0.1:4173/', {
  waitUntil: 'networkidle',
  timeout: 30_000
});

await page.waitForFunction(() => Boolean(window.__MAVKA_GAME__), null, { timeout: 15_000 });
await page.waitForFunction(() => {
  const game = window.__MAVKA_GAME__;
  return game?.scene?.getScenes(true)?.some((scene) => scene.scene.key === 'title');
}, null, { timeout: 15_000 });

const assetsReady = await page.evaluate(() => {
  const game = window.__MAVKA_GAME__;
  return Boolean(
    game?.textures?.exists('region-bg') &&
    game?.textures?.exists('battle-bg')
  );
});
if (!assetsReady) throw new Error('Visual atlas frames did not initialize');

await page.mouse.click(200, 360);
await page.waitForFunction(() => {
  const game = window.__MAVKA_GAME__;
  return game?.scene?.getScenes(true)?.some((scene) => scene.scene.key === 'region');
}, null, { timeout: 10_000 });

await page.mouse.click(1010, 505);
await page.waitForTimeout(250);
await page.mouse.click(640, 485);
await page.waitForFunction(() => {
  const game = window.__MAVKA_GAME__;
  return game?.scene?.getScenes(true)?.some((scene) => scene.scene.key === 'battle');
}, null, { timeout: 10_000 });

await page.mouse.click(248, 645);
await page.waitForTimeout(1200);

const active = await page.evaluate(() =>
  window.__MAVKA_GAME__?.scene?.getScenes(true)?.map((scene) => scene.scene.key) ?? []
);

if (!active.includes('battle')) {
  throw new Error(`Battle scene not active after skill interaction: ${active.join(', ')}`);
}

await page.screenshot({ path: 'runtime-smoke.png', fullPage: true });

await browser.close();

if (runtimeErrors.length) {
  throw new Error(`Browser runtime errors:\n${runtimeErrors.join('\n')}`);
}

console.log('MAVKA_RUNTIME_SMOKE_OK');
