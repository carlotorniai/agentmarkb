/**
 * KB Manager Popup Script
 *
 * Handles the popup UI logic including:
 * - Extracting content from the current page
 * - Displaying extracted data
 * - Managing topic selection
 * - Saving to the knowledge base
 */

// State
let extractedData = null;
let existingTopics = [];
let selectedTopics = new Set();
let kbFilePath = null;
let authorExists = false;

// DOM Elements
const elements = {
  // States
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  noConfigState: document.getElementById('noConfigState'),
  successState: document.getElementById('successState'),
  duplicateState: document.getElementById('duplicateState'),
  mainContent: document.getElementById('mainContent'),

  // Error
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn'),

  // Main content
  platformBadge: document.getElementById('platformBadge'),
  platformIcon: document.getElementById('platformIcon'),
  platformName: document.getElementById('platformName'),
  authorName: document.getElementById('authorName'),
  authorStatus: document.getElementById('authorStatus'),
  contentTitle: document.getElementById('contentTitle'),
  contentText: document.getElementById('contentText'),
  topicsContainer: document.getElementById('topicsContainer'),
  customTopicInput: document.getElementById('customTopicInput'),
  addTopicBtn: document.getElementById('addTopicBtn'),
  summaryInput: document.getElementById('summaryInput'),
  saveBtn: document.getElementById('saveBtn'),
  cancelBtn: document.getElementById('cancelBtn'),

  // Other
  settingsBtn: document.getElementById('settingsBtn'),
  goToSettingsBtn: document.getElementById('goToSettingsBtn'),
  closeDuplicateBtn: document.getElementById('closeDuplicateBtn'),
  successMessage: document.getElementById('successMessage')
};

/**
 * Show a specific state and hide others
 */
function showState(stateName) {
  const states = ['loadingState', 'errorState', 'noConfigState', 'successState', 'duplicateState', 'mainContent'];

  for (const state of states) {
    const element = elements[state];
    if (element) {
      if (state === stateName) {
        element.classList.remove('hidden');
      } else {
        element.classList.add('hidden');
      }
    }
  }
}

/**
 * Get platform display info
 */
function getPlatformInfo(platform) {
  const platforms = {
    x: { name: 'X (Twitter)', icon: '𝕏' },
    linkedin: { name: 'LinkedIn', icon: 'in' },
    substack: { name: 'Substack', icon: '◉' },
    generic_web: { name: 'Web Article', icon: '◎' }
  };

  return platforms[platform] || { name: 'Unknown', icon: '?' };
}

/**
 * Render topics checkboxes
 */
