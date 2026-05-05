import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, loginAsUser, loginSecure } from '../api';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertTriangle, Lock } from 'lucide-react';

export default function Login() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState('');
  const [mode, setMode] = useState('demo');
  const [secureEmail, setSecureEmail] = useState('');
  const [securePassword, setSecurePassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getUsers()
      .then((response) => {
        setUsers(response.data.users);
        if (response.data.users.length > 0) {
          setSecureEmail(response.data.users[0].email);
        }
      })
      .catch(() => setError('Backend unreachable'));
  }, []);

  const selectedUser = useMemo(() => users.find((user) => user.id === selected), [users, selected]);

  const handleLogin = async () => {
    setError('');

    if (mode === 'demo' && !selected) {
      setError('Please choose a demo user.');
      return;
    }

    if (mode === 'secure' && (!secureEmail || !securePassword)) {
      setError('Email and password are required for secure login.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'demo') {
        const response = await loginAsUser(selected);
        login(response.data.user, { mode: 'demo' });
      } else {
        const response = await loginSecure(secureEmail, securePassword);
        login(response.data.user, {
          mode: 'secure',
          token: response.data.token,
          expiresIn: response.data.expiresIn
        });
      }
      navigate('/welcome');
    } catch (requestError) {
      const serverMessage = requestError?.response?.data?.error;
      setError(serverMessage || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-shell fade-up">
        <div className="section-label">Permission Firewall</div>
        <h1 className="login-title">Block privilege escalation before it reaches your API.</h1>
        <p className="page-subtitle">
          Tenant-safe RBAC checks with explainable decisions and full audit logs.
        </p>

        <div className="login-timeline" aria-label="agent timeline">
          <span className="badge timeline-pill-thinking">Thinking</span>
          <span className="badge timeline-pill-grep">Grepping</span>
          <span className="badge timeline-pill-read">Reading</span>
          <span className="badge timeline-pill-edit">Editing</span>
          <span className="badge timeline-pill-done">Done</span>
        </div>

        <div className="card login-card fade-up delay-1">
          <div className="mode-toggle" role="tablist" aria-label="Login mode">
            <button
              type="button"
              className={`btn btn-sm ${mode === 'demo' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('demo')}
            >
              Demo Login
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === 'secure' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('secure')}
            >
              Secure Login
            </button>
          </div>

          {mode === 'demo' ? (
            <>
              <div className="mode-note">Demo mode - no password required.</div>
              <div className="form-group">
                <label className="form-label" htmlFor="user-select">Select Demo User</label>
                <select
                  id="user-select"
                  className="form-select"
                  value={selected}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  <option value="">Choose a user identity</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.roleName} @ {user.tenantName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser ? (
                <div className="login-user-preview">
                  <span className="avatar">{selectedUser.avatar}</span>
                  <div>
                    <div className="login-user-name">{selectedUser.name}</div>
                    <div className="login-user-meta">
                      <span className="perm-tag">{selectedUser.roleName}</span> {selectedUser.tenantName}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="mode-note">
                Secure mode - email plus password. Demo password for seeded users: <code>Firewall@2026</code>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="secure-email">Work Email</label>
                <input
                  id="secure-email"
                  type="email"
                  className="form-input"
                  value={secureEmail}
                  onChange={(event) => setSecureEmail(event.target.value)}
                  placeholder="name@company.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="secure-password">Password</label>
                <input
                  id="secure-password"
                  type="password"
                  className="form-input"
                  value={securePassword}
                  onChange={(event) => setSecurePassword(event.target.value)}
                  placeholder="Enter your password"
                />
              </div>
            </>
          )}

          {error ? (
            <div className="login-error">
              <AlertTriangle size={15} />
              {error}
            </div>
          ) : null}

          <div className="login-cta-row">
            <button type="button" className="btn btn-download" onClick={handleLogin} disabled={loading}>
              {loading ? <span className="spinner" /> : mode === 'secure' ? <Lock size={16} /> : <LogIn size={16} />}
              {loading ? 'Authenticating...' : mode === 'secure' ? 'Enter Secure Console' : 'Enter Demo Console'}
            </button>
          </div>
        </div>
      </section>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
        }

        .login-shell {
          width: min(820px, 100%);
        }

        .login-title {
          margin: 10px 0 0;
          color: var(--ink);
          font-size: 72px;
          line-height: 1.1;
          letter-spacing: -2.16px;
          font-weight: 400;
          max-width: 780px;
        }

        .login-card {
          margin-top: 24px;
          display: grid;
          gap: 16px;
        }

        .mode-toggle {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .mode-note {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
        }

        .mode-note code {
          color: var(--ink);
          font-family: var(--font-mono);
          font-size: 12px;
        }

        .login-timeline {
          margin-top: 18px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .login-user-preview {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          background: var(--canvas-soft);
          padding: 10px;
        }

        .login-user-name {
          color: var(--ink);
          font-size: 14px;
          font-weight: 600;
        }

        .login-user-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
          color: var(--muted);
          font-size: 12px;
        }

        .login-error {
          border: 1px solid color-mix(in srgb, var(--error) 30%, var(--hairline) 70%);
          border-radius: var(--radius-md);
          background: color-mix(in srgb, var(--error) 12%, var(--surface-card) 88%);
          padding: 10px 12px;
          color: var(--error);
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .login-cta-row {
          display: flex;
          justify-content: flex-start;
        }

        @media (max-width: 1024px) {
          .login-title {
            font-size: 56px;
            letter-spacing: -1.2px;
          }
        }

        @media (max-width: 640px) {
          .login-title {
            font-size: 32px;
            letter-spacing: -0.64px;
          }
        }
      `}</style>
    </div>
  );
}
