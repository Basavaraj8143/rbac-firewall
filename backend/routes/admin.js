/**
 * routes/admin.js - Admin and observability routes
 */

'use strict';

const express = require('express');
const db = require('../db');
const { buildRoleGraph, serializeGraph } = require('../engine/graphBuilder');

const router = express.Router();

// GET /api/admin/logs - paginated audit log
router.get('/logs', (req, res) => {
  const logs = db.read('audit_log');
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
});

// GET /api/admin/stats - summary statistics for dashboard cards
router.get('/stats', (_req, res) => {
  const logs = db.read('audit_log');
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
});

// GET /api/admin/roles - all roles with inheritance edges
router.get('/roles', (_req, res) => {
  const roles = db.read('roles');
  const tenants = db.read('tenants');
  const inheritance = db.read('role_inheritance');

  res.json({ roles, tenants, inheritance });
});

// GET /api/admin/graph/:tenantId - serialized role graph for visualization
router.get('/graph/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  const roles = db.read('roles');
  const graph = buildRoleGraph(tenantId);
  const serial = serializeGraph(graph, roles);

  const tenantRoles = roles.filter((role) => role.tenant_id === tenantId);
  const inheritance = db.read('role_inheritance').filter((edge) => edge.tenant_id === tenantId);

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
});

// GET /api/admin/backup - parsed JSON snapshot for backup/data review page
router.get('/backup', (_req, res) => {
  const tenants = db.read('tenants');
  const roles = db.read('roles');
  const inheritance = db.read('role_inheritance');
  const users = db.read('users');
  const auditLog = db.read('audit_log');

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
});

// DELETE /api/admin/logs - clear audit log
router.delete('/logs', (_req, res) => {
  db.write('audit_log', []);
  res.json({ success: true, message: 'Audit log cleared' });
});

module.exports = router;
