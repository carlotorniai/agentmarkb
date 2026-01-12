/**
 * KB Manager - Background Service Worker
 *
 * Central coordinator for the extension. Handles:
 * - Native messaging communication
 * - Message routing between popup and content scripts
 * - KB data caching
 * - Deduplication logic
 * - Topic index updates
 */

const NATIVE_HOST_NAME = 'com.kb_manager.host';

// Cache for KB data
let kbCache = null;
let kbFilePath = null;

// Native messaging port
let nativePort = null;

/**
 * Connect to the native messaging host
 */
function connectToNativeHost() {
  if (nativePort) {
    return nativePort;
  }

  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);

    nativePort.onMessage.addListener((response) => {
      console.log('Native host response:', response);
    });

    nativePort.onDisconnect.addListener(() => {
      console.log('Native host disconnected');
      if (chrome.runtime.lastError) {
        console.error('Native host error:', chrome.runtime.lastError.message);
      }
      nativePort = null;
    });

    return nativePort;
  } catch (error) {
    console.error('Failed to connect to native host:', error);
    return null;
  }
}

/**
 * Send a message to the native host and wait for response
 */
async function sendNativeMessage(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Read the KB file
 */
async function readKB(filePath) {
  const response = await sendNativeMessage({
    action: 'read',
    filePath: filePath
  });

  if (response.success) {
    kbCache = response.data;
    kbFilePath = filePath;
    return response.data;
  } else {
    throw new Error(response.error || 'Failed to read KB file');
  }
}

/**
 * Write to the KB file
 */
async function writeKB(filePath, data) {
  const response = await sendNativeMessage({
    action: 'write',
    filePath: filePath,
    data: data
  });

  if (response.success) {
    kbCache = data;
    return true;
  } else {
    throw new Error(response.error || 'Failed to write KB file');
  }
}

/**
 * Test connection to native host and file access
 */
async function testConnection(filePath) {
  const response = await sendNativeMessage({
    action: 'test',
    filePath: filePath
  });
  return response;
}

/**
 * Get all existing topics from the KB
 */
function getExistingTopics(kb) {
  const topics = new Set();

  // From topic_index
  if (kb.topic_index) {
    Object.keys(kb.topic_index).forEach((topic) => topics.add(topic));
  }

  // From favorite_authors
  if (kb.favorite_authors) {
    for (const platform of Object.values(kb.favorite_authors)) {
      if (Array.isArray(platform)) {
        for (const author of platform) {
          if (author.topics) {
            author.topics.forEach((topic) => topics.add(topic));
          }
          // Also check saved posts/articles
          const savedContent = author.saved_posts || author.saved_articles || [];
          for (const content of savedContent) {
            if (content.topics) {
              content.topics.forEach((topic) => topics.add(topic));
            }
          }
        }
      }
    }
  }

  return Array.from(topics).sort();
}

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);

    // Remove tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source', 'fbclid', 'gclid'];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));

    // Remove trailing slashes
    let normalized = parsed.href.replace(/\/+$/, '');

    // Normalize x.com to twitter.com for comparison
    normalized = normalized.replace('//x.com/', '//twitter.com/');
    normalized = normalized.replace('//www.x.com/', '//twitter.com/');

    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Normalize author handle/identifier
 */
function normalizeHandle(handle) {
  return handle.replace(/^@/, '').toLowerCase().trim();
}

/**
 * Check if author exists in KB
 */
function findAuthor(kb, platform, identifier) {
  const authors = kb.favorite_authors?.[platform] || [];

  for (const author of authors) {
    if (platform === 'x') {
      if (normalizeHandle(author.handle) === normalizeHandle(identifier)) {
        return author;
      }
    } else if (platform === 'linkedin') {
      if (normalizeUrl(author.profile_url) === normalizeUrl(identifier)) {
        return author;
      }
    } else if (platform === 'substack') {
      if (normalizeUrl(author.url) === normalizeUrl(identifier)) {
        return author;
      }
    } else if (platform === 'generic_web') {
      // Match by author name and source
      if (
        author.name?.toLowerCase() === identifier.name?.toLowerCase() &&
        author.source?.toLowerCase() === identifier.source?.toLowerCase()
      ) {
        return author;
      }
    }
  }

  return null;
}

