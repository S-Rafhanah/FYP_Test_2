# Malicious IP Attack Simulator

This tool simulates attacks from **real malicious IPs** reported on AbuseIPDB, making your IDS demo incredibly realistic!

## Features

✅ Fetches real malicious IPs from AbuseIPDB (90+ confidence score)
✅ Shows IPs from different countries (China, Russia, USA, Brazil, etc.)
✅ Safe, controlled packet rates (won't crash your server)
✅ Multiple attack types: Port Scan, Web Attack, DDoS
✅ Your IDS will show alerts from verified malicious sources

---

## Setup Instructions

### 1. Install Dependencies

```bash
# On Kali Linux
sudo apt update
sudo apt install python3 python3-pip python3-scapy hping3

# Install Python packages
pip3 install requests
```

### 2. Add Your AbuseIPDB API Key

Edit the config file:
```bash
nano malicious_ip_config.json
```

Replace `"YOUR_API_KEY_HERE"` with your actual AbuseIPDB API key.

**Get your API key**: https://www.abuseipdb.com/account/api

### 3. Configure Target

In `malicious_ip_config.json`, set:
- `target_ip`: Your IDS monitored server IP
- `target_ports`: Ports to scan/attack
- `total_packets`: Number of packets (default: 50)
- `packets_per_second`: Rate limit (default: 5)

---

## Usage

### Option 1: Scapy Version (Recommended)

```bash
# Make executable
chmod +x malicious_ip_simulator_scapy.py

# Run with root privileges
sudo ./malicious_ip_simulator_scapy.py
```

**Attack Types Available:**
1. **Port Scan** - Scans multiple ports from malicious IPs
2. **Web Attack** - Simulates SQL injection, XSS attempts
3. **DDoS Simulation** - Mixed SYN/HTTP/ICMP packets
4. **Full Demo** - All attacks sequentially

### Option 2: hping3 Version

```bash
# Edit the script to add your API key
nano malicious_ip_attack_simulator.py

# Set ABUSEIPDB_API_KEY = "your_key_here"

# Run
chmod +x malicious_ip_attack_simulator.py
sudo ./malicious_ip_attack_simulator.py
```

---

## Example Output

```
======================================================================
  MALICIOUS IP ATTACK SIMULATOR (Scapy Edition)
  Powered by AbuseIPDB + Scapy
======================================================================

[*] Querying AbuseIPDB for malicious IPs (confidence >= 90)...
[+] Successfully fetched 20 malicious IPs

======================================================================
  MALICIOUS IP SUMMARY
======================================================================

[CN] - 5 IPs
  ├─ 218.92.0.112     Score: 100/100 | Data Center/Web Hosting
  ├─ 122.51.152.89    Score: 98/100  | ISP
  └─ ... and 3 more

[RU] - 4 IPs
  ├─ 185.220.101.45   Score: 100/100 | Data Center/Web Hosting
  ├─ 195.123.245.78   Score: 97/100  | ISP
  └─ ... and 2 more

[US] - 3 IPs
  ├─ 45.146.164.110   Score: 99/100  | Data Center/Web Hosting
  └─ ... and 2 more

======================================================================

[?] Select attack type:
  1. Port Scan (scans multiple ports from malicious IPs)
  2. Web Attack (simulates SQL injection, XSS attempts)
  3. DDoS Simulation (mixed SYN/HTTP/ICMP flood)
  4. All of the above (full demo)
  0. Exit

[?] Enter choice (1-4): 3

[!] WARNING: You are about to simulate an attack on 192.168.56.128
[!] Packets will be sent from 20 real malicious IPs
[?] Continue? (yes/no): yes

[*] Simulating DDoS attack...
[*] Target: 192.168.56.128:80
[*] Total packets: 50
[*] Rate: 5 packets/second
[*] Duration: ~10.0 seconds

[1/50] SYN from 218.92.0.112 (CN) Score:100 ✓
[2/50] HTTP from 122.51.152.89 (CN) Score:98 ✓
[3/50] ICMP from 185.220.101.45 (RU) Score:100 ✓
...

======================================================================
  ATTACK SIMULATION COMPLETE
======================================================================
[+] Duration: 10.23 seconds
[+] Source IPs used: 20
[+] Check your IDS dashboard now!
[+] You should see alerts from known malicious IPs worldwide
======================================================================
```

---

## What Your IDS Will Show

After running the simulator, your IDS dashboard will display:

✅ Alerts from **real malicious IPs** (verified by AbuseIPDB)
✅ Multiple countries represented (China, Russia, USA, Brazil, etc.)
✅ High abuse confidence scores (90-100)
✅ Various attack patterns (port scans, web attacks, DDoS)
✅ Realistic threat intelligence data

---

## Demo Workflow

### Step 1: Clear Old Logs
```
Login to web UI → Alerts Management → Click red trash icon
```

### Step 2: Run Attack Simulation
```bash
sudo ./malicious_ip_simulator_scapy.py
# Select option 4 (Full Demo)
```

### Step 3: Monitor IDS Dashboard
```
Wait 30-60 seconds for log aggregation
Refresh Alerts Management page
See alerts from malicious IPs worldwide! 🌍
```

### Step 4: Demonstrate Features
- Show source IPs match AbuseIPDB records
- Display country distribution
- Show abuse confidence scores
- Classify alerts (True Positive - known malicious)
- Add tags: "AbuseIPDB", "Known Malicious", "Global Threat"
- Archive alerts after review

---

## Safety Notes

✅ **Safe Parameters Used:**
- Rate limited to 5 packets/second
- Total packets limited to 50-100
- Uses packet spoofing (not real connections)
- Won't overwhelm your server

⚠️ **Best Practices:**
- Only use on networks you own/have permission
- Run in isolated lab environment
- Monitor server resources during test
- Document all tests performed

---

## Troubleshooting

### "Permission denied" error
→ Run with sudo: `sudo ./malicious_ip_simulator_scapy.py`

### "Scapy not found"
→ Install: `sudo apt install python3-scapy`

### "API key invalid"
→ Check your key at https://www.abuseipdb.com/account/api
→ Make sure you copied it correctly in config file

### "No malicious IPs fetched"
→ Check internet connectivity
→ Verify API key is correct
→ Check AbuseIPDB API quota (free tier: 1000 requests/day)

### IDS not showing alerts
→ Wait 1-2 minutes for log aggregation
→ Check Elasticsearch is receiving logs
→ Verify Suricata/Zeek is monitoring the correct interface

---

## API Rate Limits

**AbuseIPDB Free Tier:**
- 1,000 requests per day
- Each script run uses 1-2 API requests
- You can run ~500 demos per day

**Pro Tier:**
- 10,000 requests per day
- Additional features (geolocation, reports, etc.)

---

## Credits

- **AbuseIPDB**: IP reputation database (https://www.abuseipdb.com)
- **Scapy**: Packet manipulation library
- **hping3**: Network tool for packet crafting

---

## Support

Having issues? Check:
1. Your API key is set correctly
2. You're running as root (sudo)
3. Target IP is reachable
4. Firewall allows traffic
5. IDS is monitoring correct network interface

**Need help?** Open an issue on the project repository.

---

## License

Educational and demonstration purposes only. Use responsibly.
