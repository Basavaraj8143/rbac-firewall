/**
 * escalationDetector.js — Permission Escalation Analysis Engine
 *
 * ALGORITHM:
 *   1. Resolve the requesting user's direct role
 *   2. Validate tenant isolation (user.tenant_id must match resource.tenant_id)
 *   3. Check if user's DIRECT role has the required permission → ALLOW
 *   4. Build the role inheritance graph for the tenant
 *   5. DFS traversal from user's role → collect all reachable ancestor roles
 *   6. Aggregate permissions from all reachable roles
 *   7. If the required permission exists in inherited (not direct) roles → ESCALATION DETECTED → DENY
 *   8. If permission not found anywhere → DENY (unauthorized)
 *
 * ESCALATION DEFINITION:
 *   A user holds role R (level L). Via inheritance chain R→P1→P2→...→Pn,
 *   the user transitively gains permission P that belongs to a higher-privilege
 *   role. This constitutes an indirect privilege escalation.
 *
 * CIRCULAR INHERITANCE PROTECTION:
 *   Visited set prevents infinite traversal in cyclic role graphs (A→B→A).
 */

'use strict';

const db                           = require('../db');
const { buildRoleGraph }           = require('./graphBuilder');

// Permissions that require DIRECT assignment — cannot be inherited
const SENSITIVE_PERMISSIONS = new Set([
  'delete:users',
  'manage:billing',
  'export:data',
  'manage:roles',
  'manage:tenants'
]);

/**
 * DFS traversal of the role inheritance graph.
 * Returns an ordered path of role IDs from start to each reachable ancestor.
 *
 * @param {string} startRoleId
 * @param {Map<string, string[]>} graph
 * @returns {{ visitedRoles: Set<string>, escalationPath: string[] }}
 */
function dfsTraverse(startRoleId, graph) {
  const visited       = new Set();
  const escalationPath = [startRoleId];
  const stack          = [{ roleId: startRoleId, path: [startRoleId] }];
  const allPaths       = [];

  while (stack.length > 0) {
    const { roleId, path } = stack.pop();

    if (visited.has(roleId)) continue; // Circular inheritance guard
    visited.add(roleId);

    const parents = graph.get(roleId) || [];
    for (const parentId of parents) {
      if (!visited.has(parentId)) {
        const newPath = [...path, parentId];
        allPaths.push(newPath);
        stack.push({ roleId: parentId, path: newPath });
      }
    }
  }

  return { visitedRoles: visited, allPaths };
}

/**
 * Core permission evaluation function.
 *
 * @param {Object} params
 * @param {string} params.userId          - Requesting user ID
 * @param {string} params.resourceTenantId - Tenant that owns the resource
 * @param {string} params.requiredPermission - Permission needed for the action
 * @param {string} params.resource        - Resource name (for logging)
 * @param {string} params.action          - HTTP verb / action label
 *
 * @returns {{
 *   decision: 'ALLOW' | 'DENY',
 *   reason: string,
 *   escalationPath: string[] | null,
 *   details: Object
 * }}
 */
async function evaluate({ userId, resourceTenantId, requiredPermission, resource, action }) {
  const [users, roles] = await Promise.all([
    db.read('users'),
    db.read('roles')
  ]);

  // ── 1. Resolve user ────────────────────────────────────────────────────────
  const user = users.find(u => u.id === userId);
  if (!user) {
    return deny('User not found in directory', null, { userId });
  }

  // ── 2. Tenant isolation check ──────────────────────────────────────────────
  if (user.tenant_id !== resourceTenantId) {
    return deny(
      `Cross-tenant access violation: user belongs to tenant "${user.tenant_id}" ` +
      `but resource is owned by tenant "${resourceTenantId}"`,
      null,
      { userTenant: user.tenant_id, resourceTenant: resourceTenantId }
    );
  }

  // ── 3. Resolve direct role ─────────────────────────────────────────────────
  const directRole = roles.find(r => r.id === user.role_id && r.tenant_id === user.tenant_id);
  if (!directRole) {
    return deny('User role definition not found — possible misconfiguration', null, { roleId: user.role_id });
  }

  const hasDirectPermission = directRole.permissions.includes(requiredPermission);

  // ── 4. Build tenant-scoped role graph ──────────────────────────────────────
  const graph = await buildRoleGraph(user.tenant_id);

  // ── 5. DFS traversal to find all inherited roles ───────────────────────────
  const { visitedRoles, allPaths } = dfsTraverse(directRole.id, graph);

  // Collect all inherited (non-direct) role objects
  const inheritedRoles = roles.filter(
    r => r.tenant_id === user.tenant_id && visitedRoles.has(r.id) && r.id !== directRole.id
  );

  // Aggregate all inherited permissions
  const inheritedPermissions = new Set(inheritedRoles.flatMap(r => r.permissions));

  const hasInheritedPermission = inheritedPermissions.has(requiredPermission);

  // ── 6. Decision logic ──────────────────────────────────────────────────────

  // 6a. Permission found directly AND it's not a sensitive one → ALLOW
  if (hasDirectPermission && !SENSITIVE_PERMISSIONS.has(requiredPermission)) {
    return {
      decision: 'ALLOW',
      reason: `Direct permission granted: "${requiredPermission}" is explicitly assigned to role "${directRole.name}"`,
      escalationPath: null,
      details: { directRole: directRole.name, method: 'direct' }
    };
  }

  // 6b. Sensitive permission — must be DIRECTLY assigned, no inheritance
  if (hasDirectPermission && SENSITIVE_PERMISSIONS.has(requiredPermission)) {
    return {
      decision: 'ALLOW',
      reason: `Sensitive permission "${requiredPermission}" directly assigned to role "${directRole.name}" — access granted`,
      escalationPath: null,
      details: { directRole: directRole.name, method: 'direct-sensitive' }
    };
  }

  // 6c. Permission found only through inheritance → ESCALATION DETECTED
  if (!hasDirectPermission && hasInheritedPermission) {
    // Find the specific path that leads to the permission
    const escalationPath = buildEscalationPath(directRole.id, requiredPermission, allPaths, roles);

    return deny(
      `Indirect privilege escalation detected: role "${directRole.name}" transitively ` +
      `inherits permission "${requiredPermission}" via chain: ${escalationPath.join(' → ')}`,
      escalationPath,
      { directRole: directRole.name, inheritedFrom: escalationPath[escalationPath.length - 1] }
    );
  }

  // 6d. Permission not found anywhere → DENY
  return deny(
    `Permission "${requiredPermission}" is not assigned to role "${directRole.name}" ` +
    `or any role in its inheritance chain`,
    null,
    { directRole: directRole.name }
  );
}

/**
 * Build a human-readable escalation path showing role names.
 */
function buildEscalationPath(startRoleId, targetPermission, allPaths, roles) {
  const roleNameMap = Object.fromEntries(roles.map(r => [r.id, r.name]));

  // Find the shortest path that leads to a role with the target permission
  const rolePerm = Object.fromEntries(roles.map(r => [r.id, r.permissions]));

  for (const path of allPaths) {
    const lastRole = path[path.length - 1];
    if (rolePerm[lastRole] && rolePerm[lastRole].includes(targetPermission)) {
      return path.map(id => roleNameMap[id] || id);
    }
  }

  // Fallback: just return start role name
  return [roleNameMap[startRoleId] || startRoleId];
}

function deny(reason, escalationPath, details = {}) {
  return { decision: 'DENY', reason, escalationPath, details };
}

module.exports = { evaluate, SENSITIVE_PERMISSIONS };
