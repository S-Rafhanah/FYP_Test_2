# API Debugging Scripts

## Quick Start

If your dashboard isn't showing alerts even though data is flowing into Elasticsearch, follow these steps:

### 1. Run Backend Diagnostic (Most Important!)

```bash
cd ~/debugging_scripts
bash diagnose_backend_api.sh
```

This will tell you:
- ✓ What backend you're using (Flask or Node.js)
- ✓ If the backend is running
- ✓ What API endpoints exist
- ✓ If there are any errors

### 2. Check Frontend Configuration

```bash
bash check_frontend_api_config.sh
```

This shows what API endpoints your React dashboard is trying to call.

### 3. Test Elasticsearch Directly

```bash
bash test_elasticsearch_alerts_query.sh
```

This verifies that alerts exist in Elasticsearch and are queryable.

---

## Complete Guide

See [API_DEBUGGING_GUIDE.md](./API_DEBUGGING_GUIDE.md) for:
- Common issues and fixes
- Manual testing procedures
- Code examples
- Browser DevTools debugging tips

---

## Expected Outcome

After running all three scripts, you should know:

1. **Is the backend running?**
   - If NO → Start it
   - If YES → Continue to #2

2. **What API endpoints exist?**
   - Compare with what the frontend is calling
   - If mismatch → Fix the endpoint path

3. **Does data exist in Elasticsearch?**
   - If NO → Fix IDS → Filebeat pipeline
   - If YES → API is not querying correctly

4. **What's the specific error?**
   - Check backend logs
   - Check browser Console (F12)
   - Fix the specific issue

---

## Quick Command Reference

```bash
# Run all diagnostics at once
bash diagnose_backend_api.sh > backend_diag.txt
bash check_frontend_api_config.sh > frontend_diag.txt
bash test_elasticsearch_alerts_query.sh > es_diag.txt

# Then review the output files
cat backend_diag.txt
cat frontend_diag.txt
cat es_diag.txt
```

---

## Need Help?

Refer to the main [API_DEBUGGING_GUIDE.md](./API_DEBUGGING_GUIDE.md) for detailed troubleshooting steps.
