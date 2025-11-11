// server.js - Backend API using sqlite3 (ESM) + RBAC (JWT) + Elasticsearch
// Run with: node server.js
// Requires: npm i @elastic/elasticsearch jsonwebtoken bcrypt sqlite3 express body-parser
// NOTE: This file assumes "type": "module" in package.json (ESM imports).

import express from 'express';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

// Added JSON Web Token and Elasticsearch client
import jwt from 'jsonwebtoken';
import { Client as ESClient } from '@elastic/elasticsearch';

const SALT_ROUNDS = 10;

// Allow overrides via environment variables
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'syntra-secret-key'; // change in prod!
const ELASTIC_URL = process.env.ELASTIC_URL || 'http://192.168.56.128:9200';

// Create Elasticsearch client (used by /api/suricata/alerts and /api/zeek/logs)
const es = new ESClient({ node: ELASTIC_URL });

// --- Role normalizer (unchanged) ---
const normalizeRole = (r = '') => {
  const map = {
    'Platform Admin': 'Platform Administrator',
    'platform admin': 'Platform Administrator',
    'Network Admin': 'Network Administrator',
    'network admin': 'Network Administrator',
  };
  return map[r] || r; // Security Analyst and canonical names pass through
};

const app = express();
app.use(bodyParser.json());

// CORS (unchanged but expanded headers include Authorization for JWT)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Tiny health endpoints
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'user-api' }));
app.get('/api/health/es', async (req, res) => {
  try {
    const info = await es.info();
    res.json({ ok: true, cluster: info.cluster_name || 'elasticsearch', node: ELASTIC_URL });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), node: ELASTIC_URL });
  }
});

// Get dirname in ES module mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create / open database (users.db sits beside this server.js)
const db = new sqlite3.Database(path.join(__dirname, 'users.db'), (err) => {
  if (err) console.error('Error opening database:', err.message);
  else console.log('✅ Connected to SQLite database');
});

// Users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    joined_at TEXT NOT NULL,
    last_active TEXT
  )
`);

// Normalize legacy short roles to canonical names
db.serialize(() => {
  db.run(`UPDATE users SET role = 'Platform Administrator' WHERE role IN ('Platform Admin','platform admin')`);
  db.run(`UPDATE users SET role = 'Network Administrator'  WHERE role IN ('Network Admin','network admin')`);
});

// Profile types table
db.run(`
  CREATE TABLE IF NOT EXISTS profile_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL
  )
`);

// IDS Rules table
db.run(`
  CREATE TABLE IF NOT EXISTS ids_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL,
    rule_sid TEXT UNIQUE,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    rule_content TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_by INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`, (err) => {
  if (err) console.error('Error creating ids_rules table:', err);
  else console.log('✅ IDS Rules table ready');
});

// IDS Sources table
db.run(`
  CREATE TABLE IF NOT EXISTS ids_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    last_connection TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
  )
`, (err) => {
  if (err) console.error('Error creating ids_sources table:', err);
  else console.log('✅ IDS Sources table ready');
});

// Notifications table
db.run(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_name TEXT NOT NULL,
    trigger_condition TEXT NOT NULL,
    severity_filter TEXT,
    delivery_method TEXT NOT NULL,
    recipients TEXT NOT NULL,
    message_template TEXT,
    status TEXT NOT NULL DEFAULT 'Enabled',
    created_at TEXT NOT NULL,
    updated_at TEXT
  )
`, (err) => {
  if (err) console.error('Error creating notifications table:', err);
  else console.log('✅ Notifications table ready');
});

// Dashboard Layouts table
db.run(`
  CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    layout_config TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id)
  )
`, (err) => {
  if (err) console.error('Error creating dashboard_layouts table:', err);
  else console.log('✅ Dashboard Layouts table ready');
});

// Alert Metadata table - For storing analyst annotations on IDS alerts
db.run(`
  CREATE TABLE IF NOT EXISTS alert_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id TEXT UNIQUE NOT NULL,
    classification TEXT,
    status TEXT,
    severity INTEGER,
    triage_level TEXT,
    tags TEXT,
    notes TEXT,
    archived BOOLEAN DEFAULT 0,
    archive_reason TEXT,
    updated_by TEXT,
    updated_at TEXT NOT NULL
  )
`, (err) => {
  if (err) console.error('Error creating alert_metadata table:', err);
  else console.log('✅ Alert Metadata table ready');
});

