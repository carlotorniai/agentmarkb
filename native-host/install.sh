#!/bin/bash
#
# AgentMarKB Native Host Installation Script
# This script installs the native messaging host for Chromium-based browsers
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  AgentMarKB Native Host Installer${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
HOST_PATH="$SCRIPT_DIR/kb_host.py"

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is required but not installed.${NC}"
    echo "Please install Python 3 and try again."
    exit 1
fi

echo -e "${GREEN}[+]${NC} Python 3 found: $(python3 --version)"

# Check if PyYAML is installed
echo -e "${YELLOW}[*]${NC} Checking for PyYAML..."
if python3 -c "import yaml" 2>/dev/null; then
    echo -e "${GREEN}[+]${NC} PyYAML is installed"
else
    echo -e "${YELLOW}[*]${NC} Installing PyYAML..."
    python3 -m pip install pyyaml --quiet
    echo -e "${GREEN}[+]${NC} PyYAML installed"
fi

# Make the host script executable
chmod +x "$HOST_PATH"
echo -e "${GREEN}[+]${NC} Made host script executable"

# Get the Chrome extension ID from the user
echo ""
echo -e "${YELLOW}[*]${NC} To complete installation, you need your Chrome extension ID."
echo ""
echo "To find your extension ID:"
echo "  1. Open Chrome and go to chrome://extensions/"
echo "  2. Enable 'Developer mode' (toggle in top right)"
echo "  3. Load the extension using 'Load unpacked'"
echo "  4. Copy the extension ID shown under the extension name"
echo ""
read -p "Enter your Chrome extension ID (or press Enter to skip for now): " EXTENSION_ID

if [ -z "$EXTENSION_ID" ]; then
    echo -e "${YELLOW}[!]${NC} No extension ID provided."
    echo "    You can run this script again later with your extension ID,"
    echo "    or manually edit the native host manifest."
    EXTENSION_ID="EXTENSION_ID_PLACEHOLDER"
fi

# Create the native messaging host manifest
MANIFEST_CONTENT='{
  "name": "com.kb_manager.host",
  "description": "AgentMarKB Native Host for reading/writing YAML knowledge base",
  "path": "'"$HOST_PATH"'",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://'"$EXTENSION_ID"'/"
  ]
}'

# Chrome native messaging hosts directory
CHROME_HOSTS_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"

# Also support Chrome Canary and Chromium
CHROME_CANARY_DIR="$HOME/Library/Application Support/Google/Chrome Canary/NativeMessagingHosts"
CHROMIUM_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"

# Create directories if they don't exist
mkdir -p "$CHROME_HOSTS_DIR"
echo -e "${GREEN}[+]${NC} Created Chrome NativeMessagingHosts directory"

# Write the manifest
MANIFEST_PATH="$CHROME_HOSTS_DIR/com.kb_manager.host.json"
echo "$MANIFEST_CONTENT" > "$MANIFEST_PATH"
echo -e "${GREEN}[+]${NC} Installed native host manifest: $MANIFEST_PATH"

# Also install for Chrome Canary if the directory structure exists
if [ -d "$HOME/Library/Application Support/Google/Chrome Canary" ]; then
    mkdir -p "$CHROME_CANARY_DIR"
    echo "$MANIFEST_CONTENT" > "$CHROME_CANARY_DIR/com.kb_manager.host.json"
    echo -e "${GREEN}[+]${NC} Also installed for Chrome Canary"
fi

# Also install for Chromium if the directory structure exists
if [ -d "$HOME/Library/Application Support/Chromium" ]; then
    mkdir -p "$CHROMIUM_DIR"
    echo "$MANIFEST_CONTENT" > "$CHROMIUM_DIR/com.kb_manager.host.json"
    echo -e "${GREEN}[+]${NC} Also installed for Chromium"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Native host installed at: $HOST_PATH"
echo "Manifest installed at: $MANIFEST_PATH"
echo ""

if [ "$EXTENSION_ID" = "EXTENSION_ID_PLACEHOLDER" ]; then
    echo -e "${YELLOW}IMPORTANT:${NC} You still need to update the extension ID."
    echo "  1. Load the extension in Chrome (chrome://extensions/)"
    echo "  2. Copy the extension ID"
    echo "  3. Run this script again with the correct ID"
    echo "     OR edit: $MANIFEST_PATH"
    echo ""
fi

echo "Next steps:"
echo "  1. If not already done, load the extension in Chrome"
echo "  2. Open the extension options page"
echo "  3. Configure the path to your YAML knowledge base file"
echo "  4. Click 'Test Connection' to verify everything works"
echo ""
