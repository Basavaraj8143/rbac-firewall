import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getUsers, runSimulation } from '../api';
import { useAuth } from '../context/AuthContext';
import FirewallResult from '../components/FirewallResult';
import { Shield } from 'lucide-react';

const ALL_PERMISSIONS = [
  'read:reports', 'write:reports', 'read:profile', 'read:team',
  'delete:users', 'manage:billing', 'export:data', 'read:metrics',
  'manage:roles', 'manage:tenants'
];

const TENANTS = [
  { id: 'tenant-a', name: 'Acme Corp' },
  { id: 'tenant-b', name: 'Beta Inc' },
  { id: 'tenant-c', name: 'Apex Solutions' },
];

const PIPELINE = [
  { step: '01', label: 'Resolve User', className: 'timeline-pill-thinking', desc: 'Lookup user identity and role assignment' },
  { step: '02', label: 'Tenant Isolation', className: 'timeline-pill-grep', desc: 'Validate user.tenant_id equals resource.tenant_id' },
  { step: '03', label: 'Direct Permission', className: 'timeline-pill-read', desc: 'Check role explicit permission set' },
  { step: '04', label: 'Build Role Graph', className: 'timeline-pill-edit', desc: 'Construct adjacency list from inheritance table' },
  { step: '05', label: 'DFS Traversal', className: 'timeline-pill-edit', desc: 'Traverse all ancestor roles with cycle protection' },
  { step: '06', label: 'Escalation Check', className: 'timeline-pill-done', desc: 'Detect inherited sensitive permissions' },
];

const STEP_DELAYS_MS = [650, 760, 680, 900, 960, 820];

