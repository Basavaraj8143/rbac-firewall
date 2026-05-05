import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllRoles } from '../api';

const ROLE_PILL = {
  1: 'timeline-pill-grep',
  2: 'timeline-pill-read',
  3: 'timeline-pill-edit',
  4: 'timeline-pill-thinking',
  5: 'timeline-pill-done',
};

const FLOW_STEPS = [
  {
    title: 'Request Intercept',
    desc: 'Firewall middleware captures user, tenant, and required permission from the incoming request.',
    pill: 'timeline-pill-thinking',
  },
  {
    title: 'Tenant Isolation',
    desc: 'Engine enforces strict tenant boundary checks before permission traversal begins.',
    pill: 'timeline-pill-grep',
  },
  {
    title: 'Graph Traversal',
    desc: 'DFS/BFS expands inherited role paths to detect indirect privilege escalation.',
    pill: 'timeline-pill-edit',
  },
  {
    title: 'Explainable Verdict',
    desc: 'System returns ALLOW or DENY with reason and records an auditable event.',
    pill: 'timeline-pill-done',
  },
];

export default function Welcome() {
  const { user } = useAuth();
  const [rolesData, setRolesData] = useState(null);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [rolesError, setRolesError] = useState('');

  useEffect(() => {
    let mounted = true;

    getAllRoles()
      .then((response) => {
        if (!mounted) {
          return;
        }
        setRolesData(response.data);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setRolesError('Unable to load role catalog right now.');
      })
      .finally(() => {
        if (!mounted) {
          return;
        }
        setLoadingRoles(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const tenantRoles = useMemo(() => {
    if (!rolesData || !user) {
      return [];
    }
    return rolesData.roles.filter((role) => role.tenant_id === user.tenant_id);
  }, [rolesData, user]);

  const currentRole = useMemo(() => {
    if (!rolesData || !user) {
      return null;
    }
    return rolesData.roles.find((role) => role.id === user.role_id) || null;
  }, [rolesData, user]);

  const currentPermissions = currentRole?.permissions || user?.permissions || [];
  const activeTenantName = useMemo(() => {
    if (!user) {
      return 'Current Tenant';
    }

    const tenantFromCatalog = rolesData?.tenants?.find((tenant) => tenant.id === user.tenant_id)?.name;
    return tenantFromCatalog || user.tenantName || user.tenant_id || 'Current Tenant';
  }, [rolesData, user]);

  return (
    <div>
      <div className="page-header fade-up">
        <div className="section-label">Project Introduction</div>
        <h1 className="page-title">RBAC Permission Firewall</h1>
        <p className="page-subtitle">
          Real-time multi-tenant authorization firewall with escalation detection and explainable denials.
        </p>
      </div>

      <section className="card welcome-about fade-up delay-1">
        <div className="welcome-about-head">
          <span className="badge timeline-pill-done">Project Active</span>
          {user ? <span className="badge badge-accent">{user.name} - {user.roleName}</span> : null}
        </div>
        <h2 className="card-title" style={{ marginTop: 10 }}>What this project does</h2>
        <p className="card-subtitle">
          The firewall intercepts access requests, validates tenant boundaries, evaluates role permissions through traversal,
          and blocks risky inherited privilege chains before they reach protected resources.
        </p>
      </section>

      <section className="grid-2" style={{ marginTop: 20 }}>
        <article className="card fade-up delay-2">
          <div className="section-label">Engine Flow</div>
          <h2 className="card-title">Decision Pipeline</h2>
          <div className="flow-list">
            {FLOW_STEPS.map((step) => (
              <div key={step.title} className="flow-item">
                <span className={`badge ${step.pill}`}>{step.title}</span>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="card fade-up delay-2">
          <div className="section-label">Your Active Role</div>
          <h2 className="card-title">
            {user ? `${user.roleName} (${activeTenantName})` : 'Role Context'}
          </h2>

          <div className="role-meta-row">
            <span className={`badge ${ROLE_PILL[user?.roleLevel] || 'badge-accent'}`}>
              Level {user?.roleLevel ?? '-'}
            </span>
            <span className="badge badge-accent">{currentPermissions.length} permissions</span>
          </div>

          <div className="perm-cloud">
            {currentPermissions.length > 0 ? (
              currentPermissions.map((permission) => (
                <span key={permission} className="perm-tag">{permission}</span>
              ))
            ) : (
              <p className="welcome-muted">No permissions mapped for this role.</p>
            )}
          </div>
        </article>
      </section>

      <section className="card fade-up delay-3" style={{ marginTop: 20 }}>
        <div className="section-label">User Permission Matrix</div>
        <h2 className="card-title">User Permission Matrix in {activeTenantName}</h2>

        {loadingRoles ? (
          <div className="welcome-loading"><span className="spinner" /> Loading role definitions...</div>
        ) : rolesError ? (
          <div className="welcome-error">{rolesError}</div>
        ) : (
          <div className="role-cards">
            {tenantRoles.map((role) => (
              <div key={role.id} className="role-card">
                <div className="role-card-head">
                  <strong>{role.name}</strong>
                  <span className={`badge ${ROLE_PILL[role.level] || 'badge-accent'}`}>L{role.level}</span>
                </div>
                <div className="role-card-perms">
                  {role.permissions.map((permission) => (
                    <span key={`${role.id}-${permission}`} className="perm-tag">{permission}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="welcome-actions fade-up delay-3">
        <Link to="/simulator" className="btn btn-primary">Run Firewall Check</Link>
        <Link to="/dashboard" className="btn btn-secondary">Open Dashboard</Link>
        <Link to="/roles" className="btn btn-secondary">View Role Graph</Link>
      </section>

      <style>{`
        .welcome-about {
          padding: 28px;
        }

        .welcome-about-head {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .flow-list {
          margin-top: 14px;
          display: grid;
          gap: 10px;
        }

        .flow-item {
          border: 1px solid var(--hairline-soft);
          border-radius: var(--radius-md);
          padding: 10px;
          background: var(--canvas-soft);
          display: grid;
          gap: 8px;
        }

        .flow-item p {
          margin: 0;
          color: var(--body);
          font-size: 13px;
          line-height: 1.55;
        }

        .role-meta-row {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .perm-cloud {
          margin-top: 12px;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .welcome-muted {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }

        .welcome-loading {
          margin-top: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--muted);
          font-size: 13px;
        }

        .welcome-error {
          margin-top: 12px;
          border: 1px solid color-mix(in srgb, var(--error) 30%, var(--hairline) 70%);
          background: color-mix(in srgb, var(--error) 12%, var(--surface-card) 88%);
          color: var(--error);
          padding: 10px 12px;
          border-radius: var(--radius-md);
          font-size: 13px;
        }

        .role-cards {
          margin-top: 14px;
          display: grid;
          gap: 10px;
        }

        .role-card {
          border: 1px solid var(--hairline-soft);
          border-radius: var(--radius-md);
          background: var(--canvas-soft);
          padding: 12px;
        }

        .role-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .role-card-head strong {
          color: var(--ink);
          font-size: 14px;
        }

        .role-card-perms {
          margin-top: 10px;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .welcome-actions {
          margin-top: 20px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 1024px) {
          .grid-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
