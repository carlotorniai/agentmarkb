/**
 * X (Twitter) Content Extractor
 *
 * Extracts tweet content and author information from X/Twitter pages.
 * Handles both individual tweets and author profile pages.
 */

(function () {
  'use strict';

  /**
   * Detect if we're on a tweet page or profile page
   */
  function detectPageType() {
    const url = window.location.href;

    // Tweet URL pattern: /username/status/1234567890
    if (/\/status\/\d+/.test(url)) {
      return 'tweet';
    }

    // Profile URL pattern: /username (without /status/)
    if (/^https?:\/\/(twitter\.com|x\.com)\/[^\/]+\/?$/.test(url)) {
      return 'profile';
    }

    // Could be a profile with tabs like /username/followers
    if (/^https?:\/\/(twitter\.com|x\.com)\/[^\/]+\/(followers|following|likes)?\/?$/.test(url)) {
      return 'profile';
    }

    return 'unknown';
  }

  /**
   * Extract author handle from URL
   */
  function extractHandleFromUrl() {
    const match = window.location.pathname.match(/^\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract tweet data from the page
   */
  function extractTweet() {
    const result = {
      type: 'tweet',
      author: {
        handle: null,
        name: null,
        bio: null
      },
      content: {
        text: null,
        url: window.location.href,
        date: null
      }
    };

    // Try to get the primary tweet (the one the URL points to)
    // Look for the main tweet article
    const tweetArticles = document.querySelectorAll('article[data-testid="tweet"]');

    // The main tweet is usually the first one with full thread context
    // Or we can identify it by checking if it matches the URL
    let mainTweet = null;

    for (const article of tweetArticles) {
      // Check if this article contains a link matching the current URL
      const timeLink = article.querySelector('time')?.closest('a');
      if (timeLink && window.location.href.includes(timeLink.href)) {
        mainTweet = article;
        break;
      }
    }

    // Fallback to first tweet if we can't find exact match
    if (!mainTweet && tweetArticles.length > 0) {
      mainTweet = tweetArticles[0];
    }

    if (mainTweet) {
      // Extract tweet text
      const tweetTextElement = mainTweet.querySelector('[data-testid="tweetText"]');
      if (tweetTextElement) {
        result.content.text = tweetTextElement.textContent.trim();
      }

      // Extract author info
      const userNameElement = mainTweet.querySelector('[data-testid="User-Name"]');
      if (userNameElement) {
        // Get display name (first text node or span)
        const nameSpans = userNameElement.querySelectorAll('span');
        for (const span of nameSpans) {
          const text = span.textContent.trim();
          if (text && !text.startsWith('@') && !text.includes('·')) {
            result.author.name = text;
            break;
          }
        }

        // Get handle
        const handleMatch = userNameElement.textContent.match(/@(\w+)/);
        if (handleMatch) {
          result.author.handle = handleMatch[1];
        }
      }

      // Extract timestamp
      const timeElement = mainTweet.querySelector('time');
      if (timeElement) {
        result.content.date = timeElement.getAttribute('datetime');
      }
    }

    // Fallback: extract handle from URL if not found
    if (!result.author.handle) {
      result.author.handle = extractHandleFromUrl();
    }

    // Clean up the URL (ensure it's the canonical form)
    result.content.url = cleanTweetUrl(window.location.href);

    return result;
  }

  /**
   * Extract profile data
   */
  function extractProfile() {
    const result = {
      type: 'profile',
      author: {
        handle: extractHandleFromUrl(),
        name: null,
        bio: null
      }
    };

    // Try to get display name from profile header
    const nameElement = document.querySelector('[data-testid="UserName"] span');
    if (nameElement) {
      result.author.name = nameElement.textContent.trim();
    }

    // Try to get bio
    const bioElement = document.querySelector('[data-testid="UserDescription"]');
    if (bioElement) {
      result.author.bio = bioElement.textContent.trim();
    }

    // Alternative selectors if the above don't work
    if (!result.author.name) {
      const headerName = document.querySelector('h2[role="heading"] span');
      if (headerName) {
        result.author.name = headerName.textContent.trim();
      }
    }

    return result;
  }

  /**
   * Clean and normalize tweet URL
   */
  function cleanTweetUrl(url) {
    try {
      const parsed = new URL(url);

      // Remove query parameters and hash
      parsed.search = '';
      parsed.hash = '';

      // Ensure we use x.com (the current canonical domain)
      if (parsed.hostname === 'twitter.com' || parsed.hostname === 'www.twitter.com') {
        parsed.hostname = 'x.com';
      }

      return parsed.href;
    } catch {
      return url;
    }
  }

  /**
   * Suggest topics based on content
   */
  function suggestTopics(text) {
    if (!text) return [];

    const topicKeywords = {
      ai: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural', 'gpt', 'llm', 'chatgpt', 'claude'],
      research: ['research', 'study', 'paper', 'findings', 'experiment', 'hypothesis'],
      technology: ['tech', 'software', 'programming', 'code', 'developer', 'engineering'],
      business: ['business', 'startup', 'entrepreneur', 'company', 'revenue', 'growth'],
      productivity: ['productivity', 'efficient', 'workflow', 'tips', 'hack', 'optimize'],
      leadership: ['leadership', 'management', 'team', 'culture', 'hire', 'mentor'],
      education: ['education', 'learning', 'teach', 'student', 'course', 'training'],
      writing: ['writing', 'content', 'newsletter', 'blog', 'article', 'author'],
      economics: ['economics', 'economy', 'market', 'finance', 'investment', 'stock'],
      healthcare: ['health', 'medical', 'medicine', 'doctor', 'patient', 'clinical']
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
    if (pageType === 'tweet') {
      extracted = extractTweet();
    } else if (pageType === 'profile') {
      extracted = extractProfile();
    } else {
      // Try tweet extraction anyway
      extracted = extractTweet();
    }

    // Add suggested topics
    extracted.suggestedTopics = suggestTopics(
      extracted.content?.text || extracted.author?.bio || ''
    );

    extracted.platform = 'x';
    extracted.pageUrl = window.location.href;

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
