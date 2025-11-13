#!/bin/bash
# start-logging-vm.sh - Start services on Logging VM
# This VM runs: Elasticsearch, Filebeat, Backend API, Frontend
# IDS services (Suricata/Zeek) run on separate IDS VM

echo "==========================================="
echo "Starting Logging VM Services"
echo "==========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Detect project path
PROJECT_PATH=""
if [ -d "/home/logging/PycharmProjects/FYP_Test2" ]; then
    PROJECT_PATH="/home/logging/PycharmProjects/FYP_Test2"
elif [ -d "/home/user/FYP_Test_2" ]; then
    PROJECT_PATH="/home/user/FYP_Test_2"
else
    echo -e "${RED}❌ Cannot find project directory!${NC}"
    echo "Searched:"
    echo "  /home/logging/PycharmProjects/FYP_Test2"
    echo "  /home/user/FYP_Test_2"
    exit 1
fi

echo "Using project path: $PROJECT_PATH"
echo ""

# 1. Check Elasticsearch
echo "1. Checking Elasticsearch..."
if curl -s http://localhost:9200 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Elasticsearch is already running${NC}"
else
    echo "Starting Elasticsearch..."

    # Try systemd first
    if systemctl list-unit-files | grep -q elasticsearch; then
        sudo systemctl start elasticsearch 2>/dev/null
        sleep 10

        if curl -s http://localhost:9200 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Elasticsearch started via systemd${NC}"
        else
            echo -e "${YELLOW}⚠️  Elasticsearch systemd start failed${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Elasticsearch not configured in systemd${NC}"
        echo "   If using Docker: sudo docker start elasticsearch"
        echo "   If manual install: sudo /usr/share/elasticsearch/bin/elasticsearch -d"
    fi
fi
echo ""

# 2. Check/Start Filebeat
echo "2. Checking Filebeat..."
if systemctl is-active --quiet filebeat 2>/dev/null; then
    echo -e "${GREEN}✅ Filebeat is already running${NC}"
elif pgrep -f filebeat > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Filebeat is running (not via systemd)${NC}"
else
    echo "Starting Filebeat..."
    sudo systemctl start filebeat 2>/dev/null
    sleep 2

    if systemctl is-active --quiet filebeat; then
        echo -e "${GREEN}✅ Filebeat started${NC}"
    else
        echo -e "${YELLOW}⚠️  Filebeat failed to start or not configured${NC}"
    fi
fi
echo ""

# 3. Start Backend API
echo "3. Starting Backend API..."
if pgrep -f "node.*server.js" > /dev/null; then
    echo -e "${GREEN}✅ Backend API is already running${NC}"
    echo "   PID: $(pgrep -f 'node.*server.js')"
else
    API_PATH="$PROJECT_PATH/Project-Syntra-main/user-api"

    if [ -f "$API_PATH/server.js" ]; then
        cd "$API_PATH"
        echo "   Starting from: $API_PATH"

        nohup node server.js > server.log 2>&1 &
        sleep 3

        if pgrep -f "node.*server.js" > /dev/null; then
            echo -e "${GREEN}✅ Backend API started${NC}"
            echo "   PID: $(pgrep -f 'node.*server.js')"
            echo "   Log: $API_PATH/server.log"

            # Test if responding
            sleep 2
            if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Backend API is responding on port 3001${NC}"
            else
                echo -e "${YELLOW}⚠️  Backend API started but not responding yet (wait 10s)${NC}"
            fi
        else
            echo -e "${RED}❌ Backend API failed to start${NC}"
            echo "   Check log: $API_PATH/server.log"
        fi
    else
        echo -e "${RED}❌ server.js not found at $API_PATH${NC}"
    fi
fi
echo ""

# 4. Frontend (optional - usually for development)
echo "4. Frontend (React)..."
if pgrep -f "react-scripts" > /dev/null; then
    echo -e "${GREEN}✅ Frontend dev server is already running${NC}"
else
    FRONTEND_PATH="$PROJECT_PATH/Project-Syntra-main"

    if [ -f "$FRONTEND_PATH/package.json" ]; then
        echo -e "${YELLOW}⚠️  Frontend is not running${NC}"
        echo "   To start frontend:"
        echo "   cd $FRONTEND_PATH"
        echo "   npm start"
        echo ""
        echo "   Or for production:"
        echo "   npm run build"
        echo "   serve -s build -l 3000"
    fi
fi
echo ""

# Wait for Elasticsearch to be fully ready
echo "5. Waiting for Elasticsearch to be ready..."
max_attempts=30
attempt=0

while ! curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo -e "${YELLOW}⚠️  Elasticsearch not responding after 30 seconds${NC}"
        break
    fi
    echo "   Waiting for Elasticsearch... ($attempt/$max_attempts)"
    sleep 1
done

if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Elasticsearch is ready${NC}"

    # Show cluster health
    health=$(curl -s http://localhost:9200/_cluster/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    echo "   Cluster health: $health"
fi
echo ""

# Summary
echo "==========================================="
echo "Service Status Summary"
echo "==========================================="
echo ""

# Re-check all services
es_status="❌ Offline"
if curl -s http://localhost:9200 > /dev/null 2>&1; then
    es_status="✅ Online"
fi

fb_status="❌ Not running"
if systemctl is-active --quiet filebeat 2>/dev/null || pgrep -f filebeat > /dev/null 2>&1; then
    fb_status="✅ Running"
fi

api_status="❌ Not running"
if pgrep -f "node.*server.js" > /dev/null; then
    api_status="✅ Running"
fi

frontend_status="⚠️  Not running (optional)"
if pgrep -f "react-scripts" > /dev/null; then
    frontend_status="✅ Running"
fi

echo -e "Elasticsearch:  $es_status"
echo -e "Filebeat:       $fb_status"
echo -e "Backend API:    $api_status"
echo -e "Frontend:       $frontend_status"
echo ""

# Data flow check
suricata_count=$(curl -s "localhost:9200/filebeat-*/_count?q=event.module:suricata" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2)
zeek_count=$(curl -s "localhost:9200/filebeat-*/_count?q=event.module:zeek" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2)

if [ ! -z "$suricata_count" ]; then
    echo "Data in Elasticsearch:"
    echo "  • Suricata documents: $suricata_count"
    echo "  • Zeek documents: $zeek_count"
fi
echo ""

echo "Next steps:"
echo "  1. Verify IDS status: curl http://localhost:3001/api/health/ids | jq"
echo "  2. Access dashboard: http://localhost:3000 (if frontend running)"
echo "  3. Check detailed status: ./check-logging-vm.sh"
echo ""
echo "Note: Suricata and Zeek run on the IDS VM, not this VM"
echo ""
