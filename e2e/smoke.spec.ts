import { test, expect, type Page } from '@playwright/test';

const APP = '/tuples/';
const STEP1_SQL = 'CREATE TABLE patients (patient_id INTEGER PRIMARY KEY, full_name TEXT, age INTEGER);';

async function typeInEditor(page: Page, sql: string) {
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
  await page.keyboard.type(sql);
}

test('full journey: homepage → enter world → solve → persist → review', async ({ page }) => {
  // ── Homepage: triptych is the single entry for everyone ──
  await page.goto(APP);
  await expect(page.getByRole('heading', { name: /Every world runs/ })).toBeVisible();
  await expect(page.getByTestId('world-lab')).toBeVisible();
  await expect(page.getByTestId('world-floor')).toBeVisible();
  await expect(page.getByTestId('world-belt')).toBeVisible();

  // ── Enter The Lab (Builder / clinical trials) ──
  await page.getByTestId('world-lab').click();
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

  // ── Persistence: reload resumes the mission ──
  await page.reload();
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Step .*2.* \/ .*44|Step 2/).first()).toBeVisible();

  // ── Review mode: open completed step 1, then Esc back ──
  await page.getByRole('button', { name: /CREATE TABLE TYPED/ }).click();
  await expect(page.getByText(/Reviewing|Review/i).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.cm-content')).toBeVisible();

  // ── Switch World returns to the homepage with progress on the panel ──
  await page.getByRole('button', { name: /Switch World/ }).click();
  await expect(page.getByTestId('world-lab')).toContainText(/Continue/i);
});

test('homepage proof terminal runs real SQL', async ({ page }) => {
  await page.goto(APP);
  await expect(page.getByRole('heading', { name: /Every world runs/ })).toBeVisible();

  // The playground wakes lazily as it scrolls into view.
  await page.getByTestId('proof-terminal').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('proof-terminal')).toContainText('READY', { timeout: 30_000 });

  await page.getByRole('button', { name: 'Run query' }).click();
  const output = page.getByTestId('proof-output');
  await expect(output).toContainText('The Belt');
  await expect(output).toContainText('51');
});

test('error coaching and test-run preview', async ({ page }) => {
  await page.goto(APP);
  await page.getByTestId('world-lab').click();
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

test('each world themes the workspace with its own accent', async ({ page }) => {
  await page.goto(APP);

  // The Belt → amber accents flow through the workspace via data-world tokens.
  await page.getByTestId('world-belt').click();
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('The Belt').first()).toBeVisible();
  const beltAccent = await page
    .locator('[data-world="belt"]')
    .first()
    .evaluate((el) => getComputedStyle(el).getPropertyValue('--world-accent').trim());
  expect(beltAccent).toBe('#ffb454');

  // Switching to The Lab swaps the entire palette.
  await page.getByRole('button', { name: /Switch World/ }).click();
  await page.getByTestId('world-lab').click();
  await expect(page.getByText('The Lab').first()).toBeVisible({ timeout: 30_000 });
  const labAccent = await page
    .locator('[data-world="lab"]')
    .first()
    .evaluate((el) => getComputedStyle(el).getPropertyValue('--world-accent').trim());
  expect(labAccent).toBe('#5dcaa5');
});

test('completed mission offers the certification exam', async ({ page }) => {
  // Seed a finished Analyst track (45/45) directly into the persisted store.
  await page.addInitScript(() => {
    localStorage.setItem(
      'tuples_user_progress',
      JSON.stringify({
        state: {
          activeDomainId: null,
          progressByDomain: {
            'algorithmic-trading': { currentStepIndex: 45, historicalQueries: {} },
          },
          certifications: {},
          xp: 0, combo: 0, bestCombo: 0, totalSolved: 0, noHintSolves: 0,
          solvedConcepts: [], streakCount: 0, streakLastDate: null, unlockedAchievements: [],
        },
        version: 2,
      })
    );
  });
  await page.goto(APP);

  // The panel reflects completion, and entering leads to the exam intro.
  await expect(page.getByTestId('world-floor')).toContainText(/exam/i);
  await page.getByTestId('world-floor').click();
  await expect(page.getByRole('heading', { name: 'Certification Exam' })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('exam-start')).toBeVisible();
  await expect(page.getByText(/Score 6\/8 or better/)).toBeVisible();
});
