/**
 * permissionFirewall.js — Real-Time Permission Enforcement Middleware
 *
 * This is the "firewall" — it sits in front of every protected route and
 * intercepts the request BEFORE any business logic runs.
 *
 * Request Headers Expected:
 *   x-user-id            : ID of the requesting user
 *   x-resource-tenant-id : Tenant that owns the target resource
 *   x-required-permission: Permission required for this action
 *   x-resource           : Resource name (for audit logging)
 *   x-action             : Action being performed (for audit logging)
 *
 * On ALLOW → attaches evaluation result to req.firewallResult, calls next()
 * On DENY  → returns 403 JSON response + writes audit log
 */

'use strict';

const { v4: uuidv4 }   = require('uuid');
const { evaluate }     = require('../engine/escalationDetector');
const db               = require('../db');

/**
 * Factory function — returns an Express middleware configured for a specific
 * required permission. This allows per-route permission requirements:
 *
 * router.get('/reports', firewall('read:reports'), handler)
 * router.delete('/users/:id', firewall('delete:users'), handler)
 *
 * @param {string} requiredPermission
 */
function firewall(requiredPermission) {
  return function permissionFirewallMiddleware(req, res, next) {
    const userId           = req.headers['x-user-id'];
    const resourceTenantId = req.headers['x-resource-tenant-id'];
    const resource         = req.headers['x-resource']  || req.path;
    const action           = req.headers['x-action']    || req.method;

    // ── Input validation ───────────────────────────────────────────────────
    if (!userId || !resourceTenantId) {
      return res.status(400).json({
        status: 'ERROR',
        reason: 'Missing required headers: x-user-id and x-resource-tenant-id are mandatory'
      });
    }

    // ── Evaluate permission ────────────────────────────────────────────────
    const result = evaluate({
      userId,
      resourceTenantId,
      requiredPermission,
      resource,
      action
    });

    // ── Write audit log ────────────────────────────────────────────────────
    const logEntry = buildAuditEntry({ userId, resourceTenantId, resource, action, requiredPermission, result });
    try {
      db.append('audit_log', logEntry);
    } catch (e) {
      console.error('[FIREWALL] Audit log write failed:', e.message);
    }

    // ── Enforce decision ───────────────────────────────────────────────────
    if (result.decision === 'DENY') {
      console.log(`[FIREWALL] ❌ DENY  | user=${userId} | perm=${requiredPermission} | ${result.reason}`);
      return res.status(403).json({
        status:         'DENIED',
        reason:         result.reason,
        escalationPath: result.escalationPath,
        details:        result.details,
        auditId:        logEntry.id,
        timestamp:      logEntry.timestamp
      });
    }

    console.log(`[FIREWALL] ✅ ALLOW | user=${userId} | perm=${requiredPermission}`);
    req.firewallResult = result;
    req.auditId        = logEntry.id;
    next();
  };
}

/**
 * Build a structured audit log entry.
 */
function buildAuditEntry({ userId, resourceTenantId, resource, action, requiredPermission, result }) {
  const users = db.read('users');
  const user  = users.find(u => u.id === userId);

  return {
    id:                  uuidv4(),
    timestamp:           new Date().toISOString(),
    user_id:             userId,
    user_name:           user?.name || 'Unknown',
    user_tenant_id:      user?.tenant_id || null,
    resource_tenant_id:  resourceTenantId,
    resource,
    action,
    required_permission: requiredPermission,
    result:              result.decision,
    reason:              result.reason,
    escalation_path:     result.escalationPath,
    details:             result.details
  };
}

module.exports = firewall;
