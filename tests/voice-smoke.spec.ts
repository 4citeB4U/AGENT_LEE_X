import { test, expect } from '@playwright/test';

test('agent lee voice is set and UI shows am_michael', async ({ page }) => {
  await page.goto('http://localhost:9002/voice-smoke');

  // Wait for select to appear
  const select = await page.locator('#voiceSelect');
  await expect(select).toBeVisible({ timeout: 10000 });

  // Check DOM selected value
  const value = await select.evaluate((el: HTMLSelectElement) => el.value);
  expect(value).toBe('am_michael');

  // Check localStorage
  const lsVoice = await page.evaluate(() => localStorage.getItem('agentlee_voice'));
  expect(lsVoice).toBe('am_michael');

  // Optionally click Speak (best-effort: headless audio may not play)
  // Match exact button text 'Speak' (avoid matching 'Speak Answer')
  const speakBtn = page.locator('button', { hasText: /^Speak$/ });
  if (await speakBtn.count() > 0) {
    await speakBtn.first().click();
    // Wait a short time for any network/model load
    await page.waitForTimeout(3000);
  }
});
