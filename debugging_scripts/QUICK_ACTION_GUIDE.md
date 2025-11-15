# Quick Action Guide - Fix Dashboard API Issue

## 🎯 The Problem

You've confirmed that:
- ✅ Elasticsearch has **4.2 million documents**
- ✅ Data is flowing from IDS-VM to Elasticsearch
- ✅ Dashboard frontend loads correctly
- ✅ Backend API is running on port 8001
- ❌ **But the dashboard shows NO alerts!**

**Conclusion:** The API is not correctly querying or returning the alert data.

---

## 🚀 What To Do NOW (On Logging VM)

### Step 1: Pull the Latest Code (30 seconds)

```bash
# On Logging VM
cd ~/FYP_Test_2
git pull origin claude/investigate-api-error-01J6GchXvThe46zpBTcunWKL
```

You'll get the new `debugging_scripts/` folder.

---

### Step 2: Run Backend Diagnostic (2 minutes)

```bash
cd ~/FYP_Test_2/debugging_scripts
bash diagnose_backend_api.sh
```

**This is THE MOST IMPORTANT step!** It will show you:
1. What backend you're using (Flask or Node.js)
2. If it's running
3. What API endpoints exist
4. Any errors in the logs
5. All available routes

**📋 PASTE THE OUTPUT HERE** so I can analyze it!

---

### Step 3: Check Frontend Config (1 minute)

```bash
bash check_frontend_api_config.sh
```

This shows what endpoints your React dashboard is trying to call.

**📋 PASTE THE OUTPUT HERE** so I can see if there's a mismatch!

---

### Step 4: Test Elasticsearch (1 minute)

```bash
bash test_elasticsearch_alerts_query.sh
```

This confirms the data structure in Elasticsearch.

---

## 🔍 What I'm Looking For

After you run the diagnostics, I need to know:

1. **Backend Type:** Flask (`app.py`) or Node.js (`server.js`)?
2. **Is it running?** Should show a process on port 8001
3. **What endpoints exist?** Should show routes like `/api/alerts`
4. **What's the error?** Check the logs section
5. **Does frontend match backend?** Frontend calls `/api/X`, backend provides `/api/X`?

---

## 🎯 Most Likely Issues

Based on the symptoms, the issue is probably ONE of these:

### Issue A: API Endpoint Mismatch
- Frontend: Calls `/api/security-analyst/alerts`
- Backend: Has route `/api/alerts`
- **Fix:** Update one to match the other

### Issue B: Wrong Elasticsearch Query
- API queries for field `event_type: "alert"`
- But data uses field `event.type: "alert"`
- **Fix:** Update field names in query

### Issue C: Backend Not Connecting to Elasticsearch
- Backend tries to connect to wrong host
- **Fix:** Check Elasticsearch connection in backend code

### Issue D: CORS Error
- API returns data but browser blocks it
- **Fix:** Enable CORS in backend

---

## 📊 While Scripts Are Running...

Open your browser and check the **Developer Tools**:

1. **Open Dashboard:** http://192.168.56.128:3000
2. **Press F12** to open DevTools
3. **Go to Console tab:**
   - Look for red error messages
   - Screenshot any errors

4. **Go to Network tab:**
   - Click "XHR" filter
   - Refresh the dashboard
   - Look for API calls (should be to `/api/...`)
   - Click on any **red/failed requests**
   - Check the **Response** tab
   - **Screenshot the failed request**

**📸 SEND ME THESE SCREENSHOTS!**

---

## ⏭️ Next Steps

Once you send me:
1. ✅ Output of `diagnose_backend_api.sh`
2. ✅ Output of `check_frontend_api_config.sh`
3. ✅ Screenshot of browser Console errors
4. ✅ Screenshot of browser Network failed requests

I will:
1. Identify the EXACT issue
2. Give you the EXACT fix (code changes)
3. Help you test and verify

---

## 🎓 For Your FYP

This debugging process is actually GREAT for your report! Shows:
- **Problem-solving skills:** Systematic debugging approach
- **Integration challenges:** API layer issues between services
- **Real-world experience:** Microservices debugging
- **Documentation:** You're documenting the entire process

Add a section: **"System Integration Challenges and Resolution"**

---

## 💡 Quick Win

While waiting for diagnostics, try this quick test:

```bash
# On Logging VM
# Test if backend can reach Elasticsearch
curl localhost:9200/_cluster/health?pretty

# Test if we can manually query alerts
curl "localhost:9200/filebeat-*/_search?size=3&pretty" | grep -A 5 "alert"

# Test if API endpoint responds
curl localhost:8001/api/alerts
```

If the last command returns data, your API works! If it returns 404 or error, that's the issue.

---

## 🚨 IMPORTANT

Run the scripts on **Logging VM**, not IDS-VM!

The directory is:
```
~/PycharmProjects/This-is-the-ConZee-Folder-For-Testing/user-api/
```

The scripts will automatically find your backend and frontend directories.

---

**Run the diagnostics now and send me the results! We're very close to fixing this!** 🎯
