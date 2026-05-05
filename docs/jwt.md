Secure login request

Frontend calls POST /api/auth/login/secure with email + password.

File: Login.jsx, api.js



Password verification

Backend hashes incoming password with SHA-256 + salt (AUTH_PASSWORD_SALT or fw_demo_salt).

Compares hash with password_hash in users.json.

File: auth.js



JWT creation

If valid, backend creates JWT payload:

sub, email, tenant_id, role_id, mode, iat, exp




Token is signed with HMAC-SHA256 using AUTH_JWT_SECRET (fallback: replace-this-dev-secret).

Returns { token, expiresIn, user }.

File: auth.js



Frontend storage

Frontend stores:

user in localStorage key fw_user

auth meta (mode, token, expiresIn) in fw_auth_meta




File: AuthContext.jsx



Important current limitation

JWT is issued but not enforced yet on protected APIs.

Routes like /api/resources, /api/admin, /api/simulate are not currently verifying Bearer token.

So right now JWT is mainly for login/session metadata, not full backend authorization.



What to add for full JWT security

Add auth middleware to verify token signature + expiry.

Attach decoded user to req.user.

Protect routes with that middleware.

Prefer httpOnly cookie (or at least send Bearer token on each request).