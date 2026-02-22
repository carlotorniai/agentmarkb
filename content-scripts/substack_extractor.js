/**
 * Substack Content Extractor
 *
 * Extracts article content and author information from Substack pages.
 * Handles articles, publication homepages, and about pages.
 */

(function () {
  'use strict';

  /**
   * Detect the type of Substack page
   */
  function detectPageType() {
    const url = window.location.href;
    const path = window.location.pathname;

    // Article URL pattern: /p/article-slug
    if (path.startsWith('/p/')) {
      return 'article';
    }

    // About page
    if (path.startsWith('/about')) {
      return 'about';
    }

    // Archive page
    if (path.startsWith('/archive')) {
      return 'archive';
    }

    // Homepage
    if (path === '/' || path === '') {
      return 'homepage';
    }

    return 'unknown';
  }

  /**
   * Extract publication info
   */
  function extractPublicationInfo() {
    const info = {
      name: null,
      url: null,
      author: null
    };

    // Get publication URL (base domain)
    info.url = `${window.location.protocol}//${window.location.hostname}`;

    // Get publication name from meta tags or header
    const ogSiteName = document.querySelector('meta[property="og:site_name"]');
    if (ogSiteName) {
      info.name = ogSiteName.content;
    }

    if (!info.name) {
      // Try header or title
      const titleElement = document.querySelector('.publication-name, .navbar-title, h1.name');
      if (titleElement) {
        info.name = titleElement.textContent.trim();
      }
    }

    if (!info.name) {
      // Fallback to page title
      const title = document.title;
      if (title) {
        // Usually format is "Article Title - Publication Name"
        const parts = title.split(' - ');
        if (parts.length > 1) {
          info.name = parts[parts.length - 1].trim();
        } else {
          info.name = title;
        }
      }
    }

    // Try to get author name
    const authorMeta = document.querySelector('meta[name="author"]');
    if (authorMeta) {
      info.author = authorMeta.content;
    }

    if (!info.author) {
      const authorElement = document.querySelector('.author-name, .byline-names, [data-testid="author-name"]');
      if (authorElement) {
        info.author = authorElement.textContent.trim();
      }
    }

    return info;
  }

  /**
   * Extract article data
   */
  function extractArticle() {
    const result = {
      type: 'article',
      publication: extractPublicationInfo(),
      content: {
        title: null,
        summary: null,
        url: window.location.href,
        date: null,
        tags: []
      }
    };

    // Extract title
    // Try Open Graph first
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      result.content.title = ogTitle.content;
    }

    if (!result.content.title) {
      // Try article title elements
      const titleSelectors = [
        'h1.post-title',
        'h1[data-testid="post-title"]',
        'article h1',
        '.post-header h1',
        'h1'
      ];

      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          result.content.title = element.textContent.trim();
          break;
        }
      }
    }

    // Extract summary/description
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      result.content.summary = ogDesc.content;
    }

    if (!result.content.summary) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        result.content.summary = metaDesc.content;
      }
    }

    if (!result.content.summary) {
      // Try subtitle or first paragraph
      const subtitleElement = document.querySelector('.subtitle, .post-subtitle');
      if (subtitleElement) {
        result.content.summary = subtitleElement.textContent.trim();
      } else {
        const firstP = document.querySelector('article p, .body p');
        if (firstP) {
          const text = firstP.textContent.trim();
          result.content.summary = text.length > 200 ? text.substring(0, 200) + '...' : text;
        }
      }
    }

    // Extract publication date
    const dateMeta = document.querySelector('meta[property="article:published_time"]');
    if (dateMeta) {
      result.content.date = dateMeta.content.split('T')[0];
    }

    if (!result.content.date) {
      const timeElement = document.querySelector('time[datetime]');
      if (timeElement) {
        const datetime = timeElement.getAttribute('datetime');
        if (datetime) {
          result.content.date = datetime.split('T')[0];
        }
      }
    }

    if (!result.content.date) {
      // Try to find date text
      const dateSelectors = ['.post-date', '.date', '[data-testid="post-date"]'];
      for (const selector of dateSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          result.content.dateText = element.textContent.trim();
          break;
        }
      }
    }

    // Extract tags
    const tagElements = document.querySelectorAll('.post-label, .tag, [data-testid="post-tag"]');
    tagElements.forEach((tag) => {
      const tagText = tag.textContent.trim().toLowerCase();
      if (tagText && !result.content.tags.includes(tagText)) {
        result.content.tags.push(tagText);
      }
    });

    // Clean URL (remove query params)
    result.content.url = window.location.origin + window.location.pathname;

    return result;
  }

  /**
   * Extract homepage/publication data
   */
  function extractHomepage() {
    const result = {
      type: 'publication',
      publication: extractPublicationInfo(),
      description: null
    };

    // Try to get publication description
    const aboutSelectors = ['.publication-about', '.about-text', '.description'];
    for (const selector of aboutSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        result.description = element.textContent.trim();
        break;
      }
    }

    if (!result.description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        result.description = metaDesc.content;
      }
    }

    return result;
  }

  /**
   * Suggest topics based on content
   */
  function suggestTopics(text, tags) {
    const suggested = new Set();

    // Add existing tags
    if (tags && tags.length > 0) {
      tags.forEach((tag) => suggested.add(tag));
    }

    if (!text) return Array.from(suggested).slice(0, 5);

    const topicKeywords = {
      technology: ['tech', 'software', 'programming', 'startup', 'silicon valley', 'app'],
      ai: ['ai', 'artificial intelligence', 'machine learning', 'gpt', 'llm', 'neural', 'chatgpt'],
      business: ['business', 'entrepreneur', 'company', 'market', 'industry', 'growth'],
      finance: ['finance', 'investment', 'money', 'economy', 'stock', 'crypto', 'bitcoin'],
      politics: ['politics', 'policy', 'government', 'election', 'democrat', 'republican'],
      culture: ['culture', 'society', 'art', 'music', 'film', 'book', 'literature'],
      science: ['science', 'research', 'study', 'experiment', 'biology', 'physics'],
      health: ['health', 'medical', 'medicine', 'wellness', 'mental health', 'nutrition'],
      productivity: ['productivity', 'habits', 'workflow', 'efficiency', 'focus'],
      writing: ['writing', 'author', 'newsletter', 'content', 'journalism', 'media']
    };

    const lowerText = text.toLowerCase();

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        suggested.add(topic);
      }
    }

    return Array.from(suggested).slice(0, 5);
  }

  /**
   * Main extraction function
   */
  function extract() {
    const pageType = detectPageType();

    let extracted;
    switch (pageType) {
      case 'article':
        extracted = extractArticle();
        break;
      case 'homepage':
      case 'about':
      case 'archive':
        extracted = extractHomepage();
        break;
      default:
        // Default to article extraction
        extracted = extractArticle();
    }

    // Add suggested topics
    const textForTopics = extracted.content?.summary || extracted.content?.title || extracted.description || '';
    const existingTags = extracted.content?.tags || [];
    extracted.suggestedTopics = suggestTopics(textForTopics, existingTags);

    extracted.platform = 'substack';
    extracted.pageUrl = window.location.href;

    // Extract full content via Readability if available
    if (typeof Readability !== 'undefined') {
      try {
        const clone = document.cloneNode(true);
        const article = new Readability(clone).parse();
        if (article && article.content) {
          extracted.fullContentHtml = article.content;
          if (!extracted.content?.title && article.title) {
            extracted.content = extracted.content || {};
            extracted.content.title = article.title;
          }
          if (!extracted.content?.summary && article.excerpt) {
            extracted.content = extracted.content || {};
            extracted.content.summary = article.excerpt;
          }
        }
      } catch (e) {
        console.warn('Readability extraction failed:', e);
      }
    }

    return extracted;
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
