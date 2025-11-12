#!/bin/bash
# clear-ids-logs.sh - Clear all IDS logs for fresh demonstration
# WARNING: This will delete all existing Suricata and Zeek logs!

echo "==========================================="
echo "IDS Log Cleanup Tool"
echo "==========================================="
echo ""
echo "⚠️  WARNING: This will DELETE all IDS logs!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Starting log cleanup..."
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to clear logs safely
clear_logs() {
    local service=$1
    local log_path=$2
    local display_name=$3

    echo "Clearing $display_name logs..."

    if [ -d "$log_path" ]; then
        # Stop service first
        sudo systemctl stop "$service" 2>/dev/null
        echo "  Stopped $service"

        # Clear logs
        sudo rm -rf "$log_path"/*
        echo -e "${GREEN}  ✅ Cleared logs at $log_path${NC}"

        # Restart service
        sudo systemctl start "$service" 2>/dev/null
        sleep 2

        if systemctl is-active --quiet "$service"; then
            echo -e "${GREEN}  ✅ Restarted $service${NC}"
        else
            echo -e "${YELLOW}  ⚠ $service may not have restarted. Check manually.${NC}"
        fi
    elif [ -f "$log_path" ]; then
        # Single file (like eve.json)
        sudo systemctl stop "$service" 2>/dev/null
        echo "  Stopped $service"

        sudo rm -f "$log_path"
        sudo touch "$log_path"
        sudo chown suricata:suricata "$log_path" 2>/dev/null || true
        echo -e "${GREEN}  ✅ Cleared log file $log_path${NC}"

        sudo systemctl start "$service" 2>/dev/null
        sleep 2

        if systemctl is-active --quiet "$service"; then
            echo -e "${GREEN}  ✅ Restarted $service${NC}"
        else
            echo -e "${YELLOW}  ⚠ $service may not have restarted. Check manually.${NC}"
        fi
    else
        echo -e "${YELLOW}  ⚠ Log path not found: $log_path${NC}"
    fi

    echo ""
}

# 1. Clear Suricata logs
echo "1. Suricata IDS Logs"
clear_logs "suricata" "/var/log/suricata/eve.json" "Suricata EVE.json"

# Also clear other Suricata logs
if [ -d "/var/log/suricata" ]; then
    sudo rm -f /var/log/suricata/fast.log 2>/dev/null
    sudo rm -f /var/log/suricata/stats.log 2>/dev/null
    sudo rm -f /var/log/suricata/*.json.* 2>/dev/null
    echo -e "${GREEN}  ✅ Cleared additional Suricata log files${NC}"
fi
echo ""

# 2. Clear Zeek logs
echo "2. Zeek Network Monitor Logs"

# Common Zeek log locations
ZEEK_DIRS=(
    "/opt/zeek/logs/current"
    "/usr/local/zeek/logs/current"
    "/var/log/zeek/current"
)

zeek_found=false
for zeek_dir in "${ZEEK_DIRS[@]}"; do
    if [ -d "$zeek_dir" ]; then
        zeek_found=true

        # Stop Zeek
        sudo systemctl stop zeek 2>/dev/null || sudo /opt/zeek/bin/zeekctl stop 2>/dev/null || true
        echo "  Stopped Zeek"

        # Clear logs
        sudo rm -rf "$zeek_dir"/*
        echo -e "${GREEN}  ✅ Cleared Zeek logs at $zeek_dir${NC}"

        # Restart Zeek
        sudo systemctl start zeek 2>/dev/null || sudo /opt/zeek/bin/zeekctl start 2>/dev/null || true
        sleep 2
        echo -e "${GREEN}  ✅ Restarted Zeek${NC}"

        break
    fi
done

if [ "$zeek_found" = false ]; then
    echo -e "${YELLOW}  ⚠ Zeek log directory not found in common locations${NC}"
fi
echo ""

# 3. Clear Elasticsearch indices (optional but recommended)
echo "3. Elasticsearch Indices (Optional)"
read -p "Do you want to clear Elasticsearch indices? This removes all indexed IDS data. (yes/no): " clear_es

if [ "$clear_es" = "yes" ]; then
    echo "  Clearing Elasticsearch filebeat indices..."

    # Delete filebeat indices
    curl -X DELETE "localhost:9200/filebeat-*" 2>/dev/null
    curl -X DELETE "localhost:9200/.ds-filebeat-*" 2>/dev/null

    echo -e "${GREEN}  ✅ Cleared Elasticsearch indices${NC}"
else
    echo -e "${YELLOW}  ⚠ Skipped Elasticsearch cleanup. Old data will remain in indices.${NC}"
fi
echo ""

# 4. Clear Filebeat registry (helps ensure fresh data)
echo "4. Filebeat Registry"
if [ -d "/var/lib/filebeat" ]; then
    sudo systemctl stop filebeat 2>/dev/null
    sudo rm -rf /var/lib/filebeat/registry 2>/dev/null
    echo -e "${GREEN}  ✅ Cleared Filebeat registry${NC}"
    sudo systemctl start filebeat 2>/dev/null
    echo -e "${GREEN}  ✅ Restarted Filebeat${NC}"
else
    echo -e "${YELLOW}  ⚠ Filebeat registry not found${NC}"
fi
echo ""

# 5. Summary
echo "==========================================="
echo "Cleanup Summary"
echo "==========================================="
echo ""
echo "Logs cleared for:"
echo "  • Suricata IDS"
echo "  • Zeek Network Monitor"
if [ "$clear_es" = "yes" ]; then
    echo "  • Elasticsearch indices"
fi
echo "  • Filebeat registry"
echo ""
echo "Services restarted. Logs will start fresh."
echo ""
echo "Next steps:"
echo "  1. Wait 1-2 minutes for services to stabilize"
echo "  2. Run attack simulations to generate new logs"
echo "  3. Check dashboard for new alerts"
echo ""
echo "To simulate attacks, run:"
echo "  ./simulate-attacks.sh"
echo ""
