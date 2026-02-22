#!/usr/bin/env python3
"""
Native Messaging Host for KB Manager Chrome Extension

This script handles communication between the Chrome extension and the local
file system to read/write the YAML knowledge base.

Protocol:
- Reads JSON messages from stdin (length-prefixed with 4-byte little-endian int)
- Writes JSON responses to stdout (same format)
- All messages are JSON objects with an 'action' field

Actions:
- read: Read and parse the YAML file, return as JSON
- write: Write JSON data to YAML file
- test: Test connection and file access
"""

import json
import struct
import sys
import os
import fcntl
import hashlib
from datetime import datetime, timezone
from pathlib import Path

# Try to import yaml, install if needed
try:
    import yaml
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pyyaml', '--quiet'])
    import yaml


def read_message():
    """Read a message from stdin using Chrome's native messaging protocol."""
    # Read the message length (first 4 bytes)
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None

    # Unpack the length as a little-endian unsigned int
    message_length = struct.unpack('<I', raw_length)[0]

    # Read the message
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)


def send_message(message):
    """Send a message to stdout using Chrome's native messaging protocol."""
    # Encode the message as JSON
    encoded = json.dumps(message).encode('utf-8')

    # Write the message length followed by the message
    sys.stdout.buffer.write(struct.pack('<I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def read_yaml_file(file_path):
    """Read and parse a YAML file, return as Python dict."""
    path = Path(file_path).expanduser()

    if not path.exists():
        # Return empty KB structure if file doesn't exist
        return {
            'version': 1,
            'last_updated': datetime.now().strftime('%Y-%m-%d'),
            'my_content': {},
            'favorite_authors': {
                'x': [],
                'substack': [],
                'linkedin': [],
                'generic_web': []
            },
            'topic_index': {}
        }

    with open(path, 'r', encoding='utf-8') as f:
        # Lock for reading
        fcntl.flock(f.fileno(), fcntl.LOCK_SH)
        try:
            data = yaml.safe_load(f)
            return data if data else {}
        finally:
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)


def write_yaml_file(file_path, data):
    """Write data to a YAML file with proper formatting."""
    path = Path(file_path).expanduser()

    # Create parent directories if they don't exist
    path.parent.mkdir(parents=True, exist_ok=True)

    # Update last_updated timestamp
    data['last_updated'] = datetime.now().strftime('%Y-%m-%d')

    # Write atomically using a temp file
    temp_path = path.with_suffix('.yaml.tmp')

    with open(temp_path, 'w', encoding='utf-8') as f:
        # Lock for writing
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        try:
            yaml.dump(
                data,
                f,
                default_flow_style=False,
                allow_unicode=True,
                sort_keys=False,
                indent=2,
                width=120
            )
        finally:
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)

    # Atomic rename
    os.replace(temp_path, path)


def test_connection(file_path):
    """Test if we can read/write to the specified file path."""
    path = Path(file_path).expanduser()

    result = {
        'success': True,
        'file_exists': path.exists(),
        'readable': False,
        'writable': False,
        'directory_exists': path.parent.exists(),
        'errors': []
    }

    # Check if directory exists
    if not path.parent.exists():
        result['errors'].append(f"Directory does not exist: {path.parent}")
    else:
        # Check write permission on directory
        if os.access(path.parent, os.W_OK):
            result['writable'] = True
        else:
            result['errors'].append(f"Cannot write to directory: {path.parent}")

    # Check if file exists and is readable
    if path.exists():
        if os.access(path, os.R_OK):
            result['readable'] = True
            # Try to parse it as YAML
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    yaml.safe_load(f)
            except yaml.YAMLError as e:
                result['errors'].append(f"Invalid YAML format: {str(e)}")
        else:
            result['errors'].append(f"Cannot read file: {path}")

        if os.access(path, os.W_OK):
            result['writable'] = True
        else:
            result['errors'].append(f"Cannot write to file: {path}")

    result['success'] = len(result['errors']) == 0
    return result


