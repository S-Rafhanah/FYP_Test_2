# Distributed Architecture - IDS Platform

## Overview

Your IDS platform uses a **distributed architecture** with **two separate VMs**:

1. **IDS VM** - Network monitoring and detection
2. **Logging VM** - Data aggregation, analysis, and visualization

This is a **realistic enterprise setup** where IDS sensors are deployed separately from the centralized logging and analysis infrastructure.

---

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                         NETWORK                                │
│                   (192.168.56.0/24)                            │
└───────────────┬───────────────────────────┬───────────────────┘
                │                           │
                │                           │
        ┌───────▼────────┐         ┌────────▼────────┐
        │   IDS VM       │         │  Logging VM     │
        │                │         │                 │
        │  Services:     │         │  Services:      │
        │  • Suricata    │────────▶│  • Elasticsearch│
        │  • Zeek        │  Logs   │  • Filebeat     │
        │  • Filebeat    │         │  • Backend API  │
        │                │         │  • Frontend     │
        │  IP: ???       │         │  IP: ???        │
        └────────────────┘         └─────────────────┘
             (Sensor)                  (Aggregator)
```

---

## VM Roles & Services

### IDS VM (Sensor)

**Purpose**: Network traffic monitoring and intrusion detection

**Services Running**:
- ✅ **Suricata IDS** - Signature-based intrusion detection
- ✅ **Zeek Monitor** - Network protocol analysis
- ✅ **Filebeat** - Ships logs to Logging VM's Elasticsearch

**What it does**:
1. Captures network traffic
2. Analyzes packets with Suricata rules
3. Generates alerts in EVE.json format
4. Zeek creates connection logs (conn.log, dns.log, http.log, etc.)
5. Filebeat ships all logs to Elasticsearch on Logging VM

**Log locations**:
- `/var/log/suricata/eve.json`
- `/opt/zeek/logs/current/`

**Network**:
- Should be connected to monitored network
- Must be able to reach Logging VM's Elasticsearch (port 9200)

---

### Logging VM (Aggregator)

**Purpose**: Log aggregation, storage, analysis, and visualization

**Services Running**:
- ✅ **Elasticsearch** - Log storage and search engine (port 9200)
- ✅ **Filebeat** (optional) - Can also collect local logs
- ✅ **Backend API** - Node.js/Express REST API (port 3001)
- ✅ **Frontend** - React dashboard (port 3000)

**What it does**:
1. Receives logs from IDS VM via Filebeat → Elasticsearch
2. Indexes logs in filebeat-* indices
3. Backend API queries Elasticsearch for alerts/logs
4. Frontend displays data in web dashboard
5. Provides IDS health monitoring

**Data locations**:
- Elasticsearch indices: `/var/lib/elasticsearch/`
- Backend database: `~/Project-Syntra-main/user-api/users.db`

**Network**:
- Accepts Filebeat connections from IDS VM (port 9200)
- Serves dashboard to users (ports 3000, 3001)

---

## Data Flow

```
IDS VM                          Logging VM
────────────────────────        ────────────────────────
1. Network Traffic
   ↓
2. Suricata/Zeek
   ↓
3. Generate Logs
   (EVE.json, conn.log)
   ↓
4. Filebeat reads logs
   ↓
5. Ship to ES ─────────────────▶ 6. Elasticsearch
   (port 9200)                      receives & indexes
                                    ↓
                                 7. Backend API queries
                                    (port 3001)
                                    ↓
                                 8. Frontend displays
                                    (port 3000)
                                    ↓
                                 9. User views dashboard
