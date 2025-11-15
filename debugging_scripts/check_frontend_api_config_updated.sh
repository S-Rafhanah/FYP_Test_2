#!/bin/bash
#########################################################################
# Frontend API Configuration Checker (Updated for /src structure)
# Finds what API endpoints the React app is trying to call
#########################################################################

echo "=========================================="
echo "  FRONTEND API CONFIGURATION CHECK"
echo "=========================================="
echo ""

PROJECT_DIR="$HOME/PycharmProjects/This-is-the-ConZee-Folder-For-Testing"
SRC_DIR="$PROJECT_DIR/src"
FRONTEND_DIR="$SRC_DIR/frontend"

echo "[1] Checking frontend directory..."
echo "    Looking in: $FRONTEND_DIR"

if [ -d "$FRONTEND_DIR" ]; then
    echo "    ✓ Frontend directory exists"
    cd "$FRONTEND_DIR"
elif [ -d "$SRC_DIR/client" ]; then
    FRONTEND_DIR="$SRC_DIR/client"
    echo "    ✓ Frontend directory exists at: $FRONTEND_DIR"
    cd "$FRONTEND_DIR"
elif [ -d "$SRC_DIR/react-app" ]; then
    FRONTEND_DIR="$SRC_DIR/react-app"
    echo "    ✓ Frontend directory exists at: $FRONTEND_DIR"
    cd "$FRONTEND_DIR"
elif [ -d "$PROJECT_DIR/frontend" ]; then
    FRONTEND_DIR="$PROJECT_DIR/frontend"
    echo "    ✓ Frontend directory exists at: $FRONTEND_DIR"
    cd "$FRONTEND_DIR"
else
    echo "    ✗ Frontend directory not found"
    echo ""
    echo "    Searching for package.json (React frontend)..."
    find "$PROJECT_DIR" -name "package.json" -path "*/src/*" 2>/dev/null | head -5
    exit 1
fi

echo ""
echo "[2] Looking for API configuration files..."
echo ""

echo "    [A] Checking for .env file:"
if [ -f ".env" ]; then
    echo "    ✓ Found .env"
    echo ""
    cat .env | grep -i -E "API|REACT_APP|BASE_URL|PORT"
else
    echo "    ✗ No .env file"
fi

echo ""
echo "    [B] Checking for .env.local:"
if [ -f ".env.local" ]; then
    echo "    ✓ Found .env.local"
    echo ""
    cat .env.local | grep -i -E "API|REACT_APP|BASE_URL|PORT"
else
    echo "    ✗ No .env.local file"
fi

echo ""
echo "    [C] Checking for .env.development:"
if [ -f ".env.development" ]; then
    echo "    ✓ Found .env.development"
    echo ""
    cat .env.development | grep -i -E "API|REACT_APP|BASE_URL|PORT"
else
    echo "    ✗ No .env.development file"
fi

echo ""
echo "[3] Searching for API endpoints in source code..."
echo ""

echo "    [A] Looking for axios/fetch calls to alert endpoints:"
grep -r "axios\|fetch" src/ 2>/dev/null | grep -i -E "alert|dashboard" | grep -v node_modules | head -20

echo ""
echo "    [B] Looking for API_URL or BASE_URL constants:"
grep -r "API_URL\|BASE_URL\|REACT_APP" src/ 2>/dev/null | grep -v node_modules | grep -v ".test.js" | head -15

echo ""
echo "    [C] Looking for specific API endpoint patterns:"
grep -r "/api/alerts\|/api/dashboard\|/api/security-analyst\|localhost:8001\|:8001" src/ 2>/dev/null | grep -v node_modules | head -20

echo ""
echo "[4] Checking package.json for proxy configuration..."
if [ -f "package.json" ]; then
    echo "    ✓ Found package.json"
    echo ""
    echo "    Proxy setting:"
    cat package.json | grep -B 2 -A 2 "proxy"
    echo ""
    echo "    Scripts:"
    cat package.json | grep -A 10 "\"scripts\""
else
    echo "    ✗ No package.json found"
fi

echo ""
echo "[5] Searching for API service files..."
find src/ -name "*api*.js" -o -name "*service*.js" -o -name "*Api*.js" -o -name "*Service*.js" 2>/dev/null | grep -v node_modules | while read file; do
    echo ""
    echo "    ═══ File: $file ═══"
    head -40 "$file" | grep -E "const|function|export|axios|fetch|http|API|baseURL" | head -15
done

echo ""
echo "[6] Looking for API configuration in common locations..."
for file in "src/config/api.js" "src/api/config.js" "src/services/api.js" "src/utils/api.js" "src/config.js"; do
    if [ -f "$file" ]; then
        echo ""
        echo "    ═══ Found: $file ═══"
        head -30 "$file"
    fi
done

echo ""
echo "[7] Checking how dashboard components fetch alerts..."
echo ""
echo "    Looking in dashboard/analyst components:"
find src/ -name "*Dashboard*.js" -o -name "*Dashboard*.jsx" -o -name "*Analyst*.js" 2>/dev/null | grep -v node_modules | while read file; do
    echo ""
    echo "    ═══ Component: $file ═══"
    grep -n -E "fetch|axios|useEffect|api|alerts" "$file" | head -15
done

echo ""
echo "=========================================="
echo "  FRONTEND CHECK COMPLETE"
echo "=========================================="
echo ""
echo "Summary of what to look for:"
echo "- API base URL (e.g., http://localhost:8001)"
echo "- Specific endpoints being called (e.g., /api/alerts)"
echo "- Whether proxy is configured"
echo "- How authentication tokens are sent (if any)"
echo ""
