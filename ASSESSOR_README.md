# IDS Assessment - Setup Instructions

## Overview
This VM contains a fully-functional Intrusion Detection System (IDS) with Suricata, Zeek, and a web-based dashboard for monitoring network security.

## Quick Start (For Assessors)

### Prerequisites
- VMware Workstation/Player or VirtualBox
- Network adapter configured for Host-Only (192.168.56.x network)
- Minimum 4GB RAM, 2 CPU cores recommended

### Method 1: Static IP (Already Configured) ✅

If this VM has been configured with static IP `192.168.56.128`:

1. **Import the VM** (.vmx or .ova file)
2. **Start the VM**
3. **Login to the VM console** (credentials provided separately)
4. **Start all services:**
   ```bash
   cd /home/user/FYP_Test_2
   sudo ./start-services.sh
   ```
   This will start Elasticsearch, Suricata, Zeek, Filebeat, and the Backend API.

5. **Access the dashboard from your laptop:**
   ```
   http://192.168.56.128:3000
   ```
6. **Login credentials:** (provided separately)
7. **Navigate to:** Platform Admin → IDS Dashboard

**Note:** If services were configured to auto-start (via `setup-autostart.sh`), step 4 may not be necessary.

---

### Method 2: Dynamic IP (If IP is Different)

If the VM uses DHCP or the IP address is different:

1. **Start the VM**

2. **Login to the VM console** (credentials provided separately)

3. **Check the VM's IP address:**
   ```bash
   ip addr show | grep "192.168.56"
   ```

4. **Run the automatic setup script:**
   ```bash
   cd /home/user/FYP_Test_2
   ./setup-network.sh
   ```

   This script will:
   - Detect the VM's current IP
   - Update the configuration automatically
   - Rebuild the frontend with the correct IP
   - Show you the URL to access

5. **Access the dashboard:**
   ```
   http://<VM_IP>:3000
   ```
   (The script will display the exact URL)

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│         Network: 192.168.56.x/24                │
│                                                 │
│  ┌──────────────────┐       ┌─────────────────┐│
│  │  IDS VM          │       │ Your Laptop     ││
│  │  192.168.56.128  │◄──────┤ 192.168.56.x    ││
│  │                  │       │                 ││
│  │  Services:       │       │ Browser:        ││
│  │  - Dashboard     │       │ http://192.168. ││
│  │    :3000 (React) │       │    56.128:3000  ││
│  │  - API :3001     │       └─────────────────┘│
│  │  - Elasticsearch │                           │
│  │    :9200         │                           │
│  │  - Suricata IDS  │                           │
│  │  - Zeek Monitor  │                           │
│  └──────────────────┘                           │
└─────────────────────────────────────────────────┘
```

## Features to Evaluate

### 1. **Multi-Role Access Control**
   - Platform Administrator (Full system access)
   - Security Analyst (IDS monitoring)
   - Network Administrator (Network management)

### 2. **IDS Dashboard (Platform Admin)**
   - Real-time Suricata IDS status
   - Real-time Zeek Network Monitor status
   - System health monitoring
   - Alert visualization

### 3. **Multi-Factor Authentication (MFA)**
   - TOTP-based 2FA
   - Backup codes for recovery
   - QR code enrollment

### 4. **Alert Management (Security Analyst)**
   - View Suricata alerts
   - View Zeek logs
   - Filter and search capabilities

### 5. **Network Monitoring**
   - Integration with Elasticsearch
   - Real-time log aggregation
   - Historical data analysis

## Testing the IDS

### Verify Services are Running

```bash
# Check if services are active
systemctl status suricata
systemctl status zeek

# Check API health
curl http://localhost:3001/api/health

# Check Elasticsearch
curl http://localhost:9200
```

### Generate Test Traffic

```bash
# Generate some network traffic to trigger alerts
curl http://testmynids.org/uid/index.html

# View logs
sudo tail -f /var/log/suricata/eve.json
```

### Access from Your Laptop

```bash
# Test connectivity
ping 192.168.56.128

# Test API
curl http://192.168.56.128:3001/api/health

