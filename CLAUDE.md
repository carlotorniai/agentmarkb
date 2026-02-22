# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Project Overview

AgentMarKB is a Chrome Extension (Manifest V3) that extracts full web articles, tweets, and posts and saves them as Obsidian-compatible Markdown for RAG pipelines, AI agent swarms, and knowledge management on macOS. It uses a native messaging host to bridge Chrome's sandbox restrictions for local file access.

## Key File Locations

- **Service Worker:** `background/service-worker.js` -- central coordinator
- **Native Host:** `native-host/kb_host.py` -- Python script for local filesystem ops
- **Content Scripts:** `content-scripts/` -- platform-specific extractors (`twitter_extractor.js`, `linkedin_extractor.js`, `substack_extractor.js`, `generic_extractor.js`)
- **Libraries:** `lib/` -- Readability, Turndown (HTML-to-Markdown)
- **Popup UI:** `popup/`
- **Options UI:** `options/`
- **Utilities:** `utils/deduplication.js`
- **Manifest:** `manifest.json` (MV3)

## Platform Detection

The service worker detects platforms via URL hostname:
- `twitter.com` or `x.com` -> platform `x`
- `linkedin.com` -> platform `linkedin`
- `*.substack.com` -> platform `substack`
- Everything else -> platform `generic_web`

Content key: `x` and `linkedin` use `saved_posts`; `substack` and `generic_web` use `saved_articles`.

## Native Host Actions

`read`, `write`, `test`, `create_bookmark`, `check_exists`, `ping` -- all JSON over stdin/stdout with 4-byte LE length prefix.

## Development Commands

```bash
# Install native messaging host (required for local file access)
cd native-host && ./install.sh

# Uninstall native host
cd native-host && ./uninstall.sh

# Regenerate extension icons
cd icons && python3 generate_icons.py

# Check PyYAML dependency
python3 -c "import yaml; print('OK')"
```

## Loading the Extension

1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" and select this folder
4. Copy the extension ID for native host installation