// JWT-based RBAC middleware
function authorize(roles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Missing Authorization header' });
    try {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
      }
      req.user = decoded; // { id, role, name, email, iat, exp }
      next();
    } catch (err) {
      console.error('[authorize] Invalid token:', err);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

// =========================================================
// USER MANAGEMENT ROUTES
// =========================================================

// POST /api/users - Create user
app.post('/api/users', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date().toISOString();
    const roleNorm = normalizeRole(role);

    const query = `INSERT INTO users (name, email, password_hash, role, status, joined_at, last_active)
                   VALUES (?, ?, ?, ?, 'Active', ?, ?)`;

    db.run(query, [name.trim(), String(email).toLowerCase().trim(), hashedPassword, roleNorm, now, now], function (err) {
      if (err) {
        if (String(err.message).includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Email already exists' });
        }
        console.error('[POST /api/users] DB error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.status(201).json({
        id: this.lastID,
        name: name.trim(),
        email: String(email).toLowerCase().trim(),
        role: roleNorm,
        status: 'Active',
        joined_at: now,
      });
    });
  } catch (err) {
    console.error('[POST /api/users] bcrypt error:', err);
    res.status(500).json({ error: 'Password hashing failed' });
  }
});

// GET /api/users - List users
app.get('/api/users', (req, res) => {
  db.all(
    `SELECT id, name, email, role, status, joined_at, last_active FROM users ORDER BY id DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('[GET /api/users] DB error:', err);
        return res.status(500).json({ error: err.message });
      }
      const normalized = rows.map((r) => ({ ...r, role: normalizeRole(r.role) }));
      res.json(normalized);
    }
  );
});

// GET /api/users/:id
app.get('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  db.get(
    `SELECT id, name, email, role, status, joined_at, last_active FROM users WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        console.error('[GET /api/users/:id] DB error:', err);
        return res.status(500).json({ error: err.message });
      }
      if (!row) return res.status(404).json({ error: 'User not found.' });
      return res.json({ ...row, role: normalizeRole(row.role) });
    }
  );
});

// POST /api/auth/login - authenticate (email + password) + issue JWT
app.post('/api/auth/login', (req, res) => {
  const { email, password, expectedRole } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const sql = `SELECT id, name, email, role, status, joined_at, last_active, password_hash
               FROM users WHERE email = ? LIMIT 1`;
  db.get(sql, [String(email).toLowerCase().trim()], async (err, row) => {
    if (err) {
      console.error('[POST /api/auth/login] DB error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
    if (!row) return res.status(401).json({ error: 'Invalid email or password.' });

    try {
      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

      const storedRole = normalizeRole(row.role);
      const desiredRole = expectedRole ? normalizeRole(expectedRole) : null;
      if (desiredRole && desiredRole !== storedRole) {
        return res.status(403).json({ error: 'Role mismatch for this account.' });
      }

      // Sign a real JWT with the user's role
      const token = jwt.sign(
        { id: row.id, role: storedRole, name: row.name, email: row.email },
        JWT_SECRET,
        { expiresIn: '2h' }
      );

      return res.json({
        token,
        user: {
          id: row.id,
          name: row.name,
          email: row.email,
          role: storedRole,
          status: row.status,
          joined_at: row.joined_at,
          last_active: row.last_active,
        },
      });
    } catch (e) {
      console.error('[POST /api/auth/login] bcrypt compare error:', e);
      return res.status(500).json({ error: 'Authentication failed.' });
    }
  });
});

// PUT /api/users/:id - update name, email, role; optional password
app.put('/api/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, role, password } = req.body || {};

  if (!id || !name || !email || !role) {
    return res.status(400).json({ error: 'id, name, email, and role are required.' });
  }

  const emailNorm = String(email).toLowerCase().trim();
  const nameTrim = String(name).trim();
  const roleNorm = normalizeRole(role);

  // Validate email format
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm);
  if (!emailOk) return res.status(400).json({ error: 'Invalid email format.' });

  const getUserById = () =>
    new Promise((resolve, reject) => {
      db.get(`SELECT id FROM users WHERE id = ?`, [id], (err, row) => (err ? reject(err) : resolve(row)));
    });

  const emailTakenByAnother = () =>
    new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1`,
        [emailNorm, id],
        (err, row) => (err ? reject(err) : resolve(!!row))
      );
    });

  const runUpdate = (sql, params) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });

  try {
    const exists = await getUserById();
    if (!exists) return res.status(404).json({ error: 'User not found.' });

    const taken = await emailTakenByAnother();
    if (taken) return res.status(409).json({ error: 'Email already in use by another account.' });

    let sql, params;
    if (password && String(password).length > 0) {
      if (String(password).length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      }
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      sql = `UPDATE users SET name = ?, email = ?, role = ?, password_hash = ? WHERE id = ?`;
      params = [nameTrim, emailNorm, roleNorm, hash, id];
    } else {
      sql = `UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?`;
      params = [nameTrim, emailNorm, roleNorm, id];
    }

    await runUpdate(sql, params);

    db.get(
      `SELECT id, name, email, role, status, joined_at, last_active FROM users WHERE id = ?`,
      [id],
      (err, row) => {
        if (err) {
          console.error('[PUT /api/users/:id] select-after-update error:', err);
          return res.status(500).json({ error: 'Internal server error.' });
        }
        return res.json({ ...row, role: normalizeRole(row.role) });
      }
    );
  } catch (e) {
    console.error('[PUT /api/users/:id] error:', e);
    if (e && e.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Email already in use by another account.' });
    }
    if (String(e.message || '').includes('no such column: password_hash')) {
      return res.status(500).json({
        error: "Database schema missing 'password_hash' column. Add it or remove password update.",
      });
    }
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/users/:id
app.delete('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Valid id is required.' });

  db.run(`DELETE FROM users WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found.' });
    return res.json({ success: true });
  });
});

