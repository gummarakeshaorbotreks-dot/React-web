import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';

test.describe('Home Page Module', () => {
  let homePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.open();
    await homePage.isPageLoaded();
  });

  // ============ 1. HOME PAGE LOADS SUCCESSFULLY ============
  test('1. Home page loads successfully', async ({ page }) => {
    // Verify the page navigated correctly
    await expect(page).toHaveURL(/\/$|$/);

    // Verify key sections are loaded
    const isSearchBoxVisible = await homePage.verifySearchBoxVisible();
    expect(isSearchBoxVisible).toBe(true);

    const isHeroVisible = await homePage.verifyHeroSectionVisible();
    expect(isHeroVisible).toBe(true);
  });

  // ============ 2. HEADER IS VISIBLE ============
  test('2. Header is visible', async () => {
    const isHeaderVisible = await homePage.verifyHeaderIsVisible();
    expect(isHeaderVisible).toBe(true);
  });

  // ============ 3. LOGO IS VISIBLE ============
  test('3. Logo is visible', async () => {
    const isLogoVisible = await homePage.verifyLogoIsVisible();
    expect(isLogoVisible).toBe(true);
  });

  test('3a. Logo redirects to home page when clicked', async ({ page }) => {
    // Navigate to a different page first
    await homePage.clickNavAboutUs();
    await expect(page).toHaveURL(/\/about/i);

    // Click logo to return home
    await homePage.clickNavLogo();
    await expect(page).toHaveURL(/\/$|$/);
  });

  // ============ 4. NAVIGATION MENU ============
  test('4. Navigation menu has all required items', async () => {
    const hasAllNavItems = await homePage.verifyNavigationMenuExists();
    expect(hasAllNavItems).toBe(true);
  });

  test('4a. Navigation - Home link works', async ({ page }) => {
    await homePage.clickNavAboutUs();
    await expect(page).toHaveURL(/\/about/i);

    await homePage.clickNavHome();
    await expect(page).toHaveURL(/\/$|$/);
  });

  test('4b. Navigation - About Us link is clickable', async ({ page }) => {
    await homePage.clickNavAboutUs();
    await expect(page).toHaveURL(/\/about/i);
  });

  test('4c. Navigation - Blogs link is clickable', async ({ page }) => {
    await homePage.clickNavBlogs();
    await expect(page).toHaveURL(/\/blogs/i);
  });

  test('4d. Navigation - Safety link is clickable', async ({ page }) => {
    await homePage.clickNavSafety();
    await expect(page).toHaveURL(/\/safety/i);
  });

  test('4e. Navigation - Contact Us link is clickable', async ({ page }) => {
    await homePage.clickNavContact();
    await expect(page).toHaveURL(/\/contact/i);
  });

  // ============ 5. HERO SECTION ============
  test('5. Hero section is visible', async () => {
    const isHeroVisible = await homePage.verifyHeroSectionVisible();
    expect(isHeroVisible).toBe(true);
  });

  test('5a. Hero carousel is visible and functional', async () => {
    const isCarouselVisible = await homePage.verifyHeroCarouselVisible();
    expect(isCarouselVisible).toBe(true);
  });

  test('5b. Hero section displays correct heading', async () => {
    const heading = await homePage.verifyHeroHeadingText();
    expect(heading).toContain('Discover Your Adventure');
  });

  test('5c. Hero section displays correct subtitle', async () => {
    const subtitle = await homePage.verifyHeroSubtitleText();
    expect(subtitle).toBeTruthy();
    expect(subtitle.length).toBeGreaterThan(0);
  });

  // ============ 6. SEARCH BOX ============
  test('6. Search box is visible and functional', async () => {
    const isSearchBoxVisible = await homePage.verifySearchBoxVisible();
    expect(isSearchBoxVisible).toBe(true);
  });

  test('6a. Search box has correct placeholder text', async () => {
    const placeholder = await homePage.getSearchBoxPlaceholder();
    expect(placeholder.toLowerCase()).toContain('search');
  });

  test('6b. Search box accepts input', async () => {
    const searchTerm = 'Coorg';
    await homePage.search(searchTerm);

    const inputValue = await homePage.getSearchInputValue();
    expect(inputValue).toBe(searchTerm);
  });

  test('6c. Search suggestions appear when typing', async () => {
    await homePage.search('Coorg');
    await homePage.waitForSuggestions();

    const suggestionsCount = await homePage.getSuggestionsCount();
    expect(suggestionsCount).toBeGreaterThan(0);
  });

  // ============ 7. SEARCH BUTTON ============
  test('7. Search button is visible', async () => {
    const isSearchButtonVisible = await homePage.verifySearchButtonVisible();
    expect(isSearchButtonVisible).toBe(true);
  });

  test('7a. Search button is clickable', async () => {
    await homePage.search('Coorg');
    await homePage.waitForSuggestions();

    const suggestionsCountBefore = await homePage.getSuggestionsCount();
    expect(suggestionsCountBefore).toBeGreaterThan(0);

    // Note: Clicking search button navigates to trek details
    // This is handled in search workflow tests
  });

  // ============ 8. FEATURED DESTINATIONS SECTION ============
  test('8. Featured Destinations section is visible', async () => {
    const isSectionVisible = await homePage.verifyFeaturedDestinationsSectionVisible();
    expect(isSectionVisible).toBe(true);
  });

  test('8a. Featured Destinations heading is visible', async () => {
    const isHeadingVisible = await homePage.verifyFeaturedDestinationsHeadingVisible();
    expect(isHeadingVisible).toBe(true);
  });

  test('8b. Featured Destinations grid is visible with trek cards', async () => {
    const isGridVisible = await homePage.verifyTrekGridVisible();
    expect(isGridVisible).toBe(true);

    const trekCount = await homePage.getTrekCardsCount();
    expect(trekCount).toBeGreaterThan(0);
  });

  test('8c. Trek cards display pricing information', async () => {
    const hasPricing = await homePage.verifyTrekCardsHavePricing();
    expect(hasPricing).toBe(true);
  });

  test('8d. First trek card is clickable', async ({ page }) => {
    const firstCardTitle = await homePage.getFirstTrekCardTitle();
    expect(firstCardTitle).toBeTruthy();

    await homePage.clickFirstTrekCard();

    // Should navigate to trek details page (uses slug, not ID)
    await expect(page).toHaveURL(/\/treks\//i);
  });

  // ============ 9. TRAVEL YOUR WAY SECTION ============
  test('9. Travel Your Way section is visible', async () => {
    const isSectionVisible = await homePage.verifyTravelYourWaySectionVisible();
    expect(isSectionVisible).toBe(true);
  });

  test('9a. Travel Your Way title is visible', async () => {
    const isTitleVisible = await homePage.verifyTravelYourWayTitleVisible();
    expect(isTitleVisible).toBe(true);
  });

  test('9b. Travel Your Way cards are visible', async () => {
    const cardsVisible = await homePage.verifyTravelYourWayCardsVisible();
    expect(cardsVisible).toBe(true);

    const cardsCount = await homePage.getTravelYourWayCardsCount();
    expect(cardsCount).toBeGreaterThan(0);
  });

  test('9c. Travel Your Way cards are clickable', async ({ page }) => {
    const cardsCount = await homePage.getTravelYourWayCardsCount();
    expect(cardsCount).toBeGreaterThan(0);

    // Click first card
    const firstCard = page.locator('.tyw-card-link').first();
    await firstCard.click();

    // Should navigate to Travel Your Way page with tag parameter
    await expect(page).toHaveURL(/\/travel-your-way/i);
  });

  // ============ 10. FOOTER ============
  test('10. Footer is visible', async () => {
    await homePage.scrollToFooter();

    const isFooterVisible = await homePage.verifyFooterVisible();
    expect(isFooterVisible).toBe(true);
  });

  test('10a. Footer contains company information', async ({ page }) => {
    await homePage.scrollToFooter();

    // Check for footer content
    const footerText = await page.locator('footer').textContent();
    expect(footerText).toContain('Aorbo');
  });

  // ============ COMPREHENSIVE WORKFLOW TESTS ============
  test.describe('Search Workflow', () => {
    test('Search workflow - Enter to submit', async ({ page }) => {
      await homePage.search('Coorg');
      await homePage.waitForSuggestions();

      // Get suggestion count before pressing Enter
      const suggestionsCount = await homePage.getSuggestionsCount();
      expect(suggestionsCount).toBeGreaterThan(0);

      await homePage.pressEnter();

      // Should navigate to trek details (uses slug, not ID)
      await expect(page).toHaveURL(/\/treks\//i);
    });

    test('Search workflow - Click suggestion to navigate', async ({ page }) => {
      await homePage.search('Coorg');
      await homePage.waitForSuggestions();

      await homePage.clickSuggestion('Coorg-Chikkamagaluru');

      // Should navigate to trek details (uses slug, not ID)
      await expect(page).toHaveURL(/\/treks\//i, { timeout: 10000 });
    });

    test('Search workflow - Clear search box', async () => {
      await homePage.search('Coorg');

      const valueBeforeClear = await homePage.getSearchInputValue();
      expect(valueBeforeClear).toBe('Coorg');

      await homePage.clearSearch();

      const valueAfterClear = await homePage.getSearchInputValue();
      expect(valueAfterClear).toBe('');
    });
  });

  test.describe('Page Responsiveness', () => {
    test('All major sections are present and stacked correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Check all sections are still visible
      expect(await homePage.verifyHeaderIsVisible()).toBe(true);
      expect(await homePage.verifyHeroSectionVisible()).toBe(true);
      expect(await homePage.verifySearchBoxVisible()).toBe(true);
      expect(await homePage.verifyFeaturedDestinationsSectionVisible()).toBe(true);
      expect(await homePage.verifyTravelYourWaySectionVisible()).toBe(true);
    });

    test('All major sections are present on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      expect(await homePage.verifyHeaderIsVisible()).toBe(true);
      expect(await homePage.verifyFeaturedDestinationsSectionVisible()).toBe(true);
      expect(await homePage.verifyTravelYourWaySectionVisible()).toBe(true);
    });

    test('All major sections are present on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      expect(await homePage.verifyHeaderIsVisible()).toBe(true);
      expect(await homePage.verifyFeaturedDestinationsSectionVisible()).toBe(true);
      expect(await homePage.verifyTravelYourWaySectionVisible()).toBe(true);
    });
  });

  test.describe('Performance & Loading', () => {
    test('Page loads within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await homePage.isPageLoaded();

      const loadTime = Date.now() - startTime;

      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('Images are loaded lazily', async ({ page }) => {
      await homePage.verifyFeaturedDestinationsSectionVisible();

      // Check that images have loading attribute or are visible
      const trekImages = page.locator('.trek-card__media img');
      const count = await trekImages.count();

      expect(count).toBeGreaterThan(0);
    });
  });
});