#!/bin/bash
#########################################################################
# Backend API Diagnostic Script (Updated for /src structure)
# Identifies backend type and checks for API issues
#########################################################################

echo "=========================================="
echo "  BACKEND API DIAGNOSTIC"
echo "=========================================="
echo ""

# Updated project path
PROJECT_DIR="$HOME/PycharmProjects/This-is-the-ConZee-Folder-For-Testing"
SRC_DIR="$PROJECT_DIR/src"
BACKEND_DIR="$SRC_DIR/backend"

echo "[1] Checking project structure..."
echo "    Project: $PROJECT_DIR"
echo "    Source: $SRC_DIR"
echo "    Backend: $BACKEND_DIR"
echo ""

if [ -d "$SRC_DIR" ]; then
    echo "    ✓ /src directory exists"
    cd "$SRC_DIR"
    echo "    Contents of /src:"
    ls -la | grep -v "^total\|^\.$"
else
    echo "    ✗ /src directory not found"
    echo ""
    echo "    Let me search for backend files..."
    find "$PROJECT_DIR" -name "app.py" -o -name "server.js" -o -name "index.js" 2>/dev/null | head -5
    exit 1
fi

echo ""
echo "[2] Identifying backend technology..."
BACKEND_TYPE=""
MAIN_FILE=""

# Check in /src/backend
if [ -d "$BACKEND_DIR" ]; then
    cd "$BACKEND_DIR"
    echo "    Checking in: $BACKEND_DIR"

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
    fi
fi

# If not found in backend folder, check /src root
if [ -z "$BACKEND_TYPE" ]; then
    cd "$SRC_DIR"
    echo "    Checking in: $SRC_DIR"

    if [ -f "app.py" ]; then
        echo "    ✓ Flask backend detected (app.py found in /src root)"
        BACKEND_TYPE="flask"
        MAIN_FILE="app.py"
        BACKEND_DIR="$SRC_DIR"
    elif [ -f "server.js" ]; then
        echo "    ✓ Node.js/Express backend detected (server.js found in /src root)"
        BACKEND_TYPE="nodejs"
        MAIN_FILE="server.js"
        BACKEND_DIR="$SRC_DIR"
    elif [ -f "index.js" ]; then
        echo "    ✓ Node.js/Express backend detected (index.js found in /src root)"
        BACKEND_TYPE="nodejs"
        MAIN_FILE="index.js"
        BACKEND_DIR="$SRC_DIR"
    fi
fi

if [ -z "$BACKEND_TYPE" ]; then
    echo "    ✗ Cannot determine backend type"
    echo ""
    echo "    Files in /src:"
    ls -la "$SRC_DIR"
    echo ""
    echo "    Files in /src/backend (if exists):"
    ls -la "$BACKEND_DIR" 2>/dev/null || echo "    /src/backend doesn't exist"
    exit 1
fi

cd "$BACKEND_DIR"
echo "    Backend located at: $BACKEND_DIR"
echo "    Main file: $MAIN_FILE"

echo ""
echo "[3] Checking if backend is running..."
if [ "$BACKEND_TYPE" = "flask" ]; then
    BACKEND_PROC=$(ps aux | grep -E "python.*app.py|flask run|gunicorn.*app:app" | grep -v grep)
elif [ "$BACKEND_TYPE" = "nodejs" ]; then
    BACKEND_PROC=$(ps aux | grep -E "node.*$MAIN_FILE|npm.*start|node.*src" | grep -v grep)
fi

if [ -n "$BACKEND_PROC" ]; then
    echo "    ✓ Backend process is running"
    echo "$BACKEND_PROC" | head -3
else
    echo "    ✗ Backend process NOT running!"
    echo ""
    echo "    Checking if maybe running in Docker..."
    docker ps 2>/dev/null | grep -E "flask|node|api" || echo "    No Docker containers found"
fi

echo ""
echo "[4] Checking port 8001..."
PORT_8001=$(sudo lsof -i :8001 2>/dev/null)
if [ -n "$PORT_8001" ]; then
    echo "    ✓ Port 8001 is in use"
    echo "$PORT_8001"
