# KB Manager - Trusted Sources Knowledge Base Manager

A Chrome Extension that allows you to quickly save articles, tweets, and posts to a local YAML-based knowledge base on macOS.

## Features

- **Multi-Platform Support**: Extract content from X (Twitter), LinkedIn, Substack, and generic web pages
- **Smart Extraction**: Automatically extracts author info, content preview, publication date, and more
- **Topic Management**: Suggest and assign topics to organize your saved content
- **Duplicate Detection**: Prevents saving the same content twice
- **Local Storage**: All data is stored in a local YAML file that you control

## Supported Platforms

- **X (Twitter)** - Individual tweets and author profiles
- **LinkedIn** - Posts and author profiles
- **Substack** - Articles and publication pages
- **Generic Web Pages** - Articles from McKinsey, BCG, HBR, and other sites

## Installation

### Step 1: Install the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right corner)
3. Click **Load unpacked**
4. Select the extension folder (the one containing `manifest.json`)
5. The extension should now appear in your extensions list

### Step 2: Install the Native Messaging Host

The native messaging host is required to read and write your local YAML file. Chrome extensions cannot access the file system directly, so this component bridges that gap.

1. Open Terminal on your Mac

2. Navigate to the native-host folder:
   ```bash
   cd /path/to/extension/native-host
   ```

3. Make the install script executable (if not already):
   ```bash
   chmod +x install.sh
   ```

4. Run the install script:
   ```bash
   ./install.sh
   ```

5. When prompted, enter your Chrome extension ID. You can find this on the `chrome://extensions/` page after loading the extension.

### Step 3: Configure the Extension

1. Click the KB Manager extension icon in Chrome
2. Click the settings gear icon, or go to the extension options page
3. Enter the absolute path to your YAML knowledge base file (e.g., `/Users/username/Documents/kb/curated_sources.yaml`)
4. Click **Test Connection** to verify everything is working
5. Click **Save Settings**

## Usage

### Saving Content

1. Navigate to a tweet, LinkedIn post, Substack article, or any web article
2. Click the KB Manager extension icon
3. Review the extracted content and author information
4. Select or add topics
5. Optionally add a summary
6. Click **Save to KB**

### Knowledge Base Structure

Your knowledge base is stored as a YAML file with this structure:

```yaml
version: 1
last_updated: "2024-01-15"

favorite_authors:
  x:
    - handle: "emollick"
      name: "Ethan Mollick"
      topics: ["ai", "education", "research"]
      saved_posts:
        - url: "https://x.com/emollick/status/..."
          text: "Tweet preview text..."
          date_saved: "2024-01-15"
          topics: ["ai"]

  substack:
    - name: "Stratechery"
      url: "https://stratechery.com"
      author: "Ben Thompson"
      topics: ["technology", "business"]
      saved_articles:
        - title: "Article Title"
          url: "https://..."
          date_published: "2024-01-10"
          date_saved: "2024-01-15"
          summary: "Article summary..."
          topics: ["technology"]

  linkedin:
    - name: "Author Name"
      profile_url: "https://linkedin.com/in/username"
      topics: ["leadership", "business"]
      saved_posts:
        - url: "https://linkedin.com/posts/..."
          preview: "Post preview..."
          date_saved: "2024-01-15"

  generic_web:
    - name: "Author Name"
      source: "McKinsey & Company"
      topics: ["strategy", "consulting"]
      saved_articles:
        - title: "Article Title"
          url: "https://..."
          date_published: "2024-01-01"
          date_saved: "2024-01-15"

topic_index:
  ai: ["@emollick", "Stratechery"]
  technology: ["Stratechery"]
  strategy: ["McKinsey Author"]
```

## Troubleshooting

### "Native messaging host not found" Error

This error occurs when the native host is not properly installed.

1. Make sure you ran the install script:
   ```bash
   cd native-host && ./install.sh
   ```

2. Verify the host manifest exists:
   ```bash
   ls ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
   ```
   You should see `com.kb_manager.host.json`

3. Check the manifest contains the correct extension ID

### "Access forbidden" Error

This error occurs when the extension ID in the native host manifest doesn't match your extension.

1. Get your extension ID from `chrome://extensions/`
2. Re-run the install script with the correct ID:
   ```bash
   ./install.sh
   ```

### Content Not Extracting Properly

Web page structures change frequently. If content extraction isn't working:

1. Try refreshing the page before clicking the extension
2. Make sure the page has fully loaded
3. Some sites may block content extraction

### Python/PyYAML Issues

The native host requires Python 3 and PyYAML. If you encounter Python errors:

```bash
# Check Python version
python3 --version

# Install PyYAML if missing
python3 -m pip install pyyaml
```

## File Structure

```
kb-chrome-extension/
├── manifest.json           # Extension configuration
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
├── options/
│   ├── options.html       # Settings page
│   ├── options.css        # Settings styles
│   └── options.js         # Settings logic
├── content-scripts/
│   ├── twitter_extractor.js   # X/Twitter extraction
│   ├── linkedin_extractor.js  # LinkedIn extraction
│   ├── substack_extractor.js  # Substack extraction
│   └── generic_extractor.js   # Generic page extraction
├── background/
│   └── service-worker.js  # Background service worker
├── native-host/
│   ├── kb_host.py         # Native messaging host
│   ├── install.sh         # Installation script
│   └── uninstall.sh       # Uninstallation script
├── utils/
│   └── deduplication.js   # Deduplication utilities
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Uninstallation

### Remove Native Host

```bash
cd native-host && ./uninstall.sh
```

### Remove Extension

1. Go to `chrome://extensions/`
2. Find KB Manager and click **Remove**

## Privacy

All your data stays on your local machine. The extension:
- Does NOT send any data to external servers
- Does NOT track your browsing
- Does NOT require any online accounts
- Stores everything in a local YAML file you control

## License

MIT License - feel free to modify and use as you like.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
