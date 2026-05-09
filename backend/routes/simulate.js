/**
 * routes/simulate.js - Demo Scenario Simulator
 *
 * Allows the frontend to fire arbitrary permission check scenarios
 * without needing to set complex headers. Perfect for live demos.
 */

'use strict';

const express = require('express');
const { evaluate } = require('../engine/escalationDetector');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const router = express.Router();

/**
 * POST /api/simulate
 * Body: { userId, resourceTenantId, requiredPermission, resource, action }
 */
router.post('/', async (req, res, next) => {
  const requestedUserId = req.body?.userId;
  const userId = requestedUserId || req.auth?.userId;
  const { resourceTenantId, requiredPermission, resource, action } = req.body;

  if (!userId || !resourceTenantId || !requiredPermission) {
    return res.status(400).json({
      error: 'Required fields: userId, resourceTenantId, requiredPermission'
    });
  }

  try {
    const result = await evaluate({
      userId,
      resourceTenantId,
      requiredPermission,
      resource: resource || 'simulated-resource',
      action: action || 'ACCESS'
    });

    const users = await db.read('users');
    const user = users.find((u) => u.id === userId);
    const actorUserId = req.auth?.userId || null;
    const actorUser = users.find((u) => u.id === actorUserId);
    const isScenarioOverride = Boolean(actorUserId && userId && actorUserId !== userId);

    const logEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      user_id: userId,
      user_name: user?.name || 'Unknown',
      user_tenant_id: user?.tenant_id || null,
      resource_tenant_id: resourceTenantId,
      resource: resource || 'simulated-resource',
      action: action || 'ACCESS',
      required_permission: requiredPermission,
      result: result.decision,
      reason: result.reason,
      escalation_path: result.escalationPath,
      details: result.details,
      source: 'simulator',
      actor_user_id: actorUserId,
      actor_user_name: actorUser?.name || null,
      actor_tenant_id: actorUser?.tenant_id || req.auth?.tenantId || null,
      scenario_override: isScenarioOverride
    };

    try {
      await db.append('audit_log', logEntry);
    } catch (_error) {}

    res.json({
      decision: result.decision,
      reason: result.reason,
      escalationPath: result.escalationPath,
      details: result.details,
      actorUserId,
      simulatedUserId: userId,
      scenarioOverride: isScenarioOverride,
      auditId: logEntry.id,
      timestamp: logEntry.timestamp
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/simulate/scenarios - pre-built demo scenarios
router.get('/scenarios', (_req, res) => {
  res.json({
    scenarios: [
      {
        id: 'escalation-demo',
        label: 'Privilege Escalation via Role Chain',
        description: 'Employee (Alicia Chen) attempts to delete users, triggers escalation detection via Employee -> Manager -> Admin chain',
        userId: 'user-alice',
        resourceTenantId: 'tenant-a',
        requiredPermission: 'delete:users',
        resource: 'users-directory',
        action: 'DELETE',
        expectedDecision: 'DENY'
      },
      {
        id: 'cross-tenant-demo',
        label: 'Cross-Tenant Access Violation',
        description: 'Robert Martinez (Tenant B Admin) attempts to access Tenant A resource, triggers tenant isolation enforcement',
        userId: 'user-bob',
        resourceTenantId: 'tenant-a',
        requiredPermission: 'read:reports',
        resource: 'reports-db',
        action: 'GET',
        expectedDecision: 'DENY'
      },
      {
        id: 'legitimate-access',
        label: 'Legitimate Direct Permission',
        description: 'Charlie Davis (Tenant A Admin) reads reports, direct permission, no escalation',
        userId: 'user-charlie',
        resourceTenantId: 'tenant-a',
        requiredPermission: 'read:reports',
        resource: 'reports-db',
        action: 'GET',
        expectedDecision: 'ALLOW'
      },
      {
        id: 'sensitive-direct',
        label: 'Sensitive Permission - Direct Admin',
        description: 'Charlie Davis (Tenant A Admin) deletes a user, sensitive permission directly assigned',
        userId: 'user-charlie',
        resourceTenantId: 'tenant-a',
        requiredPermission: 'delete:users',
        resource: 'user-002',
        action: 'DELETE',
        expectedDecision: 'ALLOW'
      },
      {
        id: 'no-permission',
        label: 'Insufficient Permissions',
        description: 'Diana Wu (Tenant B Analyst) tries to manage billing, not in her permission set',
        userId: 'user-diana',
        resourceTenantId: 'tenant-b',
        requiredPermission: 'manage:billing',
        resource: 'billing-portal',
        action: 'GET',
        expectedDecision: 'DENY'
      },
      {
        id: 'apex-escalation',
        label: 'Apex Escalation - Intern to Admin Chain',
        description: 'Evelyn Roy (Apex Intern) attempts to manage tenants, inherited only through deep role chain',
        userId: 'user-evelyn',
        resourceTenantId: 'tenant-c',
        requiredPermission: 'manage:tenants',
        resource: 'tenant-admin',
        action: 'PATCH',
        expectedDecision: 'DENY'
      },
      {
        id: 'apex-direct-admin',
        label: 'Apex Direct Admin Access',
        description: 'Gina Patel (Apex Admin) directly uses manage:tenants permission',
        userId: 'user-gina',
        resourceTenantId: 'tenant-c',
        requiredPermission: 'manage:tenants',
        resource: 'tenant-admin',
        action: 'PATCH',
        expectedDecision: 'ALLOW'
      }
    ]
  });
});

module.exports = router;

