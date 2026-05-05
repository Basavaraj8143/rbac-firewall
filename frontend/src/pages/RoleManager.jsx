import { useEffect, useState } from 'react';
import { getAllRoles, getRoleGraph } from '../api';
import RoleGraph from '../components/RoleGraph';

const LEVEL_LABELS = {
  1: 'Entry',
  2: 'Analyst',
  3: 'Lead',
  4: 'Security',
  5: 'Admin',
};
const LEVEL_BADGES = {
  1: 'timeline-pill-grep',
  2: 'timeline-pill-read',
  3: 'timeline-pill-edit',
  4: 'timeline-pill-thinking',
  5: 'timeline-pill-done',
};

export default function RoleManager() {
  const [selectedTenant, setSelectedTenant] = useState('tenant-a');
  const [rolesData, setRolesData] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    getAllRoles().then((response) => setRolesData(response.data));
  }, []);

  useEffect(() => {
    getRoleGraph(selectedTenant).then((response) => setGraphData(response.data));
  }, [selectedTenant]);

  const tenantRoles = rolesData?.roles?.filter((role) => role.tenant_id === selectedTenant) || [];
  const inheritance = rolesData?.inheritance?.filter((edge) => edge.tenant_id === selectedTenant) || [];
  const tenants = rolesData?.tenants || [];

  return (
    <div>
      <div className="page-header fade-up">
        <h1 className="page-title">Role Hierarchy Graph</h1>
        <p className="page-subtitle">Visualize inheritance chains and sensitive escalation paths.</p>
      </div>

      <div className="tenant-switch fade-up delay-1">
        {tenants.map((tenant) => (
          <button
            key={tenant.id}
            type="button"
            className={`btn ${selectedTenant === tenant.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedTenant(tenant.id)}
          >
            {tenant.name}
          </button>
        ))}
      </div>

      <div className="roles-layout fade-up delay-2">
        <div className="card graph-wrap">
          <div className="card-header">
            <div>
              <div className="section-label">Graph</div>
              <h2 className="card-title">Force-Directed Role Graph</h2>
              <p className="card-subtitle">Arrows show child-to-parent inheritance edges.</p>
            </div>
          </div>
          <RoleGraph nodes={graphData.nodes} links={graphData.links} />

          <div className="legend-row">
            <span className="badge timeline-pill-grep">Level 1 Employee</span>
            <span className="badge timeline-pill-read">Level 2 Manager</span>
            <span className="badge timeline-pill-done">Level 3 Admin</span>
          </div>
        </div>

        <aside className="roles-side">
          {tenantRoles.map((role) => (
            <div key={role.id} className="card role-item">
              <div className="role-head">
                <div>
                  <h3>{role.name}</h3>
                  <p>Level {role.level} - {LEVEL_LABELS[role.level]}</p>
                </div>
                <span className={`badge ${LEVEL_BADGES[role.level] || 'badge-accent'}`}>L{role.level}</span>
              </div>

              <div className="role-perms">
                {role.permissions.map((permission) => (
                  <span key={permission} className="perm-tag">{permission}</span>
                ))}
              </div>
            </div>
          ))}

          {inheritance.length > 0 ? (
            <div className="card">
              <div className="section-label">Edges</div>
              <h2 className="card-title">Inheritance</h2>
              <div className="edge-list">
                {inheritance.map((edge, index) => {
                  const child = rolesData.roles.find((role) => role.id === edge.child_role_id);
                  const parent = rolesData.roles.find((role) => role.id === edge.parent_role_id);
                  return (
                    <div key={`${edge.child_role_id}-${edge.parent_role_id}-${index}`} className="edge-item">
                      <span>{child?.name}</span>
                      <span className="path-arrow">&rarr;</span>
                      <span>{parent?.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      <style>{`
        .tenant-switch {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 18px;
        }

        .roles-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 20px;
        }

        .graph-wrap {
          padding-bottom: 16px;
        }

        .legend-row {
          margin-top: 14px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .roles-side {
          display: grid;
          gap: 14px;
          align-content: start;
        }

        .role-item {
          padding: 16px;
        }

        .role-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }

        .role-head h3 {
          margin: 0;
          color: var(--ink);
          font-size: 16px;
          font-weight: 600;
        }

        .role-head p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .role-perms {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .edge-list {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .edge-item {
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          background: var(--canvas-soft);
          color: var(--ink);
          font-size: 13px;
          padding: 9px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 1024px) {
          .roles-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
