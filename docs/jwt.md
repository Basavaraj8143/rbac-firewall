# JWT Flow (Current Implementation)

## 1. Login Requests

Two login paths issue JWT now:

- `POST /api/auth/login` (demo user select)
- `POST /api/auth/login/secure` (email + password)

Frontend entry points:

- `frontend/src/pages/Login.jsx`
- `frontend/src/api.js`

Backend route:

- `backend/routes/auth.js`

## 2. Credential Validation (Secure Login)

For `/api/auth/login/secure`, backend:

1. Reads `email` and `password`
2. Hashes password with SHA-256 + salt (`AUTH_PASSWORD_SALT`, fallback `fw_demo_salt`)
3. Compares with stored `password_hash`

If mismatch, response is `401 Invalid credentials`.

## 3. JWT Payload and Signing

On successful login (demo or secure), backend builds payload:

- `sub`
- `email`
- `tenant_id`
- `role_id`
- `mode`
- `iat`
- `exp`

Token details:

- Algorithm: `HS256`
- Secret: `AUTH_JWT_SECRET` (fallback `replace-this-dev-secret`)
- Expiry: `8 hours` (`expiresIn`)

Response includes:

```json
{
  "success": true,
  "mode": "demo|secure",
  "token": "<jwt>",
  "expiresIn": 28800,
  "user": { "...": "..." }
}
```

## 4. Frontend Session Storage and Transport

Frontend stores:

- `fw_user` in `localStorage`
- `fw_auth_meta` with `mode`, `token`, `expiresIn`

Axios request interceptor automatically adds:

- `Authorization: Bearer <token>`

Files:

- `frontend/src/context/AuthContext.jsx`
- `frontend/src/api.js`

## 5. JWT Enforcement on Protected APIs

Protected groups now require valid Bearer token:

- `/api/resources/*`
- `/api/admin/*`
- `/api/simulate/*`

Middleware:

- `backend/middleware/requireAuth.js`

Checks:

1. Bearer token present
2. JWT signature valid
3. Token not expired
4. Required claims present (`sub`, `tenant_id`, `role_id`)

Then attaches:

```js
req.auth = {
  userId,
  email,
  tenantId,
  roleId,
  mode,
  tokenExp
};
```

## 6. Firewall Identity Source

Permission firewall now uses token identity (`req.auth.userId`) instead of trusting client `x-user-id`.

File:

- `backend/middleware/permissionFirewall.js`

## 7. Simulator Override Behavior

`/api/simulate` is authenticated, but still supports scenario override:

- Request can send a different `userId` for simulation
- Actor identity is still taken from JWT (`req.auth.userId`)
- Audit captures both actor and simulated user

Extra audit fields:

- `actor_user_id`
- `actor_user_name`
- `actor_tenant_id`
- `scenario_override`

## 8. Public vs Protected Routes

Public:

- `/api/health`
- `/api/auth/*`

Protected:

- `/api/resources/*`
- `/api/admin/*`
- `/api/simulate/*`

## 9. Next Hardening Step

JWT auth is implemented. Next recommended step is role-based guard for admin routes (for example, allow only admin roles on `/api/admin/*`).
