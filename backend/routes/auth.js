/**
 * routes/auth.js — Authentication Routes
 * Simple select-user login for demo purposes.
 */

'use strict';

const express = require('express');
const db      = require('../db');
const router  = express.Router();

// GET /api/auth/users — list all users (for login dropdown)
router.get('/users', (_req, res) => {
  const users   = db.read('users');
  const roles   = db.read('roles');
  const tenants = db.read('tenants');

  const enriched = users.map(u => {
    const role   = roles.find(r => r.id === u.role_id);
    const tenant = tenants.find(t => t.id === u.tenant_id);
    return {
      id:         u.id,
      name:       u.name,
      email:      u.email,
      avatar:     u.avatar,
      tenant_id:  u.tenant_id,
      tenantName: tenant?.name,
      role_id:    u.role_id,
      roleName:   role?.name,
      roleLevel:  role?.level
    };
  });

  res.json({ users: enriched });
});

// POST /api/auth/login — "login" as a selected user
router.post('/login', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const users   = db.read('users');
  const roles   = db.read('roles');
  const tenants = db.read('tenants');

  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const role   = roles.find(r => r.id === user.role_id);
  const tenant = tenants.find(t => t.id === user.tenant_id);

  res.json({
    success: true,
    user: {
      id:          user.id,
      name:        user.name,
      email:       user.email,
      avatar:      user.avatar,
      tenant_id:   user.tenant_id,
      tenantName:  tenant?.name,
      role_id:     user.role_id,
      roleName:    role?.name,
      roleLevel:   role?.level,
      permissions: role?.permissions || []
    }
  });
});

module.exports = router;
