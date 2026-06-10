import { test, expect, type Page } from '@playwright/test';

const APP = '/tuples/';
const STEP1_SQL = 'CREATE TABLE patients (patient_id INT, patient_name TEXT);';

async function typeInEditor(page: Page, sql: string) {
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
  await page.keyboard.type(sql);
}

test('full journey: landing → mission → solve → persist → review', async ({ page }) => {
  // ── Landing (new visitor) ──
  await page.goto(APP);
  await expect(page.getByRole('heading', { name: /Speak/ })).toBeVisible();
  await expect(page.getByText('Three worlds.')).toBeVisible();
  await page.getByTestId('landing-cta').click();

  // ── Mission selection ──
  await expect(page.getByRole('heading', { name: /Choose your/ })).toBeVisible();
  await page.getByRole('button', { name: 'Begin Mission' }).first().click();

  // ── Workspace boots: WASM engine + editor ready ──
  await expect(page.getByText('MISSION PATH')).toBeVisible();
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 30_000 });

  // ── Solve step 1 against the real SQLite engine ──
  await typeInEditor(page, STEP1_SQL);
  await page.getByRole('button', { name: /Submit/ }).click();

  await expect(page.getByTestId('success-toast')).toBeVisible();
  await expect(page.getByTestId('success-toast')).toContainText('XP');
  await expect(page.getByText('Step 2', { exact: false }).first()).toBeVisible();
  // Schema visualizer picked up the new table.
  await expect(page.getByText('patients').first()).toBeVisible();

  // ── Persistence: reload skips landing, keeps progress ──
  await page.reload();
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Step .*2.* \/ .*35|Step 2/).first()).toBeVisible();

  // ── Review mode: open completed step 1, then Esc back ──
  await page.getByRole('button', { name: /CREATE TABLE BASIC/ }).click();
  await expect(page.getByText(/Reviewing|Review/i).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.cm-content')).toBeVisible();
});

test('error coaching and test-run preview', async ({ page }) => {
  // Returning user: skip landing, fresh progress.
  await page.addInitScript(() => localStorage.setItem('tuples_entered', '1'));
  await page.goto(APP);
  await page.getByRole('button', { name: 'Begin Mission' }).first().click();
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 30_000 });

  // Wrong SQL → engine error surfaces, progress does not advance.
  await typeInEditor(page, 'CREATE TABLE oops (;');
  await page.getByRole('button', { name: /Submit/ }).click();
  await expect(page.locator('.font-mono-code.text-red-400')).toBeVisible();
  await expect(page.getByText('Step 1', { exact: false }).first()).toBeVisible();

  // Test Run executes without advancing progress.
  await typeInEditor(page, "SELECT 'hello' AS greeting;");
  await page.getByRole('button', { name: 'Test Run' }).click();
  await expect(page.getByText('greeting').first()).toBeVisible();
  await expect(page.getByText('Step 1', { exact: false }).first()).toBeVisible();
});