```

---

## Why Services Show "Down" on Logging VM

When you run `check-services.sh` on the **Logging VM**, it shows:

```
❌ Suricata Service is NOT running
❌ Zeek Process is NOT running
```

**This is CORRECT!** Suricata and Zeek are **not supposed to run** on the Logging VM - they run on the IDS VM.

### What Each VM Should Show

**On IDS VM:**
```
✅ Suricata - Running
✅ Zeek - Running
✅ Filebeat - Running (shipping to Logging VM)
❌ Elasticsearch - Not running (it's on Logging VM)
❌ Backend API - Not running (it's on Logging VM)
❌ Frontend - Not running (it's on Logging VM)
```

**On Logging VM:**
```
✅ Elasticsearch - Running (receiving data from IDS VM)
✅ Backend API - Running
✅ Frontend - Running (optional)
❌ Suricata - Not running (it's on IDS VM)
❌ Zeek - Not running (it's on IDS VM)
```

---

## Why Elasticsearch Shows "Not Running" But Is Working

Your output shows:
```
❌ Elasticsearch Service is NOT running
✅ Elasticsearch is responding on port 9200
```

This happens when Elasticsearch is **not managed by systemd**, such as:

1. **Running in Docker container**
   ```bash
   docker ps | grep elasticsearch
   ```

2. **Started manually** (not as systemd service)
   ```bash
   /usr/share/elasticsearch/bin/elasticsearch &
   ```

3. **Running as different user/process**
   ```bash
   ps aux | grep elasticsearch
   ```

**Bottom line**: If it's responding on port 9200 and you have data in indices, it's working fine! The systemd status is irrelevant.

---

## How to Check Services Correctly

### On Logging VM

Use the new script:
```bash
cd ~/PycharmProjects/FYP_Test2
./check-logging-vm.sh
```

This checks:
- ✅ Elasticsearch responding (not systemd status)
- ✅ Backend API running
- ✅ Frontend running
- ✅ Data flowing from IDS VM
- ✅ Recent Suricata/Zeek data in Elasticsearch

### On IDS VM

```bash
# Check Suricata
sudo systemctl status suricata
sudo tail -f /var/log/suricata/eve.json

# Check Zeek
sudo systemctl status zeek
ls -lh /opt/zeek/logs/current/

# Check Filebeat (shipping to Logging VM)
sudo systemctl status filebeat
sudo journalctl -u filebeat -f
```

---

## Starting Services

### On Logging VM

```bash
cd ~/PycharmProjects/FYP_Test2
./start-logging-vm.sh
```

This will:
1. Check if Elasticsearch is responding (if not, try to start it)
2. Start Filebeat (if configured)
3. Start Backend API
4. Show instructions for starting Frontend

**Manual start**:
```bash
# Backend API
cd ~/PycharmProjects/FYP_Test2/Project-Syntra-main/user-api
nohup node server.js > server.log 2>&1 &

# Frontend
cd ~/PycharmProjects/FYP_Test2/Project-Syntra-main
npm start &
```

### On IDS VM

```bash
sudo systemctl start suricata
sudo systemctl start zeek
sudo systemctl start filebeat
```

---

## Attack Simulation

When simulating attacks from Kali Linux:

### Target the IDS VM (not Logging VM)

**Why?** The IDS VM has Suricata/Zeek monitoring network traffic. Attacking the Logging VM won't generate IDS alerts.

```bash
# From Kali Linux - Target IDS VM
nmap -sS <IDS_VM_IP>
nikto -h http://<IDS_VM_IP>
curl "http://<IDS_VM_IP>/?id=1' OR 1=1--"
```

### What Happens

1. **Attack targets IDS VM**
2. **Suricata/Zeek on IDS VM detect attack**
3. **Logs generated** (EVE.json, conn.log)
4. **Filebeat ships logs** to Elasticsearch on Logging VM
5. **Backend API** on Logging VM queries Elasticsearch
6. **Dashboard** on Logging VM displays alerts

---

## Network Configuration

### Filebeat Configuration on IDS VM

Filebeat on IDS VM must point to Logging VM's Elasticsearch:

```yaml
# /etc/filebeat/filebeat.yml on IDS VM
output.elasticsearch:
  hosts: ["<LOGGING_VM_IP>:9200"]
```

### Backend API Configuration on Logging VM

Backend must connect to local Elasticsearch:

```javascript
// server.js on Logging VM
const ELASTIC_URL = 'http://localhost:9200';
```

---

## Troubleshooting

### Issue: No alerts appearing in dashboard

**Check 1**: Is data flowing from IDS VM to Logging VM?

```bash
# On Logging VM
curl localhost:9200/filebeat-*/_count?q=event.module:suricata

# Should show count > 0
```

**If count is 0:**
- Check Filebeat on IDS VM: `sudo systemctl status filebeat`
- Check Filebeat config points to Logging VM
- Check network connectivity: `ping <LOGGING_VM_IP>`
- Check Elasticsearch port open: `telnet <LOGGING_VM_IP> 9200`

**Check 2**: Is Backend API running on Logging VM?

```bash
# On Logging VM
curl localhost:3001/api/health/ids
```

**If fails:**
- Start Backend: `./start-logging-vm.sh`
- Check logs: `~/Project-Syntra-main/user-api/server.log`

### Issue: Dashboard shows "Offline" for IDS

**Root cause**: Backend API queries Elasticsearch for recent Suricata/Zeek data (last 10 minutes).

**If shows "Offline":**
1. **Check if Suricata/Zeek are running on IDS VM**
   ```bash
   # On IDS VM
   sudo systemctl status suricata zeek
   ```

2. **Generate test traffic on IDS VM**
   ```bash
   # From Kali or IDS VM itself
   curl http://testmynids.org/uid/index.html
   ```

3. **Wait 1-2 minutes** for logs to flow through pipeline

4. **Refresh dashboard** - should show "Online"

---

## Advantages of Distributed Architecture

1. **Scalability**: Can add multiple IDS VMs feeding into one Logging VM
2. **Performance**: IDS and analysis workloads separated
3. **Security**: Logging VM can be in secure network segment
4. **Realistic**: Mirrors real-world enterprise deployments
5. **Flexibility**: Can deploy IDS VMs at different network points

---

## Summary

| Component | IDS VM | Logging VM | Purpose |
|-----------|--------|------------|---------|
| **Suricata** | ✅ Running | ❌ Not here | Intrusion detection |
| **Zeek** | ✅ Running | ❌ Not here | Network monitoring |
| **Filebeat** | ✅ Running | Optional | Log shipping |
| **Elasticsearch** | ❌ Not here | ✅ Running | Log storage |
| **Backend API** | ❌ Not here | ✅ Running | REST API |
| **Frontend** | ❌ Not here | ✅ Running | Dashboard |

**Key takeaway**:
- IDS VM = **Sensor** (generates data)
- Logging VM = **Aggregator** (stores and displays data)

This is a professional, enterprise-grade architecture! ✅

---

**Last Updated**: 2025-11-13
**Architecture**: Distributed Multi-VM Deployment
