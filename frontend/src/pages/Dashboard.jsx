import { useState, useEffect, useCallback } from 'react';
import { getAuditLogs, getStats, clearLogs } from '../api';
import AuditTable from '../components/AuditTable';
import { LayoutDashboard, Trash2, AlertTriangle, XCircle } from 'lucide-react';

export default function Dashboard() {
  const [logs, setLogs]   = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([getAuditLogs(), getStats()]);
      setLogs(logsRes.data.logs);
      setStats(statsRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // auto-refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleClearLogs = async () => {
    await clearLogs();
    fetchData();
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center' }}><LayoutDashboard size={28} style={{ marginRight: 8, color: 'var(--accent)' }} /> Security Dashboard</h1>
          <p className="page-subtitle">
            Real-time audit feed · auto-refreshes every 5s
            <span className="pulse" style={{ marginLeft: 10, verticalAlign: 'middle' }} />
          </p>
        </div>
        <button className="btn btn-danger btn-sm" onClick={handleClearLogs}>
          <Trash2 size={16} /> Clear Logs
        </button>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: 28 }}>
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
            <div className="stat-meta">{stats.cross_tenant_blocked} cross-tenant</div>
          </div>
        </div>
      )}

      {/* Alert bar */}
      {stats && stats.escalations_caught > 0 && (
        <div className="escalation-alert animate-in">
          <AlertTriangle size={20} />
          <span>
            <strong>{stats.escalations_caught} privilege escalation attempt{stats.escalations_caught > 1 ? 's' : ''} detected</strong> and blocked by the firewall engine
          </span>
        </div>
      )}

      {/* Audit Log */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="card-title">Audit Log — All Access Events</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {logs.length} event{logs.length !== 1 ? 's' : ''}
          </div>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <span className="spinner" />
          </div>
        ) : (
          <AuditTable logs={logs} />
        )}
      </div>

      {/* Recent Denials detail */}
      {logs.filter(l => l.result === 'DENY').length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center' }}><XCircle size={18} style={{ marginRight: 6, color: 'var(--deny)' }} /> Denial Details</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {logs.filter(l => l.result === 'DENY').slice(0, 5).map(log => (
              <div key={log.id} style={{
                padding: '14px 16px',
                background: 'var(--deny-dim)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    {log.user_name}
                  </span>
                  <span className="perm-tag" style={{ margin: 0 }}>{log.required_permission}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {log.reason}
                </div>
                {log.escalation_path && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {log.escalation_path.map((node, i) => (
                      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="path-node">{node}</span>
                        {i < log.escalation_path.length - 1 && <span className="path-arrow">→</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .escalation-alert {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          color: var(--deny);
        }
      `}</style>
    </div>
  );
}