// =========================================================
// PROFILE TYPES ROUTES
// =========================================================

app.get('/api/profile-types', (req, res) => {
  db.all(`SELECT id, name, status, created_at FROM profile_types ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows);
  });
});

app.post('/api/profile-types', (req, res) => {
  const { name, status } = req.body || {};
  if (!name || !status) return res.status(400).json({ error: 'name and status are required.' });
  const now = new Date().toISOString();
  const sql = `INSERT INTO profile_types (name, status, created_at) VALUES (?, ?, ?)`;
  db.run(sql, [String(name).trim(), String(status).trim(), now], function (err) {
    if (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Profile type already exists.' });
      }
      return res.status(500).json({ error: err.message });
    }
    return res.status(201).json({ id: this.lastID, name: String(name).trim(), status, created_at: now });
  });
});

app.put('/api/profile-types/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, status } = req.body || {};
  if (!id || !name || !status) return res.status(400).json({ error: 'id, name and status are required.' });

  const sql = `UPDATE profile_types SET name = ?, status = ? WHERE id = ?`;
  db.run(sql, [String(name).trim(), String(status).trim(), id], function (err) {
    if (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Profile type already exists.' });
      }
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) return res.status(404).json({ error: 'Profile type not found.' });
    db.get(`SELECT id, name, status, created_at FROM profile_types WHERE id = ?`, [id], (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });
      return res.json(row);
    });
  });
});

app.delete('/api/profile-types/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Valid id is required.' });

  db.run(`DELETE FROM profile_types WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Profile type not found.' });
    return res.json({ success: true });
  });
});

// =========================================================
// IDS INTEGRATION ROUTES - Suricata & Zeek
// =========================================================

// GET /api/suricata/alerts?limit=20
app.get(
  "/api/suricata/alerts",
  authorize(["Platform Administrator", "Security Analyst", "Network Administrator"]),
  async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(200, Number(req.query.limit || 20)));
      const result = await es.search({
        index: ["filebeat-*", ".ds-filebeat-*"],
        size: limit,
        sort: [{ "@timestamp": { order: "desc" } }],
        track_total_hits: false,
        query: {
          bool: {
            must: [{ match: { "event.module": "suricata" } }],
            filter: [{ exists: { field: "suricata.eve.alert.signature" } }],
          },
        },
        _source: [
          "@timestamp",
          "suricata.eve.alert.signature",
          "suricata.eve.alert.severity",
          "event.severity",
          "log.level",
          "suricata.eve.severity",
          "source.ip",
          "source.port",
          "destination.ip",
          "destination.port",
          "network.protocol",
        ],
      });

      const alerts = result.hits.hits.map((h) => {
        // Try multiple possible locations for severity field
        // Common locations in Elasticsearch/Filebeat/Suricata logs:
        // 1. suricata.eve.alert.severity (most common)
        // 2. event.severity (ECS standard)
        // 3. suricata.eve.severity (alternative)
        // 4. log.level (fallback)
        let severity = h._source?.suricata?.eve?.alert?.severity ||
                       h._source?.event?.severity ||
                       h._source?.suricata?.eve?.severity ||
                       h._source?.log?.level;

        // If severity is still undefined, check if we can derive it from signature
        // Many Suricata rules don't have severity set, so we'll default to 2 (Medium)
        if (!severity) {
          severity = 2;
          console.log("[Suricata] No severity found for alert:", h._id, "signature:", h._source?.suricata?.eve?.alert?.signature);
        }

        return {
          id: h._id,
          timestamp: h._source?.["@timestamp"],
          signature: h._source?.suricata?.eve?.alert?.signature,
          severity: severity,
          src_ip: h._source?.source?.ip,
          src_port: h._source?.source?.port,
          dest_ip: h._source?.destination?.ip,
          dest_port: h._source?.destination?.port,
          protocol: h._source?.network?.protocol,
        };
      });

      res.json(alerts);
    } catch (err) {
      console.error("[/api/suricata/alerts] ES error:", err?.meta?.body || err);
      res.status(500).json({ error: "ES query failed" });
    }
  }
);

