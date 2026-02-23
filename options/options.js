/**
 * AgentMarKB Options Page Script
 *
 * Handles settings configuration including:
 * - KB file path configuration
 * - Native host connection testing
 * - Recent additions display
 */

// DOM Elements
const elements = {
  kbFilePath: document.getElementById('kbFilePath'),
  testBtn: document.getElementById('testBtn'),
  saveBtn: document.getElementById('saveBtn'),
  statusContainer: document.getElementById('statusContainer'),
  status: document.getElementById('status'),
  extensionId: document.getElementById('extensionId'),
  copyIdBtn: document.getElementById('copyIdBtn'),
  recentList: document.getElementById('recentList')
};

/**
 * Normalize a KB path: if it doesn't end with .yaml/.yml, append /curated_sources.yaml
 */
function normalizePath(filePath) {
  let p = filePath.replace(/\/+$/, ''); // strip trailing slashes
  if (!p.endsWith('.yaml') && !p.endsWith('.yml')) {
    p += '/curated_sources.yaml';
  }
  return p;
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  elements.statusContainer.className = `status-container ${type}`;
  elements.status.textContent = message;
}

/**
 * Hide status message
 */
function hideStatus() {
  elements.statusContainer.classList.add('hidden');
}

/**
 * Load saved settings
 */
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });

    if (response.kbFilePath) {
      elements.kbFilePath.value = response.kbFilePath;
    }

    // Load recent additions
    await loadRecentAdditions();
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Save settings
 */
async function saveSettings() {
  const filePath = elements.kbFilePath.value.trim();

  if (!filePath) {
    showStatus('Please enter a file path', 'error');
    return;
  }

  // Validate path format
  if (!filePath.startsWith('/')) {
    showStatus('Please enter an absolute path (starting with /)', 'error');
    return;
  }

  const normalizedPath = normalizePath(filePath);
  elements.kbFilePath.value = normalizedPath;

  elements.saveBtn.disabled = true;
  elements.saveBtn.textContent = 'Saving...';

  try {
    await chrome.runtime.sendMessage({
      action: 'saveSettings',
      settings: { kbFilePath: normalizedPath }
    });

    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus(`Failed to save settings: ${error.message}`, 'error');
  } finally {
    elements.saveBtn.disabled = false;
    elements.saveBtn.textContent = 'Save Settings';
  }
}

/**
 * Test connection to native host
 */
async function testConnection() {
  const filePath = elements.kbFilePath.value.trim();

  if (!filePath) {
    showStatus('Please enter a file path first', 'error');
    return;
  }

  const normalizedPath = normalizePath(filePath);
  elements.kbFilePath.value = normalizedPath;

  elements.testBtn.disabled = true;
  elements.testBtn.textContent = 'Testing...';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'testConnection',
      filePath: normalizedPath
    });

    if (response.success) {
      let message = 'Connection successful!';

      if (response.file_exists) {
        message += ' File exists and is readable.';
      } else {
        message += ' File will be created on first save.';
      }

      if (response.writable) {
        message += ' Write access confirmed.';
      }

      showStatus(message, 'success');
    } else {
      let errorMessage = 'Connection test failed.';

      if (response.errors && response.errors.length > 0) {
        errorMessage += ' ' + response.errors.join(' ');
      } else if (response.error) {
        errorMessage = response.error;
      }

      showStatus(errorMessage, 'error');
    }
  } catch (error) {
    // Native host connection errors
    let errorMessage = error.message;

    if (errorMessage.includes('Specified native messaging host not found')) {
      errorMessage =
        'Native messaging host not found. Please run the install script first. ' +
        "See the 'Native Host Setup' section below.";
    } else if (errorMessage.includes('Access to the specified native messaging host is forbidden')) {
      errorMessage =
        'Native host access forbidden. Make sure the install script was run with the correct extension ID.';
    }

    showStatus(errorMessage, 'error');
  } finally {
    elements.testBtn.disabled = false;
    elements.testBtn.textContent = 'Test Connection';
  }
}

/**
 * Load and display recent additions
 */
async function loadRecentAdditions() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getRecentAdditions' });
    const recentAdditions = response.recentAdditions || [];

    if (recentAdditions.length === 0) {
      elements.recentList.innerHTML = '<p class="empty-message">No recent additions</p>';
      return;
    }

    let html = '';
    for (const item of recentAdditions) {
      const date = new Date(item.timestamp);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      html += `
        <div class="recent-item">
          <span class="recent-platform ${item.platform}">${item.platform}</span>
          <div class="recent-content">
            <div class="recent-title">${escapeHtml(item.title || 'Untitled')}</div>
            <div class="recent-author">${escapeHtml(item.author || 'Unknown author')}</div>
          </div>
          <div class="recent-date">${dateStr}</div>
        </div>
      `;
    }

    elements.recentList.innerHTML = html;
  } catch (error) {
    console.error('Failed to load recent additions:', error);
    elements.recentList.innerHTML = '<p class="empty-message">Failed to load recent additions</p>';
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Copy extension ID to clipboard
 */
async function copyExtensionId() {
  const extensionId = chrome.runtime.id;

  try {
    await navigator.clipboard.writeText(extensionId);
    elements.copyIdBtn.textContent = 'Copied!';
    setTimeout(() => {
      elements.copyIdBtn.textContent = 'Copy ID';
    }, 2000);
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = extensionId;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    elements.copyIdBtn.textContent = 'Copied!';
    setTimeout(() => {
      elements.copyIdBtn.textContent = 'Copy ID';
    }, 2000);
  }
}

/**
 * Initialize the options page
 */
function initialize() {
  // Display extension ID
  elements.extensionId.textContent = chrome.runtime.id;

  // Load saved settings
  loadSettings();

  // Event listeners
  elements.saveBtn.addEventListener('click', saveSettings);
  elements.testBtn.addEventListener('click', testConnection);
  elements.copyIdBtn.addEventListener('click', copyExtensionId);

  // Save on Enter key in file path input
  elements.kbFilePath.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveSettings();
    }
  });

  // Auto-test on paste
  elements.kbFilePath.addEventListener('paste', () => {
    // Small delay to let the paste complete
    setTimeout(() => {
      if (elements.kbFilePath.value.trim()) {
        testConnection();
      }
    }, 100);
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
