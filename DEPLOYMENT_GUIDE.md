# IDS Dashboard - Network Deployment Guide

## Overview
This Intrusion Detection System (IDS) is designed for **on-premise deployment**, demonstrating a traditional network security architecture where the IDS runs on a dedicated server/VM and is accessed by security analysts from their workstations on the same network.

## Network Architecture

```
┌─────────────────────────────────────────────────┐
│         Network: 192.168.56.x/24                │
│                                                 │
│  ┌──────────────┐         ┌─────────────────┐  │
│  │  IDS VM      │         │ Analyst Laptop  │  │
│  │ 192.168.56.128│◄────────┤ 192.168.56.x   │  │
│  │              │         │                 │  │
│  │ - Suricata   │         │ Web Browser:    │  │
│  │ - Zeek       │         │ http://192.168.│  │
│  │ - Dashboard  │         │    56.128:3000  │  │
│  │ - API :3001  │         └─────────────────┘  │
│  │ - Elasticsearch│                             │
│  └──────────────┘                               │
└─────────────────────────────────────────────────┘
```

## Configuration

### VM Configuration (192.168.56.128)

**Frontend (.env):**
- `REACT_APP_API_URL=http://192.168.56.128:3001`
- Uses VM's network IP so browsers from other machines can reach the API

**Backend (server.js):**
- `ELASTIC_URL=http://localhost:9200` - Elasticsearch only accessed locally
- Server listens on `0.0.0.0:3001` - Accepts connections from any network interface

### Why This Configuration?

1. **Frontend uses network IP (192.168.56.128)**
   - When assessors open the dashboard in their browser, JavaScript runs on THEIR laptop
   - The browser needs to know where to send API requests
   - Must use the VM's network IP, not localhost

2. **Backend Elasticsearch uses localhost**
   - Elasticsearch only needs to be accessed by the Node.js backend
   - Both run on the same VM, so localhost is sufficient and more secure
   - Prevents exposing Elasticsearch to the network

3. **Backend listens on 0.0.0.0**
   - Accepts connections from any network interface
   - Allows laptops on the network to reach the API

## Access Instructions for Assessors

### Prerequisites
- Ensure your laptop is connected to the 192.168.56.x network
- VM must be running and network accessible

### Accessing the Dashboard

1. **From your laptop's browser, navigate to:**
   ```
   http://192.168.56.128:3000
   ```

2. **Login with provided credentials**

3. **Navigate to IDS Dashboard (Platform Admin role)**
   - View Suricata IDS status
   - View Zeek Network Monitor status
   - Monitor real-time alerts

### Verifying Connectivity

Test if the VM is reachable:
```bash
# From your laptop
ping 192.168.56.128

# Test API endpoint
curl http://192.168.56.128:3001/api/health
```

## Setting Up on a Different VM

If deploying on a different VM with a different IP:

1. **Find your VM's IP address:**
   ```bash
   ip addr show | grep "192.168.56"
   # or
   hostname -I
   ```

2. **Update the configuration:**

   Edit `Project-Syntra-main/.env`:
   ```bash
   REACT_APP_API_URL=http://<YOUR_VM_IP>:3001
   ```

3. **Rebuild the frontend:**
   ```bash
   cd Project-Syntra-main
   npm run build
   ```

4. **Restart services:**
   ```bash
   # Restart backend
   cd user-api
   node server.js

   # Restart frontend (if using serve or similar)
   # Restart Suricata and Zeek if needed
   ```

## Troubleshooting

### Assessor sees "Suricata/Zeek not responding"

**Cause:** The frontend is trying to reach the wrong IP address

**Solution:**
1. Verify VM's IP matches the `.env` configuration
2. Ensure Elasticsearch is running on the VM: `curl localhost:9200`
3. Check if Suricata/Zeek are running and sending logs
4. Rebuild frontend after changing `.env`

### Cannot access from laptop

**Causes:**
- VM firewall blocking ports 3000/3001
- VM not on the correct network
- Incorrect IP address in browser

**Solutions:**
1. Check firewall: `sudo ufw status`
2. Open required ports: `sudo ufw allow 3000` and `sudo ufw allow 3001`
3. Verify network: `ip addr show`
4. Ping the VM from laptop: `ping 192.168.56.128`

## Security Considerations

This configuration is designed for:
- **Isolated assessment/demonstration network**
- **Trusted local network access**

For production deployment, consider:
- HTTPS/TLS encryption
- Network segmentation
- Firewall rules restricting access
- VPN access for remote analysts
- Authentication strengthening (MFA is already implemented)

## Technical Highlights for Assessment

This configuration demonstrates understanding of:

1. ✅ **Network Architecture** - Client-server model with proper IP addressing
2. ✅ **Service Binding** - Understanding when to use localhost vs 0.0.0.0 vs specific IPs
3. ✅ **Browser Security Model** - Why frontend needs network IP (same-origin policy)
4. ✅ **Defense in Depth** - Elasticsearch not exposed to network
5. ✅ **On-Premise vs Cloud** - Traditional server deployment model
6. ✅ **Network Accessibility** - Making services available on LAN

---

**Last Updated:** 2025-11-12
**VM IP:** 192.168.56.128
**Network:** 192.168.56.0/24
