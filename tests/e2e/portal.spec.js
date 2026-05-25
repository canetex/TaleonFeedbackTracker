// tests/e2e/portal.spec.js — plan.md §9
import { test, expect } from '@playwright/test';

test.describe('Feedback Portal Taleon', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const banner = page.locator('#config-banner');
    if (await banner.isVisible()) {
      test.skip(true, 'Supabase não configurado (runtime-config.js ausente no servidor)');
    }
  });

  test('envio de sugestão cria card pendente na coluna', async ({ page }) => {
    const unique = `E2E Test ${Date.now()}`;
    await page.locator('#btn-new-suggestion').click();
    await expect(page.locator('#modal-suggestion')).toBeVisible();
    await page.locator('#char_name').fill('E2E Tester');
    await page.locator('#title').fill(unique);
    await page.locator('#description').fill('Descrição automatizada com mais de dez caracteres.');
    await page.locator('#form-suggestion').getByRole('button', { name: /enviar/i }).click();

    await expect(page.getByText('Sugestão enviada', { exact: false })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(unique)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('PENDENTE APROVACAO').first()).toBeVisible();
  });

  test('voto duplicado no mesmo card exibe aviso', async ({ page }) => {
    const approvedCard = page.locator('.suggestion-card').filter({
      hasNot: page.getByText('PENDENTE APROVACAO'),
    }).first();
    if ((await approvedCard.count()) === 0) {
      test.skip(true, 'Nenhum card aprovado para testar voto');
    }

    const suggestionId = await approvedCard.getAttribute('data-suggestion-id');
    const upBtn = approvedCard.locator('[data-vote="up"]');
    if (!suggestionId || (await upBtn.count()) === 0) {
      test.skip(true, 'Card já votado neste navegador');
    }

    await page.evaluate((sid) => {
      localStorage.setItem('taleon_voted_suggestions', JSON.stringify({ [sid]: 'up' }));
    }, suggestionId);
    await upBtn.click();
    await expect(page.getByText(/já votou/i)).toBeVisible({ timeout: 10_000 });
  });

  test('título similar dispara modal de duplicidade', async ({ page }) => {
    const seed = page.locator('.suggestion-card h3').first();
    if ((await seed.count()) === 0) {
      test.skip(true, 'Board vazio');
    }
    const existingTitle = (await seed.textContent())?.trim() ?? '';
    if (existingTitle.length < 5) test.skip(true, 'Título base curto demais');

    await page.locator('#btn-new-suggestion').click();
    await expect(page.locator('#modal-suggestion')).toBeVisible();
    await page.locator('#char_name').fill('E2E Similar');
    await page.locator('#title').fill(existingTitle);
    await page
      .locator('#description')
      .fill('Descrição parecida com sugestão existente para teste de similaridade automatizado.');
    await page.locator('#description').blur();

    await expect(page.locator('#modal-similar')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(/parecida encontrada/i)).toBeVisible();
  });

  test('admin: senha errada bloqueia e senha correta aprova', async ({ page }) => {
    const adminPass = process.env.E2E_ADMIN_PASSWORD;
    if (!adminPass) {
      test.skip(true, 'Defina E2E_ADMIN_PASSWORD ou ADMIN_SECRET_PASSWORD no .env');
    }

    await page.goto('/admin.html');
    await page.locator('#admin-password').fill('senha-errada-e2e');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.getByText(/incorreta|inválida|erro/i)).toBeVisible({ timeout: 10_000 });

    await page.locator('#admin-password').fill(adminPass);
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.locator('#panel-admin')).toBeVisible({ timeout: 10_000 });

    const approveBtn = page.locator('[data-approve]').first();
    if ((await approveBtn.count()) === 0) {
      test.skip(true, 'Nenhuma sugestão pendente na fila admin');
    }
    await approveBtn.click();
    await expect(page.getByText(/Sugestão aprovada/i)).toBeVisible({ timeout: 10_000 });
  });
});
