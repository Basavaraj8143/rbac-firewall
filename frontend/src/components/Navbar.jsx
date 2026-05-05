import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Zap, LayoutDashboard, Network, LogOut } from 'lucide-react';

const navItems = [
  { path: '/simulator',   label: 'Simulator',    icon: <Zap size={18} /> },
  { path: '/dashboard',   label: 'Dashboard',    icon: <LayoutDashboard size={18} /> },
  { path: '/roles',       label: 'Role Graph',   icon: <Network size={18} /> },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon"><Shield size={24} color="var(--accent)" /></div>
        <div className="brand-text">
          <div className="brand-name">Permission</div>
          <div className="brand-sub">Firewall</div>
        </div>
      </div>

      <div className="navbar-status">
        <span className="pulse"></span>
        <span className="status-label">Engine Active</span>
      </div>

      <nav className="navbar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="navbar-user">
          <div className="user-info">
            <div className="avatar">{user.avatar}</div>
            <div className="user-details">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.roleName} · {user.tenantName}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm logout-btn" title="Switch User">
            <LogOut size={16} />
          </button>
        </div>
      )}

      <style>{`
        .navbar {
          position: fixed;
          top: 0; left: 0;
          width: 240px;
          height: 100vh;
          background: var(--bg-surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 24px 0;
          z-index: 100;
        }
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 20px 24px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 12px;
        }
        .brand-icon { display: flex; align-items: center; justify-content: center; }
        .brand-name { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); }
        .brand-sub  { font-size: 0.7rem; color: var(--accent); font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
        .navbar-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px 16px;
        }
        .status-label { font-size: 0.7rem; color: var(--allow); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
        .navbar-nav { flex: 1; padding: 8px 12px; display: flex; flex-direction: column; gap: 2px; }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          text-decoration: none;
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.15s ease;
        }
        .nav-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
        .nav-item.active {
          background: var(--accent-dim);
          color: var(--accent);
          border: 1px solid rgba(59,130,246,0.2);
        }
        .nav-icon { font-size: 1rem; }
        .navbar-user {
          padding: 16px 16px 0;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .user-info { display: flex; align-items: center; gap: 10px; overflow: hidden; }
        .user-details { overflow: hidden; }
        .user-name { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-role { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .logout-btn { padding: 6px 8px; flex-shrink: 0; }
      `}</style>
    </aside>
  );
}
