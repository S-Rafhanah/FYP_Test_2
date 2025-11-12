# Quick Fix for Your Teammate

## The Problem

Your teammate's VM shows:
- ❌ "Suricata IDS is not responding"
- ❌ "Zeek Network Monitor is not responding"
- ❌ Possibly "Elasticsearch is offline"

## Why It Happened

When you export and import a VM, **services don't automatically start**. The VM has all the software and configuration, but the services (Elasticsearch, Suricata, Zeek, etc.) need to be started manually after import.

On your machine, these services are already running from when you set them up. On your teammate's machine, they're installed but stopped.

## The Fix (Send This to Your Teammate)

### One-Command Fix

Tell your teammate to do this:

```bash
cd /home/user/FYP_Test_2
sudo ./start-services.sh
```

This script will:
1. Start Elasticsearch
2. Start Suricata IDS
3. Start Zeek Network Monitor
4. Start Filebeat (ships logs to Elasticsearch)
5. Start the Backend API
6. Verify everything is running
7. Show the URL to access the dashboard

**Wait 1-2 minutes after running the script**, then refresh the dashboard. The IDS status should now show "online" with green indicators.

### Checking What's Wrong

Before starting services, your teammate can diagnose the problem:

```bash
cd /home/user/FYP_Test_2
./check-services.sh
```

This will show exactly which services are stopped and which are running.

### Permanent Fix (Optional but Recommended)

To make services start automatically on every boot/reboot:

```bash
cd /home/user/FYP_Test_2
sudo ./setup-autostart.sh
```

This configures systemd to automatically start all IDS services when the VM boots.

## What You Should Do Before Exporting the VM

Before creating the VM file to send to assessors, run this on YOUR machine:

```bash
cd /home/user/FYP_Test_2
sudo ./setup-autostart.sh
```

This will ensure that when assessors import the VM and start it, all services will automatically start. They won't need to run any commands!

## Testing After Fix

After your teammate runs `start-services.sh`, they should:

1. **Check Elasticsearch:**
   ```bash
   curl http://localhost:9200
   ```
   Should return JSON with Elasticsearch info

2. **Check API Health:**
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should show `"elasticsearch": "online"`

3. **Check IDS Health:**
   ```bash
   curl http://localhost:3001/api/health/ids
   ```
   Should show `"suricata": "online"` and `"zeek": "online"` (or "stale" if no recent data)

4. **Access Dashboard from their laptop:**
   ```
   http://192.168.56.128:3000
   ```
   Navigate to Platform Admin → IDS Dashboard
   Should see green indicators for Suricata and Zeek

## If It Still Doesn't Work

Run the diagnostic script and send you the output:

```bash
cd /home/user/FYP_Test_2
./check-services.sh > diagnostic.txt
cat diagnostic.txt
```

Common issues:
- Elasticsearch takes 15-30 seconds to start (be patient)
- May need to generate test traffic: `curl http://testmynids.org/uid/index.html`
- Firewall might be blocking ports: `sudo ufw allow 3000 && sudo ufw allow 3001`

## Summary

| Issue | Solution |
|-------|----------|
| Services not running after VM import | `sudo ./start-services.sh` |
| Want to diagnose the problem | `./check-services.sh` |
| Want auto-start on boot | `sudo ./setup-autostart.sh` |
| IDS shows "not responding" | Start services, wait 2 minutes, refresh dashboard |
| Need to verify everything works | Run the test commands above |

---

**Quick reminder:** The issue is NOT with your configuration or code - it's simply that services need to be started after importing a VM. This is normal behavior for all VMs.
