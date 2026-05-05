import { useState, useEffect } from 'react';
import { getScenarios, runSimulation, getUsers } from '../api';
import FirewallResult from '../components/FirewallResult';
import { Zap, Shield } from 'lucide-react';

const ALL_PERMISSIONS = [
  'read:reports', 'write:reports', 'read:profile', 'read:team',
  'delete:users', 'manage:billing', 'export:data', 'read:metrics'
];

const TENANTS = [
  { id: 'tenant-a', name: 'Acme Corp' },
  { id: 'tenant-b', name: 'Beta Inc'  },
];

export default function Simulator() {
  const [scenarios, setScenarios]   = useState([]);
  const [users, setUsers]           = useState([]);
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [activeScenario, setActive] = useState(null);

  // Custom form state
  const [form, setForm] = useState({
    userId:             '',
    resourceTenantId:   'tenant-a',
    requiredPermission: 'delete:users',
    resource:           'user-directory',
    action:             'DELETE'
  });

  useEffect(() => {
    getScenarios().then(r => setScenarios(r.data.scenarios));
    getUsers().then(r => setUsers(r.data.users));
  }, []);

  const loadScenario = (s) => {
    setActive(s.id);
    setResult(null);
    setForm({
      userId:             s.userId,
      resourceTenantId:   s.resourceTenantId,
      requiredPermission: s.requiredPermission,
      resource:           s.resource,
      action:             s.action
    });
  };

  const runCheck = async () => {
    if (!form.userId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await runSimulation(form);
      setResult(res.data);
    } catch (e) {
      setResult({ decision: 'ERROR', reason: e.message });
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find(u => u.id === form.userId);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center' }}><Zap size={28} style={{ marginRight: 8, color: 'var(--accent)' }} /> Permission Firewall Simulator</h1>
        <p className="page-subtitle">
          Simulate access requests and observe real-time firewall decisions with DFS/BFS escalation analysis
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>

        {/* LEFT — Scenarios + Custom Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Pre-built Scenarios */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Pre-Built Scenarios</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scenarios.map(s => (
                <div
                  key={s.id}
                  className={`scenario-card ${activeScenario === s.id ? 'active' : ''}`}
                  onClick={() => loadScenario(s)}
                >
                  <div>
                    <div className="scenario-title">{s.label}</div>
                    <div className="scenario-desc">{s.description}</div>
                    <div style={{ marginTop: 6 }}>
                      <span className={`badge ${s.expectedDecision === 'ALLOW' ? 'badge-allow' : 'badge-deny'}`}>
                        Expected: {s.expectedDecision}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Check */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Custom Check</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">User Identity</label>
                <select className="form-select" value={form.userId}
                  onChange={e => { setActive(null); setForm(f => ({ ...f, userId: e.target.value })); }}>
                  <option value="">— Select user —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.roleName} @ {u.tenantName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Resource Tenant</label>
                <select className="form-select" value={form.resourceTenantId}
                  onChange={e => setForm(f => ({ ...f, resourceTenantId: e.target.value }))}>
                  {TENANTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Required Permission</label>
                <select className="form-select" value={form.requiredPermission}
                  onChange={e => setForm(f => ({ ...f, requiredPermission: e.target.value }))}>
                  {ALL_PERMISSIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Resource</label>
                <input className="form-input" value={form.resource}
                  onChange={e => setForm(f => ({ ...f, resource: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Request Preview + Result */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Request preview */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Request Context</div>
              {selectedUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar">{selectedUser.avatar}</div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedUser.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{selectedUser.roleName} · {selectedUser.tenantName}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="code-block">
              <div><span style={{ color: 'var(--text-muted)' }}>X-User-ID:            </span>{form.userId || '—'}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>X-Resource-Tenant-ID: </span>{form.resourceTenantId}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>X-Required-Permission:</span>{form.requiredPermission}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>X-Resource:           </span>{form.resource}</div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={runCheck}
                disabled={!form.userId || loading}
              >
                {loading ? <span className="spinner" /> : <Shield size={18} />}
                {loading ? 'Analyzing...' : 'Run Firewall Check'}
              </button>
              {result && (
                <button className="btn btn-ghost btn-sm" onClick={() => setResult(null)}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Engine Analysis Pipeline */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Engine Analysis Pipeline</div>
            <div className="pipeline">
              {[
                { step: '01', label: 'Resolve User',       desc: 'Lookup user identity & role assignment' },
                { step: '02', label: 'Tenant Isolation',   desc: 'Validate user.tenant_id === resource.tenant_id' },
                { step: '03', label: 'Direct Permission',  desc: 'Check role\'s explicit permission set' },
                { step: '04', label: 'Build Role Graph',   desc: 'Construct adjacency list from inheritance table' },
                { step: '05', label: 'DFS Traversal',      desc: 'Traverse all ancestor roles (cycle-safe)' },
                { step: '06', label: 'Escalation Check',   desc: 'Detect inherited sensitive permissions' },
              ].map((s, i) => (
                <div key={i} className="pipeline-step">
                  <div className="step-num">{s.step}</div>
                  <div>
                    <div className="step-label">{s.label}</div>
                    <div className="step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Result */}
          {result && <FirewallResult result={result} />}
        </div>
      </div>

      <style>{`
        .pipeline { display: flex; flex-direction: column; gap: 0; }
        .pipeline-step {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
          position: relative;
        }
        .pipeline-step:last-child { border-bottom: none; }
        .step-num {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--accent);
          background: var(--accent-dim);
          border: 1px solid rgba(59,130,246,0.2);
          padding: 3px 7px;
          border-radius: 4px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .step-label { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); }
        .step-desc  { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
      `}</style>
    </div>
  );
}
