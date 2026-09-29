export class HomePage {
  constructor(page) {
    this.page = page;

    // HERO SECTION LOCATORS
    this.searchBox = page.locator('#hero-search-input');
    this.searchSuggestions = page.locator('#search-suggestions');
    this.searchButton = page.locator('.hero-search-button');
    this.heroSection = page.locator('.hero-landing');
    this.heroCarousel = page.locator('#heroCarousel');
    this.heroHeading = page.locator('.hero-heading');
    this.heroSubtitle = page.locator('.hero-subtitle');
    this.heroBadge = page.locator('.hero-badge');

    // NAVIGATION LOCATORS
    this.navbar = page.locator('.navbar');
    this.navLogo = page.locator('.nav-logo');
    this.navHomeLink = page.locator('nav .nav-link:has-text("Home")').first();
    this.navAboutLink = page.locator('nav .nav-link:has-text("About us")').first();
    this.navBlogsLink = page.locator('nav .nav-link:has-text("Blogs")').first();
    this.navSafetyLink = page.locator('nav .nav-link:has-text("Safety")').first();
    this.navContactLink = page.locator('nav .nav-link:has-text("Contact us")').first();

    // FEATURED DESTINATIONS LOCATORS
    this.featuredDestinationsSection = page.locator('#featured-destinations');
    this.featuredDestinationsHeading = page.locator('h2:has-text("Featured Destinations")');
    this.featuredTrekGrid = page.locator('#featured-trek-grid');
    this.trekCards = page.locator('.trek-card');
    this.paginationWrapper = page.locator('.pager');

    // TRAVEL YOUR WAY SECTION LOCATORS
    this.travelYourWaySection = page.locator('.travel-your-way');
    this.travelYourWayTitle = page.locator('h2:has-text("Travel Your Way")');
    this.travelYourWayCards = page.locator('.tyw-card-link');

    // FOOTER LOCATORS
    this.footer = page.locator('footer');
  }

  // ============ NAVIGATION METHODS ============
  async open() {
  await this.page.goto('/');
}

async isPageLoaded() {
  // Wait for the page DOM to be ready
  await this.page.waitForLoadState('domcontentloaded');

  // Wait for Featured Destinations heading
  await this.page
    .getByRole('heading', { name: /Featured Destinations/i })
    .waitFor({ state: 'visible', timeout: 10000 });
}

  // ============ HEADER & LOGO METHODS ============
  async verifyHeaderIsVisible() {
    await this.navbar.waitFor({ state: 'visible' });
    return await this.navbar.isVisible();
  }

  async verifyLogoIsVisible() {
    await this.navLogo.waitFor({ state: 'visible' });
    return await this.navLogo.isVisible();
  }

  async clickNavLogo() {
    await this.navLogo.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ============ NAVIGATION MENU METHODS ============
  async verifyNavigationMenuExists() {
    return (
      (await this.navHomeLink.isVisible()) &&
      (await this.navAboutLink.isVisible()) &&
      (await this.navBlogsLink.isVisible()) &&
      (await this.navSafetyLink.isVisible()) &&
      (await this.navContactLink.isVisible())
    );
  }

  async clickNavHome() {
    await this.navHomeLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickNavAboutUs() {
    await this.navAboutLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickNavBlogs() {
  await this.navBlogsLink.waitFor({
    state: 'visible',
    timeout: 5000,
  });

  await this.navBlogsLink.scrollIntoViewIfNeeded();

  await this.navBlogsLink.click();

  try {
    await this.page.waitForLoadState('networkidle', {
      timeout: 5000,
    });
  } catch {
    // Some pages may not reach networkidle.
  }
}

  async clickNavSafety() {
    await this.navSafetyLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickNavContact() {
    await this.navContactLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ============ HERO SECTION METHODS ============
  async verifyHeroSectionVisible() {
    await this.heroSection.waitFor({ state: 'visible' });
    return await this.heroSection.isVisible();
  }

  async verifyHeroCarouselVisible() {
    await this.heroCarousel.waitFor({ state: 'visible' });
    return await this.heroCarousel.isVisible();
  }

  async verifyHeroHeadingText() {
    await this.heroHeading.waitFor({ state: 'visible' });
    return await this.heroHeading.textContent();
  }

  async verifyHeroSubtitleText() {
    return await this.heroSubtitle.textContent();
  }

  // ============ SEARCH BOX METHODS ============
  async verifySearchBoxVisible() {
    await this.searchBox.waitFor({ state: 'visible' });
    return await this.searchBox.isVisible();
  }

  async getSearchBoxPlaceholder() {
    return await this.searchBox.getAttribute('placeholder');
  }

  async getSearchInputValue() {
    return await this.searchBox.inputValue();
  }

  // ============ SEARCH BUTTON METHODS ============
  async verifySearchButtonVisible() {
    await this.searchButton.waitFor({ state: 'visible' });
    return await this.searchButton.isVisible();
  }

  async clickSearchButton() {
  const value = await this.searchBox.inputValue();

  if (value.trim() !== '') {
    try {
      await this.page.locator('.search-suggestion-item').first().waitFor({
        state: 'visible',
        timeout: 5000,
      });
    } catch {
      // Suggestions may not appear for every valid search.
      // Continue and let the application handle the search.
    }
  }

  await this.searchButton.waitFor({
    state: 'visible',
    timeout: 5000,
  });

  await this.searchButton.scrollIntoViewIfNeeded();

  await this.searchButton.click();
}

  // ============ SEARCH SUGGESTIONS METHODS ============
  async waitForSuggestions() {
    await this.searchSuggestions.waitFor({ state: 'visible', timeout: 5000 });
  }

  async clickSuggestion(text) {
  const suggestionItem = this.page
    .locator('.search-suggestion-item')
    .filter({ hasText: new RegExp(text, 'i') })
    .first();

  await suggestionItem.waitFor({
    state: 'visible',
    timeout: 5000,
  });

  await suggestionItem.scrollIntoViewIfNeeded();

  await suggestionItem.click();

  try {
    await this.page.waitForLoadState('networkidle', {
      timeout: 5000,
    });
  } catch {
    // Some destination pages keep network requests alive.
  }
}

  async getSuggestionsCount() {
    return await this.page.locator('.search-suggestion-item').count();
  }

  // ============ FEATURED DESTINATIONS METHODS ============
  async verifyFeaturedDestinationsSectionVisible() {
    await this.featuredDestinationsSection.waitFor({ state: 'visible' });
    return await this.featuredDestinationsSection.isVisible();
  }

  async verifyFeaturedDestinationsHeadingVisible() {
    await this.featuredDestinationsHeading.waitFor({ state: 'visible' });
    return await this.featuredDestinationsHeading.isVisible();
  }

  async getTrekCardsCount() {
  await this.featuredDestinationsSection.scrollIntoViewIfNeeded();
  await this.featuredDestinationsSection.waitFor({ state: 'visible', timeout: 10000 });

  await this.trekCards.first().waitFor({
    state: 'visible',
    timeout: 10000
  });

  return await this.trekCards.count();
}

  async verifyTrekGridVisible() {
    await this.featuredTrekGrid.waitFor({ state: 'visible' });
    return await this.featuredTrekGrid.isVisible();
  }

  async getFirstTrekCardTitle() {
    const firstCard = this.trekCards.first();
    const titleLocator = firstCard.locator('.trek-card__title');
    await titleLocator.waitFor({ state: 'visible' });
    return await titleLocator.textContent();
  }

  async verifyTrekCardsHavePricing() {
    const firstCard = this.trekCards.first();
    const priceLocator = firstCard.locator('.trek-card__price');
    await priceLocator.waitFor({ state: 'visible' });
    return await priceLocator.isVisible();
  }

  async clickFirstTrekCard() {
  const firstCard = this.trekCards.first();

  await firstCard.waitFor({
    state: "visible",
    timeout: 10000,
  });

  await firstCard.scrollIntoViewIfNeeded();

  // Trigger the click directly
  await firstCard.evaluate((el) => el.click());

  await this.page.waitForURL(/\/treks\/|\/destination\//, {
    timeout: 10000,
  });
}

  // ============ PAGINATION METHODS ============
  async verifyPaginationVisible() {
    const trekCount = await this.getTrekCardsCount();
    if (trekCount > 0) {
      return await this.paginationWrapper.isVisible().catch(() => false);
    }
    return false;
  }

  // ============ TRAVEL YOUR WAY SECTION METHODS ============
  async verifyTravelYourWaySectionVisible() {
    await this.travelYourWaySection.waitFor({ state: 'visible' });
    return await this.travelYourWaySection.isVisible();
  }

  async verifyTravelYourWayTitleVisible() {
    await this.travelYourWayTitle.waitFor({ state: 'visible' });
    return await this.travelYourWayTitle.isVisible();
  }

  async getTravelYourWayCardsCount() {
    await this.travelYourWayCards.first().waitFor({ state: 'visible' });
    return await this.travelYourWayCards.count();
  }

  async verifyTravelYourWayCardsVisible() {
    const count = await this.getTravelYourWayCardsCount();
    return count > 0;
  }

  // ============ FOOTER METHODS ============
  async verifyFooterVisible() {
    await this.footer.waitFor({ state: 'visible' });
    return await this.footer.isVisible();
  }

  async scrollToFooter() {
    await this.footer.scrollIntoViewIfNeeded();
  }

  // ============ SEARCH WORKFLOW METHODS ============
  async search(place) {
  await this.searchBox.clear();
  await this.searchBox.fill(place);

  if (place.trim() !== '') {
    await this.page.locator('.search-suggestion-item').first().waitFor({
      state: 'visible',
      timeout: 5000,
    });
  }
}

async pressEnter() {
  const value = await this.searchBox.inputValue();

  if (value.trim() !== '') {
    try {
      await this.page.locator('.search-suggestion-item').first().waitFor({
        state: 'visible',
        timeout: 5000,
      });
    } catch {
      // Suggestions may not appear for every search.
      // Continue with Enter key submission.
    }
  }

  await this.searchBox.waitFor({
    state: 'visible',
    timeout: 5000,
  });

  await this.searchBox.press('Enter');
}


  async clearSearch() {
    await this.searchBox.clear();
  }

  // ============ ADVANCED SEARCH METHODS ============

  /**
   * Wait for suggestions and get count
   */
  async waitAndGetSuggestionsCount() {
    await this.waitForSuggestions();
    return await this.getSuggestionsCount();
  }

  /**
   * Check if "no results" message is displayed
   */
  async isNoResultsMessageVisible() {
    const noResultsItem = this.page.locator('.search-suggestion-item--empty');
    try {
      await noResultsItem.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get text of first suggestion
   */
  async getFirstSuggestionText() {
    await this.waitForSuggestions();
    const firstSuggestion = this.page.locator('.search-suggestion-item').first();
    return await firstSuggestion.textContent();
  }

  /**
   * Check if trek suggestion exists (has 🏔️ emoji)
   */
  async hasTrekSuggestions() {
    const trekSuggestions = this.page.locator('.search-suggestion-item').filter({ hasText: /🏔️/ });
    return await trekSuggestions.count() > 0;
  }

  /**
   * Check if OSM suggestion exists (has 📍 emoji)
   */
  async hasOsmSuggestions() {
    const osmSuggestions = this.page.locator('.search-suggestion-item').filter({ hasText: /📍/ });
    return await osmSuggestions.count() > 0;
  }

  /**
   * Submit search by pressing Enter (handles empty search gracefully)
   */
  async submitSearchByEnter() {
    await this.pressEnter();
  }

  /**
   * Submit search by clicking button (handles empty search gracefully)
   */
  async submitSearchByButton() {
    await this.clickSearchButton();
  }

  /**
   * Get first trek suggestion name
   */
  async getFirstTrekSuggestionName() {
    const trekSuggestion = this.page.locator('.search-suggestion-item').filter({ hasText: /🏔️/ }).first();
    await trekSuggestion.waitFor({ state: 'visible' });
    return await trekSuggestion.textContent();
  }

  /**
   * Get first OSM suggestion name
   */
  async getFirstOsmSuggestionName() {
    const osmSuggestion = this.page.locator('.search-suggestion-item').filter({ hasText: /📍/ }).first();
    await osmSuggestion.waitFor({ state: 'visible' });
    return await osmSuggestion.textContent();
  }

  /**
   * Click OSM suggestion by name
   */
  async clickOsmSuggestion(name) {
    const osmSuggestion = this.page.locator('.search-suggestion-item').filter({
      hasText: new RegExp(`📍.*${name}`, 'i')
    }).first();
    await osmSuggestion.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Type search with special characters
   */
  async searchWithSpecialCharacters(text) {
    await this.searchBox.click();
    await this.searchBox.type(text, { delay: 50 });
    await this.page.waitForTimeout(600);
  }

  /**
   * Search with leading/trailing spaces
   */
  async searchWithSpaces(text, type = 'leading') {
    await this.searchBox.clear();
    if (type === 'leading') {
      await this.searchBox.fill(`   ${text}`);
    } else if (type === 'trailing') {
      await this.searchBox.fill(`${text}   `);
    } else {
      await this.searchBox.fill(`   ${text}   `);
    }
    await this.page.waitForTimeout(600);
  }

  /**
   * Type and wait for no results message
   */
  async searchAndWaitForNoResults(text, timeout = 5000) {
    await this.search(text);
    const noResultsItem = this.page.locator('.search-suggestion-item--empty');
    await noResultsItem.waitFor({ state: 'visible', timeout });
  }

  /**
   * Press Escape key to close suggestions
   */
  async pressEscape() {
    await this.searchBox.press('Escape');
    await this.page.waitForTimeout(300);
  }

  /**
   * Verify suggestions close after Escape
   */
  async verifySuggestionsCloseOnEscape() {
    await this.search('test');
    await this.waitForSuggestions();
    await this.pressEscape();

    try {
      await this.searchSuggestions.waitFor({ state: 'hidden', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}