else
    echo "    ✗ Port 8001 is NOT listening!"
    echo ""
    echo "    Checking other common API ports..."
    sudo lsof -i :3001 2>/dev/null && echo "    Found: Port 3001"
    sudo lsof -i :5000 2>/dev/null && echo "    Found: Port 5000"
    sudo lsof -i :8000 2>/dev/null && echo "    Found: Port 8000"
fi

echo ""
echo "[5] Testing API endpoints..."
echo ""
echo "    [A] Testing root endpoint:"
curl -s http://localhost:8001/ | head -5 || echo "    Connection refused or no response"

echo ""
echo "    [B] Testing /api/alerts:"
ALERTS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:8001/api/alerts 2>/dev/null)
echo "$ALERTS_RESPONSE" | head -10

echo ""
echo "    [C] Testing /api/dashboard:"
curl -s http://localhost:8001/api/dashboard 2>/dev/null | head -10 || echo "    No response or 404"

echo ""
echo "    [D] Testing /api/security-analyst/alerts:"
curl -s http://localhost:8001/api/security-analyst/alerts 2>/dev/null | head -10 || echo "    No response or 404"

echo ""
echo "[6] Checking backend configuration..."
if [ -f ".env" ]; then
    echo "    ✓ Found .env file"
    cat .env | grep -E "PORT|ELASTICSEARCH|DATABASE" || echo "    (No relevant env vars)"
else
    echo "    ✗ No .env file found"
fi

echo ""
echo "[7] Finding all API routes in backend code..."
echo "    Searching for route definitions in: $BACKEND_DIR"
if [ "$BACKEND_TYPE" = "flask" ]; then
    echo ""
    echo "    Flask routes found:"
    grep -n "@app.route\|@bp.route\|@api.route" *.py 2>/dev/null | head -30
elif [ "$BACKEND_TYPE" = "nodejs" ]; then
    echo ""
    echo "    Express routes found:"
    grep -n "app.get\|app.post\|router.get\|router.post" *.js 2>/dev/null | head -30
fi

echo ""
echo "[8] Checking backend logs..."
if [ -f "/tmp/backend.log" ]; then
    echo "    Backend log (/tmp/backend.log) - Last 20 lines:"
    tail -n 20 /tmp/backend.log
elif [ -f "$BACKEND_DIR/logs/app.log" ]; then
    echo "    Backend log ($BACKEND_DIR/logs/app.log) - Last 20 lines:"
    tail -n 20 "$BACKEND_DIR/logs/app.log"
else
    echo "    ✗ No backend log file found"
    echo "    Checking for other log files..."
    find "$BACKEND_DIR" -name "*.log" 2>/dev/null | head -5
fi

echo ""
echo "[9] Testing Elasticsearch connection..."
echo "    Testing: curl localhost:9200/_cluster/health"
curl -s localhost:9200/_cluster/health?pretty 2>/dev/null || echo "    Cannot connect to Elasticsearch"

echo ""
echo "[10] Checking how backend connects to Elasticsearch..."
if [ "$BACKEND_TYPE" = "flask" ]; then
    echo "    Looking for Elasticsearch client in Python code:"
    grep -n "Elasticsearch\|elasticsearch" *.py 2>/dev/null | head -10
elif [ "$BACKEND_TYPE" = "nodejs" ]; then
    echo "    Looking for Elasticsearch client in JS code:"
    grep -n "elasticsearch\|@elastic" *.js 2>/dev/null | head -10
fi

echo ""
echo "=========================================="
echo "  DIAGNOSTIC COMPLETE"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Backend type: $BACKEND_TYPE"
echo "- Main file: $BACKEND_DIR/$MAIN_FILE"
echo "- Process running: $([ -n "$BACKEND_PROC" ] && echo "YES ✓" || echo "NO ✗")"
echo "- Port 8001 listening: $([ -n "$PORT_8001" ] && echo "YES ✓" || echo "NO ✗")"
echo ""
echo "Next steps:"
echo "1. Check if backend is running (section 3)"
echo "2. Check which API endpoints exist (section 7)"
echo "3. Check if there are errors in logs (section 8)"
echo "4. Test API endpoints with curl (section 5)"
echo ""
