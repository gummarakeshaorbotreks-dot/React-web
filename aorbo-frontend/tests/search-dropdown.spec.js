import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';

test('Search using dropdown', async ({ page }) => {

  const homePage = new HomePage(page);

  await homePage.open();

  await homePage.search('Coorg');

  await homePage.clickSuggestion('Coorg Trek');

  await expect(page).toHaveURL(/coorg/i);

});