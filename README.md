<div align="center">

# Permission Firewall

### Multi-Tenant RBAC Escalation Detection System

*Intercepts API requests · Detects indirect privilege escalation · Enforces tenant isolation · Explains every denial*

![Stack](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-339933?logo=node.js)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61DAFB?logo=react)
![Graph](https://img.shields.io/badge/graph-D3.js-F9A03C?logo=d3.js)
![License](https://img.shields.io/badge/license-MIT-green)
![Team](https://img.shields.io/badge/team-Byte--Harvest-blueviolet)

</div>

Permission Firewall intercepts access requests, validates tenant boundaries, traverses role inheritance (DFS/BFS), and blocks indirect privilege escalation with explainable denial reasons.

## Current Stack

- Backend: Node.js + Express
- Frontend: React + Vite
- Storage: JSON flat files (prototype-friendly)
- Graph + Detection: Custom DFS/BFS role traversal
- Visualization: D3.js role graph

## Core Features

- Indirect privilege escalation detection via role chain traversal
- Strict cross-tenant isolation checks
- Explainable ALLOW/DENY responses (with escalation path)
- Audit logging of every decision
- Simulator with preset scenarios and custom checks
- Dashboard with stats, logs, and on-demand graphs
- Role hierarchy graph by tenant
- Login modes:
  - Demo Login (user picker)
  - Secure Login (email + password + JWT issuance)

## Important Auth Note

Secure login now issues JWT tokens, but protected API routes are not yet enforcing Bearer token verification.

- Implemented: JWT generation in `POST /api/auth/login/secure`
- Not yet enforced: token verification middleware on `/api/resources`, `/api/admin`, `/api/simulate`

This means secure mode is currently useful for professional login flow and session metadata, but not full API auth enforcement yet.

## Tenants and Role Model

Current seeded tenants:
- Acme Corp (`tenant-a`)
- Beta Inc (`tenant-b`)
- Apex Solutions (`tenant-c`)

Apex Solutions includes a deeper hierarchy for stronger demos:
- Intern -> Analyst -> Team Lead -> Security Lead -> Admin

## Project Structure

```text
firewall/
  backend/
    data/
      tenants.json
      roles.json
      role_inheritance.json
      users.json
      audit_log.json
    engine/
      graphBuilder.js
      escalationDetector.js
    middleware/
      permissionFirewall.js
    routes/
      auth.js
      resources.js
      admin.js
      simulate.js
    db.js
    server.js
  frontend/
    src/
      pages/
      components/
      context/
      api.js
```

## Run Locally

### Prerequisites

- Node.js 18+
- npm

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on: `http://localhost:3001`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

CORS is configured for `http://localhost:5173`.

## Environment Variables (Optional but Recommended)

Backend auth settings (for secure login):

- `AUTH_PASSWORD_SALT` (default: `fw_demo_salt`)
- `AUTH_JWT_SECRET` (default fallback exists, but set your own in real usage)

Example PowerShell:

```powershell
$env:AUTH_PASSWORD_SALT="your_salt"
$env:AUTH_JWT_SECRET="your_strong_secret"
npm run dev
```

## Auth API

### Demo Login

- `GET /api/auth/users`
- `POST /api/auth/login`
  - body: `{ "userId": "user-alice" }`

### Secure Login

- `POST /api/auth/login/secure`
  - body: `{ "email": "user@domain", "password": "..." }`
  - response includes `token`, `expiresIn`, and `user`

## Main APIs

- `POST /api/simulate` - run a simulated permission decision
- `GET /api/simulate/scenarios` - preset scenarios
- `GET /api/admin/logs` - paginated audit log
- `GET /api/admin/stats` - stats summary
- `GET /api/admin/roles` - roles + tenants + inheritance
- `GET /api/admin/graph/:tenantId` - graph data for D3

Protected resource examples:
- `GET /api/resources/reports` (`read:reports`)
- `POST /api/resources/reports` (`write:reports`)
- `DELETE /api/resources/users/:id` (`delete:users`)
- `GET /api/resources/billing` (`manage:billing`)
- `GET /api/resources/export` (`export:data`)

Required headers for protected resource routes:

- `x-user-id`
- `x-resource-tenant-id`

## Firewall Evaluation Flow

1. Resolve user and direct role
2. Enforce tenant isolation
3. Check direct permission
4. Build tenant role graph
5. DFS traversal over inherited roles (cycle-safe)
6. Detect inherited sensitive permission escalation
7. Return ALLOW or DENY and log audit event

## Simulator Behavior

- User identity is locked to current login by default
- Scenario selections can override user identity for demo cases
- Engine pipeline is shown progressively with delayed step messages after clicking "Run Firewall Check"

## Known Limitations

- JWT verification middleware not yet enforced on protected APIs
- JSON file storage is single-node prototype storage (not production scale)
- No password reset or account lockout flow yet

## Suggested Next Steps

1. Add JWT verification middleware and protect all sensitive routes
2. Move auth token to `httpOnly` cookie for stronger browser security
3. Add role-based frontend route guards (admin-only views)
4. Migrate storage from JSON files to a real database

## License

MIT
