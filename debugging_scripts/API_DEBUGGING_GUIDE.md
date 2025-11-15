# API Debugging Guide - Dashboard Not Showing Alerts

## Problem Summary
- ✅ Elasticsearch has 4.2 million documents
- ✅ Data is flowing from IDS-VM to Elasticsearch
- ✅ Dashboard frontend (React) is running on port 3000
- ✅ Backend API is running on port 8001
- ❌ **Dashboard shows no alerts**

**Root Cause:** The API is not correctly querying or returning alert data from Elasticsearch.

---

## 🔍 Diagnostic Steps

### Step 1: Run Backend Diagnostic

```bash
# On Logging VM
cd ~
bash diagnose_backend_api.sh
```

**This will:**
- Identify if you're using Flask or Node.js
- Check if backend is running
- Test all API endpoints
- Show backend logs
- List all available routes

**Look for:**
- ✓ Backend process running
- ✓ Port 8001 listening
- ✓ API endpoints returning data (not 404)
- ✗ Any errors in logs

---

### Step 2: Check Frontend API Configuration

```bash
# On Logging VM
bash check_frontend_api_config.sh
```

**This will:**
- Find API endpoint URLs in React code
- Show which endpoints the dashboard is calling
- Check environment variables

**Look for:**
- What URL is the frontend calling? (e.g., `http://localhost:8001/api/alerts`)
- Does this match what the backend provides?

---

### Step 3: Test Elasticsearch Queries

```bash
# On Logging VM
bash test_elasticsearch_alerts_query.sh
```

**This will:**
- Query Elasticsearch directly for alerts
- Show sample alert data structure
- Verify alerts exist in the database

**Expected:**
- Should see alert objects with timestamps, IPs, signatures
- Count should be > 0

---

## 🔧 Common Issues & Fixes

### Issue 1: API Endpoint Mismatch

**Symptoms:**
- Frontend calls `/api/alerts`
- Backend has route `/alerts` or `/api/security-analyst/alerts`

**Fix:**
```bash
# Check what the backend actually provides
cd ~/PycharmProjects/This-is-the-ConZee-Folder-For-Testing/user-api/backend

# For Flask
grep "@app.route\|@bp.route" *.py

# For Node.js
grep "app.get\|router.get" *.js | grep alert
```

Update either the frontend to call the correct endpoint, or add the missing route to the backend.

---

### Issue 2: API Not Querying Elasticsearch Correctly

**Symptoms:**
- API endpoint exists
- Returns empty array or error
- Elasticsearch has data

**Fix:**

Check the API code for how it queries Elasticsearch. It should look something like:

**Flask Example:**
```python
from elasticsearch import Elasticsearch

es = Elasticsearch(['http://localhost:9200'])

@app.route('/api/alerts')
def get_alerts():
    result = es.search(
        index='filebeat-*',
        body={
            'size': 100,
            'sort': [{'timestamp': {'order': 'desc'}}],
            'query': {
                'match': {'event_type': 'alert'}
            }
        }
    )
    return jsonify(result['hits']['hits'])
```

**Node.js/Express Example:**
```javascript
const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'http://localhost:9200' });

app.get('/api/alerts', async (req, res) => {
  const result = await client.search({
    index: 'filebeat-*',
    body: {
      size: 100,
      sort: [{ timestamp: { order: 'desc' } }],
      query: {
        match: { event_type: 'alert' }
      }
    }
  });
  res.json(result.hits.hits);
});
```

---

### Issue 3: CORS Issues

**Symptoms:**
- Browser console shows CORS errors
- API works with `curl` but not from browser

**Fix:**

**Flask:**
```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
```

**Node.js/Express:**
```javascript
const cors = require('cors');
app.use(cors());
```

---

### Issue 4: Authentication Required

**Symptoms:**
- API returns 401 Unauthorized
- Need to be logged in to see data

**Fix:**
- Make sure you're logged in to the dashboard
- Check if frontend is sending authentication token
- Check browser DevTools → Network tab for failed requests

---

### Issue 5: Wrong Elasticsearch Field Names

