# Project Architecture - Syntra IDS Platform

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Diagram](#architecture-diagram)
4. [Component Details](#component-details)
5. [Data Flow](#data-flow)
6. [API Reference](#api-reference)
7. [Database Schema](#database-schema)
8. [Security Architecture](#security-architecture)
9. [Deployment Architecture](#deployment-architecture)
10. [Dependencies](#dependencies)

---

## 1. System Overview

**Syntra IDS Platform** is a comprehensive network security monitoring system that combines:
- **Intrusion Detection**: Suricata IDS for signature-based detection
- **Network Monitoring**: Zeek for protocol analysis and logging
- **Data Analytics**: Elasticsearch for log aggregation and search
- **Web Dashboard**: React-based interface with role-based access control
- **Multi-Factor Authentication**: TOTP-based 2FA for enhanced security

### Key Features
✅ Real-time IDS monitoring (Suricata & Zeek)
✅ Multi-role access control (3 user roles)
✅ Multi-factor authentication (MFA)
✅ Alert management and visualization
✅ IDS rule configuration
✅ Notification system
✅ System health monitoring

---

## 2. Technology Stack

### Frontend Stack
```
React 18.2.0
├── UI Framework: Chakra UI 2.6.1
├── Styling: Emotion (CSS-in-JS)
├── Routing: React Router DOM 6.30.1
├── State: React Context API
├── Charts: ApexCharts 3.50.0
├── HTTP Client: Axios 1.12.0
├── MFA UI: qrcode.react 4.2.0
└── Build: Create React App (react-scripts 5.0.1)
```

### Backend Stack
```
Node.js (ES Modules)
├── Framework: Express 4.21.2
├── Database: SQLite3 5.1.7
├── Authentication: jsonwebtoken 9.0.2
├── Password Hashing: bcrypt 5.1.1
├── MFA: speakeasy 2.0.0 (TOTP)
├── QR Codes: qrcode 1.5.4
├── Search Client: @elastic/elasticsearch 8.11.0
└── Parser: body-parser 1.20.3
```

### Infrastructure Stack
```
IDS & Monitoring
├── Suricata IDS (Intrusion Detection)
├── Zeek (Network Analysis)
├── Filebeat (Log Shipping)
└── Elasticsearch 9200 (Data Store & Search)

Operating System
└── Linux 4.4.0 (VM-based deployment)
```

---

## 3. Architecture Diagram

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NETWORK LAYER                                │
│                    (Physical/Virtual Network)                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌──────────────────┐      ┌──────────────────┐
    │  Suricata IDS    │      │  Zeek Monitor    │
    │  - Signature     │      │  - Protocol      │
    │  - Detection     │      │  - Analysis      │
    │  - EVE.json      │      │  - conn.log      │
    └────────┬─────────┘      └────────┬─────────┘
             │                         │
             └──────────┬──────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │      Filebeat         │
            │   (Log Shipper)       │
            │  - Suricata Module    │
            │  - Zeek Module        │
            └──────────┬────────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │    Elasticsearch       │
          │       :9200            │
          │  ┌──────────────────┐  │
          │  │ filebeat-*       │  │
          │  │ .ds-filebeat-*   │  │
          │  └──────────────────┘  │
          └──────────┬─────────────┘
                     │
                     │ REST API
                     ▼
      ┌──────────────────────────────┐
      │   Backend API (Express)       │
      │         :3001                 │
      │  ┌────────────────────────┐   │
      │  │  Authentication        │   │
      │  │  - JWT Tokens          │   │
      │  │  - MFA (TOTP)          │   │
      │  │  - bcrypt hashing      │   │
      │  ├────────────────────────┤   │
      │  │  Authorization         │   │
      │  │  - RBAC Middleware     │   │
      │  │  - Role checking       │   │
      │  ├────────────────────────┤   │
      │  │  Business Logic        │   │
      │  │  - User Management     │   │
      │  │  - Alert Processing    │   │
      │  │  - Rule Management     │   │
      │  │  - Notifications       │   │
      │  ├────────────────────────┤   │
      │  │  Data Layer            │   │
      │  │  - SQLite (users.db)   │   │
      │  │  - ES Queries          │   │
      │  └────────────────────────┘   │
      └──────────────┬───────────────┘
                     │
                     │ REST API (JWT Auth)
                     ▼
      ┌──────────────────────────────┐
      │   Frontend (React)            │
      │         :3000                 │
      │  ┌────────────────────────┐   │
      │  │  Routing Layer         │   │
      │  │  - React Router        │   │
      │  │  - Protected Routes    │   │
      │  │  - Role-based Routes   │   │
      │  ├────────────────────────┤   │
      │  │  Presentation Layer    │   │
      │  │  - Chakra UI           │   │
      │  │  - ApexCharts          │   │
      │  │  - Dashboard Widgets   │   │
      │  ├────────────────────────┤   │
      │  │  State Management      │   │
      │  │  - Auth Context        │   │
      │  │  - Local Storage       │   │
      │  │  - React State         │   │
      │  ├────────────────────────┤   │
      │  │  API Client            │   │
      │  │  - Axios               │   │
      │  │  - JWT Interceptors    │   │
      │  └────────────────────────┘   │
      └──────────────┬───────────────┘
                     │
                     ▼
      ┌──────────────────────────────┐
      │    User Browser               │
      │  http://192.168.56.128:3000   │
      │  - Platform Administrator     │
      │  - Network Administrator      │
      │  - Security Analyst           │
      └───────────────────────────────┘
```

### Network Topology

```
┌────────────────────────────────────────────────────┐
│         Host Machine (Laptop/Desktop)              │
│                                                    │
│  ┌──────────────────────────────────────────┐    │
│  │    VMware/VirtualBox Hypervisor          │    │
│  │                                           │    │
│  │  ┌────────────────────────────────────┐  │    │
│  │  │  Virtual Network: 192.168.56.0/24  │  │    │
│  │  │  (Host-Only Adapter)               │  │    │
│  │  │                                     │  │    │
│  │  │  ┌──────────────────────────────┐  │  │    │
│  │  │  │  IDS VM                      │  │  │    │
│  │  │  │  IP: 192.168.56.128          │  │  │    │
│  │  │  │                              │  │  │    │
│  │  │  │  Services:                   │  │  │    │
│  │  │  │  - Elasticsearch :9200       │  │  │    │
│  │  │  │  - Backend API :3001         │  │  │    │
│  │  │  │  - Frontend :3000            │  │  │    │
│  │  │  │  - Suricata IDS              │  │  │    │
│  │  │  │  - Zeek Monitor              │  │  │    │
│  │  │  │  - Filebeat                  │  │  │    │
│  │  │  └──────────────────────────────┘  │  │    │
│  │  └────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────┘    │
│                                                    │
│  Access from Host: http://192.168.56.128:3000     │
└────────────────────────────────────────────────────┘
```

---

## 4. Component Details

### 4.1 Frontend Architecture

**Location**: `/home/user/FYP_Test_2/Project-Syntra-main/`

```
src/
├── pages/                          # Page components (640KB)
│   ├── platformAdmin/              # Platform Administrator pages
│   │   ├── DashboardHome.jsx       # Main dashboard with IDS status
│   │   ├── Users.jsx               # User management
│   │   ├── Alerts.jsx              # System alerts
│   │   └── Settings.jsx            # Platform settings
│   ├── networkAdmin/               # Network Administrator pages
│   │   ├── RulesManagement.jsx     # IDS rule configuration
│   │   ├── SourcesIntegration.jsx  # IDS source management
│   │   └── Notifications.jsx       # Alert notifications
│   ├── securityAnalyst/            # Security Analyst pages
│   │   ├── AlertMonitor.jsx        # Suricata alerts viewer
│   │   ├── LogViewer.jsx           # Zeek logs viewer
│   │   └── Dashboard.jsx           # Analyst dashboard
│   ├── auth/                       # Authentication pages
│   │   ├── SignIn.jsx              # Login with MFA
│   │   └── Register.jsx            # User registration
│   └── common/                     # Shared pages
│       └── MFASettings.jsx         # MFA management
├── components/                     # Reusable components (249KB)
│   ├── alerts/                     # Alert components
│   ├── charts/                     # ApexCharts wrappers
│   ├── dashboard/                  # Dashboard widgets
│   ├── mfa/                        # MFA UI components
│   ├── navbar/                     # Top navigation
│   └── sidebar/                    # Side menu
├── routes/                         # Route definitions (10KB)
│   ├── platformAdminRoutes.js      # Routes for Platform Admin
│   ├── networkAdminRoutes.js       # Routes for Network Admin
│   ├── securityAnalystRoutes.js    # Routes for Security Analyst
│   └── adminRoutes.js              # Generic admin routes
├── auth/                           # Authentication logic (7.5KB)
│   ├── AuthContext.jsx             # JWT context provider
│   └── ProtectedRoute.jsx          # Route guard component
├── layouts/                        # Page layouts (20KB)
│   ├── admin/                      # Admin layout wrapper
│   └── auth/                       # Auth layout wrapper
├── theme/                          # Chakra UI theming (41KB)
├── assets/                         # Images, icons (1.8MB)
├── App.js                          # Root component
├── index.js                        # Entry point
└── backend_api.js                  # API client wrapper
```

**Key Frontend Files**:

1. **`src/backend_api.js`** - Centralized API client
   ```javascript
   const API_URL = process.env.REACT_APP_API_URL; // http://192.168.56.128:3001

   // All requests include JWT token
   const token = localStorage.getItem("accessToken");
   headers: { Authorization: `Bearer ${token}` }
   ```

2. **`src/auth/AuthContext.jsx`** - Authentication state management
   - Stores JWT token in localStorage
   - Provides login/logout functions
   - Manages user role and MFA state

3. **`src/auth/ProtectedRoute.jsx`** - Route protection
   - Checks if user is authenticated
   - Redirects to login if not authenticated
   - Validates role-based access

### 4.2 Backend Architecture

**Location**: `/home/user/FYP_Test_2/Project-Syntra-main/user-api/`

**Main File**: `server.js` (1587 lines)

```
Structure:
├── Dependencies & Configuration (Lines 1-50)
│   ├── Express setup
│   ├── SQLite connection
│   ├── Elasticsearch client
│   ├── JWT secret
│   └── CORS configuration
├── Database Schema (Lines 51-300)
│   ├── users table
│   ├── ids_rules table
│   ├── ids_sources table
│   ├── notifications table
│   ├── profile_types table
│   └── dashboard_layouts table
├── Middleware (Lines 301-400)
│   ├── authorize(roles) - RBAC middleware
│   └── normalizeRole() - Role normalization
├── Authentication Routes (Lines 401-700)
│   ├── POST /api/auth/login
│   ├── MFA setup endpoints
│   ├── MFA verification
│   └── Backup codes
├── User Management (Lines 701-900)
│   ├── CRUD operations
│   ├── User listing with filters
│   └── Role management
├── IDS Data Routes (Lines 901-1100)
│   ├── GET /api/suricata/alerts
│   ├── GET /api/zeek/logs
│   └── GET /api/zeek/connections
├── IDS Rules Management (Lines 1101-1300)
│   ├── Rule CRUD operations
│   └── Rule search
├── Notifications (Lines 1301-1400)
│   ├── Notification CRUD
│   └── Test notifications
├── System Health (Lines 1401-1500)
│   ├── GET /api/health
│   ├── GET /api/health/es
│   └── GET /api/health/ids
└── Server Startup (Lines 1501-1587)
    └── app.listen(3001, '0.0.0.0')
```

**Key Backend Components**:

1. **Authentication System**
   - JWT-based stateless authentication
   - TOTP MFA with speakeasy
   - Backup codes (10 per user)
   - Password hashing with bcrypt

2. **Authorization System**
   - Role-based access control (RBAC)
   - Middleware: `authorize(['Platform Administrator'])`
   - 3 roles: Platform Admin, Network Admin, Security Analyst

3. **Elasticsearch Integration**
   - Client: `@elastic/elasticsearch`
   - Queries Suricata alerts from filebeat indices
   - Queries Zeek logs with field extraction
   - Health checking with recent data validation

4. **Database Layer**
   - SQLite3 for relational data
   - 6 tables for various features
   - Foreign key constraints
   - Automatic timestamps

### 4.3 IDS Layer

**Suricata**:
- **Purpose**: Signature-based intrusion detection
- **Output**: EVE JSON format
- **Log Location**: `/var/log/suricata/eve.json`
- **Detection**: Network threats, malware, suspicious patterns

**Zeek** (formerly Bro):
- **Purpose**: Network protocol analysis and logging
- **Logs**: conn.log, dns.log, http.log, ssl.log, etc.
- **Log Location**: `/opt/zeek/logs/`
- **Analysis**: Connection metadata, protocol behavior

**Filebeat**:
- **Purpose**: Log shipping to Elasticsearch
- **Modules**:
  - Suricata module (EVE JSON parsing)
  - Zeek module (log parsing)
- **Target**: Elasticsearch at localhost:9200
- **Config**: `/etc/filebeat/filebeat.yml`

### 4.4 Data Layer

**Elasticsearch**:
- **Version**: 7.x/8.x
- **Port**: 9200 (localhost only, not exposed to network)
- **Indices**:
  - `filebeat-*` (time-series pattern)
  - `.ds-filebeat-*` (data streams)
- **Purpose**: Log storage, full-text search, aggregations
- **Query DSL**: Boolean queries with filters

**SQLite**:
- **File**: `users.db`
- **Size**: ~100KB typical
- **Purpose**: Application data (users, rules, notifications)
- **Tables**: 6 tables with relationships

---

## 5. Data Flow

### 5.1 Alert Flow (Suricata)

```
1. Network Traffic → Suricata IDS
   ├── Packet capture on network interface
   ├── Signature matching against ruleset
   └── Generate alert in EVE.json

2. Suricata → Filebeat
   ├── Filebeat monitors /var/log/suricata/eve.json
   ├── Parses JSON events
   ├── Enriches with metadata (@timestamp, host, etc.)
   └── Ships to Elasticsearch

3. Filebeat → Elasticsearch
   ├── Indexes into filebeat-* index
   ├── Stores with timestamp for time-series queries
   └── Makes searchable via Lucene queries

4. Elasticsearch → Backend API
   ├── GET /api/suricata/alerts endpoint
   ├── Query: match event.module = "suricata"
   ├── Filter: exists suricata.eve.alert.signature
   ├── Extract fields: signature, severity, IPs, ports
   └── Return JSON array

5. Backend API → Frontend
   ├── JWT authentication validated
   ├── Role authorization checked
   ├── Transform data for UI
   └── Return to React component

6. Frontend → User Browser
   ├── AlertMonitor.jsx renders ApexChart
   ├── Table displays alerts with severity colors
   ├── Real-time updates every 30 seconds
   └── User can filter, search, sort
```

### 5.2 Authentication Flow (with MFA)

```
1. User Login Attempt
   ├── User enters email + password
   ├── Frontend: POST /api/auth/login
   └── Payload: { email, password }

2. Backend Validation
   ├── Query SQLite for user by email
   ├── bcrypt.compare(password, user.password_hash)
   ├── If password correct:
   │   ├── Check if mfa_enabled = 1
   │   │   └── Return { mfaRequired: true, tempToken }
   │   └── If MFA not enabled:
   │       └── Generate JWT, return { accessToken, role }
   └── If password incorrect: 401 Unauthorized

3. MFA Verification (if required)
   ├── User enters 6-digit TOTP code
   ├── Frontend: POST /api/auth/mfa/verify
   ├── Payload: { userId, token }
   ├── Backend: speakeasy.totp.verify(secret, token)
   ├── If valid: Generate JWT, return { accessToken, role }
   └── If invalid: 401 Unauthorized

4. Frontend Token Storage
   ├── localStorage.setItem('accessToken', token)
   ├── AuthContext updates state
   └── Redirect to role-based dashboard

5. Subsequent Requests
   ├── Every API call includes header:
   │   └── Authorization: Bearer <JWT>
   ├── Backend verifies JWT signature
   ├── Extract role from JWT payload
   └── Check authorization for endpoint
```

### 5.3 IDS Status Check Flow

```
1. Frontend Dashboard Load
   ├── DashboardHome.jsx useEffect()
   ├── Fetch every 30 seconds: GET /api/health/ids
   └── Display status badges (green/orange/gray)

2. Backend Health Check
   ├── Query Elasticsearch for recent Suricata data
   │   ├── Index: filebeat-*
   │   ├── Filter: event.module = "suricata"
   │   ├── Time range: last 10 minutes (now-10m)
   │   └── If hits > 0: status = "online"
   │       └── Else: status = "stale" or "offline"
   ├── Query Elasticsearch for recent Zeek data
   │   ├── Index: filebeat-*
   │   ├── Filter: event.module = "zeek"
   │   ├── Time range: last 10 minutes (now-10m)
   │   └── If hits > 0: status = "online"
   │       └── Else: status = "stale" or "offline"
   └── Return { suricata: "online", zeek: "online", lastCheck }

3. Frontend Display
   ├── Parse response
   ├── Show badge colors:
   │   ├── "online" → Green badge
   │   ├── "stale" → Orange badge
   │   └── "offline" → Gray badge
   └── Update every 30 seconds
```

---

## 6. API Reference

### 6.1 Authentication Endpoints

#### POST /api/auth/login
**Purpose**: User login with email and password

**Request**:
```json
{
  "email": "admin@syntra.com",
  "password": "SecurePass123"
}
```

**Response** (No MFA):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@syntra.com",
    "role": "Platform Administrator"
  }
}
```

**Response** (MFA Required):
```json
{
  "mfaRequired": true,
  "userId": 1,
  "tempToken": "temp_token_123"
}
```

#### POST /api/auth/mfa/setup
**Purpose**: Setup MFA for a user

**Authorization**: Bearer token required

**Response**:
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,...",
  "backupCodes": ["12345-67890", "23456-78901", ...]
}
```

#### POST /api/auth/mfa/verify
**Purpose**: Verify TOTP token during login

**Request**:
```json
{
  "userId": 1,
  "token": "123456"
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

### 6.2 IDS Data Endpoints

#### GET /api/suricata/alerts?limit=20
**Purpose**: Fetch Suricata IDS alerts

**Authorization**: Security Analyst, Network Admin, Platform Admin

**Query Parameters**:
- `limit` (optional): Number of alerts to return (default: 20)

**Response**:
```json
{
  "alerts": [
    {
      "timestamp": "2025-11-12T10:30:45.123Z",
      "signature": "ET EXPLOIT Possible SQL Injection",
      "severity": 1,
      "source_ip": "192.168.1.100",
      "source_port": 54321,
      "dest_ip": "10.0.0.50",
      "dest_port": 3306,
      "protocol": "TCP"
    },
    ...
  ]
}
```

#### GET /api/zeek/logs?limit=20
**Purpose**: Fetch Zeek network logs

**Authorization**: Security Analyst, Network Admin, Platform Admin

**Response**:
```json
{
  "logs": [
    {
      "timestamp": "2025-11-12T10:31:00.456Z",
      "event_type": "conn",
      "service": "http",
      "source_ip": "192.168.1.101",
      "source_port": 51234,
      "dest_ip": "93.184.216.34",
      "dest_port": 80,
      "protocol": "tcp"
    },
    ...
  ]
}
```

### 6.3 Health Check Endpoints

#### GET /api/health/ids
**Purpose**: Check IDS services health (Suricata & Zeek)

**Authorization**: Platform Administrator, Security Analyst

**Response**:
```json
{
  "suricata": "online",
  "zeek": "online",
  "lastCheck": "2025-11-12T10:35:00.000Z"
}
```

**Status Values**:
- `online`: Recent data within last 10 minutes
- `stale`: Data exists but older than 10 minutes
- `offline`: No data found
- `unknown`: Error querying Elasticsearch

#### GET /api/health
**Purpose**: Overall system health

**Response**:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "elasticsearch": "online",
  "database": "online",
  "timestamp": "2025-11-12T10:36:00.000Z"
}
```

### 6.4 User Management Endpoints

#### GET /api/users
**Purpose**: List all users

**Authorization**: Platform Administrator

**Response**:
```json
{
  "users": [
    {
      "id": 1,
      "name": "Admin User",
      "email": "admin@syntra.com",
      "role": "Platform Administrator",
      "status": "Active",
      "joined_at": "2025-01-01T00:00:00.000Z",
      "last_active": "2025-11-12T10:00:00.000Z",
      "mfa_enabled": true
    },
    ...
  ]
}
```

#### POST /api/users
**Purpose**: Create new user

**Authorization**: Platform Administrator

**Request**:
```json
{
  "name": "John Doe",
  "email": "john@syntra.com",
  "password": "SecurePass123",
  "role": "Security Analyst",
  "status": "Active"
}
```

### 6.5 IDS Rules Management

#### GET /api/ids-rules
**Purpose**: List all IDS rules

**Authorization**: Network Administrator, Platform Administrator

**Response**:
```json
{
  "rules": [
    {
      "id": 1,
      "rule_name": "SQL Injection Detection",
      "rule_sid": "1000001",
      "category": "Web Application Attack",
      "severity": "High",
      "rule_content": "alert tcp any any -> any 3306 (msg:\"SQL Injection Attempt\"; ...)",
      "status": "Active",
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    ...
  ]
}
```

#### POST /api/ids-rules
**Purpose**: Create new IDS rule

**Authorization**: Network Administrator

**Request**:
```json
{
  "rule_name": "Custom Rule",
  "rule_sid": "1000002",
  "category": "Custom",
  "severity": "Medium",
  "rule_content": "alert tcp ...",
  "description": "Detects XYZ behavior"
}
```

---

## 7. Database Schema

### 7.1 users Table

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,  -- Platform Administrator, Network Administrator, Security Analyst
  status TEXT NOT NULL DEFAULT 'Active',  -- Active, Inactive
  joined_at TEXT NOT NULL,  -- ISO timestamp
  last_active TEXT,  -- ISO timestamp
  mfa_enabled INTEGER DEFAULT 0,  -- 0 = disabled, 1 = enabled
  mfa_secret TEXT,  -- Base32 TOTP secret
  mfa_backup_codes TEXT  -- JSON array of backup codes
);
```

**Example Row**:
```json
{
  "id": 1,
  "name": "Platform Admin",
  "email": "admin@syntra.com",
  "password_hash": "$2b$10$abcdefgh...",
  "role": "Platform Administrator",
  "status": "Active",
  "joined_at": "2025-01-01T00:00:00.000Z",
  "last_active": "2025-11-12T10:00:00.000Z",
  "mfa_enabled": 1,
  "mfa_secret": "JBSWY3DPEHPK3PXP",
  "mfa_backup_codes": "[\"12345-67890\", \"23456-78901\"]"
}
```

### 7.2 ids_rules Table

```sql
CREATE TABLE ids_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_name TEXT NOT NULL,
  rule_sid TEXT UNIQUE,  -- Suricata rule SID
  category TEXT NOT NULL,  -- Web Attack, Malware, etc.
  severity TEXT NOT NULL,  -- Low, Medium, High, Critical
  rule_content TEXT NOT NULL,  -- Full Suricata rule
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Active',  -- Active, Disabled
  created_by INTEGER,  -- Foreign key to users
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### 7.3 notifications Table

```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_name TEXT NOT NULL,
  trigger_condition TEXT NOT NULL,  -- alert_severity, specific_rule, etc.
  severity_filter TEXT,  -- JSON array: ["High", "Critical"]
  delivery_method TEXT NOT NULL,  -- Email, Webhook, SMS
  recipients TEXT NOT NULL,  -- JSON array of emails/phones
  message_template TEXT,  -- Custom message template
  status TEXT NOT NULL DEFAULT 'Enabled',  -- Enabled, Disabled
  created_at TEXT NOT NULL,
  updated_at TEXT
);
```

### 7.4 ids_sources Table

```sql
CREATE TABLE ids_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,  -- Suricata, Zeek, Custom
  host TEXT NOT NULL,  -- IP or hostname
  port INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',  -- Active, Inactive
  last_connection TEXT,  -- Last successful connection timestamp
  created_at TEXT NOT NULL,
  updated_at TEXT
);
```

### 7.5 Entity Relationship Diagram

```
┌──────────────┐
│    users     │
│──────────────│
│ id (PK)      │
│ email        │
│ password_hash│
│ role         │
│ mfa_enabled  │
└──────┬───────┘
       │
       │ created_by
       │
       ▼
┌──────────────┐
│  ids_rules   │
│──────────────│
│ id (PK)      │
│ rule_sid     │
│ severity     │
│ created_by(FK│
└──────────────┘

┌──────────────────┐
│ notifications    │
│──────────────────│
│ id (PK)          │
│ trigger_condition│
│ delivery_method  │
└──────────────────┘

┌──────────────┐
│ ids_sources  │
│──────────────│
│ id (PK)      │
│ host         │
│ port         │
└──────────────┘
```

---

## 8. Security Architecture

### 8.1 Authentication Layer

**JWT (JSON Web Tokens)**:
```javascript
// Token generation
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    role: user.role
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

// Token verification
const decoded = jwt.verify(token, JWT_SECRET);
// decoded = { userId: 1, email: "...", role: "...", iat: ..., exp: ... }
```

**Token Storage**:
- Frontend: `localStorage.setItem('accessToken', token)`
- Sent in header: `Authorization: Bearer <token>`
- Expiration: 24 hours (configurable)

**MFA Implementation**:
```javascript
// TOTP generation
const secret = speakeasy.generateSecret({ length: 20 });
// secret.base32 = "JBSWY3DPEHPK3PXP"

// QR code for mobile apps
const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

// Verification
const verified = speakeasy.totp.verify({
  secret: user.mfa_secret,
  encoding: 'base32',
  token: userInputToken,
  window: 2  // Allow 2 time steps before/after
});
```

**Backup Codes**:
- 10 codes generated per user
- Format: `12345-67890`
- Stored as JSON array in database
- Single-use (removed after verification)

### 8.2 Authorization Layer

**Role-Based Access Control (RBAC)**:

```javascript
// Middleware
function authorize(allowedRoles = []) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// Usage
app.get('/api/users',
  authorize(['Platform Administrator']),
  (req, res) => { ... }
);
```

**Permission Matrix**:

| Endpoint | Platform Admin | Network Admin | Security Analyst |
|----------|----------------|---------------|------------------|
| GET /api/users | ✅ | ❌ | ❌ |
| POST /api/users | ✅ | ❌ | ❌ |
| GET /api/suricata/alerts | ✅ | ✅ | ✅ |
| GET /api/zeek/logs | ✅ | ✅ | ✅ |
| GET /api/ids-rules | ✅ | ✅ | ❌ |
| POST /api/ids-rules | ✅ | ✅ | ❌ |
| GET /api/notifications | ✅ | ✅ | ❌ |
| GET /api/health/ids | ✅ | ❌ | ✅ |

### 8.3 Password Security

**bcrypt Hashing**:
```javascript
const SALT_ROUNDS = 10;

// Registration
const password_hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
// $2b$10$N9qo8uLOickgx2ZMRZoMye7sD8GfxdYUdOXzTdXRGHhJ...

// Login
const isValid = await bcrypt.compare(plainPassword, password_hash);
```

**Password Requirements** (Frontend validation):
- Minimum 8 characters
- Mix of uppercase and lowercase
- At least one number
- At least one special character

### 8.4 Network Security

**Service Binding**:
```javascript
// Backend API - Accepts external connections
app.listen(3001, '0.0.0.0');  // All interfaces

// Elasticsearch - Local only (not exposed to network)
const ELASTIC_URL = 'http://localhost:9200';
```

**CORS Configuration**:
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');  // Production: restrict to specific origin
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});
```

**Firewall Rules** (Recommended):
```bash
# Allow frontend and backend
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp

# Block Elasticsearch from external access
sudo ufw deny 9200/tcp
```

### 8.5 Input Validation

**SQL Injection Prevention**:
- Using parameterized queries with SQLite
```javascript
db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => { ... });
```

**XSS Prevention**:
- React automatically escapes JSX content
- Chakra UI components sanitize inputs
- No `dangerouslySetInnerHTML` usage

**JWT Validation**:
- Signature verification on every request
- Expiration check (exp claim)
- Role validation before authorization

---

## 9. Deployment Architecture

### 9.1 VM Configuration

**Host Machine Requirements**:
- VMware Workstation/Player or VirtualBox
- 8GB+ RAM (4GB for VM, 4GB for host)
- 50GB+ disk space
- Network adapter: Host-Only (192.168.56.0/24)

**VM Specifications**:
- OS: Linux 4.4.0
- RAM: 4GB minimum
- CPU: 2 cores minimum
- Disk: 30GB+
- Network: Host-Only adapter with static IP

### 9.2 Service Topology

```
VM Services:
├── System Services (systemd)
│   ├── elasticsearch.service :9200
│   ├── suricata.service
│   ├── zeek.service
│   └── filebeat.service
├── Application Services
│   ├── syntra-backend.service :3001 (if configured)
│   └── React dev server :3000 (manual start)
└── Management Scripts
    ├── start-services.sh
    ├── check-services.sh
    ├── setup-autostart.sh
    └── setup-network.sh
```

### 9.3 Service Dependencies

```
┌─────────────────┐
│ Elasticsearch   │
│   :9200         │
└────────┬────────┘
         │
         ├─────────────────┬─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌────────────┐    ┌────────────┐    ┌────────────┐
│  Filebeat  │    │ Backend API│    │   Health   │
│            │    │   :3001    │    │   Checks   │
└─────┬──────┘    └─────┬──────┘    └────────────┘
      │                 │
      │                 ▼
      │        ┌─────────────────┐
      │        │   Frontend      │
      │        │   :3000         │
      │        └─────────────────┘
      │
      ├──────────┬──────────┐
      │          │          │
      ▼          ▼          ▼
┌──────────┐ ┌──────┐ ┌──────┐
│ Suricata │ │ Zeek │ │ Logs │
└──────────┘ └──────┘ └──────┘
```

**Startup Order** (for reliability):
1. Elasticsearch (wait 15s)
2. Suricata & Zeek (parallel)
3. Filebeat (wait 3s)
4. Backend API
5. Frontend (manual or separate)

### 9.4 Port Mapping

| Service | Port | Binding | External Access |
|---------|------|---------|-----------------|
| Frontend | 3000 | 0.0.0.0 | ✅ Yes (from host) |
| Backend API | 3001 | 0.0.0.0 | ✅ Yes (from host) |
| Elasticsearch | 9200 | 127.0.0.1 | ❌ No (localhost only) |
| Suricata | - | - | N/A (system service) |
| Zeek | - | - | N/A (system service) |

### 9.5 Data Persistence

**VM Snapshot/Export**:
```
VM Contents:
├── /home/user/FYP_Test_2/
│   ├── Project-Syntra-main/
│   │   ├── build/ (React production build)
│   │   ├── user-api/
│   │   │   ├── server.js
│   │   │   └── users.db ← Application data
│   │   └── .env ← Configuration
│   └── *.sh (management scripts)
├── /var/log/suricata/eve.json ← IDS logs
├── /opt/zeek/logs/ ← Network logs
└── /var/lib/elasticsearch/nodes/ ← Indexed data
```

**Backup Considerations**:
- SQLite database: `/home/user/FYP_Test_2/Project-Syntra-main/user-api/users.db`
- Elasticsearch indices: Can be snapshot via ES API
- IDS logs: Rotated automatically, old logs archived/deleted

---

## 10. Dependencies

### 10.1 Frontend Dependencies (package.json)

**Core Framework** (118KB total):
```json
{
  "react": "18.2.0",
  "react-dom": "18.2.0",
  "react-router-dom": "^6.30.1"
}
```

**UI Components** (2.5MB total):
```json
{
  "@chakra-ui/react": "2.6.1",
  "@chakra-ui/icons": "^2.0.19",
  "@chakra-ui/system": "2.5.7",
  "@emotion/react": "^11.12.0",
  "@emotion/styled": "^11.12.0",
  "framer-motion": "^11.3.7"
}
```

**Data Visualization** (450KB):
```json
{
  "apexcharts": "3.50.0",
  "react-apexcharts": "1.4.1",
  "@tanstack/react-table": "^8.19.3"
}
```

**HTTP & Authentication** (200KB):
```json
{
  "axios": "^1.12.0",
  "bcrypt": "^6.0.0",
  "jsonwebtoken": "^9.0.2",
  "qrcode.react": "^4.2.0"
}
```

**Elasticsearch Client** (1.8MB):
```json
{
  "@elastic/elasticsearch": "^9.2.0"
}
```

**Development Tools**:
```json
{
  "react-scripts": "^5.0.1",
  "gh-pages": "^6.1.1"
}
```

**Total Bundle Size** (production build):
- Uncompressed: ~5MB
- Gzipped: ~1.5MB

### 10.2 Backend Dependencies (package.json)

**Core Framework** (100KB):
```json
{
  "express": "^4.21.2",
  "body-parser": "^1.20.3"
}
```

**Database** (5MB native binary):
```json
{
  "sqlite3": "^5.1.7"
}
```

**Authentication** (150KB):
```json
{
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.4"
}
```

**Elasticsearch Client** (1.5MB):
```json
{
  "@elastic/elasticsearch": "^8.11.0"
}
```

**Total Backend Size**: ~7MB (including node_modules)

### 10.3 System Dependencies

**Required Packages**:
```bash
# Node.js runtime
nodejs >= 16.x
npm >= 8.x

# IDS Systems
suricata >= 6.x
zeek >= 4.x

# Data Pipeline
filebeat >= 7.x
elasticsearch >= 7.x

# System utilities
systemd (for service management)
curl (for health checks)
```

**Installation Commands** (Ubuntu/Debian):
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Suricata
sudo add-apt-repository ppa:oisf/suricata-stable
sudo apt-get update
sudo apt-get install suricata

# Zeek
echo 'deb http://download.opensuse.org/repositories/security:/zeek/xUbuntu_20.04/ /' | sudo tee /etc/apt/sources.list.d/security:zeek.list
sudo apt-get update
sudo apt-get install zeek

# Elasticsearch & Filebeat
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
sudo apt-get install apt-transport-https
echo "deb https://artifacts.elastic.co/packages/7.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-7.x.list
sudo apt-get update
sudo apt-get install elasticsearch filebeat
```

### 10.4 Dependency Tree

```
Syntra IDS Platform
├── Frontend (React App)
│   ├── React 18.2.0
│   │   ├── react-dom
│   │   └── react-router-dom
│   ├── Chakra UI 2.6.1
│   │   ├── @emotion/react
│   │   ├── @emotion/styled
│   │   └── framer-motion
│   ├── ApexCharts 3.50.0
│   │   └── react-apexcharts
│   ├── Axios 1.12.0
│   └── @elastic/elasticsearch 9.2.0
├── Backend (Node.js API)
│   ├── Express 4.21.2
│   ├── SQLite3 5.1.7
│   ├── JWT & Auth
│   │   ├── jsonwebtoken 9.0.2
│   │   ├── bcrypt 5.1.1
│   │   ├── speakeasy 2.0.0
│   │   └── qrcode 1.5.4
│   └── @elastic/elasticsearch 8.11.0
└── Infrastructure
    ├── Suricata IDS
    ├── Zeek Monitor
    ├── Filebeat
    │   ├── Suricata module
    │   └── Zeek module
    └── Elasticsearch 7.x
```

---

## Summary

This Syntra IDS Platform demonstrates:

### ✅ Modern Web Architecture
- 3-tier architecture (Presentation, Business Logic, Data)
- Microservices approach (separate frontend/backend)
- RESTful API design
- Stateless authentication (JWT)

### ✅ Security Best Practices
- Multi-factor authentication (TOTP)
- Password hashing (bcrypt)
- Role-based access control
- Input validation & sanitization
- Least privilege principle

### ✅ Enterprise Features
- Multi-role support (3 user profiles)
- Real-time monitoring & alerting
- Rule management system
- Notification system
- Health monitoring

### ✅ Scalability & Maintainability
- Modular component structure
- Separation of concerns
- Configuration management
- Automated deployment scripts
- Comprehensive documentation

### ✅ IDS Integration
- Suricata for signature-based detection
- Zeek for protocol analysis
- Elasticsearch for log aggregation
- Real-time data pipeline
- Health status monitoring

---

**Project Repository**: /home/user/FYP_Test_2/
**Documentation Date**: 2025-11-12
**Version**: 1.0
**Architecture**: On-Premise VM Deployment