// GET /api/zeek/logs?limit=20
app.get(
  "/api/zeek/logs",
  authorize(["Platform Administrator", "Security Analyst", "Network Administrator"]),
  async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(200, Number(req.query.limit || 20)));
      const result = await es.search({
        index: ["filebeat-*", ".ds-filebeat-*"],
        size: limit,
        sort: [{ "@timestamp": { order: "desc" } }],
        track_total_hits: false,
        query: { match: { "event.module": "zeek" } },
        _source: [
          "@timestamp",
          "zeek.event",
          "zeek.service",
          "source.ip", "source.port",
          "destination.ip", "destination.port",
          "network.transport"
        ],
      });

      const logs = result.hits.hits.map((h) => ({
        id: h._id,
        timestamp: h._source?.["@timestamp"],
        event_type: h._source?.zeek?.event,
        service: h._source?.zeek?.service,
        src_ip: h._source?.source?.ip,
        src_port: h._source?.source?.port,
        dest_ip: h._source?.destination?.ip,
        dest_port: h._source?.destination?.port,
        proto: h._source?.network?.transport,
      }));

      res.json(logs);
    } catch (err) {
      console.error("[/api/zeek/logs] ES error:", err?.meta?.body || err);
      res.status(500).json({ error: "ES query failed" });
    }
  }
);

// GET /api/zeek/connections - Detailed Zeek connection logs with pagination
app.get(
  "/api/zeek/connections",
  authorize(["Platform Administrator", "Security Analyst", "Network Administrator"]),
  async (req, res) => {
    console.log('[Zeek Connections] Fetching from Elasticsearch...');

    try {
      const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
      const from = Math.max(0, Number(req.query.from || 0));

      const result = await es.search({
        index: ["filebeat-*", ".ds-filebeat-*"],
        size: limit,
        from: from,
        sort: [{ "@timestamp": { order: "desc" } }],
        track_total_hits: true,
        query: {
          bool: {
            must: [
              { match: { "event.dataset": "zeek.connection" } }
            ],
            filter: [
              { exists: { field: "source.ip" } }
            ]
          }
        },
        _source: [
          "@timestamp",
          "source.ip",
          "source.port",
          "destination.ip",
          "destination.port",
          "network.transport",
          "network.bytes",
          "network.packets",
          "zeek.connection.duration",
          "zeek.connection.state",
          "zeek.connection.community_id"
        ],
      });

      const connections = result.hits.hits.map((h) => ({
        id: h._id,
        timestamp: h._source?.["@timestamp"],
        source_ip: h._source?.source?.ip || "Unknown",
        source_port: h._source?.source?.port || 0,
        destination_ip: h._source?.destination?.ip || "Unknown",
        destination_port: h._source?.destination?.port || 0,
        protocol: h._source?.network?.transport || "Unknown",
        bytes: h._source?.network?.bytes || 0,
        packets: h._source?.network?.packets || 0,
        duration: h._source?.zeek?.connection?.duration || 0,
        connection_state: h._source?.zeek?.connection?.state || "Unknown",
        community_id: h._source?.zeek?.connection?.community_id || ""
      }));

      const total = typeof result.hits.total === 'object'
        ? result.hits.total.value
        : result.hits.total;

      console.log(`[Zeek Connections] Found ${connections.length} of ${total} records`);

      res.json({
        total: total,
        connections: connections
      });

    } catch (err) {
      console.error("[/api/zeek/connections] ES error:", err?.meta?.body || err);
      res.status(500).json({ error: "Failed to fetch Zeek connections" });
    }
  }
);

