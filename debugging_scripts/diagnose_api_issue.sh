#!/bin/bash
#########################################################################
# API Diagnostic Script for Project Syntra
# Checks backend (user-api) and frontend (src) API integration
#########################################################################

echo "=========================================="
echo "  PROJECT SYNTRA API DIAGNOSTIC"
echo "=========================================="
echo ""

# Correct project paths
PROJECT_ROOT="$HOME/PycharmProjects/This-is-the-ConZee-Folder-For-Testing/Project-Syntra-main"
BACKEND_DIR="$PROJECT_ROOT/user-api"
FRONTEND_DIR="$PROJECT_ROOT/src"

echo "[1] Verifying project structure..."
if [ ! -d "$PROJECT_ROOT" ]; then
    echo "    ✗ Project root not found at: $PROJECT_ROOT"
    echo "    Searching for Project-Syntra-main..."
    find ~ -type d -name "Project-Syntra-main" 2>/dev/null | head -3
    exit 1
fi

echo "    ✓ Project root: $PROJECT_ROOT"
echo "    ✓ Backend: $BACKEND_DIR"
echo "    ✓ Frontend: $FRONTEND_DIR"

echo ""
echo "[2] Checking if backend (Express.js) is running..."
cd "$BACKEND_DIR"

BACKEND_PROC=$(ps aux | grep -E "node.*server.js|npm.*start" | grep -v grep | grep "$BACKEND_DIR")

if [ -n "$BACKEND_PROC" ]; then
    echo "    ✓ Backend process is running"
    echo "$BACKEND_PROC"
else
    echo "    ✗ Backend process NOT running!"
    echo "    Expected: node server.js"
fi

echo ""
echo "[3] Checking port 3001 (backend API port)..."
PORT_3001=$(sudo lsof -i :3001 2>/dev/null)
if [ -n "$PORT_3001" ]; then
    echo "    ✓ Port 3001 is in use"
    echo "$PORT_3001"
else
    echo "    ✗ Port 3001 is NOT listening!"
    echo "    Backend should be on port 3001"
fi

echo ""
echo "[4] Testing backend API endpoints..."
echo ""
echo "    [A] Testing root endpoint (http://localhost:3001/):"
curl -s http://localhost:3001/ | head -10

echo ""
echo "    [B] Testing /api/security-analyst/dashboard:"
curl -s "http://localhost:3001/api/security-analyst/dashboard" | head -20

echo ""
echo "    [C] Testing /api/security-analyst/alerts:"
curl -s "http://localhost:3001/api/security-analyst/alerts" | head -20

echo ""
echo "    [D] Testing /api/alerts (if exists):"
curl -s "http://localhost:3001/api/alerts" | head -20

echo ""
echo "[5] Checking backend API routes in server.js..."
cd "$BACKEND_DIR"
echo "    Routes defined in server.js:"
grep -n "app.get\|app.post\|router.get\|router.post" server.js 2>/dev/null | grep -i -E "alert|dashboard|analyst" | head -20

echo ""
echo "[6] Checking frontend API client (backend_api.js)..."
cd "$FRONTEND_DIR"
if [ -f "backend_api.js" ]; then
    echo "    ✓ Found backend_api.js"
    echo ""
    echo "    API endpoints called by frontend:"
    grep -n "axios\|fetch" backend_api.js | grep -E "get\|post" | head -20
    echo ""
    echo "    Base URL configuration:"
    grep -n "baseURL\|API_URL\|localhost" backend_api.js | head -10
else
    echo "    ✗ backend_api.js not found!"
fi

echo ""
echo "[7] Checking Security Analyst dashboard component..."
ANALYST_DASHBOARD=$(find "$FRONTEND_DIR/pages" -name "*SecurityAnalyst*" -o -name "*Analyst*.js" 2>/dev/null | head -1)
if [ -n "$ANALYST_DASHBOARD" ]; then
    echo "    ✓ Found dashboard at: $ANALYST_DASHBOARD"
    echo ""
    echo "    API calls in dashboard:"
    grep -n "backend_api\|axios\|fetch\|getAlerts\|getDashboard" "$ANALYST_DASHBOARD" | head -15
else
    echo "    Looking for dashboard in pages/securityAnalyst..."
    ls -la "$FRONTEND_DIR/pages/securityAnalyst/" 2>/dev/null
fi

echo ""
echo "[8] Testing Elasticsearch connection from backend..."
echo "    Backend should connect to Elasticsearch at localhost:9200"
echo ""
curl -s localhost:9200/_cluster/health?pretty | head -10

echo ""
echo "[9] Checking if Elasticsearch has alert data..."
echo "    Total documents in filebeat indices:"
curl -s "localhost:9200/filebeat-*/_count"

echo ""
echo ""
echo "    Sample alert query:"
curl -s "localhost:9200/filebeat-*/_search?size=2" -H 'Content-Type: application/json' -d'
{
  "query": {
    "exists": {"field": "event_type"}
  }
}
' | grep -E "timestamp|event_type|src_ip|dest_ip|alert" | head -20

echo ""
echo "[10] Checking backend Elasticsearch query code..."
cd "$BACKEND_DIR"
echo "     Looking for Elasticsearch client usage in server.js:"
grep -n "elasticsearch\|@elastic\|es.search" server.js | head -15

echo ""
echo "[11] Checking backend logs..."
if [ -f "/tmp/backend.log" ]; then
    echo "    Last 20 lines of backend log:"
    tail -n 20 /tmp/backend.log
else
    echo "    ✗ No backend log found at /tmp/backend.log"
    echo "    Checking for other log locations..."
    find "$BACKEND_DIR" -name "*.log" 2>/dev/null
fi

echo ""
echo "=========================================="
echo "  DIAGNOSTIC COMPLETE"
echo "=========================================="
echo ""
echo "📊 Summary:"
echo ""
echo "Backend Status:"
BACKEND_STATUS="✗ NOT RUNNING"
[ -n "$BACKEND_PROC" ] && BACKEND_STATUS="✓ RUNNING"
echo "  - Process: $BACKEND_STATUS"

PORT_STATUS="✗ NOT LISTENING"
[ -n "$PORT_3001" ] && PORT_STATUS="✓ LISTENING"
echo "  - Port 3001: $PORT_STATUS"

echo ""
echo "Key Files:"
echo "  - Backend: $BACKEND_DIR/server.js"
echo "  - Frontend API: $FRONTEND_DIR/backend_api.js"
echo ""
echo "Next Steps:"
echo "1. If backend not running → Start it: cd $BACKEND_DIR && node server.js"
echo "2. Check API endpoint responses in section [4]"
echo "3. Check if frontend is calling correct endpoints (section [6])"
echo "4. Verify Elasticsearch has data (section [9])"
echo ""
