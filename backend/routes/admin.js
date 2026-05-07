/**
 * routes/admin.js - Admin and observability routes
 */

'use strict';

const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const { buildRoleGraph, serializeGraph } = require('../engine/graphBuilder');

const router = express.Router();
const PASSWORD_SALT = process.env.AUTH_PASSWORD_SALT || 'fw_demo_salt';
const DEFAULT_DEMO_PASSWORD = process.env.DEFAULT_DEMO_PASSWORD || 'Firewall@2026';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(`${password}${PASSWORD_SALT}`).digest('hex');
}

function toAvatar(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'US';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

// GET /api/admin/logs - paginated audit log
router.get('/logs', async (req, res, next) => {
  try {
    const logs = await db.read('audit_log');
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const start = (page - 1) * limit;

    const sorted = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      total: logs.length,
      page,
      limit,
      logs: sorted.slice(start, start + limit)
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/stats - summary statistics for dashboard cards
router.get('/stats', async (_req, res, next) => {
  try {
    const logs = await db.read('audit_log');
    const total = logs.length;
    const denied = logs.filter((entry) => entry.result === 'DENY').length;
    const escalations = logs.filter((entry) => entry.escalation_path && entry.escalation_path.length > 0).length;
    const crossTenant = logs.filter((entry) => entry.user_tenant_id !== entry.resource_tenant_id).length;

    res.json({
      total_requests: total,
      allowed: total - denied,
      denied,
      escalations_caught: escalations,
      cross_tenant_blocked: crossTenant,
      block_rate: total > 0 ? ((denied / total) * 100).toFixed(1) : '0.0'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/roles - all roles with inheritance edges
router.get('/roles', async (_req, res, next) => {
  try {
    const [roles, tenants, inheritance] = await Promise.all([
      db.read('roles'),
      db.read('tenants'),
      db.read('role_inheritance')
    ]);

    res.json({ roles, tenants, inheritance });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/tenants - create a new tenant/company
router.post('/tenants', async (req, res, next) => {
  try {
    const { id, name, domain } = req.body || {};
    const normalizedName = String(name || '').trim();
    const normalizedDomain = String(domain || '').trim().toLowerCase();
    const generatedId = id ? String(id).trim() : `tenant-${slugify(normalizedName)}`;

    if (!normalizedName || !normalizedDomain) {
      return res.status(400).json({ error: 'name and domain are required' });
    }

    if (!generatedId) {
      return res.status(400).json({ error: 'Unable to generate tenant id' });
    }

    const [existingById, tenants] = await Promise.all([
      db.findOne('tenants', { id: generatedId }),
      db.read('tenants')
    ]);

    if (existingById) {
      return res.status(409).json({ error: `Tenant id "${generatedId}" already exists` });
    }

    const existingByDomain = tenants.find((tenant) => String(tenant.domain).toLowerCase() === normalizedDomain);
    if (existingByDomain) {
      return res.status(409).json({ error: `Domain "${normalizedDomain}" already exists` });
    }

    const tenant = {
      id: generatedId,
      name: normalizedName,
      domain: normalizedDomain
    };

    await db.append('tenants', tenant);
    return res.status(201).json({ success: true, tenant });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/roles - create a new role for a tenant
router.post('/roles', async (req, res, next) => {
  try {
    const { id, tenant_id, name, level, permissions } = req.body || {};
    const normalizedTenantId = String(tenant_id || '').trim();
    const normalizedName = String(name || '').trim();
    const numericLevel = Number(level);
    const permissionList = Array.isArray(permissions)
      ? permissions.map((permission) => String(permission).trim()).filter(Boolean)
      : [];
    const generatedId = id ? String(id).trim() : `role-${slugify(normalizedTenantId)}-${slugify(normalizedName)}`;

    if (!normalizedTenantId || !normalizedName || !Number.isFinite(numericLevel) || permissionList.length === 0) {
      return res.status(400).json({ error: 'tenant_id, name, level, and permissions[] are required' });
    }

    if (numericLevel < 1 || numericLevel > 10) {
      return res.status(400).json({ error: 'level must be between 1 and 10' });
    }

    if (!generatedId) {
      return res.status(400).json({ error: 'Unable to generate role id' });
    }

    const [tenant, roleById, users] = await Promise.all([
      db.findOne('tenants', { id: normalizedTenantId }),
      db.findOne('roles', { id: generatedId }),
      db.read('users')
    ]);

    if (!tenant) {
      return res.status(404).json({ error: `Tenant "${normalizedTenantId}" not found` });
    }

    if (roleById) {
      return res.status(409).json({ error: `Role id "${generatedId}" already exists` });
    }

    const role = {
      id: generatedId,
      tenant_id: normalizedTenantId,
      name: normalizedName,
      level: numericLevel,
      permissions: [...new Set(permissionList)]
    };

    await db.append('roles', role);

    // Auto-create a demo user identity so new role appears in Login dropdown.
    const baseUserId = `user-${slugify(normalizedTenantId)}-${slugify(normalizedName)}`;
    let userId = baseUserId;
    let counter = 2;
    while (users.find((user) => user.id === userId)) {
      userId = `${baseUserId}-${counter}`;
      counter += 1;
    }

    const emailLocal = slugify(`${normalizedName}-user`) || 'user';
    const demoUser = {
      id: userId,
      name: `${normalizedName} User`,
      email: `${emailLocal}@${tenant.domain}`,
      tenant_id: normalizedTenantId,
      role_id: generatedId,
      avatar: toAvatar(normalizedName),
      password_hash: hashPassword(DEFAULT_DEMO_PASSWORD)
    };

    await db.append('users', demoUser);

    return res.status(201).json({
      success: true,
      role,
      user: {
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
        tenant_id: demoUser.tenant_id,
        role_id: demoUser.role_id
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/graph/:tenantId - serialized role graph for visualization
router.get('/graph/:tenantId', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const [roles, graph, inheritanceAll] = await Promise.all([
      db.read('roles'),
      buildRoleGraph(tenantId),
      db.read('role_inheritance')
    ]);
    const serial = serializeGraph(graph, roles);

    const tenantRoles = roles.filter((role) => role.tenant_id === tenantId);
    const inheritance = inheritanceAll.filter((edge) => edge.tenant_id === tenantId);

    const nodes = tenantRoles.map((role) => ({
      id: role.id,
      name: role.name,
      level: role.level,
      permissions: role.permissions
    }));

    const links = inheritance.map((edge) => ({
      source: edge.child_role_id,
      target: edge.parent_role_id,
      description: edge.description
    }));

    res.json({ tenantId, nodes, links, adjacencyList: serial });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/backup - parsed JSON snapshot for backup/data review page
router.get('/backup', async (_req, res, next) => {
  try {
    const [tenants, roles, inheritance, users, auditLog] = await Promise.all([
      db.read('tenants'),
      db.read('roles'),
      db.read('role_inheritance'),
      db.read('users'),
      db.read('audit_log')
    ]);

    res.json({
      generatedAt: new Date().toISOString(),
      counts: {
        tenants: tenants.length,
        roles: roles.length,
        inheritance: inheritance.length,
        users: users.length,
        auditLog: auditLog.length
      },
      tenants,
      roles,
      inheritance,
      users,
      auditLog
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/inheritance - create role inheritance relationship
router.post('/inheritance', async (req, res, next) => {
  try {
    const { parent_role_id, child_role_id, tenant_id, description } = req.body || {};
    const normalizedParentId = String(parent_role_id || '').trim();
    const normalizedChildId = String(child_role_id || '').trim();
    const normalizedTenantId = String(tenant_id || '').trim();
    const descriptionText = String(description || '').trim();

    if (!normalizedParentId || !normalizedChildId || !normalizedTenantId) {
      return res.status(400).json({ error: 'parent_role_id, child_role_id, and tenant_id are required' });
    }

    if (normalizedParentId === normalizedChildId) {
      return res.status(400).json({ error: 'Parent and child roles cannot be the same' });
    }

    const [parentRole, childRole, inheritance] = await Promise.all([
      db.findOne('roles', { id: normalizedParentId }),
      db.findOne('roles', { id: normalizedChildId }),
      db.read('role_inheritance')
    ]);

    if (!parentRole) {
      return res.status(404).json({ error: `Parent role "${normalizedParentId}" not found` });
    }

    if (!childRole) {
      return res.status(404).json({ error: `Child role "${normalizedChildId}" not found` });
    }

    if (parentRole.tenant_id !== normalizedTenantId || childRole.tenant_id !== normalizedTenantId) {
      return res.status(400).json({ error: 'Both roles must belong to the same tenant' });
    }

    const exists = inheritance.find(
      (edge) => edge.parent_role_id === normalizedParentId && edge.child_role_id === normalizedChildId
    );

    if (exists) {
      return res.status(409).json({ error: 'This inheritance relationship already exists' });
    }

    const edge = {
      parent_role_id: normalizedParentId,
      child_role_id: normalizedChildId,
      tenant_id: normalizedTenantId,
      description: descriptionText || `${childRole.name} inherits from ${parentRole.name}`
    };

    await db.append('role_inheritance', edge);
    return res.status(201).json({ success: true, edge });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/logs - clear audit log
router.delete('/logs', async (_req, res, next) => {
  try {
    await db.write('audit_log', []);
    res.json({ success: true, message: 'Audit log cleared' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
