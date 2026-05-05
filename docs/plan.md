# Permission Firewall: Multi-Tenant RBAC Escalation Detection System

A real-time permission firewall that intercepts API access requests, detects indirect privilege escalation via role graph traversal (DFS/BFS), enforces tenant isolation, and provides an explainable denial system with audit logging and an admin dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| Database | JSON flat-file (no external DB needed for prototype) |
| Graph Engine | Custom DFS/BFS in JavaScript |
| Visualization | D3.js (role hierarchy graph) |

> [!NOTE]
> Using a JSON flat-file as the "database" keeps setup zero-dependency for hackathon speed. The architecture is designed so swapping to MongoDB later is trivial.

---

## Open Questions

> [!IMPORTANT]
> **Q1**: Should the frontend be a separate Vite/React app (`/frontend`) with a dev proxy, or a single Express app serving static HTML/React build? 
> → *Defaulting to: separate Vite React frontend + Express backend, with CORS enabled.*

> [!IMPORTANT]
> **Q2**: Should users authenticate with a real login (JWT) or should login be a simple "select user" dropdown for demo purposes?
> → *Defaulting to: Simple select-user login (no real auth), optimized for hackathon demo flow.*

---

## Proposed Changes

### Project Structure

```
d:\projects\firewall\
├── backend\
│   ├── data\
│   │   ├── tenants.json       # Tenant seed data
│   │   ├── roles.json         # Roles + permissions per tenant
│   │   ├── role_inheritance.json  # Parent→Child role edges
│   │   ├── users.json         # Users with tenant + role assignment
│   │   └── audit_log.json     # Persisted audit log
│   ├── engine\
│   │   ├── graphBuilder.js    # Builds role graph from data
│   │   └── escalationDetector.js  # DFS/BFS traversal + escalation logic
│   ├── middleware\
│   │   └── permissionFirewall.js  # Express middleware (THE CORE)
│   ├── routes\
│   │   ├── auth.js            # Login (select user)
│   │   ├── resources.js       # Protected demo resources
│   │   ├── admin.js           # Admin: audit logs, roles, graph
│   │   └── simulate.js        # Demo scenario simulator endpoint
│   ├── db.js                  # JSON file read/write helpers
│   ├── server.js              # Express app entry point
│   └── package.json
└── frontend\
    ├── src\
    │   ├── pages\
    │   │   ├── Login.jsx          # Select tenant + user
    │   │   ├── Dashboard.jsx      # Admin dashboard (logs, graph)
    │   │   ├── Simulator.jsx      # Demo: fire requests, see results
    │   │   └── RoleManager.jsx    # View roles + hierarchy
    │   ├── components\
    │   │   ├── RoleGraph.jsx      # D3.js force-directed graph
    │   │   ├── AuditTable.jsx     # Audit log table
    │   │   ├── FirewallResult.jsx # ALLOW/DENY response card
    │   │   └── Navbar.jsx
    │   ├── api.js                 # Axios API calls
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    └── package.json
```

---

### Backend

#### [NEW] `backend/data/*.json` — Seed Data
Pre-seeded with 2 tenants, roles (Employee→Manager→Admin chain), users, and role inheritance edges to demo the escalation scenario.

#### [NEW] `backend/engine/graphBuilder.js`
Builds an adjacency list from `role_inheritance.json` for a given tenant's roles.

#### [NEW] `backend/engine/escalationDetector.js`
- `getInheritedRoles(roleId, graph)` — DFS traversal returning all reachable roles
- `detectEscalation(userId, requiredPermission, tenantId)` — full check:
  1. Fetch user → validate tenant match
  2. Get user's direct role → check direct permissions
  3. Build graph → DFS traverse to find all inherited permissions
  4. If inherited permission is a "sensitive" permission → **ESCALATION FLAGGED**
  5. Handle circular inheritance via visited set

#### [NEW] `backend/middleware/permissionFirewall.js`
Express middleware that:
1. Reads `X-User-ID` and `X-Resource-Tenant` headers
2. Calls the escalation detector
3. On DENY → returns `{ status: "DENIED", reason: "..." }` + logs to audit
4. On ALLOW → calls `next()` + logs to audit

#### [NEW] `backend/routes/` — API Routes
- `POST /api/auth/login` → returns user info
- `GET /api/resources/:resourceId` → protected by firewall middleware
- `GET /api/admin/logs` → audit log
- `GET /api/admin/roles` → all roles + inheritance
- `POST /api/simulate` → fires a simulated access request and returns firewall result

#### [NEW] `backend/server.js` — Express Entry Point
Sets up CORS, JSON body parsing, mounts all routes.

---

### Frontend

#### [NEW] `frontend/src/pages/Login.jsx`
Dropdown to select tenant + user. Sets session context. Clean animated login card.

#### [NEW] `frontend/src/pages/Simulator.jsx` ⭐ *Key Demo Page*
- Select a user (including cross-tenant users to demo leakage)
- Select a resource + action
- Hit "Check Access" → shows animated ALLOW ✅ or DENY ❌ card
- Shows the full escalation path explanation

#### [NEW] `frontend/src/pages/Dashboard.jsx`
- Real-time audit log table (auto-refreshes)
- Stats: total requests, blocked %, escalations detected
- Role hierarchy graph (D3.js)

#### [NEW] `frontend/src/pages/RoleManager.jsx`
- View all roles per tenant
- View inheritance relationships
- Highlight escalation paths

#### [NEW] `frontend/src/components/RoleGraph.jsx`
D3.js force-directed graph showing role nodes and directed inheritance edges. Escalation paths highlighted in red.

#### [NEW] `frontend/src/index.css`
Dark theme, glassmorphism cards, vibrant accent colors (security/cyber aesthetic).

---

## Seed Data (Demo Scenarios)

### Tenant A — "Acme Corp"
| Role | Permissions | Inherits From |
|---|---|---|
| Employee | `read:reports` | — |
| Manager | `read:reports`, `write:reports` | Employee |
| Admin | `read:reports`, `write:reports`, `delete:users`, `manage:billing` | Manager |

**User**: `alice` → role: `Employee` (Tenant A)  
**Escalation**: Employee → Manager → Admin → has `delete:users` (SENSITIVE) → **BLOCKED**

### Tenant B — "Beta Inc"
**User**: `bob` → role: `Admin` (Tenant B)  
**Cross-tenant test**: `bob` tries to access Tenant A resource → **BLOCKED (tenant mismatch)**

---

## Verification Plan

### Automated
- Start backend (`npm run dev` in `/backend`)
- Start frontend (`npm run dev` in `/frontend`)
- Run through demo scenarios in the Simulator page

### Manual Demo Flow
1. Login as `alice` (Tenant A, Employee)
2. Request access to `delete:users` resource → ❌ BLOCKED with escalation path
3. Login as `bob` (Tenant B, Admin)
4. Request Tenant A resource → ❌ BLOCKED (cross-tenant)
5. Login as `charlie` (Tenant A, Admin, direct permission)
6. Request `read:reports` → ✅ ALLOWED
7. View audit log → all 3 requests logged
8. View role graph → escalation path highlighted in red
