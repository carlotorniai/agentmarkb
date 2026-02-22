# AgentMarKB Architecture

## Project Overview

AgentMarKB is a Chrome Extension (Manifest V3) that extracts full web articles, tweets, and posts and saves them as Obsidian-compatible Markdown for RAG pipelines, AI agent swarms, and knowledge management. It runs on macOS and uses a native messaging host to bridge Chrome's sandbox restrictions for local file access.

## Two-Part System

1. **Chrome Extension** -- Handles UI (popup + options page), content extraction via platform-specific injected scripts, and orchestration through a background service worker.
2. **Native Messaging Host** (`native-host/kb_host.py`) -- A Python script that performs all local filesystem operations: reading/writing the YAML knowledge base and creating bookmark folder structures.

## Data Flow

```
Popup UI / Options UI
        |
        v
Service Worker (background/service-worker.js)
   |            |                 |
   |            v                 v
   |     Content Scripts     chrome.storage.local
   |     (injected per-       (settings, recent
   |      platform)            additions cache)
   |
   v
Native Messaging Host (native-host/kb_host.py)
   |
   v
Local Filesystem
   |-- curated_sources.yaml   (YAML knowledge base index)
   |-- <slug>/                (bookmark document folders)
       |-- meta.yaml
       |-- assets/
       |   +-- content.md
       +-- canonicals/
           +-- retrieval.md   (symlink -> ../assets/content.md)
```

## Service Worker

**File:** `background/service-worker.js`

The service worker is the central coordinator. It:

- Routes messages between the popup, options page, content scripts, and the native host.
- Caches KB data in memory (`kbCache`) to avoid repeated file reads.
- Handles deduplication logic: normalizes URLs (removes tracking params, normalizes x.com/twitter.com) and author handles (lowercase, strips `@`).
- Manages the topic index (sorted alphabetically with author references).
- Generates bookmark slugs, builds `meta.yaml` and `content.md` with YAML frontmatter.
- Uses `chrome.runtime.sendNativeMessage()` for one-shot native host communication.

### Key Internal Functions

| Function | Purpose |
|---|---|
| `detectPlatform(url)` | URL hostname to platform string |
| `extractContent(tabId, platform)` | Inject libraries + extractor, return data |
| `saveToKB(...)` | Add author/content to YAML, update topic index |
| `saveBookmark(...)` | Full-content save: create folder + update index |
| `normalizeUrl(url)` | Strip tracking params, normalize domains |
| `findAuthor(kb, platform, id)` | Locate existing author in KB |
| `contentExists(author, url, platform)` | Dedup check |

## Content Scripts

Dynamically injected based on detected platform. Each extractor returns structured data about the current page.

| Script File | Platform | Notes |
|---|---|---|
| `content-scripts/twitter_extractor.js` | X/Twitter | Extracts tweet text, author handle, media |
| `content-scripts/linkedin_extractor.js` | LinkedIn | Extracts post content, author profile |
| `content-scripts/substack_extractor.js` | Substack | Extracts article body, author, newsletter |
| `content-scripts/generic_extractor.js` | All other sites | Uses Readability + Turndown for HTML-to-Markdown; falls back to JSON-LD, OpenGraph, meta tags |

**Libraries injected before extractors:**
- `lib/Readability.js` -- Mozilla Readability for article extraction
- `lib/turndown.js` -- HTML to Markdown converter
- `lib/turndown-plugin-gfm.js` -- GFM tables/strikethrough support

## Native Host Protocol

**File:** `native-host/kb_host.py`

Communication uses Chrome's native messaging protocol: JSON messages over stdin/stdout, each prefixed with a 4-byte little-endian length.

### Actions

| Action | Required Fields | Description |
|---|---|---|
| `ping` | -- | Health check; returns `{ success: true, message: "pong" }` |
| `test` | `filePath` | Tests file access (readable, writable, valid YAML) |
| `read` | `filePath` | Reads and parses YAML file, returns data as JSON |
| `write` | `filePath`, `data` | Writes JSON data to YAML file (atomic via temp + rename) |
| `create_bookmark` | `baseDir`, `slug`, `metaYaml`, `contentMd` | Creates full document folder structure |
| `check_exists` | `baseDir`, `slug` | Checks if a bookmark folder already exists |

File locking uses `fcntl` (shared lock for reads, exclusive for writes).

## Platform Detection

The service worker maps URL hostnames to platform identifiers:

| Hostname Pattern | Platform ID |
|---|---|
| `twitter.com`, `x.com` | `x` |
| `linkedin.com` | `linkedin` |
| `*.substack.com` | `substack` |
| Everything else | `generic_web` |

## KB Data Structure

### curated_sources.yaml

Top-level keys:

```yaml
version: 1
last_updated: "2025-06-15"
my_content: {}
favorite_authors:
  x: []
  substack: []
  linkedin: []
  generic_web: []
topic_index: {}
```

**Authors** are stored under `favorite_authors.<platform>[]`. Each author object has platform-specific identifiers:

- `x` -- `handle`, `name`, `saved_posts[]`
- `linkedin` -- `name`, `profile_url`, `saved_posts[]`
- `substack` -- `name`, `author`, `url`, `saved_articles[]`
- `generic_web` -- `name`, `source`, `saved_articles[]`

Content storage key varies by platform:
- `x` and `linkedin` use `saved_posts`
- `substack` and `generic_web` use `saved_articles`

**topic_index** maps topic strings to arrays of author references (sorted).

### Bookmark Folder Structure

Each bookmarked article gets its own folder:

```
<base_dir>/<YYYY-MM-DD_descriptive-slug>/
  meta.yaml          # Document metadata (doc_id, tags, source info, sha256)
  assets/
    content.md       # Full article as Markdown with YAML frontmatter
  canonicals/
    retrieval.md     # Symlink -> ../assets/content.md
```

- **Slug format:** `YYYY-MM-DD_descriptive-slug` (max ~100 chars)
- **meta.yaml** includes: `doc_id`, `doc_type`, `title`, timestamps, `canonical` path info, `source_of_truth` with SHA-256, asset manifest, tags, relationships, and `bookmark_metadata` (source URL, platform, author, dates).
- **content.md** has YAML frontmatter (title, source_url, author, platform, tags) followed by the article body in Markdown.

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
3. Click "Load unpacked" and select the project root folder
4. Copy the extension ID for native host installation (`install.sh` needs it)

## Supporting Files

| Path | Purpose |
|---|---|
| `manifest.json` | Chrome Extension manifest (MV3) |
| `popup/popup.html`, `popup/popup.js` | Extension popup UI |
| `options/options.html`, `options/options.js` | Settings page |
| `utils/deduplication.js` | Shared URL/handle normalization |
| `native-host/install.sh` | Registers native host with Chrome |
| `native-host/uninstall.sh` | Removes native host registration |
| `native-host/migrate_bookmarks.py` | Migration utility for bookmark data |
| `native-host/com.kb_manager.host.json.template` | Native messaging manifest template |
| `icons/` | Extension icons (16, 48, 128px) |
