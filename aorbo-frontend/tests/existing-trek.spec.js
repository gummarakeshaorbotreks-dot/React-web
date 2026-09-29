import { test } from '@playwright/test';
import { createPages } from './utils/testHelper';

test('Existing Trek Search - Coorg', async ({ page }) => {

  const { homePage, trekPage } = createPages(page);

  await homePage.open();

  await homePage.search('Coorg');

  await homePage.pressEnter();

  await trekPage.verifyURLContains('coorg');

  await trekPage.verifyHeading('Coorg-Chikkamagaluru');

});