**Symptoms:**
- Query returns 0 results
- But data exists in Elasticsearch

**Fix:**

Check the actual field names in your data:

```bash
# See what fields exist
curl "localhost:9200/filebeat-*/_search?size=1&pretty"
```

Common field variations:
- `timestamp` vs `@timestamp`
- `event_type` vs `event.type`
- `src_ip` vs `source.ip`
- `dest_ip` vs `destination.ip`
- `alert.signature` vs `alert.name`

Update your API query to use the correct field names!

---

## 🧪 Manual API Testing

### Test 1: Can Backend Connect to Elasticsearch?

```bash
# On Logging VM
curl localhost:9200/_cluster/health?pretty
```

Expected: Should show cluster status

---

### Test 2: Can Backend Query Alerts?

```bash
# On Logging VM
curl "localhost:9200/filebeat-*/_search?size=5&pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {"event_type": "alert"}
  }
}
'
```

Expected: Should return alert documents

---

### Test 3: Does API Endpoint Return Data?

```bash
# Test different endpoint variations
curl localhost:8001/api/alerts
curl localhost:8001/api/alerts?limit=10
curl localhost:8001/api/security-analyst/alerts
curl localhost:8001/alerts
```

Expected: Should return JSON array of alerts

---

## 🎯 Quick Fix Checklist

- [ ] Run `diagnose_backend_api.sh` - Identify backend type
- [ ] Check backend is running on port 8001
- [ ] Check backend logs for errors
- [ ] Run `check_frontend_api_config.sh` - Find what endpoints frontend calls
- [ ] Run `test_elasticsearch_alerts_query.sh` - Verify data exists
- [ ] Test API endpoint with `curl`
- [ ] Check browser DevTools → Console for errors
- [ ] Check browser DevTools → Network for failed requests
- [ ] Verify API uses correct Elasticsearch field names
- [ ] Restart backend if needed

---

## 📊 Browser DevTools Debugging

1. **Open Dashboard:** http://192.168.56.128:3000
2. **Login** as Security Analyst
3. **Press F12** to open DevTools
4. **Go to Console tab:**
   - Look for red error messages
   - Look for "Failed to fetch" or "Network error"
5. **Go to Network tab:**
   - Click "XHR" filter
   - Refresh the dashboard
   - Look for requests to `/api/alerts` or similar
   - Click on failed requests (red)
   - Check Response tab for error message

---

## 🚀 Next Steps After Finding Issue

Once you identify the specific problem:

1. **If API endpoint doesn't exist:**
   - Add the missing route to backend

2. **If API query is wrong:**
   - Fix the Elasticsearch query to use correct fields

3. **If frontend is calling wrong endpoint:**
   - Update frontend API calls

4. **Restart services:**
   ```bash
   cd ~/PycharmProjects/This-is-the-ConZee-Folder-For-Testing/user-api
   # Restart backend
   cd backend
   pkill -f "python\|node"
   # Start backend (Flask)
   nohup python3 app.py > /tmp/backend.log 2>&1 &
   # OR (Node.js)
   nohup node server.js > /tmp/backend.log 2>&1 &
   ```

5. **Test again!**

---

## 📝 For Your FYP Report

Document this debugging process:

### Section: "System Integration Challenges"

**Challenge:** Dashboard not displaying alerts despite successful data collection

**Investigation:**
- Verified 4.2M+ security events in Elasticsearch
- Confirmed data pipeline (Suricata → Filebeat → Elasticsearch) operational
- Isolated issue to API layer between frontend and Elasticsearch

**Resolution:**
- Identified [specific issue found]
- Implemented [specific fix]
- Result: Dashboard successfully displays real-time and historical alerts

**Learning:** Integration between microservices requires careful verification of each component and interface compatibility.

---

## 💡 Pro Tip

The fastest way to debug is:

1. **Check browser Console** (F12) - Shows frontend errors
2. **Check browser Network** tab - Shows failed API calls
3. **Check backend logs** - Shows backend errors
4. **Test with curl** - Eliminates browser issues

Work backwards from the dashboard to find where the data flow breaks!

---

Good luck! 🎯
