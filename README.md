<div align="center">

# 🔥 Permission Firewall

### Multi-Tenant RBAC Escalation Detection System

*Intercepts API requests · Detects indirect privilege escalation · Enforces tenant isolation · Explains every denial*

![Stack](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-339933?logo=node.js)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61DAFB?logo=react)
![Graph](https://img.shields.io/badge/graph-D3.js-F9A03C?logo=d3.js)
![License](https://img.shields.io/badge/license-MIT-green)
![Team](https://img.shields.io/badge/team-Byte--Harvest-blueviolet)

</div>

---

## What is Permission Firewall?

Most RBAC systems check *direct* permissions. Permission Firewall goes deeper — it traverses your entire role inheritance graph (DFS/BFS) to catch **indirect privilege escalation** before it reaches your API.

If a user's role chain leads to a sensitive permission they shouldn't have, the request is blocked — with a full explanation of the escalation path returned in the response.

---

## Features

| Feature | Description |
|---|---|
| 🛡️ Escalation Detection | DFS/BFS traversal of role inheritance graphs catches indirect permission gains before they reach your API |
| 🏢 Tenant Isolation | Hard-blocks cross-tenant resource access regardless of role level — no exceptions |
| 💬 Explainable Denials | Every block returns a structured reason with the full escalation path and the sensitive permission flagged |
| 📋 Real-Time Audit Log | Persists every access attempt — allowed or denied — with user, tenant, resource, and timestamp |
| 📊 Admin Dashboard | Live log table, stats, and a D3.js force-directed role graph with escalation paths highlighted in red |
| 🗄️ Zero External DB | JSON flat-file store by default — swap to MongoDB without touching business logic |

---

## How It Works

Every request to a protected resource passes through `permissionFirewall.js`:

```
Incoming Request
      │
      ▼
 Read X-User-ID + X-Resource-Tenant headers
      │
      ▼
 Validate user exists + belongs to requested tenant
      │
      ├── ❌ Tenant mismatch → DENY (cross-tenant blocked)
      │
      ▼
 Fetch user's direct role + permissions
      │
      ▼
 Build role inheritance graph for tenant
      │
      ▼
 DFS traversal → collect all inherited permissions
 (cycle detection via visited set)
      │
      ▼
 Inherited permission = SENSITIVE?
      │
      ├── ✅ No → ALLOW + write audit log
      │
      └── ❌ Yes → DENY + escalation path + write audit log
```

**Escalation response (DENY):**
```json
{
  "status": "DENIED",
  "reason": "Indirect escalation detected via role inheritance",
  "escalationPath": ["Employee", "Manager", "Admin"],
  "sensitivePermission": "delete:users"
}
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| Database | JSON flat-file (prototype) — MongoDB-ready |
| Graph Engine | Custom DFS/BFS (JavaScript) |
| Visualization | D3.js — force-directed role graph |

---

## Seed Data

### Tenant A — Acme Corp

| Role | Permissions | Inherits From |
|---|---|---|
| Employee | `read:reports` | — |
| Manager | `read:reports`, `write:reports` | Employee |
| Admin | `read:reports`, `write:reports`, `delete:users`, `manage:billing` | Manager |

### Tenant B — Beta Inc

| Role | Permissions | Inherits From |
|---|---|---|
| Admin | `read:reports`, `write:reports`, `delete:users` | — |

### Users

| User | Tenant | Role |
|---|---|---|
| `alice` | Acme Corp | Employee |
| `bob` | Beta Inc | Admin |
| `charlie` | Acme Corp | Admin |

---

## Demo Scenarios

**1. Privilege Escalation — Blocked**
Login as `alice` (Tenant A · Employee) → request `delete:users`
> ❌ DENIED — `Employee → Manager → Admin → delete:users (SENSITIVE)`

**2. Cross-Tenant Access — Blocked**
Login as `bob` (Tenant B · Admin) → request a Tenant A resource
> ❌ DENIED — Tenant mismatch: `Beta Inc` cannot access `Acme Corp` resources

**3. Direct Permission — Allowed**
Login as `charlie` (Tenant A · Admin) → request `read:reports`
> ✅ ALLOWED — Permission held directly by role

**4. Audit Log**
After all 3 scenarios → navigate to Dashboard → all requests logged with full context.

---

## Getting Started

### Prerequisites
- Node.js v18+
- npm

**Backend**
```bash
cd backend
npm install
npm run dev
# http://localhost:3000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

> CORS is pre-configured. No proxy setup needed.

---

## Project Structure

```
firewall/
├── backend/
│   ├── data/
│   │   ├── tenants.json            # Tenant seed data
│   │   ├── roles.json              # Roles + permissions per tenant
│   │   ├── role_inheritance.json   # Parent → Child role edges
│   │   ├── users.json              # Users with tenant + role assignment
│   │   └── audit_log.json          # Persisted audit log
│   ├── engine/
│   │   ├── graphBuilder.js         # Builds adjacency list from role edges
│   │   └── escalationDetector.js   # DFS/BFS traversal + escalation logic
│   ├── middleware/
│   │   └── permissionFirewall.js   # Express middleware — core firewall
│   ├── routes/
│   │   ├── auth.js                 # Login (select-user flow)
│   │   ├── resources.js            # Protected demo resources
│   │   ├── admin.js                # Audit logs, roles, graph data
│   │   └── simulate.js             # Demo scenario simulator
│   ├── db.js                       # JSON file read/write helpers
│   └── server.js                   # Express app entry point
└── frontend/
    └── src/
        ├── pages/
        │   ├── Login.jsx           # Select tenant + user
        │   ├── Dashboard.jsx       # Admin: logs, stats, graph
        │   ├── Simulator.jsx       # Fire requests, see ALLOW/DENY
        │   └── RoleManager.jsx     # View roles + inheritance
        └── components/
            ├── RoleGraph.jsx       # D3.js force-directed graph
            ├── AuditTable.jsx      # Audit log table
            ├── FirewallResult.jsx  # ALLOW ✅ / DENY ❌ card
            └── Navbar.jsx
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Returns user info for selected user |
| `GET` | `/api/resources/:resourceId` | Protected resource (firewall applied) |
| `GET` | `/api/admin/logs` | Full audit log |
| `GET` | `/api/admin/roles` | All roles + inheritance per tenant |
| `POST` | `/api/simulate` | Fire a simulated access request |

**Required headers for protected routes:**
```
X-User-ID: alice
X-Resource-Tenant: tenant-a
```

---

## Roadmap

- [ ] Swap JSON flat-file for MongoDB
- [ ] JWT-based authentication
- [ ] Time-bounded role assignments
- [ ] Webhook alerts on escalation detection
- [ ] Export audit log as CSV

---

## License

MIT License

---

<div align="center">

Built by **Byte-Harvest** — Akash M K · Ishan Patil · Disha H · Bass

</div>