#!/usr/bin/env python3
"""
Migration script for existing bookmarks in curated_sources.yaml.

Reads the YAML file, finds all saved articles/posts with URLs, fetches
their content, converts to Markdown, and creates the KB document folder
structure in 08_bookmarked_content/.

Usage:
    python3 migrate_bookmarks.py <path_to_curated_sources.yaml> [--dry-run]

Dependencies:
    pip3 install pyyaml requests readability-lxml markdownify
"""

import argparse
import hashlib
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. Install with: pip3 install pyyaml")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("ERROR: requests required. Install with: pip3 install requests")
    sys.exit(1)

try:
    from readability import Document
except ImportError:
    print("ERROR: readability-lxml required. Install with: pip3 install readability-lxml")
    sys.exit(1)

try:
    from markdownify import markdownify as md
except ImportError:
    print("ERROR: markdownify required. Install with: pip3 install markdownify")
    sys.exit(1)


HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}


def generate_slug(title, url, date_published):
    """Generate a slug for the bookmark folder name."""
    date_str = None
    if date_published:
        try:
            d = datetime.fromisoformat(date_published.replace('Z', '+00:00'))
            date_str = d.strftime('%Y-%m-%d')
        except (ValueError, TypeError):
            pass
    if not date_str:
        date_str = datetime.now().strftime('%Y-%m-%d')

    slug_text = title or ''
    if not slug_text:
        from urllib.parse import urlparse
        slug_text = urlparse(url).path.replace('/', ' ')

    # Lowercase, replace non-alphanumeric with hyphens, collapse, trim
    slug = re.sub(r'[^a-z0-9]+', '-', slug_text.lower()).strip('-')[:80]
    return f"{date_str}_{slug}"


def escape_yaml_string(s):
    """Escape a string for YAML double-quoted values."""
    if not s:
        return ''
    return s.replace('\\', '\\\\').replace('"', '\\"')


def build_meta_yaml(slug, title, tags, source_url, platform, author_name,
                    source_name, date_published, date_bookmarked, sha256):
    """Build meta.yaml content string."""
    tags_yaml = '\n'.join(f'  - {t}' for t in tags) if tags else '  []'

    return f'''doc_id: "{slug}"
doc_type: "bookmark"
title: "{escape_yaml_string(title)}"
created_at: "{date_bookmarked}"
updated_at: "{date_bookmarked}"
language: "en"
status: "final"
visibility: "private"

canonical:
  path: "canonicals/retrieval.md"
  generated_from: "assets/content.md"
  generator: "kb_manager_migration"
  generated_at: "{date_bookmarked}"

source_of_truth:
  path: "assets/content.md"
  sha256: "{sha256}"

assets:
  - path: "assets/content.md"
    media_type: "text/markdown"
    sha256: "{sha256}"
    created_at: "{date_bookmarked}"

tags:
{tags_yaml}

relationships:
  derived_from: []
  related: []

bookmark_metadata:
  source_url: "{escape_yaml_string(source_url)}"
  platform: "{platform}"
  author_name: "{escape_yaml_string(author_name or '')}"
  source_name: "{escape_yaml_string(source_name or '')}"
  date_published: "{date_published or ''}"
  date_bookmarked: "{date_bookmarked.split('T')[0] if 'T' in date_bookmarked else date_bookmarked}"
'''


def build_content_md(title, source_url, author_name, source_name, platform,
                     date_published, date_bookmarked, tags, body_markdown, status='final'):
    """Build content.md with YAML frontmatter."""
    tags_yaml = '\n'.join(f'  - {t}' for t in tags) if tags else '  []'

    frontmatter = f'''---
title: "{escape_yaml_string(title)}"
source_url: "{escape_yaml_string(source_url)}"'''

    if author_name:
        frontmatter += f'\nauthor: "{escape_yaml_string(author_name)}"'
    if source_name:
        frontmatter += f'\nsource: "{escape_yaml_string(source_name)}"'

    frontmatter += f'''
platform: {platform}
date_published: "{date_published or ''}"
date_bookmarked: "{date_bookmarked}"
status: "{status}"
tags:
{tags_yaml}
---'''

    header = f'\n# {title}\n'
    if source_name:
        header += f'\n**Source:** [{source_name}]({source_url})'
    else:
        header += f'\n**Source:** [{source_url}]({source_url})'
    if author_name:
        header += f'\n**Author:** {author_name}'
    if date_published:
        header += f'\n**Published:** {date_published}'
    header += '\n\n---\n'

    return frontmatter + header + '\n' + (body_markdown or '*No content extracted.*')


def create_bookmark_folder(base_dir, slug, meta_yaml_str, content_md, dry_run=False):
    """Create the KB document folder structure."""
    doc_path = base_dir / slug

    if doc_path.exists():
        print(f"  SKIP: Folder already exists: {slug}")
        return False

    if dry_run:
        print(f"  DRY-RUN: Would create {doc_path}")
        return True

    assets_dir = doc_path / 'assets'
    canonicals_dir = doc_path / 'canonicals'
    assets_dir.mkdir(parents=True, exist_ok=True)
    canonicals_dir.mkdir(parents=True, exist_ok=True)

    # Write content.md
    content_path = assets_dir / 'content.md'
    content_path.write_text(content_md, encoding='utf-8')

    # Write meta.yaml
    meta_path = doc_path / 'meta.yaml'
    meta_path.write_text(meta_yaml_str, encoding='utf-8')

    # Create symlink
    symlink_path = canonicals_dir / 'retrieval.md'
    symlink_path.symlink_to('../assets/content.md')

    return True


