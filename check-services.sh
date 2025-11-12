#!/bin/bash
# check-services.sh - Diagnose IDS services status
# Run this script to check which services are running

echo "==========================================="
echo "IDS Services Health Check"
echo "==========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service status
check_service() {
    local service_name=$1
    local display_name=$2

    if systemctl is-active --quiet "$service_name"; then
        echo -e "${GREEN}✅ $display_name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $display_name is NOT running${NC}"
        return 1
    fi
}

# Function to check process
check_process() {
    local process_name=$1
    local display_name=$2

    if pgrep -f "$process_name" > /dev/null; then
        echo -e "${GREEN}✅ $display_name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $display_name is NOT running${NC}"
        return 1
    fi
}

# Function to check port
check_port() {
    local port=$1
    local service_name=$2

    if nc -z localhost "$port" 2>/dev/null || curl -s "http://localhost:$port" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name is responding on port $port${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is NOT responding on port $port${NC}"
        return 1
    fi
}

echo "1. Checking Elasticsearch..."
check_service elasticsearch "Elasticsearch Service"
check_port 9200 "Elasticsearch"
echo ""

echo "2. Checking Backend API..."
check_process "node.*server.js" "Backend API (Node.js)"
check_port 3001 "Backend API"
echo ""

echo "3. Checking Frontend..."
check_process "react-scripts" "Frontend (React)"
check_port 3000 "Frontend"
echo ""

echo "4. Checking Suricata IDS..."
check_service suricata "Suricata Service"
check_process suricata "Suricata Process"
echo ""

echo "5. Checking Zeek..."
check_service zeek "Zeek Service" 2>/dev/null || check_process zeek "Zeek Process"
echo ""

echo "6. Checking Filebeat..."
check_service filebeat "Filebeat Service"
echo ""

echo "==========================================="
echo "Detailed Status"
echo "==========================================="
echo ""

# Check if Elasticsearch has data
if curl -s http://localhost:9200/_cat/indices?v 2>/dev/null > /dev/null; then
    echo -e "${GREEN}Elasticsearch indices:${NC}"
    curl -s http://localhost:9200/_cat/indices?v 2>/dev/null | grep -E "filebeat|suricata|zeek" || echo "No IDS data indices found"
else
    echo -e "${RED}Cannot query Elasticsearch indices${NC}"
fi

echo ""
echo "==========================================="
echo "Recent Logs"
echo "==========================================="
echo ""

echo "Backend API errors (last 10 lines):"
if [ -f /home/user/FYP_Test_2/Project-Syntra-main/user-api/server.log ]; then
    tail -10 /home/user/FYP_Test_2/Project-Syntra-main/user-api/server.log
else
    echo "No log file found. Check if backend is running."
fi

echo ""
echo "==========================================="
echo "Recommendations"
echo "==========================================="
echo ""

# Count failed services
failed=0
systemctl is-active --quiet elasticsearch || ((failed++))
pgrep -f "node.*server.js" > /dev/null || ((failed++))
systemctl is-active --quiet suricata || ((failed++))

if [ $failed -gt 0 ]; then
    echo -e "${YELLOW}⚠ $failed critical services are not running${NC}"
    echo ""
    echo "To start all services, run:"
    echo "  sudo ./start-services.sh"
    echo ""
    echo "Or start services individually:"
    echo "  sudo systemctl start elasticsearch"
    echo "  sudo systemctl start suricata"
    echo "  sudo systemctl start zeek"
    echo "  sudo systemctl start filebeat"
    echo "  cd /home/user/FYP_Test_2/Project-Syntra-main/user-api && node server.js &"
else
    echo -e "${GREEN}✅ All critical services are running!${NC}"
fi

echo ""
