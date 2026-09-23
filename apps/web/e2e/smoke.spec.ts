import { expect, test } from '@playwright/test';

test('нэвтрэх хуудас нээгдэнэ', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Нэвтрэх' })).toBeVisible();
});

test('туршилтын горимд сургалтын алба нэвтэрч оюутны жагсаалт харна', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Сургалтын алба/ }).click();
  await page.getByRole('link', { name: 'Оюутан' }).first().click();
  await expect(page.getByRole('heading', { name: /Оюутан/ })).toBeVisible();
});

test('Ctrl+K хайлт нээгдэнэ', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Санхүүгийн алба/ }).click();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Хайлт' })).toBeVisible();
});

test('dark mode солигдоно', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Удирдлага/ }).click();
  const html = page.locator('html');
  for (let i = 0; i < 3 && !(await html.getAttribute('class'))?.includes('dark'); i++) {
    await page.getByRole('button', { name: /Харагдах байдал/ }).click();
  }
  await expect(html).toHaveClass(/dark/);
});