# Test if IDS status endpoint works
curl http://192.168.56.128:3001/api/health/ids
```

## Troubleshooting

### Quick Diagnosis (Run This First!) 🔍

If anything isn't working, start here:

```bash
cd /home/user/FYP_Test_2
./check-services.sh
```

This script will:
- Check status of all services (Elasticsearch, Suricata, Zeek, Filebeat, Backend API)
- Show which services are running/stopped
- Provide specific recommendations
- Display recent error logs

**If services are not running, fix it with one command:**
```bash
sudo ./start-services.sh
```

This will start all required services and verify they're working.

---

### Cannot Access Dashboard from Laptop

**Symptom:** Browser shows "Cannot connect" or timeout

**Solutions:**

1. **Check VM firewall:**
   ```bash
   sudo ufw status
   sudo ufw allow 3000
   sudo ufw allow 3001
   ```

2. **Verify VM IP:**
   ```bash
   ip addr show | grep "192.168.56"
   ```

3. **Check if services are running:**
   ```bash
   # Backend API
   ps aux | grep "node server.js"

   # Frontend
   ps aux | grep "react-scripts"
   ```

4. **Ping test from laptop:**
   ```bash
   ping 192.168.56.128
   ```

### IDS Shows "Not Responding" ⚠️ **COMMON ISSUE**

**Symptom:** Dashboard shows "Suricata IDS is not responding" or "Zeek Network Monitor is not responding" or "Elasticsearch is offline"

**Root Cause:** Services don't automatically start after VM import.

**Quick Fix:**
```bash
cd /home/user/FYP_Test_2
sudo ./start-services.sh
```

This is the **most common issue** with imported VMs. The script will start:
- Elasticsearch (required for IDS status)
- Suricata IDS
- Zeek Network Monitor
- Filebeat (ships logs to Elasticsearch)
- Backend API

**After starting services:**
1. Wait 1-2 minutes for data to flow through the pipeline
2. Generate test traffic to create alerts: `curl http://testmynids.org/uid/index.html`
3. Refresh the dashboard - IDS status should now show "online"

**Manual service start (if needed):**
```bash
sudo systemctl start elasticsearch
sudo systemctl start suricata
sudo systemctl start zeek
sudo systemctl start filebeat
cd /home/user/FYP_Test_2/Project-Syntra-main/user-api && node server.js &
```

**To prevent this issue on future reboots:**
```bash
cd /home/user/FYP_Test_2
sudo ./setup-autostart.sh
```
This configures all services to start automatically on boot.

### Wrong IP Address in Configuration

**Symptom:** Frontend tries to connect to wrong IP

**Solution:** Run the setup script:
```bash
cd /home/user/FYP_Test_2
./setup-network.sh
```

## Technical Highlights

This project demonstrates:

### ✅ Network Security Concepts
- **On-Premise Deployment:** Traditional server-based architecture
- **Network Segmentation:** Isolated monitoring network
- **Defense in Depth:** Multiple layers of security

### ✅ System Administration
- **Service Management:** systemd configuration
- **Network Configuration:** Static vs DHCP, interface binding
- **Log Aggregation:** Centralized logging with Elasticsearch

### ✅ Software Architecture
- **Separation of Concerns:** Frontend (React) + Backend (Node.js) + Data (Elasticsearch)
- **API Design:** RESTful endpoints with proper authentication
- **Role-Based Access Control (RBAC):** Different permissions per role

### ✅ Security Best Practices
- **Authentication:** JWT tokens + MFA
- **Authorization:** Role-based permissions
- **Service Binding:** Elasticsearch on localhost (not exposed to network)
- **Least Privilege:** Backend accesses Elasticsearch, frontend does not

### ✅ DevOps & Deployment
- **Environment Configuration:** .env files for deployment flexibility
- **Build Process:** React production builds
- **Automation:** Setup scripts for easy deployment
- **Documentation:** Comprehensive deployment and troubleshooting guides

## Key Files & Locations

```
/home/user/FYP_Test_2/
├── Project-Syntra-main/
│   ├── .env                          # Frontend API configuration
│   ├── src/                          # React frontend source
│   ├── user-api/
│   │   └── server.js                 # Backend API (Port 3001)
│   └── package.json
├── setup-network.sh                  # Auto-configuration script
├── DEPLOYMENT_GUIDE.md               # Detailed deployment documentation
└── ASSESSOR_README.md                # This file

Configuration Files:
- Suricata: /etc/suricata/suricata.yaml
- Zeek: /opt/zeek/etc/
- Elasticsearch: /etc/elasticsearch/elasticsearch.yml
- Filebeat: /etc/filebeat/filebeat.yml
```

## Assessment Criteria Addressed

| Criterion | Implementation |
|-----------|----------------|
| **IDS Deployment** | Suricata + Zeek with centralized logging |
| **Network Architecture** | Host-only network, proper service binding |
| **Access Control** | RBAC with 3 roles, MFA support |
| **Monitoring Dashboard** | Real-time status, alerts, and logs |
| **System Integration** | Elasticsearch for log aggregation |
| **Security Hardening** | JWT auth, role enforcement, limited exposure |
| **Documentation** | Deployment guides, API documentation |
| **Ease of Use** | Web-based interface, automated setup |

## Contact

If you encounter any issues during assessment, please document:
1. The exact error message
2. Steps to reproduce
3. VM network configuration
4. Output of: `ip addr show`, `curl http://localhost:3001/api/health`

---

**VM Version:** 1.0
**Last Updated:** 2025-11-12
**Default Network:** 192.168.56.0/24
**Default VM IP:** 192.168.56.128 (if static IP configured)