// =========================================================
// NOTIFICATION MANAGEMENT APIs
// =========================================================

// GET all notifications
app.get('/api/notifications', authorize(['Network Administrator']), (req, res) => {
  const sql = `SELECT * FROM notifications ORDER BY created_at DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('[GET /api/notifications] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
    res.json(rows || []);
  });
});

// GET notification by ID
app.get('/api/notifications/:id', authorize(['Network Administrator']), (req, res) => {
  const { id } = req.params;
  const sql = `SELECT * FROM notifications WHERE id = ?`;

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('[GET /api/notifications/:id] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch notification' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(row);
  });
});

// CREATE notification
app.post('/api/notifications', authorize(['Network Administrator']), (req, res) => {
  const {
    notification_name,
    trigger_condition,
    severity_filter,
    delivery_method,
    recipients,
    message_template,
    status = 'Enabled'
  } = req.body;

  if (!notification_name || !trigger_condition || !delivery_method || !recipients) {
    return res.status(400).json({
      error: 'Missing required fields: notification_name, trigger_condition, delivery_method, recipients'
    });
  }

  const now = new Date().toISOString();
  const sql = `
    INSERT INTO notifications (
      notification_name, trigger_condition, severity_filter, delivery_method,
      recipients, message_template, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [
    notification_name,
    trigger_condition,
    severity_filter || null,
    delivery_method,
    recipients,
    message_template || null,
    status,
    now
  ], function(err) {
    if (err) {
      console.error('[POST /api/notifications] Error:', err);
      return res.status(500).json({ error: 'Failed to create notification' });
    }

    res.status(201).json({
      id: this.lastID,
      notification_name,
      trigger_condition,
      severity_filter,
      delivery_method,
      recipients,
      message_template,
      status,
      created_at: now,
      updated_at: null
    });
  });
});

// UPDATE notification
app.put('/api/notifications/:id', authorize(['Network Administrator']), (req, res) => {
  const { id } = req.params;
  const {
    notification_name,
    trigger_condition,
    severity_filter,
    delivery_method,
    recipients,
    message_template,
    status
  } = req.body;

  if (!notification_name || !trigger_condition || !delivery_method || !recipients) {
    return res.status(400).json({
      error: 'Missing required fields: notification_name, trigger_condition, delivery_method, recipients'
    });
  }

  const now = new Date().toISOString();
  const sql = `
    UPDATE notifications SET
      notification_name = ?,
      trigger_condition = ?,
      severity_filter = ?,
      delivery_method = ?,
      recipients = ?,
      message_template = ?,
      status = ?,
      updated_at = ?
    WHERE id = ?
  `;

  db.run(sql, [
    notification_name,
    trigger_condition,
    severity_filter || null,
    delivery_method,
    recipients,
    message_template || null,
    status,
    now,
    id
  ], function(err) {
    if (err) {
      console.error('[PUT /api/notifications/:id] Error:', err);
      return res.status(500).json({ error: 'Failed to update notification' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Fetch and return updated notification
    db.get(`SELECT * FROM notifications WHERE id = ?`, [id], (err, row) => {
      if (err || !row) {
        return res.status(500).json({ error: 'Failed to fetch updated notification' });
      }
      res.json(row);
    });
  });
});

// DELETE notification
app.delete('/api/notifications/:id', authorize(['Network Administrator']), (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM notifications WHERE id = ?`;

  db.run(sql, [id], function(err) {
    if (err) {
      console.error('[DELETE /api/notifications/:id] Error:', err);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  });
});

// TOGGLE notification status (enable/disable)
app.patch('/api/notifications/:id/toggle', authorize(['Network Administrator']), (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  // First get current status
  db.get(`SELECT status FROM notifications WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.error('[PATCH /api/notifications/:id/toggle] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch notification' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const newStatus = row.status === 'Enabled' ? 'Disabled' : 'Enabled';
    const sql = `UPDATE notifications SET status = ?, updated_at = ? WHERE id = ?`;

    db.run(sql, [newStatus, now, id], function(err) {
      if (err) {
        console.error('[PATCH /api/notifications/:id/toggle] Update error:', err);
        return res.status(500).json({ error: 'Failed to toggle notification status' });
      }

      res.json({ success: true, status: newStatus });
    });
  });
});

// TEST notification (simulate sending)
app.post('/api/notifications/:id/test', authorize(['Network Administrator']), (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM notifications WHERE id = ?`, [id], (err, notification) => {
    if (err) {
      console.error('[POST /api/notifications/:id/test] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch notification' });
    }
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Simulate test notification
    console.log(`[TEST NOTIFICATION] ID: ${id}, Name: ${notification.notification_name}`);
    console.log(`  Delivery Method: ${notification.delivery_method}`);
    console.log(`  Recipients: ${notification.recipients}`);
    console.log(`  Message: ${notification.message_template || 'Default message'}`);

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      details: {
        notification_name: notification.notification_name,
        delivery_method: notification.delivery_method,
        recipients: notification.recipients,
        timestamp: new Date().toISOString()
      }
    });
  });
});

// =========================================================
// IDS RULES MANAGEMENT APIs
// =========================================================

// GET all IDS rules
app.get('/api/ids-rules', authorize(['Network Administrator', 'Security Analyst']), (req, res) => {
  const sql = `SELECT * FROM ids_rules ORDER BY created_at DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('[GET /api/ids-rules] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch rules' });
    }
    res.json(rows);
  });
});

