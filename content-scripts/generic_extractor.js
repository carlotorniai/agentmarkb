/**
 * Generic Web Page Content Extractor
 *
 * Extracts article content and author information from any web page.
 * Uses a priority-based approach:
 * 1. JSON-LD structured data
 * 2. OpenGraph meta tags
 * 3. Twitter Card meta tags
 * 4. Standard meta tags
 * 5. Heuristic DOM parsing
 */

(function () {
  'use strict';

  /**
   * Extract JSON-LD structured data
   */
  function extractJsonLd() {
    const result = {
      title: null,
      author: null,
      date: null,
      description: null,
      source: null,
      type: null
    };

    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);

        // Handle arrays
        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
          // Check @graph structure (common in many sites)
          if (item['@graph']) {
            for (const graphItem of item['@graph']) {
              parseSchemaItem(graphItem, result);
            }
          } else {
            parseSchemaItem(item, result);
          }
        }
      } catch (e) {
        console.warn('Failed to parse JSON-LD:', e);
      }
    }

    return result;
  }

  /**
   * Parse a single schema.org item
   */
  function parseSchemaItem(item, result) {
    const type = item['@type'];

    // Check if it's an Article type
    if (['Article', 'NewsArticle', 'BlogPosting', 'WebPage', 'Report'].includes(type)) {
      result.type = type;

      if (item.headline && !result.title) {
        result.title = item.headline;
      }
      if (item.name && !result.title) {
        result.title = item.name;
      }
      if (item.description && !result.description) {
        result.description = item.description;
      }
      if (item.datePublished && !result.date) {
        result.date = item.datePublished;
      }

      // Author can be string, object, or array
      if (item.author && !result.author) {
        if (typeof item.author === 'string') {
          result.author = item.author;
        } else if (Array.isArray(item.author)) {
          result.author = item.author.map((a) => (typeof a === 'string' ? a : a.name)).join(', ');
        } else if (item.author.name) {
          result.author = item.author.name;
        }
      }

      // Publisher/source
      if (item.publisher && !result.source) {
        if (typeof item.publisher === 'string') {
          result.source = item.publisher;
        } else if (item.publisher.name) {
          result.source = item.publisher.name;
        }
      }
    }

    // Check for Organization (for source name)
    if (type === 'Organization' && item.name && !result.source) {
      result.source = item.name;
    }

    // Check for Person (for author)
    if (type === 'Person' && item.name && !result.author) {
      result.author = item.name;
    }
  }

  /**
   * Extract OpenGraph meta tags
   */
  function extractOpenGraph() {
    const result = {
      title: null,
      description: null,
      siteName: null,
      type: null,
      date: null,
      author: null
    };

    const ogTags = {
      'og:title': 'title',
      'og:description': 'description',
      'og:site_name': 'siteName',
      'og:type': 'type',
      'article:published_time': 'date',
      'article:author': 'author'
    };

    for (const [property, key] of Object.entries(ogTags)) {
      const meta = document.querySelector(`meta[property="${property}"]`);
      if (meta && meta.content) {
        result[key] = meta.content;
      }
    }

    return result;
  }

  /**
   * Extract Twitter Card meta tags
   */
  function extractTwitterCard() {
    const result = {
      title: null,
      description: null,
      creator: null
    };

    const twitterTags = {
      'twitter:title': 'title',
      'twitter:description': 'description',
      'twitter:creator': 'creator',
      'twitter:site': 'site'
    };

    for (const [name, key] of Object.entries(twitterTags)) {
      const meta = document.querySelector(`meta[name="${name}"]`);
      if (meta && meta.content) {
        result[key] = meta.content;
      }
    }

    return result;
  }

  /**
   * Extract standard meta tags
   */
  function extractMetaTags() {
    const result = {
      title: null,
      description: null,
      author: null,
      date: null
    };

    // Title
    const titleElement = document.querySelector('title');
    if (titleElement) {
      result.title = titleElement.textContent.trim();
    }

    // Description
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      result.description = descMeta.content;
    }

    // Author
    const authorMeta = document.querySelector('meta[name="author"]');
    if (authorMeta) {
      result.author = authorMeta.content;
    }

    // Date - try multiple formats
    const dateMetas = ['date', 'article:published', 'pubdate', 'publishdate', 'DC.date.issued'];
    for (const name of dateMetas) {
      const meta = document.querySelector(`meta[name="${name}"]`);
      if (meta && meta.content) {
        result.date = meta.content;
        break;
      }
    }

    return result;
  }

  /**
   * Heuristic DOM parsing as fallback
   */
  function extractFromDOM() {
    const result = {
      title: null,
      author: null,
      date: null,
      description: null
    };

    // Title - try h1 first
    const h1 = document.querySelector('article h1, main h1, .article-title, .post-title, h1');
    if (h1) {
      result.title = h1.textContent.trim();
    }

    // Author - look for common patterns
    const authorSelectors = [
      '.author-name',
      '.byline',
      '.author',
      '[rel="author"]',
      '.post-author',
      '.article-author',
      '.writer-name',
      '[itemprop="author"]'
    ];

    for (const selector of authorSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        let authorText = element.textContent.trim();
        // Remove common prefixes
        authorText = authorText.replace(/^(by|author:|written by)\s*/i, '');
        if (authorText) {
          result.author = authorText;
          break;
        }
      }
    }

    // Also try to find "By Author Name" pattern in text
    if (!result.author) {
      const bylinePattern = /by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i;
      const articleElement = document.querySelector('article') || document.body;
      const text = articleElement.textContent.substring(0, 2000);
      const match = text.match(bylinePattern);
      if (match) {
        result.author = match[1].trim();
      }
    }

    // Date - look for time elements or common patterns
    const timeElement = document.querySelector('article time, time[datetime], .publish-date, .post-date');
    if (timeElement) {
      const datetime = timeElement.getAttribute('datetime');
      if (datetime) {
        result.date = datetime;
      } else {
        result.date = timeElement.textContent.trim();
      }
    }

    // Description - first paragraph of article
    if (!result.description) {
      const articleP = document.querySelector('article p, main p, .article-content p');
      if (articleP) {
        const text = articleP.textContent.trim();
        result.description = text.length > 200 ? text.substring(0, 200) + '...' : text;
      }
    }

    return result;
  }

  /**
   * Get the source/site name
   */
  function getSourceName() {
    // Try meta tags first
    const ogSiteName = document.querySelector('meta[property="og:site_name"]');
    if (ogSiteName && ogSiteName.content) {
      return ogSiteName.content;
    }

    // Try to infer from domain
    const hostname = window.location.hostname;

    // Common mappings
    const siteNames = {
      'mckinsey.com': 'McKinsey & Company',
      'bcg.com': 'Boston Consulting Group',
      'hbr.org': 'Harvard Business Review',
      'medium.com': 'Medium',
      'forbes.com': 'Forbes',
      'wired.com': 'Wired',
      'techcrunch.com': 'TechCrunch',
      'theverge.com': 'The Verge',
      'nytimes.com': 'The New York Times',
      'wsj.com': 'The Wall Street Journal',
      'economist.com': 'The Economist',
      'ft.com': 'Financial Times',
      'bloomberg.com': 'Bloomberg',
      'bain.com': 'Bain & Company',
      'deloitte.com': 'Deloitte',
      'pwc.com': 'PwC',
      'kpmg.com': 'KPMG',
      'accenture.com': 'Accenture',
      'stratechery.com': 'Stratechery',
      'a16z.com': 'Andreessen Horowitz'
    };

    for (const [domain, name] of Object.entries(siteNames)) {
      if (hostname.includes(domain)) {
        return name;
      }
    }

    // Fallback: format hostname nicely
    return hostname.replace('www.', '').split('.')[0];
  }

  /**
   * Merge extracted data with priority
   */
  function mergeData(jsonLd, og, twitter, meta, dom) {
    return {
      title: jsonLd.title || og.title || twitter.title || meta.title || dom.title,
      author: jsonLd.author || og.author || twitter.creator || meta.author || dom.author,
      date: jsonLd.date || og.date || meta.date || dom.date,
      description: jsonLd.description || og.description || twitter.description || meta.description || dom.description,
      source: jsonLd.source || og.siteName || getSourceName()
    };
  }

  /**
   * Clean and normalize date
   */
  function normalizeDate(dateStr) {
    if (!dateStr) return null;

    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Ignore parsing errors
    }

    return dateStr;
  }

  /**
   * Suggest topics based on content
   */
  function suggestTopics(text, source) {
    const suggested = [];

    if (!text) return suggested;

    const topicKeywords = {
      strategy: ['strategy', 'strategic', 'competitive', 'transformation', 'planning'],
      consulting: ['consulting', 'consultant', 'advisory', 'mckinsey', 'bcg', 'bain'],
      technology: ['technology', 'digital', 'software', 'platform', 'innovation', 'tech'],
      ai: ['ai', 'artificial intelligence', 'machine learning', 'automation', 'generative'],
      leadership: ['leadership', 'ceo', 'executive', 'management', 'organization'],
      business: ['business', 'company', 'enterprise', 'corporate', 'growth'],
      finance: ['finance', 'investment', 'capital', 'banking', 'markets'],
      healthcare: ['healthcare', 'health', 'medical', 'pharma', 'hospital'],
      sustainability: ['sustainability', 'climate', 'esg', 'carbon', 'green', 'environmental'],
      operations: ['operations', 'supply chain', 'manufacturing', 'efficiency', 'lean']
    };

    const lowerText = text.toLowerCase();

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        suggested.push(topic);
      }
    }

    // Add source-based topics
    const sourceLower = (source || '').toLowerCase();
    if (sourceLower.includes('mckinsey') || sourceLower.includes('bcg') || sourceLower.includes('bain')) {
      if (!suggested.includes('consulting')) {
        suggested.push('consulting');
      }
    }

    return suggested.slice(0, 5);
  }

  /**
   * Main extraction function
   */
  function extract() {
    // Extract from all sources
    const jsonLd = extractJsonLd();
    const og = extractOpenGraph();
    const twitter = extractTwitterCard();
    const meta = extractMetaTags();
    const dom = extractFromDOM();

    // Merge with priority
    const merged = mergeData(jsonLd, og, twitter, meta, dom);

    const result = {
      type: 'article',
      platform: 'generic_web',
      pageUrl: window.location.href,
      author: {
        name: merged.author,
        source: merged.source
      },
      content: {
        title: merged.title,
        summary: merged.description,
        url: window.location.href,
        date_published: normalizeDate(merged.date)
      }
    };

    // Add suggested topics
    result.suggestedTopics = suggestTopics(
      `${result.content.title || ''} ${result.content.summary || ''}`,
      result.author.source
    );

    return result;
  }

  // Execute extraction and return result
  const extractedData = extract();

  // Also listen for messages from popup/background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getExtractedData') {
      sendResponse(extract());
    }
    return true;
  });

  // Return the extracted data (for executeScript)
  return extractedData;
})();
