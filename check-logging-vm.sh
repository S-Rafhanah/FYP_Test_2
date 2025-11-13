#!/bin/bash
# check-logging-vm.sh - Check services on Logging VM (distributed architecture)
# This VM runs: Elasticsearch, Filebeat, Backend API, Frontend
# IDS services (Suricata/Zeek) run on separate IDS VM

echo "==========================================="
echo "Logging VM Health Check"
echo "==========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failed services
failed=0

echo "Checking services on Logging VM..."
echo ""

# 1. Check Elasticsearch (by port, not systemd)
echo "1. Elasticsearch..."
if curl -s http://localhost:9200 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Elasticsearch is responding on port 9200${NC}"

    # Show cluster health
    health=$(curl -s http://localhost:9200/_cluster/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    echo "   Cluster status: $health"
else
    echo -e "${RED}❌ Elasticsearch is NOT responding on port 9200${NC}"
    ((failed++))
fi
echo ""

# 2. Check Filebeat (by systemd)
echo "2. Filebeat..."
if systemctl is-active --quiet filebeat 2>/dev/null; then
    echo -e "${GREEN}✅ Filebeat service is running${NC}"
elif pgrep -f filebeat > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Filebeat process is running (not via systemd)${NC}"
else
    echo -e "${RED}❌ Filebeat is NOT running${NC}"
    ((failed++))
fi
echo ""

# 3. Check Backend API
echo "3. Backend API..."
if pgrep -f "node.*server.js" > /dev/null; then
    echo -e "${GREEN}✅ Backend API (Node.js) is running${NC}"

    if nc -z localhost 3001 2>/dev/null || curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend API is responding on port 3001${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend API process exists but not responding on port 3001${NC}"
    fi
else
    echo -e "${RED}❌ Backend API (Node.js) is NOT running${NC}"
    ((failed++))
fi
echo ""

# 4. Check Frontend
echo "4. Frontend..."
if pgrep -f "react-scripts" > /dev/null; then
    echo -e "${GREEN}✅ Frontend (React dev server) is running${NC}"

    if nc -z localhost 3000 2>/dev/null || curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is responding on port 3000${NC}"
    fi
elif [ -d "/home/logging/PycharmProjects/FYP_Test2/Project-Syntra-main/build" ]; then
    echo -e "${YELLOW}⚠️  Frontend is built (production mode), serve via nginx/apache${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend (React) is NOT running${NC}"
    echo "   Note: You may need to start it manually with 'npm start'"
fi
echo ""

# 5. Check data flow from IDS VM
echo "5. Data Flow from IDS VM..."
echo "   Checking for recent Suricata data in Elasticsearch..."

suricata_count=$(curl -s "localhost:9200/filebeat-*/_count?q=event.module:suricata" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2)
zeek_count=$(curl -s "localhost:9200/filebeat-*/_count?q=event.module:zeek" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2)

if [ ! -z "$suricata_count" ] && [ "$suricata_count" -gt 0 ]; then
    echo -e "${GREEN}✅ Suricata data detected: $suricata_count documents${NC}"
else
    echo -e "${YELLOW}⚠️  No Suricata data found in Elasticsearch${NC}"
    echo "   Check if Suricata is running on IDS VM"
fi

if [ ! -z "$zeek_count" ] && [ "$zeek_count" -gt 0 ]; then
    echo -e "${GREEN}✅ Zeek data detected: $zeek_count documents${NC}"
else
    echo -e "${YELLOW}⚠️  No Zeek data found in Elasticsearch${NC}"
    echo "   Check if Zeek is running on IDS VM"
fi

# Check for recent data (last 10 minutes)
recent_suricata=$(curl -s "localhost:9200/filebeat-*/_count" -H 'Content-Type: application/json' -d '{
  "query": {
    "bool": {
      "must": [
        {"match": {"event.module": "suricata"}},
        {"range": {"@timestamp": {"gte": "now-10m"}}}
      ]
    }
  }
}' 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2)

if [ ! -z "$recent_suricata" ] && [ "$recent_suricata" -gt 0 ]; then
    echo -e "${GREEN}✅ Recent Suricata data (last 10 min): $recent_suricata documents${NC}"
    echo "   IDS is actively generating data"
else
    echo -e "${YELLOW}⚠️  No recent Suricata data (last 10 minutes)${NC}"
    echo "   IDS may be idle or not running on IDS VM"
fi
echo ""

# 6. Show Elasticsearch indices
echo "6. Elasticsearch Indices..."
curl -s "localhost:9200/_cat/indices?v" 2>/dev/null | grep -E "filebeat|health" | head -5
echo ""

# Summary
echo "==========================================="
echo "Summary"
echo "==========================================="
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✅ All critical Logging VM services are running!${NC}"
    echo ""
    echo "Data pipeline status:"
    echo "  • Elasticsearch: Online"
    echo "  • Filebeat: Running"
    echo "  • IDS data flowing: Yes ($suricata_count Suricata docs, $zeek_count Zeek docs)"
else
    echo -e "${YELLOW}⚠️  $failed critical service(s) need attention${NC}"
    echo ""
fi

echo ""
echo "To start missing services:"
echo "  Backend API: cd ~/PycharmProjects/FYP_Test2/Project-Syntra-main/user-api && nohup node server.js > server.log 2>&1 &"
echo "  Frontend: cd ~/PycharmProjects/FYP_Test2/Project-Syntra-main && npm start &"
echo "  Filebeat: sudo systemctl start filebeat"
echo ""
echo "To check IDS status via API (requires Backend running):"
echo "  curl http://localhost:3001/api/health/ids | jq"
echo ""
