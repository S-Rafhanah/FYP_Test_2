#!/bin/bash
# simulate-attacks.sh - Simulate various network attacks for IDS demonstration
# This generates legitimate test alerts for Suricata and Zeek

echo "==========================================="
echo "IDS Attack Simulation Tool"
echo "==========================================="
echo ""
echo "This script will generate test network traffic to trigger"
echo "IDS alerts. All attacks are simulated and harmless."
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run attack simulation
simulate_attack() {
    local name=$1
    local description=$2
    local command=$3

    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}Attack: $name${NC}"
    echo "Description: $description"
    echo ""
    echo "Executing..."

    eval "$command"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Simulation completed${NC}"
    else
        echo -e "${YELLOW}⚠️  Command may have failed, but this is normal for some tests${NC}"
    fi

    echo ""
    echo "Waiting 3 seconds before next test..."
    sleep 3
    echo ""
}

# 1. Test NIDS (Network IDS) Detection
simulate_attack \
    "NIDS Test Alert" \
    "Standard IDS test from testmynids.org" \
    "curl -m 10 http://testmynids.org/uid/index.html 2>/dev/null"

# 2. SQL Injection Pattern
simulate_attack \
    "SQL Injection Pattern" \
    "Simulates SQL injection in HTTP request" \
    "curl -m 10 'http://testmynids.org/uid/index.html?id=1%27%20OR%201=1--' 2>/dev/null"

# 3. XSS Pattern
simulate_attack \
    "XSS Pattern" \
    "Simulates Cross-Site Scripting pattern" \
    "curl -m 10 'http://testmynids.org/uid/index.html?search=<script>alert(1)</script>' 2>/dev/null"

# 4. User-Agent Scan Detection
simulate_attack \
    "Scanner User-Agent" \
    "Simulates security scanner user-agent" \
    "curl -m 10 -A 'Nikto/2.1.6' http://testmynids.org/uid/index.html 2>/dev/null"

# 5. Port Scan Simulation (if nmap is installed)
if command -v nmap &> /dev/null; then
    simulate_attack \
        "Port Scan Detection" \
        "Simulates network port scanning" \
        "sudo nmap -sS -p 80,443,22 localhost 2>/dev/null"
else
    echo -e "${YELLOW}⚠️  nmap not installed, skipping port scan simulation${NC}"
    echo ""
fi

# 6. Suspicious DNS Queries
simulate_attack \
    "Suspicious Domain Query" \
    "Queries known suspicious/malicious domains" \
    "nslookup malware.wicar.org 2>/dev/null || dig malware.wicar.org 2>/dev/null"

# 7. Multiple rapid connections (potential DoS pattern)
simulate_attack \
    "Multiple Rapid Connections" \
    "Creates multiple connections in quick succession" \
    "for i in {1..10}; do curl -m 2 http://testmynids.org/uid/index.html >/dev/null 2>&1 & done; wait"

# 8. ICMP Flood Pattern (small scale)
simulate_attack \
    "ICMP Pattern" \
    "Sends ICMP packets (ping flood pattern)" \
    "ping -c 50 -i 0.1 localhost >/dev/null 2>&1"

# 9. Suspicious HTTP Methods
simulate_attack \
    "Suspicious HTTP Method" \
    "Uses non-standard HTTP method" \
    "curl -m 10 -X TRACE http://testmynids.org/uid/index.html 2>/dev/null"

# 10. Download Malware Test File (EICAR)
simulate_attack \
    "Malware Download Test" \
    "Downloads EICAR test malware file (harmless)" \
    "curl -m 10 https://secure.eicar.org/eicar.com.txt 2>/dev/null"

# 11. SSH Brute Force Pattern
if command -v hydra &> /dev/null; then
    simulate_attack \
        "SSH Brute Force Pattern" \
        "Simulates SSH brute force attempts" \
        "hydra -l test -P /usr/share/wordlists/rockyou.txt.gz localhost ssh -t 4 -V -f 2>/dev/null | head -20"
else
    # Fallback: simple failed SSH attempts
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}Attack: SSH Failed Login Attempts${NC}"
    echo "Description: Simulates failed SSH login attempts"
    echo ""
    echo "Executing..."

    for i in {1..5}; do
        sshpass -p 'wrongpassword' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=2 fakeuser@localhost 2>/dev/null &
    done
    wait

    echo -e "${GREEN}✅ Simulation completed${NC}"
    echo ""
    sleep 3
fi

# 12. FTP Bounce Attack Pattern (if FTP server exists)
simulate_attack \
    "FTP Connection Pattern" \
    "Attempts FTP connection" \
    "nc -w 2 localhost 21 </dev/null 2>/dev/null || telnet localhost 21 2>/dev/null | timeout 2 cat"

# 13. Shellcode Pattern in HTTP
simulate_attack \
    "Shellcode Pattern" \
    "HTTP request with shellcode-like pattern" \
    "curl -m 10 'http://testmynids.org/uid/index.html?data=%90%90%90%90%90%90%90' 2>/dev/null"

# 14. Directory Traversal Pattern
simulate_attack \
    "Directory Traversal" \
    "Path traversal attack pattern" \
    "curl -m 10 'http://testmynids.org/uid/../../../etc/passwd' 2>/dev/null"

# 15. Command Injection Pattern
simulate_attack \
    "Command Injection Pattern" \
    "OS command injection in parameter" \
    "curl -m 10 'http://testmynids.org/uid/index.html?cmd=cat%20/etc/passwd' 2>/dev/null"

# Summary
echo "==========================================="
echo "Simulation Complete!"
echo "==========================================="
echo ""
echo "Generated test traffic for:"
echo "  ✅ NIDS detection"
echo "  ✅ SQL Injection patterns"
echo "  ✅ XSS patterns"
echo "  ✅ Scanner detection"
echo "  ✅ Port scanning (if nmap available)"
echo "  ✅ Suspicious DNS queries"
echo "  ✅ DoS patterns"
echo "  ✅ ICMP patterns"
echo "  ✅ HTTP method anomalies"
echo "  ✅ Malware download test"
echo "  ✅ SSH brute force patterns"
echo "  ✅ Shellcode patterns"
echo "  ✅ Directory traversal"
echo "  ✅ Command injection"
echo ""
echo "Next steps:"
echo "  1. Wait 1-2 minutes for logs to be processed"
echo "  2. Check Suricata logs: sudo tail -f /var/log/suricata/eve.json"
echo "  3. Check Elasticsearch: curl localhost:9200/filebeat-*/_search?size=10"
echo "  4. View alerts in dashboard: http://192.168.56.128:3000"
echo ""
echo "To check IDS status:"
echo "  curl http://localhost:3001/api/health/ids"
echo ""
echo "To view alerts via API:"
echo "  curl http://localhost:3001/api/suricata/alerts"
echo ""
