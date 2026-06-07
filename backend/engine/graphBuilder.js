/**
 * graphBuilder.js — Role Inheritance Graph Constructor
 *
 * Transforms the flat role_inheritance table into an adjacency list
 * suitable for DFS/BFS traversal.
 *
 * Graph Direction: child → [parent1, parent2, ...]
 * This means traversal from a child role discovers all ancestor roles
 * (and their permissions), modeling real-world RBAC inheritance.
 */

'use strict';

const db = require('../db');
//reqire db
/**
 * Build a directed adjacency list for role inheritance within a tenant.
 *
 * @param {string} tenantId - Scope graph to a single tenant
 * @returns {Map<string, string[]>} roleId → list of parent roleIds
 *
 * @example
 * // Returns: { 'role-a-employee': ['role-a-manager'], 'role-a-manager': ['role-a-admin'] }
 * buildRoleGraph('tenant-a')
 */
async function buildRoleGraph(tenantId) {
  const [inheritanceEdges, roles] = await Promise.all([
    db.read('role_inheritance'),
    db.read('roles')
  ]);

  // Filter to this tenant's roles only
  const tenantRoleIds = new Set(
    roles.filter(r => r.tenant_id === tenantId).map(r => r.id)
  );

  // Build adjacency list: child → parents[]
  const graph = new Map();

  // Initialize every tenant role with an empty parent list
  for (const roleId of tenantRoleIds) {
    graph.set(roleId, []);
  }

  // Populate edges — only include edges where both endpoints belong to this tenant
  for (const edge of inheritanceEdges) {
    if (
      edge.tenant_id === tenantId &&
      tenantRoleIds.has(edge.child_role_id) &&
      tenantRoleIds.has(edge.parent_role_id)
    ) {
      graph.get(edge.child_role_id).push(edge.parent_role_id);
    }
  }

  return graph;
}

/**
 * Return a human-readable adjacency representation for debugging/logging.
 * @param {Map} graph
 * @param {Array} roles - all roles (for name lookup)
 * @returns {Object}
 */
function serializeGraph(graph, roles) {
  const nameMap = Object.fromEntries(roles.map(r => [r.id, r.name]));
  const result  = {};
  for (const [child, parents] of graph.entries()) {
    result[nameMap[child] || child] = parents.map(p => nameMap[p] || p);
  }
  return result;
}

module.exports = { buildRoleGraph, serializeGraph };
