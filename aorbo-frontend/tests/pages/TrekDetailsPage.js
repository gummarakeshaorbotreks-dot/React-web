import { expect } from '@playwright/test';

/**
 * TrekDetailsPage - Page Object for Trek and Destination Details pages
 * Handles both database trek details and OSM destination details verification
 */
export class TrekDetailsPage {
  constructor(page) {
    this.page = page;

    // ============ HERO SECTION LOCATORS ============
    this.mainImage = page.locator('.detail-hero__img').first();
    this.backButton = page.locator('.detail-hero__back');
    
    // ============ MAIN HEADING & LOCATION ============
    this.pageHeading = page.locator('h1').first();
    this.locationTag = page.locator('.detail-hero .chip').first();
    this.categoryTag = page.locator('.detail-hero .chip').first();

    // ============ TREK INFO SECTION ============
    this.tripInfoSection = page.locator('h3:has-text("Trip Info"), h3:has-text("Trip Information")').first();
    this.durationInfo = page.locator('.fact-row:has-text("Duration"), .fact-row:has-text("Difficulty")').first();
    this.departureInfo = page.locator('.fact-row:has-text("Departure"), .fact-row:has-text("Best Time")').first();

    // ============ DESCRIPTION & ACTIVITIES ============
    this.aboutSection = page.locator('h2:has-text("About this Trek"), h2:has-text("About this Destination")').first();
    this.descriptionText = page.locator('text=/About this Trek|About this Destination/').locator('..').locator('p').first();
    this.activitiesSection = page.locator('h2:has-text("Activities")').first();
    this.activityTags = this.activitiesSection
  .locator('span')
  .filter({ hasText: /\S+/ });

    // ============ PRICING SECTION ============
    this.priceCard = page.locator('text=/Starting from|Package Price|₹/').first();
    this.priceValue = page.locator('text=/₹\\s*[\\d,]+/').first();
    this.priceLabel = page.locator('text=per person onwards, text=Pricing details will be added soon').first();

    // ============ IMAGES & GALLERY ============
    this.heroImageWrapper = page.locator('.detail-hero').first();
    this.loadingText = page.getByText('Loading trek details...');

    // ============ RELATED SECTIONS ============
    this.relatedTreksSection = page.locator('h2:has-text("Related Treks")').first();
    this.relatedTrekLinks = page.locator('.link-list a');
    this.famousPlacesSection = page.locator('h2:has-text("Famous Places"), h2:has-text("Nearby Attractions")').first();
    this.operatorsSection = page.locator('h3:has-text("Trusted Operators")').first();

    // ============ ADDITIONAL INFO SECTIONS ============
    this.travelTipsSection = page.locator('h2:has-text("Travel Tips")').first();
    this.accommodationSection = page.locator('h3:has-text("Accommodation")').first();
    this.localCuisineSection = page.locator('h3:has-text("Local Cuisine")').first();
    this.locationDetailsSection = page.locator('h3:has-text("Location Details")').first();

    // ============ LOADING & ERROR LOCATORS ============
    this.loadingMessage = page.locator('text=Loading');
    this.errorMessage = page.locator('text=/not found/i');
    this.goBackButton = page.locator('button:has-text("Go Back")');

    // ============ MAP LOCATOR ============
    this.mapIframe = page.frameLocator('iframe[title="Destination location map"]');
  }

  // ============ BASIC NAVIGATION METHODS ============

  /**
   * Verify URL contains specific text
   */
  async verifyURLContains(text) {
    await expect(this.page).toHaveURL(new RegExp(text, 'i'));
  }

  /**
   * Verify page heading contains text
   */
  async verifyHeading(text) {
    await expect(
      this.page.getByRole('heading', {
        name: new RegExp(text, 'i')
      })
    ).toBeVisible();
  }

