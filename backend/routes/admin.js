/**
 * routes/admin.js — Admin & Observability Routes
 * Exposes audit logs, role graph, and statistics for the dashboard.
 */

'use strict';

const express                    = require('express');
const db                         = require('../db');
const { buildRoleGraph, serializeGraph } = require('../engine/graphBuilder');
const router                     = express.Router();

// GET /api/admin/logs — paginated audit log
router.get('/logs', (req, res) => {
  const logs  = db.read('audit_log');
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 50;
  const start = (page - 1) * limit;

  // Sort newest first
  const sorted = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    total:  logs.length,
    page,
    limit,
    logs:   sorted.slice(start, start + limit)
  });
});

// GET /api/admin/stats — summary statistics for dashboard cards
router.get('/stats', (_req, res) => {
  const logs   = db.read('audit_log');
  const total  = logs.length;
  const denied = logs.filter(l => l.result === 'DENY').length;
  const escalations = logs.filter(l => l.escalation_path && l.escalation_path.length > 0).length;
  const crossTenant = logs.filter(l => l.user_tenant_id !== l.resource_tenant_id).length;

  res.json({
    total_requests:    total,
    allowed:           total - denied,
    denied,
    escalations_caught: escalations,
    cross_tenant_blocked: crossTenant,
    block_rate:        total > 0 ? ((denied / total) * 100).toFixed(1) : '0.0'
  });
});

// GET /api/admin/roles — all roles with inheritance edges
router.get('/roles', (req, res) => {
  const roles       = db.read('roles');
  const tenants     = db.read('tenants');
  const inheritance = db.read('role_inheritance');

  res.json({ roles, tenants, inheritance });
});

// GET /api/admin/graph/:tenantId — serialized role graph for visualization
router.get('/graph/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  const roles  = db.read('roles');
  const graph  = buildRoleGraph(tenantId);
  const serial = serializeGraph(graph, roles);

  // Build D3-compatible nodes + links format
  const tenantRoles = roles.filter(r => r.tenant_id === tenantId);
  const inheritance = db.read('role_inheritance').filter(e => e.tenant_id === tenantId);

  const nodes = tenantRoles.map(r => ({
    id:    r.id,
    name:  r.name,
    level: r.level,
    permissions: r.permissions
  }));

  const links = inheritance.map(e => ({
    source:      e.child_role_id,
    target:      e.parent_role_id,
    description: e.description
  }));

  res.json({ tenantId, nodes, links, adjacencyList: serial });
});

// DELETE /api/admin/logs — clear audit log (for demo reset)
router.delete('/logs', (_req, res) => {
  db.write('audit_log', []);
  res.json({ success: true, message: 'Audit log cleared' });
});

module.exports = router;
