# IDS Attack Simulation Guide

## Overview
This guide explains how to clear existing IDS logs and simulate various network attacks to demonstrate your IDS platform's detection capabilities during assessment.

---

## Quick Start (For Assessment Demo)

### Complete Demo Preparation (3-Step Process)

```bash
# Step 1: Clear all old logs (fresh start)
cd /home/user/FYP_Test_2
sudo ./clear-ids-logs.sh

# Step 2: Wait for services to stabilize
sleep 60

# Step 3: Simulate attacks to generate new alerts
./simulate-attacks.sh
```

**Timeline**: 5-10 minutes total
- Log clearing: ~30 seconds
- Service stabilization: ~1 minute
- Attack simulation: ~3-5 minutes
- Log processing & indexing: ~2 minutes

After completion, your dashboard will show fresh, clean alerts from the simulated attacks.

---

## Detailed Instructions

### 1. Clear IDS Logs

**Purpose**: Remove all old logs for a clean demonstration

**Script**: `clear-ids-logs.sh`

**What it clears**:
- ✅ Suricata EVE.json logs
- ✅ Suricata fast.log and stats.log
- ✅ Zeek connection logs (conn.log, dns.log, http.log, etc.)
- ✅ Elasticsearch filebeat indices (optional)
- ✅ Filebeat registry (ensures fresh data ingestion)

**Usage**:
```bash
cd /home/user/FYP_Test_2
sudo ./clear-ids-logs.sh
```

**Interactive Prompts**:
1. **Confirm deletion**: Type `yes` to proceed
2. **Clear Elasticsearch**: Type `yes` to also clear indexed data (recommended)

**What happens**:
```
1. Stops Suricata
2. Deletes /var/log/suricata/eve.json and related files
3. Restarts Suricata

4. Stops Zeek
5. Deletes /opt/zeek/logs/current/* (or similar)
6. Restarts Zeek

7. (Optional) Deletes Elasticsearch filebeat-* indices
8. Clears Filebeat registry
9. Restarts Filebeat
```

**Verification**:
```bash
# Check Suricata log is empty/new
sudo tail /var/log/suricata/eve.json
# Should show empty or minimal output

# Check Zeek logs are fresh
ls -lh /opt/zeek/logs/current/
# Should show recent timestamps

# Check Elasticsearch indices
curl localhost:9200/_cat/indices?v
# filebeat indices should be empty or missing
```

---

### 2. Simulate Attacks

**Purpose**: Generate diverse network traffic to trigger IDS alerts

**Script**: `simulate-attacks.sh`

**Attack Types Simulated**:

| # | Attack Type | Detection Target | Expected Alert |
|---|-------------|------------------|----------------|
| 1 | NIDS Test | Standard IDS test | ET CURRENT_EVENTS GPL ATTACK_RESPONSE id check returned root |
| 2 | SQL Injection | Web application attack | ET WEB_SPECIFIC_APPS SQL Injection Attempt |
| 3 | XSS (Cross-Site Scripting) | Web application attack | ET WEB_CLIENT Possible XSS Attempt |
| 4 | Scanner User-Agent | Security scanner detection | ET SCAN Nikto Scanner Detected |
| 5 | Port Scan | Network reconnaissance | ET SCAN Possible Port Scan |
| 6 | Suspicious DNS | Malicious domain query | ET DNS Query to Known Malware Domain |
| 7 | Connection Flood | DoS pattern | ET DOS Multiple Rapid Connections |
| 8 | ICMP Flood | DoS pattern | ET DOS ICMP Flood |
| 9 | HTTP Method Anomaly | Protocol violation | ET POLICY Unusual HTTP Method |
| 10 | Malware Download | EICAR test file | ET MALWARE EICAR Test File Download |
| 11 | SSH Brute Force | Authentication attack | ET SCAN SSH Brute Force |
| 12 | FTP Connection | Service probe | ET INFO FTP Connection Attempt |
| 13 | Shellcode Pattern | Exploit attempt | ET SHELLCODE Common Shellcode Pattern |
| 14 | Directory Traversal | Path traversal | ET WEB_SERVER Directory Traversal Attempt |
| 15 | Command Injection | OS command injection | ET WEB_SERVER Command Injection Attempt |

**Usage**:
```bash
cd /home/user/FYP_Test_2
./simulate-attacks.sh
```

**No interaction required** - script runs all simulations automatically.

**Duration**: ~3-5 minutes (15 attacks with 3-second delays)

**What happens**:
```
For each attack:
1. Displays attack name and description
2. Executes the attack simulation command
3. Shows success/failure status
4. Waits 3 seconds
5. Moves to next attack
```

**Sample Output**:
```
═══════════════════════════════════════
Attack: SQL Injection Pattern
Description: Simulates SQL injection in HTTP request

Executing...
✅ Simulation completed

Waiting 3 seconds before next test...
```

---

### 3. Verify Detection

**After running simulations, verify alerts are being generated:**

