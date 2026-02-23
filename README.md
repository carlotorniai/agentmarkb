<p align="center">
  <img src="icons/logo.svg" alt="AgentMarKB Logo" width="120">
</p>

<h1 align="center">AgentMarKB</h1>
<p align="center"><strong>Agentic AI Knowledge Base from Your Browser</strong></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Chrome-MV3-green.svg" alt="Chrome MV3">
  <img src="https://img.shields.io/badge/platform-macOS%20%C2%B7%20Linux-lightgrey.svg" alt="macOS · Linux">
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

<p align="center">
  Turn any web page into structured Markdown for your Obsidian vault,<br>
  RAG pipeline, and agentic AI workflows.
</p>

---

## Why AgentMarKB?

Your AI agents are only as good as the knowledge you feed them. AgentMarKB is a Chrome extension that captures full web articles as clean Markdown with rich YAML metadata — ready for Obsidian, RAG retrieval, agentic AI swarms, and knowledge management systems.

**The missing link between your browser and your AI knowledge base.**

Bookmarks are dead ends. You save articles but never use them. Your Obsidian vault is disconnected from your browsing. Your AI agents can't access what you read. AgentMarKB fixes all of that — turning every saved page into a structured, agent-ready document in your local knowledge base.

Built with [Claude Code](https://claude.ai/code).

## Features

- **Full Content Extraction** — Mozilla Readability strips away clutter, Turndown converts to clean Markdown
- **Obsidian-Native Output** — YAML frontmatter, folder structure with `meta.yaml` + `assets/` + `canonicals/` — works with Dataview, tags, graph view
- **Multi-Platform** — X/Twitter, LinkedIn, Substack, and any website (JSON-LD, OpenGraph, meta tags)
- **Agent-Ready Metadata** — Structured YAML with source URL, author, date, topics, SHA-256 hash — designed for RAG pipelines and agentic retrieval
- **Local-First** — Your data stays on your file system. No cloud, no tracking, no accounts
- **Smart Deduplication** — URL normalization prevents duplicate saves
- **Knowledge Base File System** — Each bookmark becomes a self-contained document folder following a consistent KB convention
- **Migration Tool** — Convert existing YAML bookmarks to the new Markdown format

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/carlotorniai/agentmarkb.git
cd agentmarkb

# 2. Load in Chrome: chrome://extensions → Developer mode → Load unpacked → select this folder

# 3. Install the native messaging host
cd native-host && ./install.sh

# 4. Open extension settings → set your KB YAML path → Test Connection

# 5. Navigate to any article → click the extension icon → Save to KB
```

## How It Works

<p align="center">
  <img src="docs/architecture-diagram.svg" alt="AgentMarKB Architecture Diagram" width="800">
</p>

## Output Format

Each saved article becomes a self-contained document folder:

```
your-kb-directory/
└── 2026-02-22_article-title-slug/
    ├── meta.yaml              # Full document metadata
    ├── assets/
    │   └── content.md         # Article as Markdown with YAML frontmatter
    └── canonicals/
        └── retrieval.md       # Symlink → ../assets/content.md
```

**content.md** includes YAML frontmatter compatible with Obsidian Dataview:

```yaml
---
title: "Article Title"
source_url: "https://example.com/article"
author: "Author Name"
source: "Publication Name"
platform: generic_web
date_published: "2026-02-20"
date_bookmarked: "2026-02-22"
tags:
  - ai
  - knowledge-management
---
```

**meta.yaml** contains the full KB document schema with SHA-256 hash, relationships, and provenance tracking.

## Installation

### Prerequisites

- Python 3.6+ with pip
- Google Chrome, Brave, Edge, or any Chromium-based browser

### Step 1: Clone the Repository

```bash
git clone https://github.com/carlotorniai/agentmarkb.git
cd agentmarkb
```

### Step 2: Load the Extension

1. Open your Chromium-based browser
2. Navigate to the extensions page:
   - Chrome: `chrome://extensions/`
   - Brave: `brave://extensions/`
   - Edge: `edge://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the `agentmarkb` folder (the one containing `manifest.json`)
6. Copy the **extension ID** shown under the extension name — you'll need it next

### Step 3: Install the Native Messaging Host

The native host bridges Chrome's sandbox to your local file system.

#### macOS

```bash
cd native-host
./install.sh
# When prompted, paste your extension ID
```

#### Linux

```bash
cd native-host
./install.sh
```

The install script auto-detects your OS. On Linux, manifests are installed to:
- Chrome: `~/.config/google-chrome/NativeMessagingHosts/`
- Brave: `~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/`
- Chromium: `~/.config/chromium/NativeMessagingHosts/`

#### Windows

> Windows support is coming soon. Contributions welcome!

### Step 4: Configure

1. Click the AgentMarKB extension icon → Settings (gear icon)
2. Enter the absolute path to your knowledge base YAML file
   - Example: `/Users/you/Obsidian/MyVault/bookmarks/curated_sources.yaml`
3. Click **Test Connection** to verify
4. Click **Save Settings**

The bookmark document folders will be created alongside the YAML file in the same directory.

### Browser Compatibility

| Browser  | macOS | Linux | Windows |
|----------|:-----:|:-----:|:-------:|
| Chrome   |  Yes  |  Yes  |  Soon   |
| Brave    |  Yes  |  Yes  |  Soon   |
| Edge     |  Yes  |  Yes  |  Soon   |
| Chromium |  Yes  |  Yes  |  Soon   |

## Supported Platforms

| Platform     | What's Extracted                                    | Content Type |
|-------------|-----------------------------------------------------|-------------|
| X / Twitter  | Tweet text, author handle, date, profile info      | Post        |
| LinkedIn     | Post text, author name, profile URL                | Post        |
| Substack     | Full article, author, publication, date            | Article     |
| Any website  | Full article via Readability, JSON-LD, OpenGraph   | Article     |

## Configuration

**KB YAML Path** — The path to your `curated_sources.yaml` file. This file indexes all saved content with author metadata, topics, and URLs.

**Bookmark Directory** — Automatically inferred as the parent directory of your YAML file. Each bookmark creates a subfolder here with the full document structure.

Example layout:
```
~/Obsidian/MyVault/bookmarks/
├── curated_sources.yaml                          # Index file
├── 2026-02-20_how-rag-pipelines-work/           # Bookmark folder
│   ├── meta.yaml
│   ├── assets/content.md
│   └── canonicals/retrieval.md
├── 2026-02-21_agent-swarms-knowledge-work/
│   └── ...
```

## Migrating Existing Bookmarks

If you have bookmarks in the old YAML-only format, convert them to the new Markdown folder structure:

```bash
# Install migration dependencies
pip install -r requirements.txt

# Dry run — preview what will be created
python3 scripts/migrate_bookmarks.py --dry-run /path/to/curated_sources.yaml

# Run the migration
python3 scripts/migrate_bookmarks.py /path/to/curated_sources.yaml
```

## Use with AI Agents

AgentMarKB's output format is designed for agentic AI workflows:

- **RAG Pipelines** — Each `content.md` is a clean Markdown document with rich YAML frontmatter. Ingest directly into vector databases (Chroma, Pinecone, Weaviate) for retrieval-augmented generation.
- **Obsidian + Dataview** — Query your bookmarks with Dataview. Filter by tags, date, platform, author. Your graph view shows connections between saved knowledge.
- **Agent File System Access** — The consistent folder structure (`meta.yaml` + `assets/` + `canonicals/`) makes it trivial for AI agents to traverse, index, and reason over your knowledge base.
- **MCP Integration** — Use the KB folder convention with Model Context Protocol servers for direct agent access to your bookmarked knowledge.

Your Obsidian vault becomes the RAG corpus. Every bookmark you save is a structured document your agents can retrieve, reason over, and learn from. The knowledge base compounds over time — and so does your agents' capability.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "Native messaging host not found" | Native host not installed | Run `cd native-host && ./install.sh` |
| "Access forbidden" | Extension ID mismatch | Re-run install script with correct extension ID |
| Content not extracting | Page hasn't fully loaded | Refresh the page, then try again |
| Python/PyYAML errors | Missing Python dependency | Run `python3 -m pip install pyyaml` |
| "Failed to create bookmark folder" | Directory permissions | Check write access to your KB directory |
| Connection test fails | Wrong YAML path | Verify the path exists and is writable |

### Verifying the Native Host

```bash
# Check the manifest is installed
ls ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.kb_manager.host.json

# On Linux:
ls ~/.config/google-chrome/NativeMessagingHosts/com.kb_manager.host.json

# Verify Python and PyYAML
python3 -c "import yaml; print('PyYAML OK')"
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Reporting bugs
- Requesting features
- Development setup
- Submitting pull requests

## Privacy & Security

AgentMarKB is fully local-first:

- **No telemetry** — Zero tracking, analytics, or data collection
- **No network calls** — The extension only communicates with the page you're viewing and your local file system
- **No accounts** — No sign-up, no cloud, no sync
- **Open source** — Every line of code is auditable
- **Your data, your machine** — All bookmarks are stored as plain files you control

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

[MIT](LICENSE) — free to use, modify, and distribute.

## Acknowledgments

- [Mozilla Readability](https://github.com/mozilla/readability) — Article content extraction
- [Turndown](https://github.com/mixmark-io/turndown) — HTML to Markdown conversion
- [Turndown GFM Plugin](https://github.com/mixmark-io/turndown-plugin-gfm) — GitHub Flavored Markdown support
- [Obsidian](https://obsidian.md) — The knowledge management tool that inspired our output format
- [Claude Code](https://claude.ai/code) — AI-assisted development