// NEW: SEARCH ROUTE MOVED HERE (BEFORE :id)
// GET search IDS rules
app.get('/api/ids-rules/search', authorize(['Network Administrator', 'Security Analyst']), (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Search query required' });
  }

  const searchTerm = `%${q}%`;
  const sql = `
    SELECT * FROM ids_rules
    WHERE rule_name LIKE ? OR rule_sid LIKE ? OR category LIKE ? OR description LIKE ?
    ORDER BY created_at DESC
  `;

  db.all(sql, [searchTerm, searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (err) {
      console.error('[GET /api/ids-rules/search] Error:', err);
      return res.status(500).json({ error: 'Search failed' });
    }
    res.json(rows);
  });
});

// GET single IDS rule by ID (NOW AFTER SEARCH)
app.get('/api/ids-rules/:id', authorize(['Network Administrator', 'Security Analyst']), (req, res) => {
  const { id } = req.params;
  const sql = `SELECT * FROM ids_rules WHERE id = ?`;

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('[GET /api/ids-rules/:id] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch rule' });
    }
    if (!row) return res.status(404).json({ error: 'Rule not found' });
    res.json(row);
  });
});

// POST create new IDS rule
app.post('/api/ids-rules', authorize(['Network Administrator']), (req, res) => {
  const { rule_name, rule_sid, category, severity, rule_content, description, status } = req.body;

  if (!rule_name || !category || !severity || !rule_content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const now = new Date().toISOString();
  const sql = `
    INSERT INTO ids_rules
    (rule_name, rule_sid, category, severity, rule_content, description, status, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const created_by = req.user.id; // from JWT token
  const finalStatus = status || 'Active';

  db.run(sql, [
    rule_name, rule_sid, category, severity, rule_content,
    description, finalStatus, created_by, now, now
  ], function(err) {
    if (err) {
      console.error('[POST /api/ids-rules] Error:', err);
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ error: 'Rule SID already exists' });
      }
      return res.status(500).json({ error: 'Failed to create rule' });
    }

    res.status(201).json({
      id: this.lastID,
      rule_name,
      rule_sid,
      category,
      severity,
      rule_content,
      description,
      status: finalStatus,
      created_by,
      created_at: now,
      updated_at: now
    });
  });
});

// PUT update IDS rule
app.put('/api/ids-rules/:id', authorize(['Network Administrator']), (req, res) => {
  const { id } = req.params;
  const { rule_name, rule_sid, category, severity, rule_content, description, status } = req.body;

  if (!rule_name || !category || !severity || !rule_content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const now = new Date().toISOString();
  const sql = `
    UPDATE ids_rules
    SET rule_name = ?, rule_sid = ?, category = ?, severity = ?,
        rule_content = ?, description = ?, status = ?, updated_at = ?
    WHERE id = ?
  `;

  db.run(sql, [
    rule_name, rule_sid, category, severity, rule_content,
    description, status, now, id
  ], function(err) {
    if (err) {
      console.error('[PUT /api/ids-rules/:id] Error:', err);
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ error: 'Rule SID already exists' });
      }
      return res.status(500).json({ error: 'Failed to update rule' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // Fetch and return updated rule
    db.get(`SELECT * FROM ids_rules WHERE id = ?`, [id], (err, row) => {
      if (err || !row) return res.status(500).json({ error: 'Failed to fetch updated rule' });
      res.json(row);
    });
  });
});

// DELETE IDS rule
app.delete('/api/ids-rules/:id', authorize(['Network Administrator']), (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM ids_rules WHERE id = ?`;

  db.run(sql, [id], function(err) {
    if (err) {
      console.error('[DELETE /api/ids-rules/:id] Error:', err);
      return res.status(500).json({ error: 'Failed to delete rule' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({ success: true, message: 'Rule deleted successfully' });
  });
});

// =========================================================
// ALERT METADATA MANAGEMENT APIs
// =========================================================

// POST /api/alerts/metadata - Save or update metadata for alert(s)
app.post('/api/alerts/metadata', authorize(['Security Analyst', 'Network Administrator', 'Platform Administrator']), (req, res) => {
  const { alert_id, alert_ids, classification, status, severity, triage_level, tags, notes, archived, archive_reason } = req.body;

  // Support both single alert and bulk updates (for consolidated alerts)
  const alertIds = alert_ids || (alert_id ? [alert_id] : []);

  if (!alertIds || alertIds.length === 0) {
    return res.status(400).json({ error: 'alert_id or alert_ids required' });
  }

  const updated_by = req.user?.email || req.user?.name || 'unknown';
  const updated_at = new Date().toISOString();

  // Prepare tags as JSON string
  const tagsJson = tags ? JSON.stringify(tags) : null;

  const sql = `
    INSERT INTO alert_metadata (
      alert_id, classification, status, severity, triage_level,
      tags, notes, archived, archive_reason, updated_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(alert_id) DO UPDATE SET
      classification = excluded.classification,
      status = excluded.status,
      severity = excluded.severity,
      triage_level = excluded.triage_level,
      tags = excluded.tags,
      notes = excluded.notes,
      archived = excluded.archived,
      archive_reason = excluded.archive_reason,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `;

  let completed = 0;
  let errors = [];

  alertIds.forEach((alertId, index) => {
    db.run(sql, [
      alertId,
      classification || null,
      status || null,
      severity || null,
      triage_level || null,
      tagsJson,
      notes || null,
      archived ? 1 : 0,
      archive_reason || null,
      updated_by,
      updated_at
    ], function(err) {
      completed++;

      if (err) {
        console.error('[POST /api/alerts/metadata] Error for alert', alertId, ':', err);
        errors.push({ alert_id: alertId, error: err.message });
      }

      // Send response after all inserts complete
      if (completed === alertIds.length) {
        if (errors.length > 0) {
          return res.status(500).json({
            success: false,
            saved: alertIds.length - errors.length,
            errors
          });
        }

        res.status(200).json({
          success: true,
          count: alertIds.length,
          updated_by,
          updated_at
        });
      }
    });
  });
});

// GET /api/alerts/metadata/:alertId - Get metadata for specific alert
app.get('/api/alerts/metadata/:alertId', authorize(['Security Analyst', 'Network Administrator', 'Platform Administrator']), (req, res) => {
  const { alertId } = req.params;

  const sql = `SELECT * FROM alert_metadata WHERE alert_id = ?`;

  db.get(sql, [alertId], (err, row) => {
    if (err) {
      console.error('[GET /api/alerts/metadata/:alertId] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch metadata' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Metadata not found' });
    }

    // Parse tags back to array
    if (row.tags) {
      try {
        row.tags = JSON.parse(row.tags);
      } catch (e) {
        row.tags = [];
      }
    }

    res.json(row);
  });
});

// GET /api/alerts/metadata - Get all metadata (bulk)
app.get('/api/alerts/metadata', authorize(['Security Analyst', 'Network Administrator', 'Platform Administrator']), (req, res) => {
  const sql = `SELECT * FROM alert_metadata ORDER BY updated_at DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('[GET /api/alerts/metadata] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch metadata' });
    }

    // Parse tags for each row
    const parsed = rows.map(row => {
      if (row.tags) {
        try {
          row.tags = JSON.parse(row.tags);
        } catch (e) {
          row.tags = [];
        }
      }
      return row;
    });

    res.json(parsed);
  });
});

// =========================================================
// SYSTEM HEALTH & MONITORING ROUTES
// =========================================================

// GET /api/health/ids - Check IDS health status
app.get('/api/health/ids', authorize(['Platform Administrator', 'Security Analyst']), async (req, res) => {
  const health = {
    suricata: 'unknown',
    zeek: 'unknown',
    lastCheck: new Date().toISOString()
  };

  try {
    // Check if Suricata data exists in filebeat indices (with recent data in last 10 minutes)
    const suricataCheck = await es.search({
      index: ['filebeat-*', '.ds-filebeat-*'],
      size: 1,
      sort: [{ '@timestamp': { order: 'desc' } }],
      query: {
        bool: {
          must: [
            { match: { 'event.module': 'suricata' } }
          ],
          filter: [
            { range: { '@timestamp': { gte: 'now-10m' } } }
          ]
        }
      }
    }).catch(() => null);

    if (suricataCheck && suricataCheck.hits?.hits?.length > 0) {
      health.suricata = 'online';
    } else {
      // Check if any Suricata data exists (even if old)
      const anyData = await es.search({
        index: ['filebeat-*', '.ds-filebeat-*'],
        size: 1,
        query: { match: { 'event.module': 'suricata' } }
      }).catch(() => null);
      health.suricata = anyData?.hits?.hits?.length > 0 ? 'stale' : 'offline';
    }

    // Check if Zeek data exists in filebeat indices (with recent data in last 10 minutes)
    const zeekCheck = await es.search({
      index: ['filebeat-*', '.ds-filebeat-*'],
      size: 1,
      sort: [{ '@timestamp': { order: 'desc' } }],
      query: {
        bool: {
          must: [
            { match: { 'event.module': 'zeek' } }
          ],
          filter: [
            { range: { '@timestamp': { gte: 'now-10m' } } }
          ]
        }
      }
    }).catch(() => null);

    if (zeekCheck && zeekCheck.hits?.hits?.length > 0) {
      health.zeek = 'online';
    } else {
      // Check if any Zeek data exists (even if old)
      const anyData = await es.search({
        index: ['filebeat-*', '.ds-filebeat-*'],
        size: 1,
        query: { match: { 'event.module': 'zeek' } }
      }).catch(() => null);
      health.zeek = anyData?.hits?.hits?.length > 0 ? 'stale' : 'offline';
    }

    res.json(health);
  } catch (err) {
    console.error('[GET /api/health/ids] Error:', err);
    res.json(health); // Return unknown status on error
  }
});

// Enhanced GET /api/health - System health with detailed info
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    elasticsearch: 'unknown',
    database: 'online',
    timestamp: new Date().toISOString()
  };

  // Check Elasticsearch
  try {
    await es.ping();
    health.elasticsearch = 'online';
  } catch (err) {
    health.elasticsearch = 'offline';
    health.status = 'degraded';
  }

  // Check database
  try {
    await new Promise((resolve, reject) => {
      db.get('SELECT 1', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    health.database = 'online';
  } catch (err) {
    health.database = 'offline';
    health.status = 'critical';
  }

  res.json(health);
});

// GET /api/system/alerts - Get system-level alerts
app.get('/api/system/alerts', authorize(['Platform Administrator', 'Security Analyst']), async (req, res) => {
  const alerts = [];
  const now = new Date();

  try {
    // Check Elasticsearch health
    try {
      await es.ping();
    } catch (err) {
      alerts.push({
        type: 'Database Health',
        severity: 'critical',
        message: 'Elasticsearch is not responding',
        timestamp: now.toISOString(),
        source: 'Database Monitor'
      });
    }

    // Check for recent suspicious account activity
    db.all(
      `SELECT COUNT(*) as count FROM users WHERE joined_at > datetime('now', '-1 hour')`,
      [],
      (err, rows) => {
        if (!err && rows[0]?.count > 5) {
          alerts.push({
            type: 'Account Activity',
            severity: 'medium',
            message: `${rows[0].count} accounts created in the last hour`,
            timestamp: now.toISOString(),
            source: 'User Monitor'
          });
        }
      }
    );

    res.json(alerts);
  } catch (err) {
    console.error('[GET /api/system/alerts] Error:', err);
    res.json(alerts); // Return any alerts collected so far
  }
});

// GET /api/users/recent - Get recently created users
app.get('/api/users/recent', authorize(['Platform Administrator', 'Security Analyst']), (req, res) => {
  const days = parseInt(req.query.days) || 1;

  db.all(
    `SELECT id, name, email, role, status, joined_at as created_at, last_active
     FROM users
     WHERE joined_at > datetime('now', '-${days} days')
     ORDER BY joined_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('[GET /api/users/recent] DB error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows || []);
    }
  );
});

// =========================================================
// START SERVER
// =========================================================

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
  console.log(`🔐 JWT roles enforced. ES at ${ELASTIC_URL}`);
});