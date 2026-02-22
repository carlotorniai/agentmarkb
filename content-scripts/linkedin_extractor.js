/**
 * LinkedIn Content Extractor
 *
 * Extracts post content and author information from LinkedIn pages.
 * Handles posts, articles, and profile pages.
 */

(function () {
  'use strict';

  /**
   * Detect the type of LinkedIn page
   */
  function detectPageType() {
    const url = window.location.href;

    // Post URL patterns
    if (url.includes('/posts/') || url.includes('/pulse/') || url.includes('/feed/update/')) {
      return 'post';
    }

    // Article URL pattern
    if (url.includes('/pulse/')) {
      return 'article';
    }

    // Profile URL pattern
    if (url.includes('/in/')) {
      return 'profile';
    }

    // Company page
    if (url.includes('/company/')) {
      return 'company';
    }

    // Feed - might have a focused post
    if (url.includes('/feed/')) {
      return 'feed';
    }

    return 'unknown';
  }

  /**
   * Extract profile URL from the page
   */
  function extractProfileUrl(element) {
    if (!element) return null;

    // Look for profile links
    const profileLinks = element.querySelectorAll('a[href*="/in/"]');
    for (const link of profileLinks) {
      const href = link.href;
      // Clean up the URL
      const match = href.match(/linkedin\.com\/in\/([^\/\?]+)/);
      if (match) {
        return `https://www.linkedin.com/in/${match[1]}/`;
      }
    }
    return null;
  }

  /**
   * Clean text by removing extra whitespace
   */
  function cleanText(text) {
    if (!text) return null;
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract post data from the page
   */
  function extractPost() {
    const result = {
      type: 'post',
      author: {
        name: null,
        profile_url: null,
        headline: null
      },
      content: {
        text: null,
        preview: null,
        url: window.location.href,
        date: null
      }
    };

    // Try multiple selectors for finding the post container
    const postSelectors = [
      '.feed-shared-update-v2',
      '.feed-shared-update-v2__content',
      '[data-urn*="activity"]',
      '.occludable-update',
      'article'
    ];

    let postContainer = null;
    for (const selector of postSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // For feed page, get the first one or the one matching URL
        postContainer = elements[0];
        break;
      }
    }

    if (postContainer || document.body) {
      const container = postContainer || document.body;

      // Extract author name
      const authorSelectors = [
        '.update-components-actor__name',
        '.feed-shared-actor__name',
        '.update-components-actor__title span',
        '.feed-shared-actor__title span',
        '.artdeco-entity-lockup__title'
      ];

      for (const selector of authorSelectors) {
        const element = container.querySelector(selector);
        if (element) {
          result.author.name = cleanText(element.textContent);
          break;
        }
      }

      // Extract profile URL
      result.author.profile_url = extractProfileUrl(container);

      // Extract headline/title
      const headlineSelectors = [
        '.update-components-actor__description',
        '.feed-shared-actor__description',
        '.artdeco-entity-lockup__subtitle'
      ];

      for (const selector of headlineSelectors) {
        const element = container.querySelector(selector);
        if (element) {
          result.author.headline = cleanText(element.textContent);
          break;
        }
      }

      // Extract post content
      const contentSelectors = [
        '.feed-shared-update-v2__description',
        '.feed-shared-text',
        '.update-components-text',
        '.feed-shared-inline-show-more-text',
        '.break-words'
      ];

      for (const selector of contentSelectors) {
        const element = container.querySelector(selector);
        if (element) {
          result.content.text = cleanText(element.textContent);
          break;
        }
      }

      // Create preview (first 100 chars)
      if (result.content.text) {
        result.content.preview =
          result.content.text.length > 100 ? result.content.text.substring(0, 100) + '...' : result.content.text;
      }

      // Extract timestamp
      const timeSelectors = [
        '.feed-shared-actor__sub-description time',
        'time',
        '.update-components-actor__sub-description'
      ];

      for (const selector of timeSelectors) {
        const element = container.querySelector(selector);
        if (element) {
          const datetime = element.getAttribute('datetime');
          if (datetime) {
            result.content.date = datetime.split('T')[0];
          } else {
            // Try to parse text like "1w", "2d", etc.
            const timeText = element.textContent.trim();
            result.content.dateText = timeText;
          }
          break;
        }
      }
    }

    return result;
  }

  /**
   * Extract profile data
   */
  function extractProfile() {
    const result = {
      type: 'profile',
      author: {
        name: null,
        profile_url: window.location.href,
        headline: null,
        about: null
      }
    };

    // Clean up profile URL
    const urlMatch = window.location.href.match(/linkedin\.com\/in\/([^\/\?]+)/);
    if (urlMatch) {
      result.author.profile_url = `https://www.linkedin.com/in/${urlMatch[1]}/`;
    }

    // Extract name
    const nameSelectors = ['.text-heading-xlarge', 'h1.text-heading-xlarge', '.pv-top-card--list li:first-child', 'h1'];

    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        result.author.name = cleanText(element.textContent);
        break;
      }
    }

    // Extract headline
    const headlineSelectors = ['.text-body-medium.break-words', '.pv-top-card--list .text-body-medium'];

    for (const selector of headlineSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        result.author.headline = cleanText(element.textContent);
        break;
      }
    }

    // Extract about section
    const aboutSection = document.querySelector('#about ~ .display-flex .pv-shared-text-with-see-more span');
    if (aboutSection) {
      result.author.about = cleanText(aboutSection.textContent);
    }

    return result;
  }

  /**
   * Extract article data (LinkedIn Pulse articles)
   */
  function extractArticle() {
    const result = {
      type: 'article',
      author: {
        name: null,
        profile_url: null
      },
      content: {
        title: null,
        summary: null,
        url: window.location.href,
        date: null
      }
    };

    // Extract title
    const titleElement = document.querySelector('h1');
    if (titleElement) {
      result.content.title = cleanText(titleElement.textContent);
    }

    // Extract author
    const authorElement = document.querySelector('.author-name, .article-author-name, [data-tracking-control-name="article-author-name"]');
    if (authorElement) {
      result.author.name = cleanText(authorElement.textContent);
      result.author.profile_url = extractProfileUrl(authorElement.closest('a') || authorElement);
    }

    // Extract summary from meta or first paragraph
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      result.content.summary = metaDesc.content;
    } else {
      const firstP = document.querySelector('article p, .article-content p');
      if (firstP) {
        const text = cleanText(firstP.textContent);
        result.content.summary = text.length > 200 ? text.substring(0, 200) + '...' : text;
      }
    }

    // Extract date
    const dateElement = document.querySelector('time, .article-date');
    if (dateElement) {
      const datetime = dateElement.getAttribute('datetime');
      if (datetime) {
        result.content.date = datetime.split('T')[0];
      }
    }

    return result;
  }

  /**
   * Suggest topics based on content and headline
   */
  function suggestTopics(text) {
    if (!text) return [];

    const topicKeywords = {
      leadership: ['leadership', 'leader', 'ceo', 'executive', 'management', 'team lead', 'director'],
      career: ['career', 'job', 'hiring', 'interview', 'resume', 'promotion', 'opportunity'],
      business: ['business', 'entrepreneur', 'startup', 'company', 'revenue', 'growth', 'strategy'],
      technology: ['tech', 'software', 'digital', 'innovation', 'engineering', 'developer'],
      ai: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'automation', 'gpt', 'llm'],
      marketing: ['marketing', 'brand', 'content', 'social media', 'advertising', 'seo'],
      sales: ['sales', 'revenue', 'customer', 'b2b', 'deal', 'pipeline'],
      productivity: ['productivity', 'efficiency', 'workflow', 'time management', 'habits'],
      networking: ['networking', 'connections', 'community', 'relationships', 'mentorship'],
      finance: ['finance', 'investment', 'funding', 'venture', 'capital', 'economy']
    };

    const lowerText = text.toLowerCase();
    const suggested = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        suggested.push(topic);
      }
    }

    return suggested.slice(0, 5);
  }

  /**
   * Main extraction function
   */
  function extract() {
    const pageType = detectPageType();

    let extracted;
    switch (pageType) {
      case 'post':
      case 'feed':
        extracted = extractPost();
        break;
      case 'article':
        extracted = extractArticle();
        break;
      case 'profile':
        extracted = extractProfile();
        break;
      default:
        // Default to post extraction
        extracted = extractPost();
    }

    // Add suggested topics
    const textForTopics = extracted.content?.text || extracted.author?.headline || extracted.author?.about || '';
    extracted.suggestedTopics = suggestTopics(textForTopics);

    extracted.platform = 'linkedin';
    extracted.pageUrl = window.location.href;

    // Extract full content via Readability if available (works well for Pulse articles)
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
