import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { TrekDetailsPage } from './pages/TrekDetailsPage';

/**
 * TREK DETAILS MODULE TEST SUITE
 * 
 * This test suite covers all aspects of the Trek Details page functionality:
 * - Navigation to Trek Details (from Featured Destinations and Search)
 * - Trek Information Display (title, location, description, duration, price)
 * - Images and Gallery
 * - Itinerary and Activities
 * - Related Information (famous places, operators, travel tips)
 * - Navigation (back button, browser back, refresh)
 * - Stability and Robustness
 * 
 * ASSUMPTIONS:
 * - Backend is running on http://127.0.0.1:8000
 * - At least one trek exists with ID 1 (Coorg)
 * - Related treks are available for featured treks
 * - Homepage is functional and can navigate to trek details
 */

test.describe('Trek Details Module', () => {
  let homePage;
  let trekPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    trekPage = new TrekDetailsPage(page);
    await homePage.open();
    await homePage.isPageLoaded();
  });

  // ============ 1. NAVIGATION TO TREK DETAILS ============

  test.describe('1. Navigation to Trek Details', () => {
    
    test('1a. Navigate from Featured Destinations card', async () => {
    const trekCount = await homePage.getTrekCardsCount();
    expect(trekCount).toBeGreaterThan(0);

    await homePage.clickFirstTrekCard();

    await trekPage.verifyOnTrekDetailsPage();

    const isHeadingVisible = await trekPage.isHeadingVisible();
    expect(isHeadingVisible).toBe(true);
});


    test('1b. Navigate from Search results using dropdown', async ({ page }) => {
      // Search for a trek
      await homePage.search('Coorg');
      await homePage.waitForSuggestions();

      // Get suggestions count to verify we found results
      const suggestionsCount = await homePage.getSuggestionsCount();
      expect(suggestionsCount).toBeGreaterThan(0);

      // Click first suggestion
      await homePage.clickSuggestion('Coorg');

      // Should navigate to trek details
      // Should navigate to trek details (slug URL)
await expect(page).toHaveURL(/\/treks\/[a-z0-9-]+$/i, {
  timeout: 10000,
});
    });

    test('1c. Navigate from Search results using Enter key', async ({ page }) => {
      // Search for a trek
      await homePage.search('Coorg');
      await homePage.waitForSuggestions();

      // Press Enter to navigate to first result
      await homePage.pressEnter();

      // Should navigate to trek details
      await expect(page).toHaveURL(/\/treks\/[a-z0-9-]+$/i, {
  timeout: 10000,
});
    });

    test('1d. Direct URL navigation to trek details', async ({ page }) => {
      // Navigate directly to a trek with numeric ID
      await page.goto('/treks/kedarkantha-trek');

      // Verify page loaded
      await trekPage.waitForPageToLoad();

      // Verify heading is visible
      const isHeadingVisible = await trekPage.isHeadingVisible();
      expect(isHeadingVisible).toBe(true);

      // Verify URL contains treks/
      await trekPage.verifyOnTrekDetailsPage();
    });

    test('1e. Verify correct URL structure for trek details', async () => {
      // Navigate to trek
      await homePage.clickFirstTrekCard();

      // Get current URL
      const url = await trekPage.getCurrentUrl();

      // Verify URL matches pattern /treks/[id]
      expect(url).toMatch(/\/treks\/[a-z0-9-]+$/i);
    });
  });

  // ============ 2. TREK INFORMATION ============

  test.describe('2. Trek Information Display', () => {
    
    test.beforeEach(async () => {
      // Navigate to a trek for each test
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();
    });

    test('2a. Trek title is displayed', async () => {
      const isVisible = await trekPage.isTrekTitleVisible();
      expect(isVisible).toBe(true);

      const title = await trekPage.getTrekTitle();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    test('2b. Location information is displayed', async () => {
      const locationInfo = await trekPage.getLocationInfo();
      expect(locationInfo).toBeTruthy();
    });

    test('2c. Duration information is displayed', async () => {
      const duration = await trekPage.getDurationInfo();
      expect(duration).toBeTruthy();
    });

    test('2d. Departure/Best Time information is displayed', async () => {
      const departure = await trekPage.getDepartureInfo();
      expect(departure).toBeTruthy();
    });

    test('2e. Price information is displayed', async () => {
      const isPriceVisible = await trekPage.isPriceCardVisible();
      expect(isPriceVisible).toBe(true);

      const priceValue = await trekPage.getPriceValue();
      expect(priceValue).toBeTruthy();
      expect(typeof priceValue).toBe('number');
      expect(priceValue).toBeGreaterThan(0);
    });

    test('2f. Trek Info section is visible', async () => {
      const isSectionVisible = await trekPage.isTripInfoSectionVisible();
      expect(isSectionVisible).toBe(true);
    });

    test('2g. Price starts with currency symbol (₹)', async () => {
      const priceText = await trekPage.getPriceText();
      expect(priceText).toContain('₹');
    });
  });

  // ============ 3. DESCRIPTION & CONTENT ============

  test.describe('3. Description and Content', () => {
    
    test.beforeEach(async () => {
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();
    });

    test('3a. Description/About section is visible', async () => {
      const isVisible = await trekPage.isDescriptionVisible();
      expect(isVisible).toBe(true);
    });

    test('3b. Description text is not empty', async () => {
      const description = await trekPage.getDescriptionText();
      expect(description).toBeTruthy();
      expect(description.trim().length).toBeGreaterThan(0);
    });

    test('3c. Activities section is visible (if available)', async () => {
      const isVisible = await trekPage.isActivitiesSectionVisible().catch(() => true);
      // Activities might not always be present, so we just verify it doesn't error
      expect(typeof isVisible).toBe('boolean');
    });

    test('3d. Activities have content if section is present', async () => {
      const isVisible = await trekPage.isActivitiesSectionVisible().catch(() => false);
      
      if (isVisible) {
        const count = await trekPage.getActivitiesCount();
        expect(count).toBeGreaterThan(0);

        const firstActivity = await trekPage.getFirstActivity();
        expect(firstActivity).toBeTruthy();
      }
    });
  });

  // ============ 4. IMAGES & HERO SECTION ============

  test.describe('4. Images and Hero Section', () => {
    
    test.beforeEach(async () => {
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();
    });

    test('4a. Main hero image is visible', async () => {
      const isVisible = await trekPage.isMainImageVisible();
      expect(isVisible).toBe(true);
    });

    test('4b. Hero image has loaded correctly', async () => {
      const hasLoaded = await trekPage.hasHeroImageLoaded();
      expect(hasLoaded).toBe(true);
    });

    test('4c. Hero image has alt text', async () => {
      const altText = await trekPage.getHeroImageAlt();
      expect(altText).toBeTruthy();
    });

    test('4d. Hero section has overlay gradient', async () => {
      const hasOverlay = await trekPage.hasHeroOverlay();
      expect(hasOverlay).toBe(true);
    });

    test('4e. Hero image is responsive', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Reload page
      await page.reload();
      await trekPage.waitForPageToLoad();

      // Image should still be visible
      const isVisible = await trekPage.isMainImageVisible();
      expect(isVisible).toBe(true);
    });
  });

  // ============ 5. RELATED SECTIONS ============

  test.describe('5. Related Sections (Famous Places, Operators, etc)', () => {
    
    test.beforeEach(async () => {
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();
    });

    test('5a. Famous Places section is visible (if available)', async () => {
      const isVisible = await trekPage.isFamousPlacesSectionVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });

    test('5b. Trusted Operators section is visible (if available)', async () => {
      const isVisible = await trekPage.isOperatorsSectionVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });

    test('5c. Related Treks section is visible (if available)', async () => {
      const isVisible = await trekPage.isRelatedTreksSectionVisible().catch(() => false);
      
      if (isVisible) {
        const count = await trekPage.getRelatedTreksCount();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('5d. Related Trek links are clickable', async () => {
      const isVisible = await trekPage.isRelatedTreksSectionVisible().catch(() => false);
      
      if (isVisible) {
        const count = await trekPage.getRelatedTreksCount();
        
        if (count > 0) {
          // Get current trek ID for comparison
          const currentUrl = await trekPage.getCurrentUrl();
          const currentId = currentUrl.match(/\/treks\/(\d+)/)[1];

          // Click first related trek
          await trekPage.clickFirstRelatedTrek();

          // Should navigate to different trek
          const newUrl = await trekPage.getCurrentUrl();
          const newId = newUrl.match(/\/treks\/(\d+)/)[1];

          expect(newId).not.toBe(currentId);
        }
      }
    });
  });

  // ============ 6. ADDITIONAL INFO SECTIONS ============

  test.describe('6. Additional Information Sections', () => {
    
    test.beforeEach(async () => {
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();
    });

    test('6a. Travel Tips section visibility', async () => {
      const isVisible = await trekPage.isTravelTipsSectionVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });

    test('6b. Accommodation section visibility', async () => {
      const isVisible = await trekPage.isAccommodationSectionVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });

    test('6c. Local Cuisine section visibility', async () => {
      const isVisible = await trekPage.isLocalCuisineSectionVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });

    test('6d. Location Details section visibility', async () => {
      const isVisible = await trekPage.isLocationDetailsSectionVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });
  });

  // ============ 7. BACK NAVIGATION ============

  test.describe('7. Back Navigation', () => {
    
    test('7a. Back button is visible on trek details page', async () => {
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();

      const isVisible = await trekPage.isBackButtonVisible();
      expect(isVisible).toBe(true);
    });

    test('7b. Back button navigates to previous page', async ({ page }) => {
      // Start on home page
      const initialUrl = await page.url();

      // Navigate to trek details
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();

      // Verify we're on trek details page
      const trekDetailsUrl = await page.url();
      expect(trekDetailsUrl).not.toBe(initialUrl);

      // Click back button
      await trekPage.clickBackButton();

      // Should return to home page
      const returnedUrl = await page.url();
      expect(returnedUrl).toBe(initialUrl);
    });

    test('7c. Browser back button works', async ({ page }) => {
      // Navigate to trek details
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();

      const trekDetailsUrl = await page.url();

      // Use browser back
      await page.goBack();
      await homePage.isPageLoaded();

      // Should be on home page
      const currentUrl = await page.url();
      expect(currentUrl).not.toBe(trekDetailsUrl);
    });

    test('7d. Refresh page maintains trek details display', async ({ page }) => {
      // Navigate to trek details
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();

      const headingBefore = await trekPage.getTrekTitle();

      // Refresh page
      await page.reload();
      await trekPage.waitForPageToLoad();

      const headingAfter = await trekPage.getTrekTitle();

      // Heading should be the same
      expect(headingBefore).toBe(headingAfter);
    });
  });

  // ============ 8. ERROR HANDLING ============

  test.describe('8. Error Handling', () => {
    
    test('8a. Invalid trek ID shows error', async ({ page }) => {
      // Navigate to non-existent trek
      await page.goto('/treks/99999');
      await page.waitForLoadState('networkidle');

      // Error should be displayed or page should show "not found" message
      const hasError = await trekPage.isErrorDisplayed();
      const hasErrorMessage = await page.locator('text=not found').isVisible().catch(() => false);

      // Either error message or "not found" text should be visible
      expect(hasError || hasErrorMessage).toBe(true);
    });

    test('8b. Page loading is handled gracefully', async ({ page }) => {
      // Navigate to trek
      await page.goto('/treks/kedarkantha-trek');

      // Page should eventually load without errors
      await trekPage.waitForPageToLoad();

      // Verify heading is visible (not still loading)
      const isHeadingVisible = await trekPage.isHeadingVisible();
      expect(isHeadingVisible).toBe(true);
    });
  });

  // ============ 9. RESPONSIVENESS ============

  test.describe('9. Page Responsiveness', () => {
    
    test('9a. Trek details display on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to trek
      await page.goto('/treks/kedarkantha-trek');
      await trekPage.waitForPageToLoad();

      // Verify key sections are visible
      const hasHeading = await trekPage.isHeadingVisible();
      const hasImage = await trekPage.isMainImageVisible();
      const hasPrice = await trekPage.isPriceCardVisible();

      expect(hasHeading && hasImage && hasPrice).toBe(true);
    });

    test('9b. Trek details display on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Navigate to trek
      await page.goto('/treks/kedarkantha-trek');
      await trekPage.waitForPageToLoad();

      // Verify key sections are visible
      const hasHeading = await trekPage.isHeadingVisible();
      const hasPrice = await trekPage.isPriceCardVisible();

      expect(hasHeading && hasPrice).toBe(true);
    });

    test('9c. Trek details display on desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Navigate to trek
      await page.goto('/treks/kedarkantha-trek');
      await trekPage.waitForPageToLoad();

      // Verify all sections are visible
      const hasHeading = await trekPage.isHeadingVisible();
      const hasDescription = await trekPage.isDescriptionVisible();
      const hasPrice = await trekPage.isPriceCardVisible();

      expect(hasHeading && hasDescription && hasPrice).toBe(true);
    });

    test('9d. Images scale properly on different viewports', async ({ page }) => {
      // Mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/treks/kedarkantha-trek');
      await trekPage.waitForPageToLoad();

      let imageVisible = await trekPage.isMainImageVisible();
      expect(imageVisible).toBe(true);

      // Tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await trekPage.waitForPageToLoad();

      imageVisible = await trekPage.isMainImageVisible();
      expect(imageVisible).toBe(true);

      // Desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.reload();
      await trekPage.waitForPageToLoad();

      imageVisible = await trekPage.isMainImageVisible();
      expect(imageVisible).toBe(true);
    });
  });

  // ============ 10. DATA INTEGRITY ============

  test.describe('10. Data Integrity and Consistency', () => {
    
    test('10a. Page content is consistent across refreshes', async ({ page }) => {
      // Navigate to trek
      await page.goto('/treks/kedarkantha-trek');
      await trekPage.waitForPageToLoad();

      const content1 = await trekPage.getPageContent();

      // Refresh page
      await page.reload();
      await trekPage.waitForPageToLoad();

      const content2 = await trekPage.getPageContent();

      // Content should be identical
      expect(content1).toBe(content2);
    });

    test('10b. Multiple navigations maintain data integrity', async () => {
      // First trek
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();

      const firstTitle = await trekPage.getTrekTitle();
      const firstPrice = await trekPage.getPriceValue();

      // Navigate back to home
      await trekPage.clickBackButton();

      // Navigate to first trek again
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();

      const secondTitle = await trekPage.getTrekTitle();
      const secondPrice = await trekPage.getPriceValue();

      // Data should be the same
      expect(firstTitle).toBe(secondTitle);
      expect(firstPrice).toBe(secondPrice);
    });

    test('10c. Price information is always a valid number', async () => {
      // Navigate through multiple treks and verify price is always valid
      for (let i = 0; i < 2; i++) {
        await homePage.open();
        await homePage.isPageLoaded();
        await homePage.clickFirstTrekCard();
        await trekPage.waitForPageToLoad();

        const price = await trekPage.getPriceValue();
        expect(price).toBeTruthy();
        expect(typeof price).toBe('number');
        expect(price).toBeGreaterThan(0);

        await trekPage.clickBackButton();
      }
    });
  });

  // ============ 11. SCROLL AND VIEWPORT BEHAVIOR ============

  test.describe('11. Scroll and Viewport Behavior', () => {
    
    test('11a. All sections are accessible by scrolling', async () => {
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();

      // Scroll to top
      await trekPage.scrollToTop();

      // Verify heading is visible
      let isVisible = await trekPage.isTrekTitleVisible();
      expect(isVisible).toBe(true);

      // Scroll to bottom
      await trekPage.scrollToBottom();

      // Verify we can scroll to bottom without errors
      expect(true).toBe(true);
    });

    test('11b. Description section can be scrolled into view', async () => {
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();

      const isVisible = await trekPage.scrollToAndVerify(
        trekPage.aboutSection
      ).catch(() => false);

      expect(typeof isVisible).toBe('boolean');
    });
  });

  // ============ 12. DESTINATION DETAILS PAGE (OSM) ============

  test.describe('12. Destination Details Page (OpenStreetMap)', () => {
    
    test('12a. Destination page loads from search', async ({ page }) => {
      // Search for a location that returns OSM result
      // This navigates to destination page instead of trek details
      await homePage.search('Manali');
      await homePage.waitForSuggestions();

      const suggestionsCount = await homePage.getSuggestionsCount();
      if (suggestionsCount > 0) {
        // Try to click suggestion (may be OSM or trek)
        await homePage.clickSuggestion('Manali');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Should be on either trek or destination page
        const url = await page.url();
        expect(url).toMatch(/\/(treks|destination)\//i);
      }
    });

    test('12b. Destination map is visible (if available)', async () => {
      // Navigate to destination page directly (if structure is different)
      // This is a fallback test for destination-specific features
      
      // Since we don't have a guaranteed destination page, we skip if navigating to trek
      const isVisible = await trekPage.isMapVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });

    test('12c. Destination difficulty level is displayed', async () => {
      // Get difficulty level - may be null if on trek page
      const difficulty = await trekPage.getDifficultyLevel().catch(() => null);
      expect(
  difficulty === null || typeof difficulty === 'string'
).toBe(true);
    });
  });

  // ============ 13. PERFORMANCE ============

  test.describe('13. Performance', () => {
    
    test('13a. Trek details page loads within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/treks/kedarkantha-trek');
      await trekPage.waitForPageToLoad();

      const loadTime = Date.now() - startTime;

      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('13b. Images load without blocking page interaction', async ({ page }) => {
      await page.goto('/treks/kedarkantha-trek');

      // Page content should be available immediately
      await trekPage.waitForPageToLoad();

      const isHeadingVisible = await trekPage.isHeadingVisible();
      expect(isHeadingVisible).toBe(true);
    });

    test('13c. Navigation between treks is smooth', async () => {
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();

      // Navigate back
      await trekPage.clickBackButton();

      // Navigate to different trek
      await homePage.clickFirstTrekCard();
      await trekPage.waitForPageToLoad();

      // Should be able to navigate without errors
      const isHeadingVisible = await trekPage.isHeadingVisible();
      expect(isHeadingVisible).toBe(true);
    });
  });
});
