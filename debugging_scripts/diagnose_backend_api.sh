#!/bin/bash
#########################################################################
# Backend API Diagnostic Script
# Identifies backend type and checks for API issues
#########################################################################

echo "=========================================="
echo "  BACKEND API DIAGNOSTIC"
echo "=========================================="
echo ""

PROJECT_DIR="$HOME/PycharmProjects/This-is-the-ConZee-Folder-For-Testing/user-api"
BACKEND_DIR="$PROJECT_DIR/backend"

echo "[1] Checking backend directory..."
if [ -d "$BACKEND_DIR" ]; then
    echo "    ✓ Backend directory exists"
    cd "$BACKEND_DIR"
else
    echo "    ✗ Backend directory not found at $BACKEND_DIR"
    exit 1
fi

echo ""
echo "[2] Identifying backend technology..."
if [ -f "app.py" ]; then
    echo "    ✓ Flask backend detected (app.py found)"
    BACKEND_TYPE="flask"
    MAIN_FILE="app.py"
elif [ -f "server.js" ]; then
    echo "    ✓ Node.js/Express backend detected (server.js found)"
    BACKEND_TYPE="nodejs"
    MAIN_FILE="server.js"
elif [ -f "index.js" ]; then
    echo "    ✓ Node.js/Express backend detected (index.js found)"
    BACKEND_TYPE="nodejs"
    MAIN_FILE="index.js"
else
    echo "    ✗ Cannot determine backend type"
    echo "    Files in backend directory:"
    ls -la
    exit 1
fi

echo ""
echo "[3] Checking if backend is running..."
if [ "$BACKEND_TYPE" = "flask" ]; then
    BACKEND_PROC=$(ps aux | grep -E "python.*app.py|flask run" | grep -v grep)
elif [ "$BACKEND_TYPE" = "nodejs" ]; then
    BACKEND_PROC=$(ps aux | grep -E "node.*$MAIN_FILE|npm start" | grep -v grep)
fi

if [ -n "$BACKEND_PROC" ]; then
    echo "    ✓ Backend process is running"
    echo "$BACKEND_PROC" | head -3
else
    echo "    ✗ Backend process NOT running!"
fi

echo ""
echo "[4] Checking port 8001..."
PORT_8001=$(sudo lsof -i :8001 2>/dev/null)
if [ -n "$PORT_8001" ]; then
    echo "    ✓ Port 8001 is in use"
    echo "$PORT_8001"
else
    echo "    ✗ Port 8001 is NOT listening!"
fi

echo ""
echo "[5] Testing API endpoints..."
echo ""
echo "    [A] Testing root endpoint:"
curl -s http://localhost:8001/ | head -5

echo ""
echo "    [B] Testing /api/alerts:"
ALERTS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:8001/api/alerts)
echo "$ALERTS_RESPONSE"

echo ""
echo "    [C] Testing /api/dashboard:"
curl -s http://localhost:8001/api/dashboard | head -10

echo ""
echo "    [D] Testing /api/security-analyst/dashboard:"
curl -s http://localhost:8001/api/security-analyst/dashboard | head -10

echo ""
echo "[6] Checking backend logs..."
if [ -f "/tmp/backend.log" ]; then
    echo "    Backend log (/tmp/backend.log):"
    tail -n 20 /tmp/backend.log
elif [ -f "$BACKEND_DIR/logs/app.log" ]; then
    echo "    Backend log ($BACKEND_DIR/logs/app.log):"
    tail -n 20 "$BACKEND_DIR/logs/app.log"
else
    echo "    ✗ No backend log file found"
fi

echo ""
echo "[7] Finding all API routes in backend code..."
echo "    Searching for route definitions..."
if [ "$BACKEND_TYPE" = "flask" ]; then
    grep -n "@app.route\|@bp.route" *.py 2>/dev/null | head -20
elif [ "$BACKEND_TYPE" = "nodejs" ]; then
    grep -n "app.get\|app.post\|router.get\|router.post" *.js 2>/dev/null | grep -i "alert\|dashboard" | head -20
fi

echo ""
echo "[8] Testing Elasticsearch connection from backend..."
echo "    Testing: curl localhost:9200/_cluster/health"
curl -s localhost:9200/_cluster/health?pretty

echo ""
echo "[9] Testing if backend can query alerts from Elasticsearch..."
curl -s "localhost:9200/filebeat-*/_search?size=3&sort=@timestamp:desc" | head -40

echo ""
echo "=========================================="
echo "  DIAGNOSTIC COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check if backend is running (section 3)"
echo "2. Check which API endpoints exist (section 5 & 7)"
echo "3. Check backend logs for errors (section 6)"
echo "4. If backend isn't running, start it"
echo ""
