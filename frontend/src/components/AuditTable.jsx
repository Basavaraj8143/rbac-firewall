/**
 * AuditTable.jsx — Real-time Audit Log Table
 */
import { ClipboardList, AlertTriangle, Check, X } from 'lucide-react';

function truncate(str, n = 60) {
  return str && str.length > n ? str.slice(0, n) + '…' : str;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return new Date(iso).toLocaleTimeString();
}

export default function AuditTable({ logs = [], compact = false }) {
  if (logs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ClipboardList size={40} /></div>
        <div>No audit events yet. Run the simulator to generate activity.</div>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>User</th>
            <th>Tenant</th>
            <th>Permission</th>
            <th>Resource</th>
            <th>Result</th>
            {!compact && <th>Reason</th>}
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td className="mono" style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                {timeAgo(log.timestamp)}
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="avatar" style={{ width: 26, height: 26, fontSize: '0.6rem' }}>
                    {(log.user_name || '?').split(' ').map(n => n[0]).join('')}
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                    {log.user_name || log.user_id}
                  </span>
                </div>
              </td>
              <td>
                <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>
                  {log.user_tenant_id === log.resource_tenant_id ? log.user_tenant_id : (
                    <span title="Cross-tenant!" style={{ display: 'flex', alignItems: 'center' }}>
                      <AlertTriangle size={10} style={{ marginRight: 4 }} /> {log.user_tenant_id}
                    </span>
                  )}
                </span>
              </td>
              <td>
                <span className="perm-tag">{log.required_permission}</span>
              </td>
              <td className="mono" style={{ fontSize: '0.75rem' }}>
                {log.resource}
              </td>
              <td>
                <span className={`badge ${log.result === 'ALLOW' ? 'badge-allow' : 'badge-deny'}`}>
                  <span>{log.result === 'ALLOW' ? <Check size={12} style={{ marginRight: 2 }} /> : <X size={12} style={{ marginRight: 2 }} />}</span>
                  {log.result}
                </span>
              </td>
              {!compact && (
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 280 }}>
                  {truncate(log.reason)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
