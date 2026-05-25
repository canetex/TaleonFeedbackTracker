// tests/e2e/portal.spec.js — plan.md §9
import { test, expect } from '@playwright/test';

async function waitForPortalReady(page) {
  await page.waitForFunction(() => typeof window.showToast === 'function', {
    timeout: 45_000,
  });
  await expect(page.locator('#config-banner')).toBeHidden({ timeout: 5_000 });
  await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 60_000 });
  await expect(page.locator('#board section').first()).toBeVisible({ timeout: 30_000 });
}

async function openNewSuggestionModal(page) {
  const btn = page.locator('#btn-new-suggestion');
  await expect(btn).toBeEnabled({ timeout: 10_000 });
  await btn.click();
  await expect(page.locator('#modal-suggestion')).toBeVisible({ timeout: 10_000 });
}

test.describe('Feedback Portal Taleon', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForResponse(
      (res) => res.url().includes('runtime-config.js') && res.status() === 200,
      { timeout: 15_000 },
    ).catch(() => null);

    if (await page.locator('#config-banner').isVisible()) {
      test.skip(true, 'Supabase não configurado (runtime-config.js ausente ou inválido)');
    }
    await waitForPortalReady(page);
  });

  test('envio de sugestão cria card pendente na coluna', async ({ page }) => {
    const unique = `E2E Test ${Date.now()}`;
    await openNewSuggestionModal(page);
    await page.locator('#char_name').fill('E2E Tester');
    await page.locator('#title').fill(unique);
    await page.locator('#description').fill('Descrição automatizada com mais de dez caracteres.');
    await page.locator('#form-suggestion').getByRole('button', { name: /enviar/i }).click();

    await expect(page.getByText('Sugestão enviada', { exact: false })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(unique)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('PENDENTE APROVACAO').first()).toBeVisible();
  });

  test('limite de votos na mesma sugestão exibe aviso', async ({ page }) => {
    const approvedCard = page.locator('.suggestion-card').filter({
      has: page.locator('[data-vote="up"]:not([disabled])'),
    }).first();
    if ((await approvedCard.count()) === 0) {
      test.skip(true, 'Nenhum card aprovado com voto disponível');
    }

    const suggestionId = await approvedCard.getAttribute('data-suggestion-id');
    const upBtn = approvedCard.locator('[data-vote="up"]');
    if (!suggestionId) {
      test.skip(true, 'Card sem data-suggestion-id');
    }

    await page.evaluate((sid) => {
      localStorage.setItem(
        'taleon_voted_suggestions',
        JSON.stringify({ [sid]: { up: 15, down: 0 } })
      );
    }, suggestionId);
    await upBtn.click();
    await expect(page.getByText(/15 votos deste tipo nesta sugestão/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('título similar dispara modal de duplicidade', async ({ page }) => {
    const seed = page
      .locator('.suggestion-card')
      .filter({ hasNot: page.getByText('PENDENTE APROVACAO') })
      .locator('h3')
      .first();
    if ((await seed.count()) === 0) {
      test.skip(true, 'Nenhum card aprovado para título base');
    }
    const existingTitle = (await seed.textContent())?.trim() ?? '';
    if (existingTitle.length < 5) test.skip(true, 'Título base curto demais');

    await openNewSuggestionModal(page);
    await page.locator('#char_name').fill('E2E Similar');
    await page.locator('#title').fill(existingTitle);
    await page
      .locator('#description')
      .fill('Descrição parecida com sugestão existente para teste de similaridade automatizado.');
    await page.locator('#description').blur();

    await expect(page.locator('#modal-similar')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/parecida encontrada/i)).toBeVisible();
  });
});

test.describe('Admin Taleon', () => {
  test('senha errada bloqueia e senha correta aprova', async ({ page }) => {
    const adminPass = process.env.E2E_ADMIN_PASSWORD;
    if (!adminPass) {
      test.skip(true, 'Defina E2E_ADMIN_PASSWORD ou ADMIN_SECRET_PASSWORD no .env');
    }

    await page.goto('/admin.html', { waitUntil: 'load' });
    await page.waitForResponse(
      (res) => res.url().includes('runtime-config.js') && res.status() === 200,
      { timeout: 15_000 },
    ).catch(() => null);

    await page.waitForFunction(() => typeof window.showToast === 'function', {
      timeout: 30_000,
    });

    await page.locator('#admin-password').fill('senha-errada-e2e');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.getByText(/Senha incorreta/i)).toBeVisible({ timeout: 10_000 });

    await page.locator('#admin-password').fill(adminPass);
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.locator('#panel-admin')).toBeVisible({ timeout: 10_000 });

    const approveBtn = page.locator('[data-approve]').first();
    if ((await approveBtn.count()) === 0) {
      test.skip(true, 'Nenhuma sugestão pendente na fila admin');
    }

    page.once('dialog', (dialog) => dialog.accept());
    await approveBtn.click();
    await expect(page.getByText(/Sugestão aprovada/i)).toBeVisible({ timeout: 15_000 });
  });
});
