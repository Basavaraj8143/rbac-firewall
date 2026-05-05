import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, loginAsUser } from '../api';
import { useAuth } from '../context/AuthContext';
import { Shield, Brain, Ban, MessageSquare, ClipboardList, LogIn, AlertTriangle } from 'lucide-react';

export default function Login() {
  const [users, setUsers]       = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { login }               = useAuth();
  const navigate                = useNavigate();

  useEffect(() => {
    getUsers().then(r => setUsers(r.data.users)).catch(() => setError('Backend unreachable'));
  }, []);

  const handleLogin = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await loginAsUser(selected);
      login(res.data.user);
      navigate('/simulator');
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find(u => u.id === selected);

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon"><Shield size={48} color="var(--accent)" /></div>
          <h1 className="login-title">Permission Firewall</h1>
          <p className="login-subtitle">
            Multi-Tenant RBAC Escalation Detection Engine
          </p>
        </div>

        <div className="login-divider" />

        {/* Engine info */}
        <div className="login-info-grid">
          <div className="login-info-item">
            <div className="login-info-icon"><Brain size={24} color="var(--accent)" /></div>
            <div>
              <div className="login-info-label">Analysis</div>
              <div className="login-info-value">DFS/BFS Graph Traversal</div>
            </div>
          </div>
          <div className="login-info-item">
            <div className="login-info-icon"><Ban size={24} color="var(--accent)" /></div>
            <div>
              <div className="login-info-label">Isolation</div>
              <div className="login-info-value">Strict Tenant Boundary</div>
            </div>
          </div>
          <div className="login-info-item">
            <div className="login-info-icon"><MessageSquare size={24} color="var(--accent)" /></div>
            <div>
              <div className="login-info-label">Denials</div>
              <div className="login-info-value">Explainable Responses</div>
            </div>
          </div>
          <div className="login-info-item">
            <div className="login-info-icon"><ClipboardList size={24} color="var(--accent)" /></div>
            <div>
              <div className="login-info-label">Audit</div>
              <div className="login-info-value">Full Request Logging</div>
            </div>
          </div>
        </div>

        <div className="login-divider" />

        {/* User select */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Select Demo User</label>
            <select
              className="form-select"
              value={selected}
              onChange={e => setSelected(e.target.value)}
            >
              <option value="">— Choose a user identity —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.roleName} @ {u.tenantName}
                </option>
              ))}
            </select>
          </div>

          {/* Selected user preview */}
          {selectedUser && (
            <div className="login-user-preview animate-in">
              <div className="avatar">{selectedUser.avatar}</div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedUser.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  <span className="perm-tag" style={{ margin: 0 }}>{selectedUser.roleName}</span>
                  <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>at</span>
                  {selectedUser.tenantName}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--deny)', fontSize: '0.82rem', background: 'var(--deny-dim)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-lg"
            onClick={handleLogin}
            disabled={!selected || loading}
          >
            {loading ? <span className="spinner" /> : <LogIn size={20} />}
            {loading ? 'Authenticating...' : 'Enter Firewall Console'}
          </button>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-base);
          background-image: radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.06) 0%, transparent 60%),
                            radial-gradient(ellipse at 80% 20%, rgba(239,68,68,0.04) 0%, transparent 50%);
          padding: 24px;
        }
        .login-card {
          width: 100%;
          max-width: 520px;
          background: var(--bg-card);
          border: 1px solid var(--border-bright);
          border-radius: var(--radius-xl);
          padding: 40px;
          box-shadow: var(--shadow-card), 0 0 80px rgba(59,130,246,0.08);
        }
        .login-brand { text-align: center; margin-bottom: 24px; display: flex; flex-direction: column; align-items: center; }
        .login-brand-icon { margin-bottom: 12px; }
        .login-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.03em;
          margin-bottom: 8px;
        }
        .login-subtitle { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; }
        .login-divider { height: 1px; background: var(--border); margin: 24px 0; }
        .login-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .login-info-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: var(--bg-elevated);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
        }
        .login-info-icon { display: flex; align-items: center; justify-content: center; }
        .login-info-label { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
        .login-info-value { font-size: 0.75rem; color: var(--text-primary); font-weight: 500; margin-top: 2px; }
        .login-user-preview {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: var(--accent-dim);
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: var(--radius-md);
        }
      `}</style>
    </div>
  );
}