/**
 * Check if content already exists
 */
function contentExists(author, url, platform) {
  const contentKey = platform === 'x' || platform === 'linkedin' ? 'saved_posts' : 'saved_articles';
  const savedContent = author[contentKey] || [];

  const normalizedUrl = normalizeUrl(url);
  return savedContent.some((item) => normalizeUrl(item.url) === normalizedUrl);
}

/**
 * Add or update author in KB
 */
function addOrUpdateAuthor(kb, platform, authorData) {
  // Ensure the structure exists
  if (!kb.favorite_authors) {
    kb.favorite_authors = {};
  }
  if (!kb.favorite_authors[platform]) {
    kb.favorite_authors[platform] = [];
  }

  const existingAuthor = findAuthor(kb, platform, getAuthorIdentifier(platform, authorData));

  if (existingAuthor) {
    // Update existing author topics if new ones provided
    if (authorData.topics) {
      const allTopics = new Set([...(existingAuthor.topics || []), ...authorData.topics]);
      existingAuthor.topics = Array.from(allTopics);
    }
    return { author: existingAuthor, isNew: false };
  }

  // Add new author
  kb.favorite_authors[platform].push(authorData);
  return { author: authorData, isNew: true };
}

/**
 * Get author identifier based on platform
 */
function getAuthorIdentifier(platform, authorData) {
  switch (platform) {
    case 'x':
      return authorData.handle;
    case 'linkedin':
      return authorData.profile_url;
    case 'substack':
      return authorData.url;
    case 'generic_web':
      return { name: authorData.name, source: authorData.source };
    default:
      return null;
  }
}

/**
 * Add content to author's saved posts/articles
 */
function addContent(author, platform, contentData) {
  const contentKey = platform === 'x' || platform === 'linkedin' ? 'saved_posts' : 'saved_articles';

  if (!author[contentKey]) {
    author[contentKey] = [];
  }

  // Check for duplicates
  if (contentExists(author, contentData.url, platform)) {
    return { success: false, reason: 'duplicate' };
  }

  // Add date_saved
  contentData.date_saved = new Date().toISOString().split('T')[0];

  author[contentKey].push(contentData);
  return { success: true };
}

/**
 * Update topic index
 */
function updateTopicIndex(kb, topics, authorRef) {
  if (!kb.topic_index) {
    kb.topic_index = {};
  }

  for (const topic of topics) {
    if (!kb.topic_index[topic]) {
      kb.topic_index[topic] = [];
    }

    if (!kb.topic_index[topic].includes(authorRef)) {
      kb.topic_index[topic].push(authorRef);
      kb.topic_index[topic].sort();
    }
  }

  // Sort topic_index keys
  const sortedIndex = {};
  Object.keys(kb.topic_index)
    .sort()
    .forEach((key) => {
      sortedIndex[key] = kb.topic_index[key];
    });
  kb.topic_index = sortedIndex;
}

/**
 * Get author reference for topic index
 */
function getAuthorRef(platform, author) {
  switch (platform) {
    case 'x':
      return `@${author.handle}`;
    case 'linkedin':
      return author.name;
    case 'substack':
      return author.name || author.author;
    case 'generic_web':
      return author.name;
    default:
      return author.name || 'Unknown';
  }
}

/**
 * Save extracted content to KB
 */
