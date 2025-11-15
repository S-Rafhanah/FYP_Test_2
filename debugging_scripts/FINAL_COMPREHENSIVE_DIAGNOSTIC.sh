#!/bin/bash
#########################################################################
# FINAL COMPREHENSIVE DIAGNOSTIC - Project Syntra
# Tests every component in the data pipeline
#########################################################################

echo "=========================================================================="
echo "  PROJECT SYNTRA - COMPLETE SYSTEM DIAGNOSTIC"
echo "=========================================================================="
echo ""
echo "Testing: IDS-VM → Elasticsearch → Backend API → Frontend → Dashboard"
echo ""

PROJECT_ROOT="$HOME/Pych armProjects/This-is-the-ConZee-Folder-For-Testing/Project-Syntra-main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

echo "=========================================================================="
echo "STEP 1: BACKEND SERVER (Express.js on port 3001)"
echo "=========================================================================="
echo ""

echo "[1.1] Checking if backend process is running..."
BACKEND_PID=$(ps aux | grep "node.*server.js" | grep -v grep | awk '{print $2}')
if [ -n "$BACKEND_PID" ]; then
    print_check 0 "Backend is running (PID: $BACKEND_PID)"
else
    print_check 1 "Backend is NOT running!"
    echo "      To start: cd $PROJECT_ROOT/user-api && node server.js"
fi

echo ""
echo "[1.2] Checking if port 3001 is listening..."
PORT_CHECK=$(sudo lsof -i :3001 2>/dev/null)
if [ -n "$PORT_CHECK" ]; then
    print_check 0 "Port 3001 is listening"
    echo "$PORT_CHECK" | head -2
else
    print_check 1 "Port 3001 is NOT listening!"
fi

echo ""
echo "[1.3] Testing backend root endpoint..."
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null)
if [ "$BACKEND_RESPONSE" = "200" ] || [ "$BACKEND_RESPONSE" = "404" ]; then
    print_check 0 "Backend is responding (HTTP $BACKEND_RESPONSE)"
else
    print_check 1 "Backend is NOT responding (HTTP $BACKEND_RESPONSE or no response)"
fi

echo ""
echo "=========================================================================="
echo "STEP 2: ELASTICSEARCH (Backend dependency)"
echo "=========================================================================="
echo ""

echo "[2.1] Testing Elasticsearch connection from localhost..."
ES_HEALTH=$(curl -s http://localhost:9200/_cluster/health 2>/dev/null)
if [ -n "$ES_HEALTH" ]; then
    print_check 0 "Elasticsearch is reachable from Logging VM"
    echo "$ES_HEALTH" | grep -o '"status":"[^"]*"'
else
    print_check 1 "Elasticsearch is NOT reachable!"
fi

echo ""
echo "[2.2] Testing Elasticsearch connection from backend's perspective..."
ES_FROM_BACKEND=$(curl -s http://192.168.56.128:9200/_cluster/health 2>/dev/null)
if [ -n "$ES_FROM_BACKEND" ]; then
    print_check 0 "Elasticsearch reachable at http://192.168.56.128:9200"
else
    print_check 1 "Elasticsearch NOT reachable at http://192.168.56.128:9200"
fi

echo ""
echo "[2.3] Checking for Suricata data in Elasticsearch..."
SURICATA_COUNT=$(curl -s "localhost:9200/filebeat-*/_search?size=0" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [{ "match": { "event.module": "suricata" } }],
      "filter": [{ "exists": { "field": "suricata.eve.alert.signature" } }]
    }
  }
}
' 2>/dev/null | grep -o '"value":[0-9]*' | head -1 | cut -d: -f2)

if [ -n "$SURICATA_COUNT" ] && [ "$SURICATA_COUNT" -gt 0 ]; then
    print_check 0 "Found $SURICATA_COUNT Suricata alerts in Elasticsearch"
else
    print_check 1 "No Suricata alerts found! (Count: ${SURICATA_COUNT:-0})"
fi

echo ""
echo "[2.4] Checking for Zeek data in Elasticsearch..."
ZEEK_COUNT=$(curl -s "localhost:9200/filebeat-*/_search?size=0" -H 'Content-Type: application/json' -d'
{
  "query": { "match": { "event.module": "zeek" } }
}
' 2>/dev/null | grep -o '"value":[0-9]*' | head -1 | cut -d: -f2)

if [ -n "$ZEEK_COUNT" ] && [ "$ZEEK_COUNT" -gt 0 ]; then
    print_check 0 "Found $ZEEK_COUNT Zeek events in Elasticsearch"
else
    print_check 1 "No Zeek events found! (Count: ${ZEEK_COUNT:-0})"
fi

echo ""
echo "=========================================================================="
echo "STEP 3: BACKEND API ENDPOINTS (Authentication required)"
echo "=========================================================================="
echo ""

echo "[3.1] Testing /api/suricata/alerts (without auth - should get 401)..."
SURICATA_NO_AUTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/suricata/alerts 2>/dev/null)
if [ "$SURICATA_NO_AUTH" = "401" ]; then
    print_check 0 "Endpoint exists and requires authentication (HTTP 401)"
elif [ "$SURICATA_NO_AUTH" = "200" ]; then
    echo -e "${YELLOW}⚠${NC}  Endpoint works without auth (HTTP 200) - auth might be disabled"
else
    print_check 1 "Unexpected response: HTTP $SURICATA_NO_AUTH"
fi