function renderTopics() {
  elements.topicsContainer.innerHTML = '';

  // Combine existing topics with suggested topics
  const allTopics = new Set([...existingTopics, ...(extractedData.suggestedTopics || [])]);

  for (const topic of allTopics) {
    const isChecked = selectedTopics.has(topic);
    const isSuggested = extractedData.suggestedTopics?.includes(topic);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <input type="checkbox" class="topic-checkbox" id="topic-${topic}" value="${topic}" ${isChecked ? 'checked' : ''}>
      <label class="topic-label" for="topic-${topic}">${topic}${isSuggested ? ' *' : ''}</label>
    `;

    const checkbox = wrapper.querySelector('input');
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedTopics.add(topic);
      } else {
        selectedTopics.delete(topic);
      }
    });

    elements.topicsContainer.appendChild(wrapper.firstElementChild);
    elements.topicsContainer.appendChild(wrapper.lastElementChild);
  }
}

/**
 * Add a custom topic
 */
function addCustomTopic() {
  const topic = elements.customTopicInput.value.trim().toLowerCase();

  if (topic && !selectedTopics.has(topic)) {
    selectedTopics.add(topic);
    elements.customTopicInput.value = '';
    renderTopics();
  }
}

/**
 * Display extracted data in the UI
 */
function displayExtractedData() {
  const platform = extractedData.platform;
  const platformInfo = getPlatformInfo(platform);

  // Platform badge
  elements.platformBadge.className = `platform-badge ${platform}`;
  elements.platformIcon.textContent = platformInfo.icon;
  elements.platformName.textContent = platformInfo.name;

  // Author info
  let authorDisplayName = 'Unknown Author';
  if (extractedData.author) {
    if (extractedData.author.handle) {
      authorDisplayName = `@${extractedData.author.handle}`;
      if (extractedData.author.name) {
        authorDisplayName = `${extractedData.author.name} (${authorDisplayName})`;
      }
    } else if (extractedData.author.name) {
      authorDisplayName = extractedData.author.name;
    }
  } else if (extractedData.publication) {
    authorDisplayName = extractedData.publication.author || extractedData.publication.name;
  }

  elements.authorName.textContent = authorDisplayName;

  // Author status (new or existing)
  if (authorExists) {
    elements.authorStatus.textContent = 'In KB';
    elements.authorStatus.className = 'author-status exists';
  } else {
    elements.authorStatus.textContent = 'New';
    elements.authorStatus.className = 'author-status new';
  }

  // Content preview
  let title = '';
  let text = '';

  if (extractedData.content) {
    title = extractedData.content.title || '';
    text = extractedData.content.text || extractedData.content.summary || extractedData.content.preview || '';
  }

  if (extractedData.type === 'profile' || extractedData.type === 'publication') {
    title = 'Author/Publication Profile';
    text = extractedData.author?.bio || extractedData.description || 'No preview available';
  }

  elements.contentTitle.textContent = title || 'Untitled';
  elements.contentText.textContent = text.substring(0, 200) + (text.length > 200 ? '...' : '') || 'No preview available';

  // Pre-select suggested topics
  if (extractedData.suggestedTopics) {
    extractedData.suggestedTopics.forEach((topic) => selectedTopics.add(topic));
  }

  // Render topics
  renderTopics();
}

/**
 * Build author data for saving
 */
function buildAuthorData() {
  const platform = extractedData.platform;

  switch (platform) {
    case 'x':
      return {
        handle: extractedData.author.handle,
        name: extractedData.author.name,
        topics: Array.from(selectedTopics)
      };

    case 'linkedin':
      return {
        name: extractedData.author.name,
        profile_url: extractedData.author.profile_url,
        topics: Array.from(selectedTopics)
      };

    case 'substack':
      return {
        name: extractedData.publication.name,
        url: extractedData.publication.url,
        author: extractedData.publication.author,
        topics: Array.from(selectedTopics)
      };

    case 'generic_web':
      return {
        name: extractedData.author.name || 'Unknown',
        source: extractedData.author.source,
        topics: Array.from(selectedTopics)
      };

    default:
      return null;
  }
}

/**
 * Build content data for saving
 */
function buildContentData() {
  if (extractedData.type === 'profile' || extractedData.type === 'publication') {
    // Just adding author, no specific content
    return null;
  }

  const platform = extractedData.platform;
  const content = extractedData.content;
  const summary = elements.summaryInput.value.trim();

  switch (platform) {
    case 'x':
      return {
        url: content.url,
        text: content.text ? content.text.substring(0, 100) : '',
        topics: Array.from(selectedTopics)
      };

    case 'linkedin':
      return {
        url: content.url,
        preview: content.preview || content.text?.substring(0, 100) || '',
        topics: Array.from(selectedTopics)
      };

    case 'substack':
      return {
        title: content.title,
        url: content.url,
        date_published: content.date,
        summary: summary || content.summary,
        topics: Array.from(selectedTopics)
      };

    case 'generic_web':
      return {
        title: content.title,
        url: content.url,
        date_published: content.date_published,
        summary: summary || content.summary,
        topics: Array.from(selectedTopics)
      };

    default:
      return null;
  }
}

/**
 * Save content to KB
 */
async function saveToKB() {
  elements.saveBtn.disabled = true;
  elements.saveBtn.textContent = 'Saving...';

  try {
    const authorData = buildAuthorData();
    const contentData = buildContentData();

    const response = await chrome.runtime.sendMessage({
      action: 'saveContent',
      filePath: kbFilePath,
      platform: extractedData.platform,
      authorData: authorData,
      contentData: contentData,
      topics: Array.from(selectedTopics)
    });

    if (response.success) {
      let message = '';

      if (response.authorAdded) {
        message = 'Author added to KB';
      }

      if (response.contentAdded) {
        message += message ? ' and content saved!' : 'Content saved!';
      } else if (response.contentDuplicate) {
        message += message ? '. Content was already saved.' : 'Content was already saved.';
      } else if (!contentData) {
        message += '!';
      }

      elements.successMessage.textContent = message || 'Saved successfully!';
      showState('successState');

      // Close popup after a delay
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      throw new Error(response.error || 'Failed to save');
    }
  } catch (error) {
    elements.errorMessage.textContent = error.message;
    showState('errorState');
  }
}

/**
 * Extract content from current tab
 */
async function extractContent() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('No active tab found');
    }

    // Detect platform
    const platformResponse = await chrome.runtime.sendMessage({
      action: 'detectPlatform',
      url: tab.url
    });

    const platform = platformResponse.platform;

    // Execute the appropriate content script
    const scriptFile = `content-scripts/${platform === 'x' ? 'twitter' : platform}_extractor.js`;

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [scriptFile]
    });

    if (results && results[0] && results[0].result) {
      extractedData = results[0].result;
    } else {
      throw new Error('Failed to extract content from page');
    }

    // Check for duplicates
    const authorIdentifier = getAuthorIdentifier();
    if (authorIdentifier && extractedData.content?.url) {
      const duplicateCheck = await chrome.runtime.sendMessage({
        action: 'checkDuplicate',
        filePath: kbFilePath,
        platform: platform,
        authorIdentifier: authorIdentifier,
        url: extractedData.content.url
      });

      authorExists = duplicateCheck.authorExists;

      if (duplicateCheck.contentExists) {
        showState('duplicateState');
        return;
      }
    }

    // Get existing topics
    const topicsResponse = await chrome.runtime.sendMessage({ action: 'getTopics' });
    if (topicsResponse.success) {
      existingTopics = topicsResponse.topics;
    }

    // Display the data
    displayExtractedData();
    showState('mainContent');
  } catch (error) {
    console.error('Extraction error:', error);
    elements.errorMessage.textContent = error.message || 'Failed to extract content';
    showState('errorState');
  }
}

/**
 * Get author identifier based on platform
 */
function getAuthorIdentifier() {
  if (!extractedData) return null;

  switch (extractedData.platform) {
    case 'x':
      return extractedData.author?.handle;
    case 'linkedin':
      return extractedData.author?.profile_url;
    case 'substack':
      return extractedData.publication?.url;
    case 'generic_web':
      return {
        name: extractedData.author?.name,
        source: extractedData.author?.source
      };
    default:
      return null;
  }
}

/**
 * Initialize the popup
 */
async function initialize() {
  showState('loadingState');

  try {
    // Get settings
    const settings = await chrome.runtime.sendMessage({ action: 'getSettings' });

    if (!settings.kbFilePath) {
      showState('noConfigState');
      return;
    }

    kbFilePath = settings.kbFilePath;

    // Extract content
    await extractContent();
  } catch (error) {
    console.error('Initialization error:', error);
    elements.errorMessage.textContent = error.message || 'Failed to initialize';
    showState('errorState');
  }
}

// Event Listeners
elements.settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

elements.goToSettingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

elements.retryBtn.addEventListener('click', () => {
  initialize();
});

elements.addTopicBtn.addEventListener('click', addCustomTopic);

elements.customTopicInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addCustomTopic();
  }
});

elements.saveBtn.addEventListener('click', saveToKB);

elements.cancelBtn.addEventListener('click', () => {
  window.close();
});

elements.closeDuplicateBtn.addEventListener('click', () => {
  window.close();
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initialize);
