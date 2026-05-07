import { useEffect, useMemo, useState } from 'react';
import { createRole, createTenant, createInheritance, getAllRoles } from '../api';

function extractError(error, fallback) {
  return error?.response?.data?.error || fallback;
}

export default function AdminSetup() {
  const [rolesData, setRolesData] = useState({ tenants: [], roles: [], inheritance: [] });
  const [loading, setLoading] = useState(true);
  const [savingTenant, setSavingTenant] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [tenantForm, setTenantForm] = useState({
    id: '',
    name: '',
    domain: '',
  });

  const [roleForm, setRoleForm] = useState({
    id: '',
    tenant_id: '',
    name: '',
    level: 1,
    permissions: 'read:reports',
  });

  const [inheritanceForm, setInheritanceForm] = useState({
    parent_role_id: '',
    child_role_id: '',
    tenant_id: '',
    description: '',
  });

  const [savingInheritance, setSavingInheritance] = useState(false);

  async function refreshData() {
    const response = await getAllRoles();
    const payload = response.data || {};
    const tenants = payload.tenants || [];
    setRolesData({
      tenants,
      roles: payload.roles || [],
      inheritance: payload.inheritance || [],
    });
    setRoleForm((prev) => ({
      ...prev,
      tenant_id: prev.tenant_id || tenants[0]?.id || '',
    }));
  }

  useEffect(() => {
    refreshData()
      .catch(() => setError('Failed to load admin data.'))
      .finally(() => setLoading(false));
  }, []);

  const tenantsSorted = useMemo(
    () => [...rolesData.tenants].sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [rolesData.tenants]
  );

  const rolesSorted = useMemo(
    () => [...rolesData.roles].sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [rolesData.roles]
  );

  async function handleCreateTenant(event) {
    event.preventDefault();
    setSavingTenant(true);
    setMessage('');
    setError('');
    try {
      await createTenant({
        id: tenantForm.id.trim() || undefined,
        name: tenantForm.name.trim(),
        domain: tenantForm.domain.trim(),
      });
      setMessage('Company added successfully.');
      setTenantForm({ id: '', name: '', domain: '' });
      await refreshData();
    } catch (apiError) {
      setError(extractError(apiError, 'Failed to add company.'));
    } finally {
      setSavingTenant(false);
    }
  }

  async function handleCreateRole(event) {
    event.preventDefault();
    setSavingRole(true);
    setMessage('');
    setError('');
    try {
      const permissions = roleForm.permissions
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      const response = await createRole({
        id: roleForm.id.trim() || undefined,
        tenant_id: roleForm.tenant_id,
        name: roleForm.name.trim(),
        level: Number(roleForm.level),
        permissions,
      });
      const createdUser = response?.data?.user;
      setMessage('Role added successfully.');
      if (createdUser) {
        setMessage(
          `Role added successfully. Demo user created: ${createdUser.name} (${createdUser.email})`
        );
      }
      setRoleForm((prev) => ({
        ...prev,
        id: '',
        name: '',
        level: 1,
        permissions: 'read:reports',
      }));
      await refreshData();
    } catch (apiError) {
      setError(extractError(apiError, 'Failed to add role.'));
    } finally {
      setSavingRole(false);
    }
  }

  async function handleCreateInheritance(event) {
    event.preventDefault();
    setSavingInheritance(true);
    setMessage('');
    setError('');
    try {
      await createInheritance({
        parent_role_id: inheritanceForm.parent_role_id,
        child_role_id: inheritanceForm.child_role_id,
        tenant_id: inheritanceForm.tenant_id,
        description: inheritanceForm.description.trim(),
      });
      setMessage('Role inheritance created successfully.');
      setInheritanceForm({
        parent_role_id: '',
        child_role_id: '',
        tenant_id: inheritanceForm.tenant_id,
        description: '',
      });
      await refreshData();
    } catch (apiError) {
      setError(extractError(apiError, 'Failed to add inheritance.'));
    } finally {
      setSavingInheritance(false);
    }
  }

  return (
    <div>
      <div className="page-header fade-up">
        <h1 className="page-title">Admin Setup</h1>
        <p className="page-subtitle">Create new companies and roles for your RBAC firewall catalog.</p>
      </div>

      {loading ? (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="spinner" /> Loading admin setup...
        </div>
      ) : (
        <>
          {message ? <div className="card" style={{ color: 'var(--success)', marginBottom: 18 }}>{message}</div> : null}
          {error ? <div className="card" style={{ color: 'var(--error)', marginBottom: 18 }}>{error}</div> : null}

          <div className="grid-2 fade-up delay-1" style={{ marginBottom: 20 }}>
            <form className="card" onSubmit={handleCreateTenant}>
              <div className="card-header">
                <h2 className="card-title">Add New Company</h2>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" htmlFor="tenant-id">Tenant ID (Optional)</label>
                <input
                  id="tenant-id"
                  className="form-input"
                  value={tenantForm.id}
                  onChange={(event) => setTenantForm((prev) => ({ ...prev, id: event.target.value }))}
                  placeholder="tenant-zenlabs"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" htmlFor="tenant-name">Company Name</label>
                <input
                  id="tenant-name"
                  className="form-input"
                  value={tenantForm.name}
                  onChange={(event) => setTenantForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Zen Labs"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="tenant-domain">Company Domain</label>
                <input
                  id="tenant-domain"
                  className="form-input"
                  value={tenantForm.domain}
                  onChange={(event) => setTenantForm((prev) => ({ ...prev, domain: event.target.value }))}
                  placeholder="zenlabs.io"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingTenant}>
                {savingTenant ? 'Adding Company...' : 'Add Company'}
              </button>
            </form>

            <form className="card" onSubmit={handleCreateRole}>
              <div className="card-header">
                <h2 className="card-title">Add New Role</h2>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" htmlFor="role-id">Role ID (Optional)</label>
                <input
                  id="role-id"
                  className="form-input"
                  value={roleForm.id}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, id: event.target.value }))}
                  placeholder="role-tenant-analyst"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" htmlFor="role-tenant">Tenant</label>
                <select
                  id="role-tenant"
                  className="form-select"
                  value={roleForm.tenant_id}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, tenant_id: event.target.value }))}
                  required
                >
                  <option value="" disabled>Select tenant</option>
                  {tenantsSorted.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" htmlFor="role-name">Role Name</label>
                <input
                  id="role-name"
                  className="form-input"
                  value={roleForm.name}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Compliance Manager"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" htmlFor="role-level">Role Level</label>
                <input
                  id="role-level"
                  type="number"
                  min="1"
                  max="10"
                  className="form-input"
                  value={roleForm.level}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, level: event.target.value }))}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="role-permissions">Permissions (Comma Separated)</label>
                <input
                  id="role-permissions"
                  className="form-input"
                  value={roleForm.permissions}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, permissions: event.target.value }))}
                  placeholder="read:reports,write:reports"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingRole}>
                {savingRole ? 'Adding Role...' : 'Add Role'}
              </button>
            </form>
          </div>

          <div className="grid-2 fade-up delay-2" style={{ marginBottom: 20 }}>
            <form className="card" onSubmit={handleCreateInheritance}>
              <div className="card-header">
                <h2 className="card-title">Add Role Inheritance</h2>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" htmlFor="inheritance-tenant">Tenant</label>
                <select
                  id="inheritance-tenant"
                  className="form-select"
                  value={inheritanceForm.tenant_id}
                  onChange={(event) => setInheritanceForm((prev) => ({ ...prev, tenant_id: event.target.value }))}
                  required
                >
                  <option value="" disabled>Select tenant</option>
                  {tenantsSorted.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" htmlFor="inheritance-child">Child Role</label>
                <select
                  id="inheritance-child"
                  className="form-select"
                  value={inheritanceForm.child_role_id}
                  onChange={(event) => setInheritanceForm((prev) => ({ ...prev, child_role_id: event.target.value }))}
                  required
                >
                  <option value="" disabled>Select child role</option>
                  {rolesData.roles
                    .filter((role) => role.tenant_id === inheritanceForm.tenant_id)
                    .map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" htmlFor="inheritance-parent">Parent Role</label>
                <select
                  id="inheritance-parent"
                  className="form-select"
                  value={inheritanceForm.parent_role_id}
                  onChange={(event) => setInheritanceForm((prev) => ({ ...prev, parent_role_id: event.target.value }))}
                  required
                >
                  <option value="" disabled>Select parent role</option>
                  {rolesData.roles
                    .filter((role) => role.tenant_id === inheritanceForm.tenant_id && role.id !== inheritanceForm.child_role_id)
                    .map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="inheritance-description">Description (Optional)</label>
                <input
                  id="inheritance-description"
                  className="form-input"
                  value={inheritanceForm.description}
                  onChange={(event) => setInheritanceForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="e.g., Employee inherits from Manager"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingInheritance || !inheritanceForm.parent_role_id || !inheritanceForm.child_role_id}>
                {savingInheritance ? 'Adding Inheritance...' : 'Add Inheritance'}
              </button>
            </form>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Role Inheritance Edges</h2>
                <span className="badge badge-accent">{rolesData.inheritance.length}</span>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Child Role</th><th>Parent Role</th><th>Tenant</th><th>Description</th></tr></thead>
                  <tbody>
                    {rolesData.inheritance.map((edge, idx) => (
                      <tr key={idx}>
                        <td className="mono">{edge.child_role_id}</td>
                        <td className="mono">{edge.parent_role_id}</td>
                        <td className="mono">{edge.tenant_id}</td>
                        <td>{edge.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid-2 fade-up delay-3">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Companies</h2>
                <span className="badge badge-accent">{tenantsSorted.length}</span>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>ID</th><th>Name</th><th>Domain</th></tr></thead>
                  <tbody>
                    {tenantsSorted.map((tenant) => (
                      <tr key={tenant.id}>
                        <td className="mono">{tenant.id}</td>
                        <td>{tenant.name}</td>
                        <td className="mono">{tenant.domain}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Roles</h2>
                <span className="badge badge-accent">{rolesSorted.length}</span>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>ID</th><th>Tenant</th><th>Name</th><th>Level</th></tr></thead>
                  <tbody>
                    {rolesSorted.map((role) => (
                      <tr key={role.id}>
                        <td className="mono">{role.id}</td>
                        <td className="mono">{role.tenant_id}</td>
                        <td>{role.name}</td>
                        <td className="mono">{role.level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
