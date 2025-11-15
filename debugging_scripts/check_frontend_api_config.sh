#!/bin/bash
#########################################################################
# Frontend API Configuration Checker
# Finds what API endpoints the React app is trying to call
#########################################################################

echo "=========================================="
echo "  FRONTEND API CONFIGURATION CHECK"
echo "=========================================="
echo ""

PROJECT_DIR="$HOME/PycharmProjects/This-is-the-ConZee-Folder-For-Testing/user-api"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "[1] Checking frontend directory..."
if [ -d "$FRONTEND_DIR" ]; then
    echo "    ✓ Frontend directory exists"
    cd "$FRONTEND_DIR"
else
    echo "    ✗ Frontend directory not found at $FRONTEND_DIR"
    exit 1
fi

echo ""
echo "[2] Looking for API configuration files..."
echo ""

echo "    [A] Checking for .env file:"
if [ -f ".env" ]; then
    echo "    ✓ Found .env"
    cat .env | grep -i api
else
    echo "    ✗ No .env file"
fi

echo ""
echo "    [B] Checking for .env.local:"
if [ -f ".env.local" ]; then
    echo "    ✓ Found .env.local"
    cat .env.local | grep -i api
else
    echo "    ✗ No .env.local file"
fi

echo ""
echo "[3] Searching for API endpoints in source code..."
echo ""

echo "    [A] Looking for axios/fetch calls in src/:"
grep -r "axios\|fetch" src/ 2>/dev/null | grep -i "alert\|dashboard" | head -20

echo ""
echo "    [B] Looking for API_URL or BASE_URL constants:"
grep -r "API_URL\|BASE_URL\|REACT_APP" src/ 2>/dev/null | grep -v node_modules | head -15

echo ""
echo "    [C] Looking for specific alert/dashboard API calls:"
grep -r "/api/alerts\|/api/dashboard\|/api/security-analyst" src/ 2>/dev/null | head -20

echo ""
echo "[4] Checking package.json for proxy configuration..."
if [ -f "package.json" ]; then
    echo "    Proxy setting:"
    cat package.json | grep -A 2 "proxy"
fi

echo ""
echo "[5] Searching for API service files..."
find src/ -name "*api*.js" -o -name "*service*.js" 2>/dev/null | while read file; do
    echo ""
    echo "    File: $file"
    head -30 "$file" | grep -E "const|function|export|axios|fetch|http" | head -10
done

echo ""
echo "=========================================="
echo "  FRONTEND CHECK COMPLETE"
echo "=========================================="
