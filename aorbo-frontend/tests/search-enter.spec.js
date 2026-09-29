import { test } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { TrekDetailsPage } from './pages/TrekDetailsPage';

test('Search existing trek using Enter', async ({ page }) => {

  const homePage = new HomePage(page);
  const trekPage = new TrekDetailsPage(page);

  await homePage.open();

  await homePage.search('Coorg');

  await homePage.pressEnter();

  await trekPage.verifyURLContains('coorg');

  await trekPage.verifyHeading('Coorg-Chikkamagaluru');

});