# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KB Manager is a Chrome Extension (Manifest V3) that saves articles, tweets, and posts to a local YAML-based knowledge base on macOS. It uses a native messaging host to bridge Chrome's sandbox restrictions for local file access.

## Architecture

**Two-part system:**
1. **Chrome Extension** - Handles UI, content extraction, and orchestration
2. **Native Messaging Host** (`native-host/kb_host.py`) - Python script that reads/writes the local YAML file

**Data flow:**
```
Popup/Options UI  ←→  Service Worker  ←→  Native Host (Python)  ←→  YAML File
                           ↑
                    Content Scripts
                    (injected per-platform)
```

**Service Worker** (`background/service-worker.js`) is the central coordinator:
- Routes messages between popup, content scripts, and native host
- Caches KB data in memory
- Handles deduplication logic and topic index updates
- Uses `chrome.runtime.sendNativeMessage()` for native host communication

**Content Scripts** are dynamically injected based on detected platform:
- `twitter_extractor.js` → X/Twitter
- `linkedin_extractor.js` → LinkedIn
- `substack_extractor.js` → Substack
- `generic_extractor.js` → All other sites (uses JSON-LD, OpenGraph, meta tags)

**Native Host Protocol:**
- Messages: JSON objects with `action` field (`read`, `write`, `test`, `ping`)
- Communication: stdin/stdout with 4-byte little-endian length prefix
- File locking via `fcntl` for concurrent access protection

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

## Platform Detection

The service worker detects platforms via URL hostname:
- `twitter.com` or `x.com` → platform `x`
- `linkedin.com` → platform `linkedin`
- `*.substack.com` → platform `substack`
- Everything else → platform `generic_web`

## KB Data Structure

Authors are stored under `favorite_authors.[platform][]`. Content storage key varies:
- `x` and `linkedin` → `saved_posts`
- `substack` and `generic_web` → `saved_articles`

Deduplication normalizes URLs (removes tracking params, normalizes x.com/twitter.com) and author handles (lowercase, no @).
