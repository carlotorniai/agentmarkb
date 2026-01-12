#!/bin/bash
#
# KB Manager Native Host Uninstallation Script
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  KB Manager Native Host Uninstaller${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

MANIFEST_NAME="com.kb_manager.host.json"

# Remove from Chrome
CHROME_MANIFEST="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/$MANIFEST_NAME"
if [ -f "$CHROME_MANIFEST" ]; then
    rm "$CHROME_MANIFEST"
    echo -e "${GREEN}[+]${NC} Removed Chrome manifest"
else
    echo -e "${RED}[-]${NC} Chrome manifest not found"
fi

# Remove from Chrome Canary
CANARY_MANIFEST="$HOME/Library/Application Support/Google/Chrome Canary/NativeMessagingHosts/$MANIFEST_NAME"
if [ -f "$CANARY_MANIFEST" ]; then
    rm "$CANARY_MANIFEST"
    echo -e "${GREEN}[+]${NC} Removed Chrome Canary manifest"
fi

# Remove from Chromium
CHROMIUM_MANIFEST="$HOME/Library/Application Support/Chromium/NativeMessagingHosts/$MANIFEST_NAME"
if [ -f "$CHROMIUM_MANIFEST" ]; then
    rm "$CHROMIUM_MANIFEST"
    echo -e "${GREEN}[+]${NC} Removed Chromium manifest"
fi

echo ""
echo -e "${GREEN}Uninstallation complete!${NC}"
echo ""