#### A. Check Suricata Raw Logs
```bash
# View EVE.json log (real-time)
sudo tail -f /var/log/suricata/eve.json | grep alert

# Count recent alerts
sudo grep '"event_type":"alert"' /var/log/suricata/eve.json | wc -l
```

**Expected**: Should see JSON entries with `"event_type":"alert"`

#### B. Check Zeek Logs
```bash
# View connection logs
sudo cat /opt/zeek/logs/current/conn.log | tail -20

# View HTTP logs
sudo cat /opt/zeek/logs/current/http.log | tail -20

# View DNS logs
sudo cat /opt/zeek/logs/current/dns.log | tail -20
```

**Expected**: Should see recent connections with timestamps from the last few minutes

#### C. Check Elasticsearch Indexing
```bash
# Check if indices exist
curl localhost:9200/_cat/indices?v | grep filebeat

# Search for Suricata alerts
curl localhost:9200/filebeat-*/_search?q=event.module:suricata | jq '.hits.total'

# Search for Zeek logs
curl localhost:9200/filebeat-*/_search?q=event.module:zeek | jq '.hits.total'
```

**Expected**:
- `filebeat-*` indices should exist
- Suricata hits: 10-20+ (depending on attack success)
- Zeek hits: 50-100+ (Zeek logs all connections)

#### D. Check Backend API
```bash
# Check IDS health status
curl http://localhost:3001/api/health/ids | jq

# Expected output:
# {
#   "suricata": "online",
#   "zeek": "online",
#   "lastCheck": "2025-11-12T..."
# }

# Get Suricata alerts via API
curl http://localhost:3001/api/suricata/alerts?limit=10 | jq

# Get Zeek logs via API
curl http://localhost:3001/api/zeek/logs?limit=10 | jq
```

**Expected**: JSON responses with alert/log data

#### E. Check Dashboard (Visual Verification)

1. **Open browser**: `http://192.168.56.128:3000`

2. **Login** with Platform Admin or Security Analyst account

3. **Navigate to IDS Dashboard**:
   - Platform Admin → IDS Dashboard
   - Security Analyst → Alert Monitor

4. **Expected to see**:
   - 🟢 Suricata IDS: **Online** (green badge)
   - 🟢 Zeek Network Monitor: **Online** (green badge)
   - Alert table with 10-20+ recent alerts
   - Alert severity breakdown (High, Medium, Low)
   - Timeline chart showing alert distribution

---

## Troubleshooting

### Issue: No alerts appearing after simulation

**Possible causes**:

1. **Services not running**
   ```bash
   ./check-services.sh
   # Fix with:
   sudo ./start-services.sh
   ```

2. **Filebeat not shipping logs**
   ```bash
   sudo systemctl status filebeat
   sudo journalctl -u filebeat -f
   # Restart if needed:
   sudo systemctl restart filebeat
   ```

3. **Elasticsearch indexing delay**
   ```bash
   # Wait 1-2 minutes, then check again
   sleep 120
   curl localhost:9200/filebeat-*/_search?size=1
   ```

4. **Suricata not detecting (rules outdated)**
   ```bash
   # Update Suricata rules
   sudo suricata-update
   sudo systemctl restart suricata
   ```

### Issue: Dashboard shows "offline" or "stale"

**Root cause**: IDS status check looks for data within last 10 minutes

**Solution**:
```bash
# Ensure services are running
sudo systemctl start suricata zeek

# Generate fresh traffic
./simulate-attacks.sh

# Wait for indexing
sleep 120

# Refresh dashboard
# Should now show "online"
```

### Issue: Some attack simulations fail

**This is normal!** Some simulations may fail due to:
- Missing dependencies (nmap, hydra, etc.)
- Network restrictions
- Target websites being down (testmynids.org)

**Important**: Even if some fail, others will succeed and generate alerts.

**Fix for missing dependencies**:
```bash
# Install optional tools for more attack types
sudo apt-get install -y nmap hydra sshpass netcat

# Re-run simulation
./simulate-attacks.sh
```

---

## Advanced Usage

### Custom Attack Simulation

Create your own attack patterns:

```bash
# SQL injection against your own server
curl 'http://localhost:3001/api/users?id=1%27%20OR%201=1--'

# XSS attempt
curl 'http://localhost:3001/search?q=<script>alert(1)</script>'

# Port scan
nmap -sS -p 1-1000 localhost

# Directory traversal
curl 'http://localhost:3001/../../../../etc/passwd'
```

### Generate High Volume of Alerts

```bash
# Run simulation multiple times
for i in {1..5}; do
    ./simulate-attacks.sh
    sleep 30
done
```

### Continuous Background Traffic

```bash
# Generate ongoing traffic for live demo
while true; do
    curl http://testmynids.org/uid/index.html >/dev/null 2>&1
    sleep 10
done &

# Kill when done:
pkill -f "testmynids"
```

---

## Assessment Demo Workflow

### Before Assessors Arrive

