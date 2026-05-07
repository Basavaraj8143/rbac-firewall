/**
 * permissionFirewall.js - Real-time permission enforcement middleware
 */

'use strict';

const { v4: uuidv4 } = require('uuid');
const { evaluate } = require('../engine/escalationDetector');
const db = require('../db');

function firewall(requiredPermission) {
  return async function permissionFirewallMiddleware(req, res, next) {
    const userId = req.headers['x-user-id'];
    const resourceTenantId = req.headers['x-resource-tenant-id'];
    const resource = req.headers['x-resource'] || req.path;
    const action = req.headers['x-action'] || req.method;

    if (!userId || !resourceTenantId) {
      return res.status(400).json({
        status: 'ERROR',
        reason: 'Missing required headers: x-user-id and x-resource-tenant-id are mandatory'
      });
    }

    try {
      const result = await evaluate({
        userId,
        resourceTenantId,
        requiredPermission,
        resource,
        action
      });

      const logEntry = await buildAuditEntry({
        userId,
        resourceTenantId,
        resource,
        action,
        requiredPermission,
        result
      });

      try {
        await db.append('audit_log', logEntry);
      } catch (error) {
        console.error('[FIREWALL] Audit log write failed:', error.message);
      }

      if (result.decision === 'DENY') {
        console.log(`[FIREWALL] DENY  | user=${userId} | perm=${requiredPermission} | ${result.reason}`);
        return res.status(403).json({
          status: 'DENIED',
          reason: result.reason,
          escalationPath: result.escalationPath,
          details: result.details,
          auditId: logEntry.id,
          timestamp: logEntry.timestamp
        });
      }

      console.log(`[FIREWALL] ALLOW | user=${userId} | perm=${requiredPermission}`);
      req.firewallResult = result;
      req.auditId = logEntry.id;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

async function buildAuditEntry({ userId, resourceTenantId, resource, action, requiredPermission, result }) {
  const user = await db.findOne('users', { id: userId }, { projection: { _id: 0 } });

  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    user_id: userId,
    user_name: user?.name || 'Unknown',
    user_tenant_id: user?.tenant_id || null,
    resource_tenant_id: resourceTenantId,
    resource,
    action,
    required_permission: requiredPermission,
    result: result.decision,
    reason: result.reason,
    escalation_path: result.escalationPath,
    details: result.details
  };
}

module.exports = firewall;
