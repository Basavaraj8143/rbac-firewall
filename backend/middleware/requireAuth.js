/**
 * requireAuth.js - JWT authentication middleware
 */

'use strict';

const crypto = require('crypto');

const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'replace-this-dev-secret';

function base64urlDecode(input) {
  const normalized = String(input).replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function verifyJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid token signature' };
  }

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (typeof payload.exp !== 'number' || payload.exp <= now) {
      return { valid: false, error: 'Token expired' };
    }

    if (!payload.sub || !payload.tenant_id || !payload.role_id) {
      return { valid: false, error: 'Token missing required claims' };
    }

    return { valid: true, payload };
  } catch (_error) {
    return { valid: false, error: 'Invalid token payload' };
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }

  const token = authHeader.slice(7).trim();
  const result = verifyJwt(token);
  if (!result.valid) {
    return res.status(401).json({ error: result.error });
  }

  req.auth = {
    userId: result.payload.sub,
    email: result.payload.email,
    tenantId: result.payload.tenant_id,
    roleId: result.payload.role_id,
    mode: result.payload.mode || 'secure',
    tokenExp: result.payload.exp
  };

  return next();
}

module.exports = requireAuth;
