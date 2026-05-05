import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAuditLogs, getStats, clearLogs } from '../api';
import AuditTable from '../components/AuditTable';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGraphs, setShowGraphs] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [logsResponse, statsResponse] = await Promise.all([getAuditLogs(), getStats()]);
      setLogs(logsResponse.data.logs);
      setStats(statsResponse.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleClearLogs = async () => {
    await clearLogs();
    fetchData();
  };

  const recentDenials = logs.filter((log) => log.result === 'DENY').slice(0, 5);
  const totalRequests = Number(stats?.total_requests || 0);
  const allowed = Number(stats?.allowed || 0);
  const denied = Number(stats?.denied || 0);
  const deniedPercent = totalRequests > 0 ? (denied / totalRequests) * 100 : 0;
  const allowedPercent = totalRequests > 0 ? (allowed / totalRequests) * 100 : 0;
  const escalationPercent = totalRequests > 0 ? (Number(stats?.escalations_caught || 0) / totalRequests) * 100 : 0;
  const crossTenantPercent = totalRequests > 0 ? (Number(stats?.cross_tenant_blocked || 0) / totalRequests) * 100 : 0;

  const trafficBars = useMemo(() => {
    const binSizeMs = 2 * 60 * 1000;
    const bucketCount = 10;
    const now = Date.now();
    const startTime = now - bucketCount * binSizeMs;
    const counts = Array.from({ length: bucketCount }, () => 0);

    logs.forEach((log) => {
      const ts = new Date(log.timestamp).getTime();
      if (Number.isNaN(ts) || ts < startTime || ts > now) {
        return;
      }
      const index = Math.min(bucketCount - 1, Math.floor((ts - startTime) / binSizeMs));
      counts[index] += 1;
    });

    const max = Math.max(...counts, 1);
    return counts.map((count, index) => ({
      id: index,
      count,
      heightPercent: (count / max) * 100,
    }));
  }, [logs]);
  const trafficTotals = useMemo(() => {
    const total = trafficBars.reduce((sum, bar) => sum + bar.count, 0);
    const max = trafficBars.reduce((currentMax, bar) => Math.max(currentMax, bar.count), 0);
    return { total, max };
  }, [trafficBars]);

  return (
    <div>
      <div className="page-header fade-up dashboard-head">
        <div>
          <h1 className="page-title">Security Dashboard</h1>
          <p className="page-subtitle">
            Real-time audit feed, auto-refresh every 5 seconds.
            <span className="pulse" style={{ marginLeft: 10 }} />
          </p>
        </div>
        <div className="dashboard-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowGraphs((current) => !current)}>
            {showGraphs ? 'Hide Graphs' : 'Graphs'}
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={handleClearLogs}>
            <Trash2 size={14} />
            Clear Logs
          </button>
        </div>
      </div>

      {stats ? (
        <div className="grid-4 fade-up delay-1" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Total Requests</div>
            <div className="stat-value accent">{stats.total_requests}</div>
            <div className="stat-meta">Since session start</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Allowed</div>
            <div className="stat-value allow">{stats.allowed}</div>
            <div className="stat-meta">Direct permission match</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Blocked</div>
            <div className="stat-value deny">{stats.denied}</div>
            <div className="stat-meta">{stats.block_rate}% block rate</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Escalations Caught</div>
            <div className="stat-value warn">{stats.escalations_caught}</div>
            <div className="stat-meta">{stats.cross_tenant_blocked} cross-tenant blocked</div>
          </div>
        </div>
      ) : null}

      {stats && stats.escalations_caught > 0 ? (
        <div className="dashboard-alert fade-up delay-2">
          <AlertTriangle size={16} />
          <span>
            {stats.escalations_caught} escalation attempt{stats.escalations_caught > 1 ? 's' : ''} blocked by the firewall.
          </span>
        </div>
      ) : null}

      {showGraphs && stats ? (
        <div className="grid-2 fade-up delay-2" style={{ marginTop: 20 }}>
          <div className="card">
            <div className="section-label">Graphs</div>
            <h2 className="card-title">Request Decision Split</h2>
            <div className="donut-wrap">
              <div
                className="stats-donut"
                style={{
                  background: `conic-gradient(
                    var(--success) 0% ${allowedPercent}%,
                    var(--error) ${allowedPercent}% ${allowedPercent + deniedPercent}%,
                    var(--hairline-soft) ${allowedPercent + deniedPercent}% 100%
                  )`
                }}
              />
              <div className="donut-legend">
                <div><span className="legend-dot allow" /> Allowed: {allowed}</div>
                <div><span className="legend-dot deny" /> Blocked: {denied}</div>
                <div><span className="legend-dot neutral" /> Total: {totalRequests}</div>
              </div>
            </div>

            <div className="metrics-bars">
              <div className="metric-row">
                <span>Block Rate</span>
                <div className="metric-track"><div style={{ width: `${deniedPercent}%` }} className="metric-fill deny" /></div>
                <strong>{deniedPercent.toFixed(1)}%</strong>
              </div>
              <div className="metric-row">
                <span>Escalation Rate</span>
                <div className="metric-track"><div style={{ width: `${escalationPercent}%` }} className="metric-fill warn" /></div>
                <strong>{escalationPercent.toFixed(1)}%</strong>
              </div>
              <div className="metric-row">
                <span>Cross-Tenant Rate</span>
                <div className="metric-track"><div style={{ width: `${crossTenantPercent}%` }} className="metric-fill accent" /></div>
                <strong>{crossTenantPercent.toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-label">Graphs</div>
            <h2 className="card-title">Recent Traffic (2m buckets)</h2>
            <p className="card-subtitle">
              Last 20 minutes · {trafficTotals.total} requests · peak {trafficTotals.max} / bucket
            </p>
            <div className="traffic-chart">
              {trafficBars.map((bar) => (
                <div key={bar.id} className="traffic-col" title={`${bar.count} requests`}>
                  {bar.count > 0 ? <span className="traffic-count">{bar.count}</span> : null}
                  <div
                    className={`traffic-bar ${bar.count === 0 ? 'is-zero' : ''}`}
                    style={{ height: `${bar.heightPercent}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="traffic-foot">
              <span>Oldest</span>
              <span>Latest</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card fade-up delay-2" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div>
            <div className="section-label">Audit</div>
            <h2 className="card-title">All Access Events</h2>
          </div>
          <span className="badge badge-accent">{logs.length} events</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 28 }}>
            <span className="spinner" />
          </div>
        ) : (
          <AuditTable logs={logs} />
        )}
      </div>

      {recentDenials.length > 0 ? (
        <div className="card fade-up delay-3" style={{ marginTop: 20 }}>
          <div className="card-header">
            <div>
              <div className="section-label">Incidents</div>
              <h2 className="card-title">Recent Denials</h2>
            </div>
          </div>

          <div className="denial-list">
            {recentDenials.map((log) => (
              <div key={log.id} className="denial-item">
                <div className="denial-head">
                  <strong>{log.user_name}</strong>
                  <span className="perm-tag">{log.required_permission}</span>
                </div>
                <p>{log.reason}</p>
                {log.escalation_path ? (
                  <div className="denial-path">
                    {log.escalation_path.map((node, index) => (
                      <span key={`${log.id}-${node}-${index}`}>
                        <span className="path-node">{node}</span>
                        {index < log.escalation_path.length - 1 ? <span className="path-arrow">&rarr;</span> : null}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <style>{`
        .dashboard-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .dashboard-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .dashboard-alert {
          border: 1px solid color-mix(in srgb, var(--error) 30%, var(--hairline) 70%);
          border-radius: var(--radius-md);
          padding: 12px 14px;
          color: var(--error);
          background: color-mix(in srgb, var(--error) 12%, var(--surface-card) 88%);
          display: inline-flex;
          gap: 10px;
          align-items: center;
        }

        .donut-wrap {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }

        .stats-donut {
          width: 118px;
          height: 118px;
          border-radius: 50%;
          position: relative;
          border: 1px solid var(--hairline);
        }

        .stats-donut::after {
          content: '';
          position: absolute;
          inset: 18px;
          border-radius: 50%;
          background: var(--surface-card);
          border: 1px solid var(--hairline-soft);
        }

        .donut-legend {
          display: grid;
          gap: 8px;
          color: var(--body);
          font-size: 13px;
        }

        .legend-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 7px;
        }

        .legend-dot.allow { background: var(--success); }
        .legend-dot.deny { background: var(--error); }
        .legend-dot.neutral { background: var(--hairline-strong); }

        .metrics-bars {
          margin-top: 14px;
          display: grid;
          gap: 10px;
        }

        .metric-row {
          display: grid;
          grid-template-columns: 130px 1fr 52px;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: var(--body);
        }

        .metric-track {
          width: 100%;
          height: 8px;
          border-radius: 9999px;
          background: var(--hairline-soft);
          overflow: hidden;
        }

        .metric-fill {
          height: 100%;
          border-radius: 9999px;
        }

        .metric-fill.deny { background: var(--error); }
        .metric-fill.warn { background: var(--timeline-done); }
        .metric-fill.accent { background: var(--timeline-read); }

        .metric-row strong {
          color: var(--ink);
          font-size: 12px;
          text-align: right;
        }

        .traffic-chart {
          margin-top: 12px;
          min-height: 170px;
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          background: var(--canvas-soft);
          padding: 10px;
          display: grid;
          grid-template-columns: repeat(10, minmax(0, 1fr));
          align-items: end;
          gap: 8px;
        }

        .traffic-col {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          gap: 4px;
        }

        .traffic-count {
          color: var(--muted);
          font-size: 11px;
          line-height: 1;
        }

        .traffic-bar {
          width: 100%;
          border-radius: 6px 6px 2px 2px;
          background: linear-gradient(180deg, var(--timeline-read), var(--timeline-edit));
        }

        .traffic-bar.is-zero {
          background: transparent;
          border-top: 1px dashed var(--hairline-strong);
          border-radius: 0;
        }

        .traffic-foot {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          color: var(--muted);
          font-size: 12px;
        }

        .denial-list {
          display: grid;
          gap: 10px;
        }

        .denial-item {
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          padding: 12px;
          background: var(--canvas-soft);
        }

        .denial-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .denial-head strong {
          color: var(--ink);
          font-size: 14px;
        }

        .denial-item p {
          margin: 8px 0 0;
          color: var(--body);
          font-size: 13px;
          line-height: 1.55;
        }

        .denial-path {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .denial-path > span {
          display: inline-flex;
          gap: 8px;
          align-items: center;
        }

        @media (max-width: 640px) {
          .dashboard-head {
            flex-direction: column;
          }

          .metric-row {
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .metric-row strong {
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}