echo ""
echo "[3.2] Testing /api/zeek/logs (without auth - should get 401)..."
ZEEK_NO_AUTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/zeek/logs 2>/dev/null)
if [ "$ZEEK_NO_AUTH" = "401" ]; then
    print_check 0 "Endpoint exists and requires authentication (HTTP 401)"
elif [ "$ZEEK_NO_AUTH" = "200" ]; then
    echo -e "${YELLOW}⚠${NC}  Endpoint works without auth (HTTP 200) - auth might be disabled"
else
    print_check 1 "Unexpected response: HTTP $ZEEK_NO_AUTH"
fi

echo ""
echo "[3.3] Testing /api/health (should be public)..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health 2>/dev/null)
if echo "$HEALTH_RESPONSE" | grep -q "status"; then
    print_check 0 "Health endpoint is working"
    echo "$HEALTH_RESPONSE" | head -5
else
    print_check 1 "Health endpoint not responding correctly"
fi

echo ""
echo "=========================================================================="
echo "STEP 4: FRONTEND CONFIGURATION"
echo "=========================================================================="
echo ""

echo "[4.1] Checking .env file..."
if [ -f "$PROJECT_ROOT/.env" ]; then
    print_check 0 "Found .env file"
    API_URL=$(grep "REACT_APP_API_URL" "$PROJECT_ROOT/.env" | cut -d= -f2)
    echo "      API URL: $API_URL"
    if [ "$API_URL" = "http://192.168.56.128:3001" ]; then
        print_check 0 "API URL is correct"
    else
        print_check 1 "API URL might be wrong! Expected: http://192.168.56.128:3001"
    fi
else
    print_check 1 ".env file not found!"
fi

echo ""
echo "[4.2] Checking backend_api.js..."
if [ -f "$PROJECT_ROOT/src/backend_api.js" ]; then
    print_check 0 "Found backend_api.js"
    SURICATA_CALL=$(grep "api/suricata/alerts" "$PROJECT_ROOT/src/backend_api.js")
    if [ -n "$SURICATA_CALL" ]; then
        print_check 0 "getSuricataAlerts() function exists"
    else
        print_check 1 "getSuricataAlerts() function not found!"
    fi
else
    print_check 1 "backend_api.js not found!"
fi

echo ""
echo "[4.3] Checking if React frontend is running..."
FRONTEND_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
if [ "$FRONTEND_CHECK" = "200" ]; then
    print_check 0 "Frontend is running on port 3000"
else
    print_check 1 "Frontend might not be running (HTTP $FRONTEND_CHECK)"
fi

echo ""
echo "=========================================================================="
echo "STEP 5: AUTHENTICATION TEST"
echo "=========================================================================="
echo ""

echo "[5.1] To test with authentication, you need a valid JWT token"
echo "      You get this token by logging in through the dashboard"
echo ""
echo "      If you're already logged in to the dashboard:"
echo "      1. Open browser DevTools (F12)"
echo "      2. Go to Console tab"
echo "      3. Type: localStorage.getItem('accessToken')"
echo "      4. Copy the token and run:"
echo "         TOKEN='your-token-here'"
echo "         curl -H \"Authorization: Bearer \$TOKEN\" http://localhost:3001/api/suricata/alerts"
echo ""

echo "=========================================================================="
echo "DIAGNOSTIC SUMMARY"
echo "=========================================================================="
echo ""

# Count issues
ISSUES=0

[ -z "$BACKEND_PID" ] && ISSUES=$((ISSUES+1)) && echo "❌ Backend is not running"
[ -z "$PORT_CHECK" ] && ISSUES=$((ISSUES+1)) && echo "❌ Port 3001 is not listening"
[ -z "$ES_HEALTH" ] && ISSUES=$((ISSUES+1)) && echo "❌ Elasticsearch is not reachable"
[ -z "$SURICATA_COUNT" ] || [ "$SURICATA_COUNT" -eq 0 ] && ISSUES=$((ISSUES+1)) && echo "❌ No Suricata data in Elasticsearch"
[ -z "$ZEEK_COUNT" ] || [ "$ZEEK_COUNT" -eq 0 ] && ISSUES=$((ISSUES+1)) && echo "❌ No Zeek data in Elasticsearch"

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ All systems operational!${NC}"
    echo ""
    echo "If dashboard still shows no alerts, the issue is likely:"
    echo "  1. Not logged in (check browser DevTools → Console for auth errors)"
    echo "  2. Time filter on dashboard (set to 'Last 24 hours' but data is older)"
    echo "  3. Dashboard component not calling getSuricataAlerts() correctly"
    echo ""
    echo "Next steps:"
    echo "  • Open http://192.168.56.128:3000"
    echo "  • Login as Security Analyst"
    echo "  • Open browser DevTools (F12) → Console tab"
    echo "  • Look for errors or failed network requests"
    echo "  • Screenshot any errors and share them"
else
    echo -e "${RED}Found $ISSUES issue(s) that need to be fixed${NC}"
    echo ""
    echo "Priority fixes:"
    [ -z "$BACKEND_PID" ] && echo "  1. Start backend: cd $PROJECT_ROOT/user-api && node server.js"
    [ -z "$ES_HEALTH" ] && echo "  2. Start Elasticsearch or check connection"
    [ -z "$SURICATA_COUNT" ] || [ "$SURICATA_COUNT" -eq 0 ] && echo "  3. Verify IDS-VM is sending Suricata data to Elasticsearch"
fi

echo ""
echo "=========================================================================="
echo "END OF DIAGNOSTIC"
echo "=========================================================================="