def create_bookmark(base_dir, slug, meta_yaml_str, content_md):
    """Create the full KB document folder structure for a bookmark.

    Creates:
        <base_dir>/<slug>/
        ├── meta.yaml
        ├── assets/
        │   └── content.md
        └── canonicals/
            └── retrieval.md  (symlink → ../assets/content.md)
    """
    base_path = Path(base_dir).expanduser()
    doc_path = base_path / slug

    # Check if already exists (dedup)
    if doc_path.exists():
        return {'success': False, 'error': f'Bookmark folder already exists: {slug}'}

    # Create directory tree
    assets_dir = doc_path / 'assets'
    canonicals_dir = doc_path / 'canonicals'
    assets_dir.mkdir(parents=True, exist_ok=True)
    canonicals_dir.mkdir(parents=True, exist_ok=True)

    # Write content.md
    content_path = assets_dir / 'content.md'
    content_path.write_text(content_md, encoding='utf-8')

    # Compute SHA-256 of content.md
    sha256 = hashlib.sha256(content_md.encode('utf-8')).hexdigest()

    # Update the sha256 placeholder in meta.yaml if present
    meta_yaml_str = meta_yaml_str.replace('SHA256_PLACEHOLDER', sha256)

    # Write meta.yaml
    meta_path = doc_path / 'meta.yaml'
    meta_path.write_text(meta_yaml_str, encoding='utf-8')

    # Create symlink for canonicals/retrieval.md → ../assets/content.md
    symlink_path = canonicals_dir / 'retrieval.md'
    symlink_path.symlink_to('../assets/content.md')

    return {
        'success': True,
        'path': str(doc_path),
        'sha256': sha256
    }


def check_exists(base_dir, slug):
    """Check if a bookmark folder already exists."""
    base_path = Path(base_dir).expanduser()
    doc_path = base_path / slug
    return {
        'success': True,
        'exists': doc_path.exists(),
        'path': str(doc_path)
    }


def handle_message(message):
    """Process a message and return a response."""
    action = message.get('action')
    file_path = message.get('filePath')

    if not action:
        return {'success': False, 'error': 'No action specified'}

    try:
        if action == 'read':
            if not file_path:
                return {'success': False, 'error': 'No file path specified'}
            data = read_yaml_file(file_path)
            return {'success': True, 'data': data}

        elif action == 'write':
            if not file_path:
                return {'success': False, 'error': 'No file path specified'}
            data = message.get('data')
            if data is None:
                return {'success': False, 'error': 'No data to write'}
            write_yaml_file(file_path, data)
            return {'success': True}

        elif action == 'test':
            if not file_path:
                return {'success': False, 'error': 'No file path specified'}
            result = test_connection(file_path)
            return result

        elif action == 'create_bookmark':
            base_dir = message.get('baseDir')
            slug = message.get('slug')
            meta_yaml_str = message.get('metaYaml')
            content_md = message.get('contentMd')
            if not all([base_dir, slug, meta_yaml_str, content_md]):
                return {'success': False, 'error': 'Missing required fields: baseDir, slug, metaYaml, contentMd'}
            return create_bookmark(base_dir, slug, meta_yaml_str, content_md)

        elif action == 'check_exists':
            base_dir = message.get('baseDir')
            slug = message.get('slug')
            if not all([base_dir, slug]):
                return {'success': False, 'error': 'Missing required fields: baseDir, slug'}
            return check_exists(base_dir, slug)

        elif action == 'ping':
            return {'success': True, 'message': 'pong'}

        else:
            return {'success': False, 'error': f'Unknown action: {action}'}

    except Exception as e:
        return {'success': False, 'error': str(e)}


def main():
    """Main loop: read messages and send responses."""
    while True:
        message = read_message()
        if message is None:
            break

        response = handle_message(message)
        send_message(response)


if __name__ == '__main__':
    main()
