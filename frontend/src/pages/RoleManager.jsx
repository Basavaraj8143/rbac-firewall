import { useState, useEffect } from 'react';
import { getAllRoles, getRoleGraph } from '../api';
import RoleGraph from '../components/RoleGraph';
import { Network, Building2 } from 'lucide-react';

const TENANTS = [
  { id: 'tenant-a', name: 'Acme Corp' },
  { id: 'tenant-b', name: 'Beta Inc'  },
];

const LEVEL_LABELS = { 1: 'Employee', 2: 'Manager', 3: 'Admin' };
const LEVEL_COLORS = { 1: 'var(--allow)', 2: 'var(--warn)', 3: 'var(--deny)' };

export default function RoleManager() {
  const [selectedTenant, setTenant] = useState('tenant-a');
  const [rolesData, setRolesData]   = useState(null);
  const [graphData, setGraphData]   = useState({ nodes: [], links: [] });

  useEffect(() => {
    getAllRoles().then(r => setRolesData(r.data));
  }, []);

  useEffect(() => {
    getRoleGraph(selectedTenant).then(r => setGraphData(r.data));
  }, [selectedTenant]);

  const tenantRoles = rolesData?.roles?.filter(r => r.tenant_id === selectedTenant) || [];
  const inheritance = rolesData?.inheritance?.filter(e => e.tenant_id === selectedTenant) || [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center' }}><Network size={28} style={{ marginRight: 8, color: 'var(--accent)' }} /> Role Hierarchy Graph</h1>
        <p className="page-subtitle">
          Visualize role inheritance chains and identify escalation paths
        </p>
      </div>

      {/* Tenant selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {TENANTS.map(t => (
          <button
            key={t.id}
            className={`btn ${selectedTenant === t.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTenant(t.id)}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <Building2 size={16} style={{ marginRight: 6 }} /> {t.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

        {/* Graph */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="card-title">Force-Directed Role Graph</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Arrows indicate inheritance direction (child → parent). Drag nodes to explore.
            </div>
          </div>
          <RoleGraph nodes={graphData.nodes} links={graphData.links} />

          {/* Legend */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 20 }}>
            {Object.entries(LEVEL_COLORS).map(([level, color]) => (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${color}`, background: `${color}22` }} />
                Level {level} — {LEVEL_LABELS[level]}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div style={{ width: 20, height: 2, background: 'var(--deny)' }} />
              Inheritance Edge (Escalation Path)
            </div>
          </div>
        </div>

        {/* Right panel — Roles detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tenantRoles.map(role => (
            <div key={role.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: LEVEL_COLORS[role.level] || 'var(--accent)', fontSize: '0.95rem' }}>
                    {role.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Level {role.level} — {LEVEL_LABELS[role.level]}
                  </div>
                </div>
                <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>
                  L{role.level}
                </span>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Permissions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {role.permissions.map(p => (
                  <span key={p} className="perm-tag">{p}</span>
                ))}
              </div>
            </div>
          ))}

          {/* Inheritance edges */}
          {inheritance.length > 0 && (
            <div className="card" style={{ padding: 18 }}>
              <div className="card-title" style={{ marginBottom: 14 }}>Inheritance Edges</div>
              {inheritance.map((edge, i) => {
                const child  = rolesData.roles.find(r => r.id === edge.child_role_id);
                const parent = rolesData.roles.find(r => r.id === edge.parent_role_id);
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 0', borderBottom: i < inheritance.length - 1 ? '1px solid var(--border)' : 'none',
                    fontSize: '0.78rem'
                  }}>
                    <span style={{ color: 'var(--allow)', fontWeight: 600 }}>{child?.name}</span>
                    <span style={{ color: 'var(--deny)' }}>→</span>
                    <span style={{ color: 'var(--deny)', fontWeight: 600 }}>{parent?.name}</span>
                    <span className="badge badge-deny" style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>Escalates</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
