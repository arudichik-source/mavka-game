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

await page.addInitScript(() => {
  localStorage.setItem('mavka-game-save-v2', JSON.stringify({
    version: 2,
    seenIntro: true
  }));
});

const runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('Failed to load resource')) {
    runtimeErrors.push(`console: ${message.text()}`);
  }
});
page.on('response', (response) => {
  const url = response.url();
  if (response.status() >= 400 && !url.endsWith('/favicon.ico')) {
    runtimeErrors.push(`http ${response.status()}: ${url}`);
  }
});
page.on('requestfailed', (request) => {
  const url = request.url();
  if (!url.endsWith('/favicon.ico')) {
    runtimeErrors.push(`requestfailed: ${url} ${request.failure()?.errorText ?? ''}`);
  }
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

await fs.promises.mkdir('visual-qa', { recursive: true });
await page.screenshot({ path: 'visual-qa/title.png', fullPage: true });
await page.mouse.move(200, 360);
await page.waitForTimeout(160);
await page.screenshot({ path: 'visual-qa/title-hover.png', fullPage: true });

await page.mouse.click(200, 360);
await page.waitForFunction(() => {
  const game = window.__MAVKA_GAME__;
  return game?.scene?.getScenes(true)?.some((scene) => scene.scene.key === 'region');
}, null, { timeout: 10_000 });

await page.waitForTimeout(180);

await page.screenshot({ path: 'visual-qa/region.png', fullPage: true });
await page.mouse.move(397, 164);
await page.waitForTimeout(240);
await page.screenshot({ path: 'visual-qa/region-marker-hover.png', fullPage: true });

// Capture hover feedback on the real Old Oak marker without drawing extra cards.
await page.mouse.move(397, 164);
await page.waitForTimeout(180);
await page.screenshot({ path: 'visual-qa/region-oak-hover.png', fullPage: true });

// Start the battle through Phaser for deterministic CI. Direct scenery interaction
// is exercised in the live build; canvas click coordinates can vary by runner timing.
await page.evaluate(() => {
  const game = window.__MAVKA_GAME__;
  const region = game?.scene?.getScene('region');
  region?.scene?.start('battle', { encounterId: 'guardian' });
});
await page.waitForFunction(() => {
  const game = window.__MAVKA_GAME__;
  return game?.scene?.getScenes(true)?.some((scene) => scene.scene.key === 'battle');
}, null, { timeout: 10_000 });

await page.screenshot({ path: 'visual-qa/battle-idle.png', fullPage: true });
await page.mouse.move(160, 645);
await page.waitForTimeout(180);
await page.screenshot({ path: 'visual-qa/battle-skill-hover.png', fullPage: true });
await page.mouse.click(160, 645);
await page.waitForTimeout(1200);

const active = await page.evaluate(() =>
  window.__MAVKA_GAME__?.scene?.getScenes(true)?.map((scene) => scene.scene.key) ?? []
);

if (!active.includes('battle')) {
  throw new Error(`Battle scene not active after skill interaction: ${active.join(', ')}`);
}

await page.screenshot({ path: 'runtime-smoke.png', fullPage: true });
await page.screenshot({ path: 'visual-qa/battle.png', fullPage: true });

await browser.close();

if (runtimeErrors.length) {
  throw new Error(`Browser runtime errors:\n${runtimeErrors.join('\n')}`);
}

console.log('MAVKA_RUNTIME_SMOKE_OK');