const DEFAULT_FORM = {
  userId: '',
  resourceTenantId: 'tenant-a',
  requiredPermission: 'delete:users',
  resource: 'user-directory',
  action: 'DELETE',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildStepMessage(index, payload, userName) {
  switch (index) {
    case 0:
      return `Identity resolver: mapping ${userName || payload.userId} to active tenant-role profile.`;
    case 1:
      return `Tenant guard: validating ${payload.resourceTenantId} boundary for ${payload.resource}.`;
    case 2:
      return `Permission gate: checking direct entitlement for ${payload.requiredPermission}.`;
    case 3:
      return 'Graph engine: loading inheritance edges and compiling adjacency map.';
    case 4:
      return 'Traversal engine: expanding DFS/BFS path candidates with cycle protection.';
    case 5:
      return 'Risk evaluator: scoring escalation risk and generating explainable verdict.';
    default:
      return 'Engine step running...';
  }
}

export default function Simulator() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [completedStepIndex, setCompletedStepIndex] = useState(-1);
  const [engineMessages, setEngineMessages] = useState([]);
  const [waitingForEngineVerdict, setWaitingForEngineVerdict] = useState(false);
  const scenarioUserId = searchParams.get('userId');
  const isScenarioUserOverride = Boolean(scenarioUserId && scenarioUserId !== user?.id);

  useEffect(() => {
    getUsers()
      .then((response) => setUsers(response.data.users))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    setForm({
      userId: scenarioUserId || user?.id || '',
      resourceTenantId: searchParams.get('resourceTenantId') || user?.tenant_id || DEFAULT_FORM.resourceTenantId,
      requiredPermission: searchParams.get('requiredPermission') || DEFAULT_FORM.requiredPermission,
      resource: searchParams.get('resource') || DEFAULT_FORM.resource,
      action: searchParams.get('action') || DEFAULT_FORM.action,
    });
  }, [searchParams, user, scenarioUserId]);

  const runCheck = async () => {
    if (!form.userId) {
      return;
    }

    const payload = { ...form };
    const selectedUser = users.find((item) => item.id === payload.userId);
    const selectedName = selectedUser?.name || payload.userId;

    setShowPipeline(true);
    setLoading(true);
    setResult(null);
    setActiveStepIndex(-1);
    setCompletedStepIndex(-1);
    setEngineMessages([
      `Engine boot: preparing verification stack for ${selectedName}.`
    ]);
    setWaitingForEngineVerdict(false);

    const responsePromise = runSimulation(payload)
      .then((response) => ({ ok: true, data: response.data }))
      .catch((error) => ({ ok: false, error }));

    try {
      for (let index = 0; index < PIPELINE.length; index += 1) {
        setActiveStepIndex(index);
        setEngineMessages((current) => [
          ...current,
          `[${PIPELINE[index].step}] ${buildStepMessage(index, payload, selectedName)}`
        ]);
        await sleep(STEP_DELAYS_MS[index]);
        setCompletedStepIndex(index);
      }

      setActiveStepIndex(-1);
      setWaitingForEngineVerdict(true);
      setEngineMessages((current) => [
        ...current,
        'Finalizer: reconciling audit envelope and decision metadata.'
      ]);

      const response = await responsePromise;
      setWaitingForEngineVerdict(false);

      if (response.ok) {
        setResult(response.data);
        setEngineMessages((current) => [
          ...current,
          `Decision emitted: ${response.data.decision}. Rendering explanation payload.`
        ]);
      } else {
        setResult({ decision: 'ERROR', reason: response.error.message });
        setEngineMessages((current) => [
          ...current,
          'Decision failed: unable to complete firewall evaluation.'
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find((item) => item.id === form.userId) || (user?.id === form.userId ? user : null);
  const selectedScenarioLabel = searchParams.get('scenarioLabel');

  return (
    <div>
      <div className="page-header fade-up">
        <h1 className="page-title">Permission Firewall Check</h1>
        <p className="page-subtitle">
          Build a request and run a single firewall decision flow.
        </p>
      </div>

      <section className="sim-grid-single">
        <div className="sim-col fade-up delay-1">
          {selectedScenarioLabel ? (
            <div className="card">
              <div className="section-label">Loaded Scenario</div>
              <h2 className="card-title">{selectedScenarioLabel}</h2>
              <p className="card-subtitle">
                This form was prefilled from the Scenarios page.
              </p>
            </div>
          ) : null}

          <div className="card">
            <div className="card-header">
              <div>
                <div className="section-label">Request</div>
                <h2 className="card-title">Custom Check</h2>
              </div>
              <Link to="/simulator/scenarios" className="btn btn-secondary btn-sm">
                Open Scenarios
              </Link>
            </div>

            <div className="form-stack">
              <div className="form-group">
                <label className="form-label" htmlFor="sim-user">User Identity</label>
                <select
                  id="sim-user"
                  className="form-select"
                  value={form.userId}
                  disabled
                >
                  <option value={form.userId}>
                    {selectedUser
                      ? `${selectedUser.name} (${selectedUser.roleName} @ ${selectedUser.tenantName})`
                      : form.userId
                        ? `${form.userId} (Scenario override)`
                        : 'No active session'}
                  </option>
                </select>
                {isScenarioUserOverride ? (
                  <div className="field-note">
                    Scenario override active: request runs as <strong>{form.userId}</strong> instead of current login.
                  </div>
                ) : null}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sim-tenant">Resource Tenant</label>
                <select
                  id="sim-tenant"
                  className="form-select"
                  value={form.resourceTenantId}
                  onChange={(event) => setForm((current) => ({ ...current, resourceTenantId: event.target.value }))}
                >
                  {TENANTS.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sim-permission">Required Permission</label>
                <select
                  id="sim-permission"
                  className="form-select"
                  value={form.requiredPermission}
                  onChange={(event) => setForm((current) => ({ ...current, requiredPermission: event.target.value }))}
                >
                  {ALL_PERMISSIONS.map((permission) => (
                    <option key={permission} value={permission}>{permission}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sim-resource">Resource</label>
                <input
                  id="sim-resource"
                  className="form-input"
                  value={form.resource}
                  onChange={(event) => setForm((current) => ({ ...current, resource: event.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sim-col fade-up delay-2">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="section-label">Preview</div>
                <h2 className="card-title">Request Context</h2>
              </div>
              {selectedUser ? (
                <div className="user-chip">
                  <span className="avatar">{selectedUser.avatar}</span>
                  {selectedUser.name}
                </div>
              ) : null}
            </div>

            <div className="code-block">
              <div>X-User-ID: {form.userId || '-'}</div>
              <div>X-Resource-Tenant-ID: {form.resourceTenantId}</div>
              <div>X-Required-Permission: {form.requiredPermission}</div>
              <div>X-Resource: {form.resource}</div>
            </div>

            <div className="cta-row">
              <button type="button" className="btn btn-primary" onClick={runCheck} disabled={!form.userId || loading}>
                {loading ? <span className="spinner" /> : <Shield size={16} />}
                {loading ? 'Analyzing...' : 'Run Firewall Check'}
              </button>

              {result ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setResult(null);
                    setShowPipeline(false);
                    setActiveStepIndex(-1);
                    setCompletedStepIndex(-1);
                    setEngineMessages([]);
                    setWaitingForEngineVerdict(false);
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {showPipeline ? (
            <div className="card fade-up">
              <div className="section-label">Engine</div>
              <h2 className="card-title">Analysis Pipeline</h2>
              <div className="pipeline">
                {PIPELINE.map((item, index) => (
                  <div
                    key={item.step}
                    className={`pipeline-step ${
                      index <= completedStepIndex
                        ? 'is-complete'
                        : index === activeStepIndex
                          ? 'is-active'
                          : 'is-pending'
                    }`}
                  >
                    <span className={`badge ${item.className}`}>{item.step}</span>
                    <div>
                      <div className="pipeline-label">{item.label}</div>
                      <div className="pipeline-desc">{item.desc}</div>
                    </div>
                    <div className="pipeline-state">
                      {index <= completedStepIndex ? 'Done' : index === activeStepIndex ? 'Checking...' : 'Queued'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="engine-feed">
                <div className="section-label">Engine Feed</div>
                <div className="engine-feed-list">
                  {engineMessages.map((message, index) => (
                    <div key={`${message}-${index}`} className="engine-feed-item">
                      {message}
                    </div>
                  ))}
                  {waitingForEngineVerdict ? (
                    <div className="engine-feed-item pending">
                      Waiting for final response from policy evaluator...
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {result ? <FirewallResult result={result} /> : null}
        </div>
      </section>

      <style>{`
        .sim-grid-single {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .sim-col {
          display: grid;
          gap: 20px;
          align-content: start;
        }

        .form-stack {
          display: grid;
          gap: 12px;
        }

        .field-note {
          margin-top: 6px;
          color: var(--muted);
          font-size: 12px;
        }

        .pipeline {
          margin-top: 16px;
          display: grid;
          gap: 10px;
        }

        .pipeline-step {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border-bottom: 1px solid var(--hairline-soft);
          padding-bottom: 10px;
        }

        .pipeline-step:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .pipeline-step.is-active {
          background: color-mix(in srgb, var(--timeline-read) 16%, transparent 84%);
          border-radius: var(--radius-md);
          padding: 8px;
          margin: 0 -8px;
          border-bottom-color: transparent;
        }

        .pipeline-step.is-complete {
          opacity: 0.88;
        }

        .pipeline-step.is-pending {
          opacity: 0.55;
        }

        .pipeline-label {
          color: var(--ink);
          font-size: 14px;
          font-weight: 500;
        }

        .pipeline-desc {
          margin-top: 3px;
          color: var(--muted);
          font-size: 13px;
        }

        .pipeline-state {
          margin-left: auto;
          color: var(--muted);
          font-size: 12px;
          font-weight: 500;
        }

        .engine-feed {
          margin-top: 14px;
          border-top: 1px solid var(--hairline-soft);
          padding-top: 12px;
        }

        .engine-feed-list {
          margin-top: 8px;
          border: 1px solid var(--hairline);
          background: var(--canvas-soft);
          border-radius: var(--radius-md);
          padding: 10px;
          display: grid;
          gap: 7px;
          max-height: 210px;
          overflow: auto;
        }

        .engine-feed-item {
          color: var(--ink);
          font-family: var(--font-mono);
          font-size: 12px;
          line-height: 1.45;
        }

        .engine-feed-item.pending {
          color: var(--muted);
        }

        .cta-row {
          margin-top: 14px;
          display: flex;
          gap: 10px;
        }

        @media (max-width: 1024px) {
          .sim-grid-single {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