```bash
# 1. Ensure all services are running
cd /home/user/FYP_Test_2
sudo ./start-services.sh

# 2. Clear old logs for fresh demo
sudo ./clear-ids-logs.sh
# Answer 'yes' to both prompts

# 3. Wait for services to stabilize
sleep 60

# 4. Verify services are healthy
./check-services.sh

# 5. Pre-generate some alerts (optional)
./simulate-attacks.sh

# 6. Verify dashboard shows data
curl http://localhost:3001/api/health/ids
# Should show "online" for both Suricata and Zeek
```

### During Assessment Demo

**Scenario 1: Show Real-Time Detection**

```bash
# Open dashboard in browser first
# Then run simulation while assessors watch dashboard

./simulate-attacks.sh

# Refresh dashboard after 1-2 minutes
# Assessors will see new alerts appearing
```

**Scenario 2: Explain Alert Details**

```bash
# Pick a specific alert from dashboard
# Show raw log:
sudo tail -100 /var/log/suricata/eve.json | grep "SQL Injection"

# Show Elasticsearch query:
curl localhost:9200/filebeat-*/_search?q=suricata.eve.alert.signature:*SQL*

# Show API response:
curl http://localhost:3001/api/suricata/alerts | jq '.alerts[] | select(.signature | contains("SQL"))'
```

**Scenario 3: Live Attack Demonstration**

```bash
# Run individual attack and show immediate detection

# 1. Show dashboard (no recent alerts)

# 2. Run SQL injection:
curl 'http://testmynids.org/uid/index.html?id=1%27%20OR%201=1--'

# 3. Wait 30 seconds

# 4. Refresh dashboard - SQL injection alert appears!

# 5. Explain:
#    - Attack source (your IP)
#    - Attack type (SQL Injection)
#    - Severity (High)
#    - Signature matched
#    - Recommended action
```

---

## What Each Alert Shows You

When you view alerts in the dashboard, you'll see:

| Field | Description | Example |
|-------|-------------|---------|
| **Timestamp** | When attack occurred | 2025-11-12 10:30:45 |
| **Signature** | IDS rule that matched | ET WEB SQL Injection Attempt |
| **Severity** | Alert priority (1-3) | 1 (High) |
| **Source IP** | Attacker's IP address | 192.168.56.128 |
| **Source Port** | Attacker's port | 54321 |
| **Destination IP** | Target IP | 93.184.216.34 |
| **Destination Port** | Target service | 80 (HTTP) |
| **Protocol** | Network protocol | TCP |
| **Category** | Attack category | Web Application Attack |

---

## Safety & Ethics

### ✅ Safe to Use

All simulations in `simulate-attacks.sh` are:
- **Harmless**: No actual damage or exploitation
- **Test targets**: Use dedicated test sites (testmynids.org, eicar.org)
- **Localhost**: Many tests target only your own VM
- **Educational**: Industry-standard IDS testing patterns

### ⚠️ Important Notes

1. **Only run on your own VM** - Do not run against external targets
2. **Testmynids.org** is specifically designed for IDS testing
3. **EICAR test file** is harmless (antivirus test standard)
4. **Port scans of localhost** are safe on your own VM

### ❌ Do Not

- Run against production networks
- Run against targets you don't own
- Use for actual penetration testing without authorization
- Run continuously (can generate excessive logs)

---

## Performance Considerations

### Log File Growth

After simulations, log files will grow:

| Component | Typical Size | Location |
|-----------|--------------|----------|
| Suricata EVE.json | 10-50 KB per simulation | /var/log/suricata/eve.json |
| Zeek logs | 50-200 KB per simulation | /opt/zeek/logs/current/ |
| Elasticsearch index | 100-500 KB per simulation | /var/lib/elasticsearch/ |

**Management**:
```bash
# Check log sizes
du -sh /var/log/suricata/
du -sh /opt/zeek/logs/

# Clear if needed
sudo ./clear-ids-logs.sh
```

### System Resources

During simulation:
- **CPU**: 10-30% usage (mostly Suricata/Zeek processing)
- **Memory**: +100-200 MB (Elasticsearch indexing)
- **Disk I/O**: Moderate (log writing)

**Recovery**: Resources return to normal 1-2 minutes after simulation completes.

---

## Summary

### Commands Cheat Sheet

```bash
# Full demo preparation (3 commands)
sudo ./clear-ids-logs.sh        # Clear old logs
sleep 60                         # Wait for services
./simulate-attacks.sh            # Generate attacks

# Verification
./check-services.sh              # Check all services
curl localhost:3001/api/health/ids  # Check IDS status
sudo tail -f /var/log/suricata/eve.json  # Watch real-time alerts

# Dashboard access
http://192.168.56.128:3000       # Open in browser
```

### Expected Results

After running the full demo preparation:

✅ **15+ attack types** simulated
✅ **10-20+ Suricata alerts** generated
✅ **50-100+ Zeek logs** created
✅ **All data indexed** in Elasticsearch
✅ **Dashboard shows "Online"** for both IDS systems
✅ **Alerts visible** in Security Analyst view
✅ **Real-time monitoring** operational

---

**Last Updated**: 2025-11-12
**Scripts**: clear-ids-logs.sh, simulate-attacks.sh
**Location**: /home/user/FYP_Test_2/