  /**
   * Verify page heading is visible
   */
  async isHeadingVisible() {
    try {
      await this.pageHeading.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get page heading text
   */
  async getHeadingText() {
    try {
      return await this.pageHeading.textContent();
    } catch {
      return null;
    }
  }

  // ============ LOADING & ERROR STATES ============

  /**
   * Wait for page to load (loading state disappears)
   */
  async waitForPageToLoad(timeout = 10000) {
  await this.page.waitForLoadState('networkidle', { timeout });

  // Wait until the loading message disappears (if it appears)
  await this.loadingText
    .waitFor({ state: 'hidden', timeout: 5000 })
    .catch(() => {});

  // Wait for the trek heading to be visible
  await this.pageHeading.waitFor({
    state: 'visible',
    timeout,
  });

  // Ensure we're not reading the Home page heading
  await expect(this.pageHeading).not.toHaveText(
    /Discover Your Adventure/i,
    { timeout }
  );
}

  /**
   * Check if error message is displayed
   */
  async isErrorDisplayed() {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get error message text
   */
  async getErrorMessage() {
    try {
      return await this.errorMessage.textContent();
    } catch {
      return null;
    }
  }

  // ============ HERO SECTION METHODS ============

  /**
   * Verify main image is visible
   */
  async isMainImageVisible() {
    try {
      await this.mainImage.waitFor({ state: 'visible', timeout: 8000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify back button is visible
   */
  async isBackButtonVisible() {
    return await this.backButton.isVisible().catch(() => false);
  }

  /**
   * Click back button
   */
  async clickBackButton() {
    await this.backButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify hero section has gradient overlay
   */
  async hasHeroOverlay() {
  const overlay = this.page.locator(
    '.detail-hero__shade'
  );

  return await overlay.first().isVisible();
}

  // ============ TREK INFORMATION METHODS ============

  /**
   * Get trek/destination title
   */
  async getTrekTitle() {
    return await this.getHeadingText();
  }

  /**
   * Verify trek title is visible
   */
  async isTrekTitleVisible() {
    return await this.isHeadingVisible();
  }

  /**
   * Get location information
   */
  async getLocationInfo() {
    try {
      await this.locationTag.waitFor({ state: 'visible', timeout: 3000 });
      const locationText = await this.locationTag.locator('..').textContent();
      return locationText;
    } catch {
      return null;
    }
  }

  /**
   * Get difficulty level (for destination details)
   */
  async getDifficultyLevel() {
  const difficultyElement = this.page.locator('.fact-row:has-text("Difficulty") dd').first();

  if (!(await difficultyElement.isVisible().catch(() => false))) {
    console.log("Difficulty element not found");
    return null;
  }

  const difficulty = await difficultyElement.textContent();
  console.log("Difficulty:", difficulty);

  return difficulty;
}

  /**
   * Get duration information
   */
  async getDurationInfo() {
    try {
      await this.durationInfo.waitFor({ state: 'visible', timeout: 3000 });
      const duration = await this.durationInfo.textContent();
      return duration;
    } catch {
      return null;
    }
  }

  /**
   * Get departure/best time information
   */
  async getDepartureInfo() {
    try {
      await this.departureInfo.waitFor({ state: 'visible', timeout: 3000 });
      const departure = await this.departureInfo.textContent();
      return departure;
    } catch {
      return null;
    }
  }

  /**
   * Verify trek info section exists
   */
  async isTripInfoSectionVisible() {
    try {
      await this.tripInfoSection.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // ============ DESCRIPTION & ACTIVITIES METHODS ============

  /**
   * Verify description section is visible
   */
  async isDescriptionVisible() {
    try {
      await this.aboutSection.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get description text
   */
  async getDescriptionText() {
    try {
      return await this.descriptionText.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Verify activities section is visible
   */
  async isActivitiesSectionVisible() {
    try {
      await this.activitiesSection.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get activities count
   */
  async getActivitiesCount() {
    try {
      return await this.activityTags.count();
    } catch {
      return 0;
    }
  }

  /**
   * Get first activity
   */
  async getFirstActivity() {
    try {
      const activity = this.activityTags.first();
      return await activity.textContent();
    } catch {
      return null;
    }
  }

  // ============ PRICING METHODS ============

  /**
   * Verify price card is visible
   */
  async isPriceCardVisible() {
    try {
      await this.priceCard.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get price value
   */
  async getPriceValue() {
  try {
    const priceText = await this.priceValue.textContent();

    if (!priceText) return null;

    const numeric = priceText.replace(/[^\d]/g, '');

    return numeric ? parseInt(numeric, 10) : null;
  } catch {
    return null;
  }
}

  /**
   * Get full price text
   */
  async getPriceText() {
    try {
      return await this.priceCard.textContent();
    } catch {
      return null;
    }
  }

  // ============ IMAGES & GALLERY METHODS ============

  /**
   * Verify hero image has loaded
   */
  async hasHeroImageLoaded() {
    return await this.isMainImageVisible();
  }

  /**
   * Get hero image alt text
   */
  async getHeroImageAlt() {
    try {
      return await this.mainImage.getAttribute('alt');
    } catch {
      return null;
    }
  }

  // ============ RELATED SECTIONS METHODS ============

  /**
   * Verify related treks section is visible
   */
  async isRelatedTreksSectionVisible() {
    try {
      await this.relatedTreksSection.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get related treks count
   */
  async getRelatedTreksCount() {
    try {
      return await this.relatedTrekLinks.count();
    } catch {
      return 0;
    }
  }

  /**
   * Click first related trek
   */
  async clickFirstRelatedTrek() {
    try {
      await this.relatedTrekLinks.first().click();
      await this.page.waitForLoadState('networkidle');
    } catch {
      return false;
    }
  }

  /**
   * Verify famous places section is visible
   */
  async isFamousPlacesSectionVisible() {
    try {
      await this.famousPlacesSection.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify operators section is visible
   */
  async isOperatorsSectionVisible() {
    try {
      await this.operatorsSection.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // ============ ADDITIONAL INFO METHODS ============

  /**
   * Verify travel tips section is visible
   */
  async isTravelTipsSectionVisible() {
    try {
      await this.travelTipsSection.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify accommodation section is visible
   */
  async isAccommodationSectionVisible() {
    try {
      await this.accommodationSection.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify local cuisine section is visible
   */
  async isLocalCuisineSectionVisible() {
    try {
      await this.localCuisineSection.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify location details section is visible
   */
  async isLocationDetailsSectionVisible() {
    try {
      await this.locationDetailsSection.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify map is visible (for destination details)
   */
  async isMapVisible() {
    try {
      await this.mapIframe.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // ============ TREK DETAILS VERIFICATION ============

  /**
   * Verify trek information is present
   */
  async verifyTrekDetailsPresent() {
    const hasContent = await this.page.locator('body').textContent();
    return hasContent && hasContent.length > 100;
  }

  /**
   * Get page content text
   */
  async getPageContent() {
    return await this.page.locator('body').textContent();
  }

  // ============ DESTINATION DETAILS VERIFICATION ============

  /**
   * Verify destination page loaded (for OSM destinations)
   */
  async verifyDestinationPageLoaded() {
    await this.waitForPageToLoad();
    const isHeadingVisible = await this.isHeadingVisible();
    const hasError = await this.isErrorDisplayed();

    return isHeadingVisible && !hasError;
  }

  /**
   * Verify destination information is displayed
   */
  async verifyDestinationInfoDisplayed() {
    const content = await this.getPageContent();
    return content && content.length > 100;
  }

  /**
   * Get destination name from heading
   */
  async getDestinationName() {
    return await this.getHeadingText();
  }

  // ============ PAGE URL VERIFICATION ============

  /**
   * Verify we're on a trek details page
   */
  async verifyOnTrekDetailsPage() {
    await expect(this.page).toHaveURL(/\/treks\//i);

    // Wait for page to load by checking for key content
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify either heading or main image is visible
    const hasHeading = await this.isHeadingVisible();
    const hasImage = await this.isMainImageVisible();
    
    if (!hasHeading && !hasImage) {
      throw new Error('Trek details page did not load: no heading or image found');
    }
  }

  /**
   * Verify we're on a destination details page
   */
  async verifyOnDestinationDetailsPage() {
    await expect(this.page).toHaveURL(/\/destination\//i);
  }

  /**
   * Get current URL
   */
  async getCurrentUrl() {
    return this.page.url();
  }

  // ============ SCROLL & VISIBILITY METHODS ============

  /**
   * Scroll to element and verify visibility
   */
  async scrollToAndVerify(locator) {
    try {
      await locator.scrollIntoViewIfNeeded();
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scroll to top of page
   */
  async scrollToTop() {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  /**
   * Scroll to bottom of page
   */
  async scrollToBottom() {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }
}