async function saveToKB(filePath, platform, authorData, contentData, topics) {
  // Read current KB
  let kb = await readKB(filePath);

  // Add or get author
  const { author, isNew: isNewAuthor } = addOrUpdateAuthor(kb, platform, authorData);

  // Add content if provided
  let contentResult = { success: true, reason: null };
  if (contentData) {
    contentData.topics = topics;
    contentResult = addContent(author, platform, contentData);
  }

  // Update topic index
  if (topics && topics.length > 0) {
    const authorRef = getAuthorRef(platform, author);
    updateTopicIndex(kb, topics, authorRef);
  }

  // Write back to file
  await writeKB(filePath, kb);

  // Invalidate cache to force reload
  kbCache = kb;

  return {
    success: true,
    authorAdded: isNewAuthor,
    contentAdded: contentResult.success,
    contentDuplicate: contentResult.reason === 'duplicate'
  };
}

/**
 * Get stored settings
 */
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['kbFilePath', 'recentAdditions'], (result) => {
      resolve(result);
    });
  });
}

/**
 * Save settings
 */
async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set(settings, resolve);
  });
}

/**
 * Add to recent additions
 */
async function addToRecentAdditions(item) {
  const { recentAdditions = [] } = await getSettings();
  recentAdditions.unshift({
    ...item,
    timestamp: new Date().toISOString()
  });
  // Keep only last 10
  await saveSettings({ recentAdditions: recentAdditions.slice(0, 10) });
}

/**
 * Detect platform from URL
 */
function detectPlatform(url) {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return 'x';
  }
  if (hostname.includes('linkedin.com')) {
    return 'linkedin';
  }
  if (hostname.includes('substack.com')) {
    return 'substack';
  }
  return 'generic_web';
}

/**
 * Execute content script and get extracted data
 */
async function extractContent(tabId, platform) {
  // Map platform names to script file names
  const platformToScript = {
    'x': 'twitter',
    'generic_web': 'generic'
  };
  const scriptName = platformToScript[platform] || platform;
  const scriptFile = `content-scripts/${scriptName}_extractor.js`;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: [scriptFile]
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }

    // If no result, the script might set data differently
    // Try to get it via messaging
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'getExtractedData' }, (response) => {
        resolve(response || { error: 'Failed to extract content' });
      });
    });
  } catch (error) {
    console.error('Script execution error:', error);
    return { error: error.message };
  }
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      switch (message.action) {
        case 'getSettings':
          return await getSettings();

        case 'saveSettings':
          await saveSettings(message.settings);
          return { success: true };

        case 'testConnection':
          return await testConnection(message.filePath);

        case 'readKB':
          const kb = await readKB(message.filePath);
          return { success: true, data: kb };

        case 'getTopics':
          const settings = await getSettings();
          if (!settings.kbFilePath) {
            return { success: false, error: 'KB file path not configured' };
          }
          const kbData = kbCache || (await readKB(settings.kbFilePath));
          return { success: true, topics: getExistingTopics(kbData) };

        case 'saveContent':
          const result = await saveToKB(
            message.filePath,
            message.platform,
            message.authorData,
            message.contentData,
            message.topics
          );
          // Add to recent additions
          await addToRecentAdditions({
            platform: message.platform,
            author: message.authorData.name || message.authorData.handle,
            title: message.contentData?.title || message.contentData?.text?.substring(0, 50),
            url: message.contentData?.url
          });
          return result;

        case 'extractContent':
          return await extractContent(message.tabId, message.platform);

        case 'detectPlatform':
          return { platform: detectPlatform(message.url) };

        case 'checkDuplicate':
          const currentKB = kbCache || (await readKB(message.filePath));
          const author = findAuthor(currentKB, message.platform, message.authorIdentifier);
          if (!author) {
            return { authorExists: false, contentExists: false };
          }
          const isDupe = contentExists(author, message.url, message.platform);
          return { authorExists: true, contentExists: isDupe };

        case 'getRecentAdditions':
          const settingsForRecent = await getSettings();
          return { recentAdditions: settingsForRecent.recentAdditions || [] };

        default:
          return { error: 'Unknown action' };
      }
    } catch (error) {
      console.error('Message handler error:', error);
      return { success: false, error: error.message };
    }
  };

  handleMessage().then(sendResponse);
  return true; // Keep the message channel open for async response
});

// Log when service worker starts
console.log('KB Manager service worker started');
