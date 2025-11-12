#!/bin/bash
# start-services.sh - Start all IDS services
# Run this script after importing the VM or after a reboot

set -e

echo "==========================================="
echo "Starting IDS Services"
echo "==========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to start service and verify
start_service() {
    local service_name=$1
    local display_name=$2
    local wait_time=${3:-5}

    echo "Starting $display_name..."

    if systemctl is-active --quiet "$service_name"; then
        echo -e "${GREEN}✅ $display_name is already running${NC}"
    else
        sudo systemctl start "$service_name"
        sleep "$wait_time"

        if systemctl is-active --quiet "$service_name"; then
            echo -e "${GREEN}✅ $display_name started successfully${NC}"
            sudo systemctl enable "$service_name" > /dev/null 2>&1 || true
        else
            echo -e "${YELLOW}⚠ $display_name failed to start. Check logs: sudo journalctl -u $service_name${NC}"
        fi
    fi
    echo ""
}

echo "1. Starting Elasticsearch..."
start_service elasticsearch "Elasticsearch" 15

echo "2. Starting Suricata IDS..."
start_service suricata "Suricata IDS" 5

echo "3. Starting Zeek Network Monitor..."
# Try systemd service first, if not available, start manually
if systemctl list-unit-files | grep -q "^zeek.service"; then
    start_service zeek "Zeek" 5
else
    echo "Zeek systemd service not found, trying manual start..."
    if [ -f /opt/zeek/bin/zeekctl ]; then
        sudo /opt/zeek/bin/zeekctl start
        echo -e "${GREEN}✅ Zeek started via zeekctl${NC}"
    else
        echo -e "${YELLOW}⚠ Zeek binary not found at /opt/zeek/bin/zeekctl${NC}"
    fi
fi
echo ""

echo "4. Starting Filebeat..."
start_service filebeat "Filebeat" 3

echo "5. Starting Backend API..."
if pgrep -f "node.*server.js" > /dev/null; then
    echo -e "${GREEN}✅ Backend API is already running${NC}"
else
    cd /home/user/FYP_Test_2/Project-Syntra-main/user-api

    # Start in background with output to log file
    nohup node server.js > server.log 2>&1 &

    sleep 3

    if pgrep -f "node.*server.js" > /dev/null; then
        echo -e "${GREEN}✅ Backend API started successfully${NC}"
        echo "   Log file: /home/user/FYP_Test_2/Project-Syntra-main/user-api/server.log"
    else
        echo -e "${YELLOW}⚠ Backend API failed to start. Check log: /home/user/FYP_Test_2/Project-Syntra-main/user-api/server.log${NC}"
    fi
fi
echo ""

echo "6. Waiting for Elasticsearch to be ready..."
max_attempts=30
attempt=0
while ! curl -s http://localhost:9200 > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo -e "${YELLOW}⚠ Elasticsearch not responding after 30 seconds${NC}"
        echo "   Check status: sudo systemctl status elasticsearch"
        echo "   Check logs: sudo journalctl -u elasticsearch"
        break
    fi
    echo "Waiting for Elasticsearch... ($attempt/$max_attempts)"
    sleep 1
done

if curl -s http://localhost:9200 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Elasticsearch is responding${NC}"
fi
echo ""

echo "==========================================="
echo "Service Status Summary"
echo "==========================================="
echo ""

# Wait a moment for services to fully initialize
sleep 2

# Run the check script if it exists
if [ -f /home/user/FYP_Test_2/check-services.sh ]; then
    /home/user/FYP_Test_2/check-services.sh
else
    echo "Elasticsearch: $(systemctl is-active elasticsearch)"
    echo "Suricata: $(systemctl is-active suricata)"
    echo "Filebeat: $(systemctl is-active filebeat)"
    echo "Backend API: $(pgrep -f 'node.*server.js' > /dev/null && echo 'running' || echo 'not running')"
fi

echo ""
echo "==========================================="
echo "Access Information"
echo "==========================================="
echo ""

# Get VM IP
VM_IP=$(ip addr show | grep -oP '192\.168\.56\.\d+' | head -1)
if [ -z "$VM_IP" ]; then
    VM_IP="localhost"
fi

echo "Dashboard URL: http://$VM_IP:3000"
echo "API Health Check: curl http://$VM_IP:3001/api/health"
echo "IDS Status Check: curl http://$VM_IP:3001/api/health/ids"
echo "Elasticsearch: curl http://localhost:9200"
echo ""

echo -e "${GREEN}✅ Service startup complete!${NC}"
echo ""
echo "Note: It may take 1-2 minutes for IDS data to appear in the dashboard."
echo "      Generate test traffic: curl http://testmynids.org/uid/index.html"
echo ""
