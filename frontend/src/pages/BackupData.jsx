import { useEffect, useState } from 'react';
import { getBackupSnapshot } from '../api';

function formatTime(iso) {
  if (!iso) {
    return '-';
  }
  return new Date(iso).toLocaleString();
}

export default function BackupData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tenantById = data ? new Map(data.tenants.map((tenant) => [tenant.id, tenant])) : new Map();
  const roleById = data ? new Map(data.roles.map((role) => [role.id, role])) : new Map();

  useEffect(() => {
    getBackupSnapshot()
      .then((response) => setData(response.data))
      .catch(() => setError('Failed to load backup snapshot.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header fade-up">
        <h1 className="page-title">Backup Data Viewer</h1>
        <p className="page-subtitle">Parsed JSON collections rendered as tables for quick inspection.</p>
      </div>

      {loading ? (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="spinner" /> Loading backup snapshot...
        </div>
      ) : null}

      {error ? (
        <div className="card" style={{ color: 'var(--error)' }}>{error}</div>
      ) : null}

      {data ? (
        <>
          {(() => {
            const relations = [
              ...data.users.map((user) => ({
                table: 'users',
                recordId: user.id,
                source: `tenant_id: ${user.tenant_id}`,
                wire: '-> tenants.id',
                target: tenantById.get(user.tenant_id)?.name || 'Unknown tenant',
              })),
              ...data.users.map((user) => ({
                table: 'users',
                recordId: user.id,
                source: `role_id: ${user.role_id}`,
                wire: '-> roles.id',
                target: roleById.get(user.role_id)?.name || 'Unknown role',
              })),
              ...data.roles.map((role) => ({
                table: 'roles',
                recordId: role.id,
                source: `tenant_id: ${role.tenant_id}`,
                wire: '-> tenants.id',
                target: tenantById.get(role.tenant_id)?.name || 'Unknown tenant',
              })),
              ...data.inheritance.map((edge, index) => ({
                table: 'inheritance',
                recordId: index + 1,
                source: `child_role_id: ${edge.child_role_id}`,
                wire: '-> roles.id',
                target: roleById.get(edge.child_role_id)?.name || 'Unknown role',
              })),
              ...data.inheritance.map((edge, index) => ({
                table: 'inheritance',
                recordId: index + 1,
                source: `parent_role_id: ${edge.parent_role_id}`,
                wire: '-> roles.id',
                target: roleById.get(edge.parent_role_id)?.name || 'Unknown role',
              })),
            ];

            return (
              <div className="card fade-up delay-1" style={{ marginBottom: 20 }}>
                <div className="card-header">
                  <h2 className="card-title">Foreign Key Wires</h2>
                  <span className="badge badge-accent">{relations.length}</span>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>Table</th><th>Record</th><th>From</th><th>Wire</th><th>To</th></tr></thead>
                    <tbody>
                      {relations.map((relation, index) => (
                        <tr key={`${relation.table}-${relation.recordId}-${relation.source}-${index}`}>
                          <td className="mono">{relation.table}</td>
                          <td className="mono">{relation.recordId}</td>
                          <td className="mono">{relation.source}</td>
                          <td className="mono">{relation.wire}</td>
                          <td>{relation.target}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          <div className="grid-4 fade-up delay-1" style={{ marginBottom: 20 }}>
            <div className="stat-card"><div className="stat-label">Tenants</div><div className="stat-value accent">{data.counts.tenants}</div></div>
            <div className="stat-card"><div className="stat-label">Roles</div><div className="stat-value accent">{data.counts.roles}</div></div>
            <div className="stat-card"><div className="stat-label">Users</div><div className="stat-value accent">{data.counts.users}</div></div>
            <div className="stat-card"><div className="stat-label">Audit Log</div><div className="stat-value accent">{data.counts.auditLog}</div></div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="section-label">Snapshot</div>
            <h2 className="card-title">Generated At</h2>
            <div className="card-subtitle">{formatTime(data.generatedAt)}</div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h2 className="card-title">Tenants</h2>
              <span className="badge badge-accent">{data.tenants.length}</span>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>ID</th><th>Name</th><th>Domain</th></tr></thead>
                <tbody>
                  {data.tenants.map((tenant) => (
                    <tr key={tenant.id}><td className="mono">{tenant.id}</td><td>{tenant.name}</td><td className="mono">{tenant.domain}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h2 className="card-title">Users</h2>
              <span className="badge badge-accent">{data.users.length}</span>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Tenant Wire</th><th>Role Wire</th></tr></thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.id}>
                      <td className="mono">{user.id}</td>
                      <td>{user.name}</td>
                      <td className="mono">{user.email}</td>
                      <td><span className="mono">{user.tenant_id}</span> {' -> '} {tenantById.get(user.tenant_id)?.name || 'Unknown tenant'}</td>
                      <td><span className="mono">{user.role_id}</span> {' -> '} {roleById.get(user.role_id)?.name || 'Unknown role'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h2 className="card-title">Roles</h2>
              <span className="badge badge-accent">{data.roles.length}</span>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>ID</th><th>Name</th><th>Tenant Wire</th><th>Level</th><th>Permissions</th></tr></thead>
                <tbody>
                  {data.roles.map((role) => (
                    <tr key={role.id}>
                      <td className="mono">{role.id}</td>
                      <td>{role.name}</td>
                      <td><span className="mono">{role.tenant_id}</span> {' -> '} {tenantById.get(role.tenant_id)?.name || 'Unknown tenant'}</td>
                      <td className="mono">{role.level}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {role.permissions.map((permission) => (
                            <span key={`${role.id}-${permission}`} className="perm-tag">{permission}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h2 className="card-title">Role Inheritance</h2>
              <span className="badge badge-accent">{data.inheritance.length}</span>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Tenant Wire</th><th>Child Role Wire</th><th>Parent Role Wire</th><th>Description</th></tr></thead>
                <tbody>
                  {data.inheritance.map((edge, index) => (
                    <tr key={`${edge.child_role_id}-${edge.parent_role_id}-${index}`}>
                      <td><span className="mono">{edge.tenant_id}</span> {' -> '} {tenantById.get(edge.tenant_id)?.name || 'Unknown tenant'}</td>
                      <td><span className="mono">{edge.child_role_id}</span> {' -> '} {roleById.get(edge.child_role_id)?.name || 'Unknown role'}</td>
                      <td><span className="mono">{edge.parent_role_id}</span> {' -> '} {roleById.get(edge.parent_role_id)?.name || 'Unknown role'}</td>
                      <td>{edge.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Audit Log (Latest 20)</h2>
              <span className="badge badge-accent">{data.auditLog.length}</span>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Time</th><th>User</th><th>Permission</th><th>Result</th><th>Reason</th></tr></thead>
                <tbody>
                  {data.auditLog.slice(-20).reverse().map((log) => (
                    <tr key={log.id}>
                      <td className="mono">{formatTime(log.timestamp)}</td>
                      <td>{log.user_name}</td>
                      <td><span className="perm-tag">{log.required_permission}</span></td>
                      <td><span className={`badge ${log.result === 'ALLOW' ? 'badge-allow' : 'badge-deny'}`}>{log.result}</span></td>
                      <td>{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
