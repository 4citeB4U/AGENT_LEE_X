import { test, expect } from '@playwright/test';

test('COOP/COEP isolation + SAB present', async ({ page }) => {
  await page.goto('/voice-smoke', { waitUntil: 'load' });

  const isolated = await page.evaluate(() => (globalThis as any).crossOriginIsolated === true);
  expect(isolated).toBeTruthy();

  const sabOk = await page.evaluate(() => { try { /* @ts-ignore */ return !!new SharedArrayBuffer(8); } catch { return false; } });
  expect(sabOk).toBeTruthy();
});
import { test, expect } from '@playwright/test';

test('COOP/COEP isolation + SAB', async ({ page }) => {
  await page.goto('http://localhost:9002/voice-smoke', { waitUntil: 'load' });

  const isolated = await page.evaluate(() => (globalThis as any).crossOriginIsolated === true);
  expect(isolated).toBeTruthy();

  const sabOk = await page.evaluate(() => {
    try { return !!(new SharedArrayBuffer(8)); } catch { return false; }
  });
  expect(sabOk).toBeTruthy();
});
