/**
 * routes/auth.js - Authentication Routes
 * Supports both demo identity-select login and secure email/password login.
 */

'use strict';

const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const router = express.Router();

const PASSWORD_SALT = process.env.AUTH_PASSWORD_SALT || 'fw_demo_salt';
const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'replace-this-dev-secret';
const JWT_EXP_SECONDS = 60 * 60 * 8;

function hashPassword(password) {
  return crypto.createHash('sha256').update(`${password}${PASSWORD_SALT}`).digest('hex');
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signingInput}.${signature}`;
}

function buildAuthUser(user, roles, tenants) {
  const role = roles.find((r) => r.id === user.role_id);
  const tenant = tenants.find((t) => t.id === user.tenant_id);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    tenant_id: user.tenant_id,
    tenantName: tenant?.name,
    role_id: user.role_id,
    roleName: role?.name,
    roleLevel: role?.level,
    permissions: role?.permissions || []
  };
}

// GET /api/auth/users - list all users (for demo dropdown)
router.get('/users', (_req, res) => {
  const users = db.read('users');
  const roles = db.read('roles');
  const tenants = db.read('tenants');

  const enriched = users.map((u) => {
    const role = roles.find((r) => r.id === u.role_id);
    const tenant = tenants.find((t) => t.id === u.tenant_id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      tenant_id: u.tenant_id,
      tenantName: tenant?.name,
      role_id: u.role_id,
      roleName: role?.name,
      roleLevel: role?.level
    };
  });

  res.json({ users: enriched });
});

// POST /api/auth/login - demo login by userId
router.post('/login', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  const users = db.read('users');
  const roles = db.read('roles');
  const tenants = db.read('tenants');

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    success: true,
    mode: 'demo',
    user: buildAuthUser(user, roles, tenants)
  });
});

// POST /api/auth/login/secure - secure login by email/password
router.post('/login/secure', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }

  const users = db.read('users');
  const roles = db.read('roles');
  const tenants = db.read('tenants');

  const user = users.find((u) => String(u.email).toLowerCase() === String(email).toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const providedHash = hashPassword(password);
  if (providedHash !== user.password_hash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    tenant_id: user.tenant_id,
    role_id: user.role_id,
    mode: 'secure',
    iat: now,
    exp: now + JWT_EXP_SECONDS
  };

  const token = signJwt(payload);

  res.json({
    success: true,
    mode: 'secure',
    token,
    expiresIn: JWT_EXP_SECONDS,
    user: buildAuthUser(user, roles, tenants)
  });
});

module.exports = router;
