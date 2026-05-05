import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScenarios, getUsers } from '../api';

export default function SimulationScenarios() {
  const [scenarios, setScenarios] = useState([]);
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getScenarios().then((response) => setScenarios(response.data.scenarios));
    getUsers().then((response) => setUsers(response.data.users));
  }, []);

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((user) => map.set(user.id, user));
    return map;
  }, [users]);

  const useScenario = (scenario) => {
    const params = new URLSearchParams({
      userId: scenario.userId,
      resourceTenantId: scenario.resourceTenantId,
      requiredPermission: scenario.requiredPermission,
      resource: scenario.resource,
      action: scenario.action,
      scenarioLabel: scenario.label,
    });

    navigate(`/simulator?${params.toString()}`);
  };

  return (
    <div>
      <div className="page-header fade-up">
        <h1 className="page-title">Simulation Scenarios</h1>
        <p className="page-subtitle">
          Choose a pre-built demo case, then run it from the check page.
        </p>
      </div>

      <section className="grid-2 fade-up delay-1">
        {scenarios.map((scenario) => {
          const user = userMap.get(scenario.userId);

          return (
            <article key={scenario.id} className="card">
              <div className="section-label">Scenario</div>
              <h2 className="card-title" style={{ marginTop: 6 }}>{scenario.label}</h2>
              <p className="card-subtitle">{scenario.description}</p>

              <div className="scenario-meta-grid">
                <div className="scenario-meta-item">
                  <span className="section-label">User</span>
                  <div>{user ? `${user.name} (${user.roleName})` : scenario.userId}</div>
                </div>

                <div className="scenario-meta-item">
                  <span className="section-label">Tenant</span>
                  <div>{scenario.resourceTenantId}</div>
                </div>

                <div className="scenario-meta-item">
                  <span className="section-label">Permission</span>
                  <span className="perm-tag">{scenario.requiredPermission}</span>
                </div>

                <div className="scenario-meta-item">
                  <span className="section-label">Expected</span>
                  <span className={`badge ${scenario.expectedDecision === 'ALLOW' ? 'badge-allow' : 'badge-deny'}`}>
                    {scenario.expectedDecision}
                  </span>
                </div>
              </div>

              <div className="scenario-actions">
                <button type="button" className="btn btn-primary" onClick={() => useScenario(scenario)}>
                  Use This Scenario
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <style>{`
        .scenario-meta-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .scenario-meta-item {
          border: 1px solid var(--hairline-soft);
          border-radius: var(--radius-md);
          background: var(--canvas-soft);
          padding: 10px;
          color: var(--ink);
          font-size: 13px;
          display: grid;
          gap: 4px;
        }

        .scenario-actions {
          margin-top: 16px;
          display: flex;
          justify-content: flex-start;
        }

        @media (max-width: 1024px) {
          .grid-2 {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .scenario-meta-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