def fetch_and_extract(url):
    """Fetch a URL and extract article content."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        doc = Document(resp.text)
        title = doc.title()
        content_html = doc.summary()
        body_markdown = md(content_html, heading_style='ATX', code_language='')
        return title, body_markdown, True
    except Exception as e:
        print(f"  WARN: Failed to fetch {url}: {e}")
        return None, None, False


def collect_bookmarks(kb_data):
    """Collect all saved articles/posts from the KB data."""
    bookmarks = []

    if not kb_data or 'favorite_authors' not in kb_data:
        return bookmarks

    for platform, authors in kb_data['favorite_authors'].items():
        if not isinstance(authors, list):
            continue
        for author in authors:
            # Determine content key
            content_key = 'saved_posts' if platform in ('x', 'linkedin') else 'saved_articles'
            saved_content = author.get(content_key, [])

            for item in saved_content:
                url = item.get('url')
                if not url:
                    continue

                # Determine author name and source
                if platform == 'x':
                    author_name = f"@{author.get('handle', '')}"
                    source_name = 'X (Twitter)'
                elif platform == 'linkedin':
                    author_name = author.get('name', '')
                    source_name = 'LinkedIn'
                elif platform == 'substack':
                    author_name = author.get('author', author.get('name', ''))
                    source_name = author.get('name', '')
                else:
                    author_name = author.get('name', '')
                    source_name = author.get('source', '')

                bookmarks.append({
                    'url': url,
                    'title': item.get('title', ''),
                    'summary': item.get('summary', item.get('preview', item.get('text', ''))),
                    'date_published': item.get('date_published', ''),
                    'topics': item.get('topics', []),
                    'platform': platform,
                    'author_name': author_name,
                    'source_name': source_name,
                })

    return bookmarks


def main():
    parser = argparse.ArgumentParser(description='Migrate existing bookmarks to KB folder structure')
    parser.add_argument('yaml_path', help='Path to curated_sources.yaml')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without writing')
    parser.add_argument('--output-dir', help='Output directory (default: sibling 08_bookmarked_content/)')
    args = parser.parse_args()

    yaml_path = Path(args.yaml_path).expanduser()
    if not yaml_path.exists():
        print(f"ERROR: File not found: {yaml_path}")
        sys.exit(1)

    # Determine output directory
    if args.output_dir:
        base_dir = Path(args.output_dir).expanduser()
    else:
        # Infer AI_KB root from yaml path
        parts = yaml_path.parts
        try:
            ai_kb_idx = parts.index('AI_KB')
            ai_kb_root = Path(*parts[:ai_kb_idx + 1])
        except ValueError:
            ai_kb_root = yaml_path.parent
        base_dir = ai_kb_root / '08_bookmarked_content'

    print(f"Reading: {yaml_path}")
    print(f"Output:  {base_dir}")
    if args.dry_run:
        print("MODE:    DRY RUN\n")
    else:
        print()
        base_dir.mkdir(parents=True, exist_ok=True)

    # Read YAML
    with open(yaml_path, 'r', encoding='utf-8') as f:
        kb_data = yaml.safe_load(f)

    bookmarks = collect_bookmarks(kb_data)
    print(f"Found {len(bookmarks)} bookmark(s) to migrate.\n")

    now = datetime.now(timezone.utc).isoformat()
    success = 0
    partial = 0
    skipped = 0

    for i, bm in enumerate(bookmarks, 1):
        print(f"[{i}/{len(bookmarks)}] {bm['title'] or bm['url']}")

        # Fetch and extract
        fetched_title, body_markdown, fetch_ok = fetch_and_extract(bm['url'])

        title = bm['title'] or fetched_title or 'Untitled'
        date_published = bm['date_published'] or ''
        status = 'final' if fetch_ok else 'partial'

        # Generate slug
        slug = generate_slug(title, bm['url'], date_published)

        # Build content.md
        content_md = build_content_md(
            title=title,
            source_url=bm['url'],
            author_name=bm['author_name'],
            source_name=bm['source_name'],
            platform=bm['platform'],
            date_published=date_published,
            date_bookmarked=now.split('T')[0],
            tags=bm['topics'],
            body_markdown=body_markdown,
            status=status
        )

        # Compute SHA-256
        sha256 = hashlib.sha256(content_md.encode('utf-8')).hexdigest()

        # Build meta.yaml
        meta_yaml = build_meta_yaml(
            slug=slug,
            title=title,
            tags=bm['topics'],
            source_url=bm['url'],
            platform=bm['platform'],
            author_name=bm['author_name'],
            source_name=bm['source_name'],
            date_published=date_published,
            date_bookmarked=now,
            sha256=sha256
        )

        # Create folder
        created = create_bookmark_folder(base_dir, slug, meta_yaml, content_md, dry_run=args.dry_run)

        if created:
            if fetch_ok:
                success += 1
                print(f"  OK: Created {slug} (full content)")
            else:
                partial += 1
                print(f"  OK: Created {slug} (metadata only, status: partial)")
        else:
            skipped += 1

    print(f"\nDone! Created: {success} full, {partial} partial, {skipped} skipped")


if __name__ == '__main__':
    main()
