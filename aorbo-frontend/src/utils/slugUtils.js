/**
 * Slug Utility Functions
 * Handles URL-safe slug generation and reversal for destination names
 */

/**
 * Generate URL-safe slug from destination name
 * Handles special characters, spaces, accents
 * 
 * @param {string} name - Destination name (e.g., "Talakona Falls, AP")
 * @returns {string} URL-safe slug (e.g., "talakona-falls-ap")
 * 
 * Examples:
 *   "Coorg" → "coorg"
 *   "Talakona Falls, AP" → "talakona-falls-ap"
 *   "St. Mary's Peak" → "st-marys-peak"
 *   "Kashi Vishwanath Temple" → "kashi-vishwanath-temple"
 */
export function generateSlug(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    // Remove or replace special characters
    .replace(/[&/\\#,+()$~%.'":*?<>{}]/g, '')
    // Replace spaces with dashes
    .replace(/\s+/g, '-')
    // Remove duplicate dashes
    .replace(/-+/g, '-')
    // Remove leading/trailing dashes
    .replace(/^-+|-+$/g, '');
}

/**
 * Reverse slug generation to get original-like name
 * Used when fetching destination details
 * 
 * @param {string} slug - URL slug (e.g., "talakona-falls-ap")
 * @returns {string} Destination name (e.g., "talakona falls ap")
 * 
 * Examples:
 *   "coorg" → "coorg"
 *   "talakona-falls-ap" → "talakona falls ap"
 *   "st-marys-peak" → "st marys peak"
 */
export function slugToName(slug) {
  if (!slug) return '';
  
  return decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .trim();
}
