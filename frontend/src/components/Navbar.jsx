import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, X, LogOut } from 'lucide-react';

const navItems = [
  { path: '/welcome', label: 'Intro', end: true },
  { path: '/simulator', label: 'Run Check', end: true },
  { path: '/simulator/scenarios', label: 'Scenarios' },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/roles', label: 'Role Graph' },
  { path: '/admin', label: 'Admin' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <NavLink to="/welcome" className="brand-link" onClick={() => setMenuOpen(false)}>
          <span className="brand-word">RBAC</span>
          <span className="brand-sub">Firewall</span>
        </NavLink>

        <nav className={`top-nav-links ${menuOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="top-nav-actions">
          {user ? (
            <span className="user-chip">
              <span className="avatar">{user.avatar}</span>
              {user.name} - {user.roleName}
            </span>
          ) : null}

          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {user ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
              <LogOut size={14} />
              Sign Out
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
