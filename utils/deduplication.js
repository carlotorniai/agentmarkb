/**
 * Deduplication Utilities for AgentMarKB
 *
 * Provides URL and identifier normalization for detecting duplicates
 * across the knowledge base.
 */

/**
 * Tracking parameters to remove from URLs
 */
const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'source',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'trk',
  'trkInfo'
];

/**
 * Normalize a URL for comparison
 * Removes tracking parameters, trailing slashes, and normalizes domains
 *
 * @param {string} url - The URL to normalize
 * @returns {string} - Normalized URL
 */
export function normalizeUrl(url) {
  if (!url) return '';

  try {
    const parsed = new URL(url);

    // Remove tracking parameters
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }

    // Get the normalized URL
    let normalized = parsed.href;

    // Remove trailing slashes (but keep single slash for root)
    normalized = normalized.replace(/\/+$/, '');
    if (normalized.endsWith(parsed.hostname)) {
      normalized += '/';
    }

    // Normalize X/Twitter domains
    normalized = normalized.replace(/\/\/(www\.)?(twitter\.com|x\.com)\//, '//x.com/');

    // Normalize LinkedIn domains
    normalized = normalized.replace(/\/\/(www\.)?linkedin\.com\//, '//www.linkedin.com/');

    // Remove hash/fragments unless they're meaningful
    const hash = parsed.hash;
    if (hash && !hash.includes('=') && !hash.startsWith('#!')) {
      normalized = normalized.replace(hash, '');
    }

    return normalized.toLowerCase();
  } catch (error) {
    // If URL parsing fails, do basic normalization
    return url.toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Normalize an X/Twitter handle
 *
 * @param {string} handle - The handle (with or without @)
 * @returns {string} - Normalized handle (lowercase, no @)
 */
export function normalizeHandle(handle) {
  if (!handle) return '';
  return handle.replace(/^@/, '').toLowerCase().trim();
}

/**
 * Normalize author name for comparison
 *
 * @param {string} name - The author name
 * @returns {string} - Normalized name
 */
export function normalizeAuthorName(name) {
  if (!name) return '';

  return name
    .toLowerCase()
    .trim()
    // Remove common titles
    .replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?|prof\.?)\s+/i, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Check if two URLs point to the same content
 *
 * @param {string} url1 - First URL
 * @param {string} url2 - Second URL
 * @returns {boolean} - True if URLs match
 */
export function urlsMatch(url1, url2) {
  return normalizeUrl(url1) === normalizeUrl(url2);
}

/**
 * Check if two author handles match
 *
 * @param {string} handle1 - First handle
 * @param {string} handle2 - Second handle
 * @returns {boolean} - True if handles match
 */
export function handlesMatch(handle1, handle2) {
  return normalizeHandle(handle1) === normalizeHandle(handle2);
}

/**
 * Check if two author names match
 *
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {boolean} - True if names match
 */
export function namesMatch(name1, name2) {
  return normalizeAuthorName(name1) === normalizeAuthorName(name2);
}

/**
 * Find an author in a KB section
 *
 * @param {Array} authors - Array of authors from KB
 * @param {string} platform - Platform type (x, linkedin, substack, generic_web)
 * @param {Object|string} identifier - Author identifier
 * @returns {Object|null} - Found author or null
 */
export function findAuthor(authors, platform, identifier) {
  if (!authors || !Array.isArray(authors)) return null;

  for (const author of authors) {
    switch (platform) {
      case 'x':
        if (handlesMatch(author.handle, identifier)) {
          return author;
        }
        break;

      case 'linkedin':
        if (urlsMatch(author.profile_url, identifier)) {
          return author;
        }
        break;

      case 'substack':
        if (urlsMatch(author.url, identifier)) {
          return author;
        }
        break;

      case 'generic_web':
        if (typeof identifier === 'object') {
          if (
            namesMatch(author.name, identifier.name) &&
            normalizeAuthorName(author.source) === normalizeAuthorName(identifier.source)
          ) {
            return author;
          }
        }
        break;
    }
  }

  return null;
}

/**
 * Check if content already exists in author's saved items
 *
 * @param {Object} author - Author object from KB
 * @param {string} url - Content URL to check
 * @param {string} platform - Platform type
 * @returns {boolean} - True if content exists
 */
export function contentExists(author, url, platform) {
  if (!author) return false;

  const contentKey = platform === 'x' || platform === 'linkedin' ? 'saved_posts' : 'saved_articles';
  const savedContent = author[contentKey];

  if (!savedContent || !Array.isArray(savedContent)) return false;

  const normalizedUrl = normalizeUrl(url);
  return savedContent.some((item) => normalizeUrl(item.url) === normalizedUrl);
}

/**
 * Generate a unique ID for an author
 *
 * @param {string} platform - Platform type
 * @param {Object} author - Author object
 * @returns {string} - Unique identifier
 */
export function generateAuthorId(platform, author) {
  switch (platform) {
    case 'x':
      return `x:${normalizeHandle(author.handle)}`;
    case 'linkedin':
      const linkedinMatch = author.profile_url?.match(/\/in\/([^\/\?]+)/);
      return `linkedin:${linkedinMatch ? linkedinMatch[1].toLowerCase() : ''}`;
    case 'substack':
      const substackMatch = author.url?.match(/\/\/([^\/]+)/);
      return `substack:${substackMatch ? substackMatch[1].toLowerCase() : ''}`;
    case 'generic_web':
      return `web:${normalizeAuthorName(author.source)}:${normalizeAuthorName(author.name)}`;
    default:
      return '';
  }
}
