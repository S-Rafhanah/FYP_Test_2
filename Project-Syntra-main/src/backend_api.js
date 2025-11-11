// src/backend_api.js
const API = process.env.REACT_APP_API_URL;

function getAuthHeader() {
  const token = localStorage.getItem("accessToken"); // <- unified
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(email, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  // store handled by AuthContext.login(), see below
  return data; // { token, user }
}

export async function getUsers() {
  const res = await fetch(`${API}/api/users`, { headers: { ...getAuthHeader() } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getSuricataAlerts(limit = 20) {
  const res = await fetch(`${API}/api/suricata/alerts?limit=${limit}`, { headers: { ...getAuthHeader() } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getZeekLogs(limit = 20) {
  const res = await fetch(`${API}/api/zeek/logs?limit=${limit}`, { headers: { ...getAuthHeader() } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getZeekConnections(limit = 50, from = 0) {
  const res = await fetch(`${API}/api/zeek/connections?limit=${limit}&from=${from}`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getIDSRules() {
  const res = await fetch(`${API}/api/ids-rules`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getIDSRule(id) {
  const res = await fetch(`${API}/api/ids-rules/${id}`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createIDSRule(ruleData) {
  const res = await fetch(`${API}/api/ids-rules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(ruleData),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateIDSRule(id, ruleData) {
  const res = await fetch(`${API}/api/ids-rules/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(ruleData),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteIDSRule(id) {
  const res = await fetch(`${API}/api/ids-rules/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function searchIDSRules(query) {
  const res = await fetch(`${API}/api/ids-rules/search?q=${encodeURIComponent(query)}`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// System Health and Monitoring APIs
export async function getSystemHealth() {
  const res = await fetch(`${API}/api/health`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getIDSHealth() {
  const res = await fetch(`${API}/api/health/ids`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getSystemAlerts() {
  const res = await fetch(`${API}/api/system/alerts`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getRecentUsers(days = 1) {
  const res = await fetch(`${API}/api/users/recent?days=${days}`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Notification Management APIs
export async function getNotifications() {
  const res = await fetch(`${API}/api/notifications`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getNotification(id) {
  const res = await fetch(`${API}/api/notifications/${id}`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createNotification(notificationData) {
  const res = await fetch(`${API}/api/notifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(notificationData)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateNotification(id, notificationData) {
  const res = await fetch(`${API}/api/notifications/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(notificationData)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteNotification(id) {
  const res = await fetch(`${API}/api/notifications/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function toggleNotificationStatus(id) {
  const res = await fetch(`${API}/api/notifications/${id}/toggle`, {
    method: 'PATCH',
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function testNotification(id) {
  const res = await fetch(`${API}/api/notifications/${id}/test`, {
    method: 'POST',
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Alert Metadata Management APIs
export async function saveAlertMetadata(alertId, metadata) {
  const res = await fetch(`${API}/api/alerts/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({
      alert_id: alertId,
      ...metadata
    })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function saveAlertMetadataBulk(alertIds, metadata) {
  const res = await fetch(`${API}/api/alerts/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({
      alert_ids: alertIds,
      ...metadata
    })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getAlertMetadata(alertId) {
  const res = await fetch(`${API}/api/alerts/metadata/${alertId}`, {
    headers: { ...getAuthHeader() }
  });
  if (res.status === 404) {
    return null; // No metadata found
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function getAllAlertMetadata() {
  const res = await fetch(`${API}/api/alerts/metadata`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}