import { ClipboardList, AlertTriangle, Check, X } from 'lucide-react';

function truncate(text, size = 60) {
  return text && text.length > size ? `${text.slice(0, size)}...` : text;
}

function timeAgo(isoTime) {
  const diffMs = Date.now() - new Date(isoTime).getTime();
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }

  return new Date(isoTime).toLocaleTimeString();
}

export default function AuditTable({ logs = [], compact = false }) {
  if (logs.length === 0) {
    return (
      <div className="empty-state">
        <ClipboardList size={34} />
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
            {!compact ? <th>Reason</th> : null}
          </tr>
        </thead>

        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="mono">{timeAgo(log.timestamp)}</td>

              <td>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span className="avatar" style={{ width: 24, height: 24, fontSize: 11 }}>
                    {(log.user_name || '?').split(' ').map((part) => part[0]).join('')}
                  </span>
                  <span style={{ color: 'var(--ink)', fontSize: 13 }}>{log.user_name || log.user_id}</span>
                </div>
              </td>

              <td>
                {log.user_tenant_id === log.resource_tenant_id ? (
                  <span className="badge badge-accent">{log.user_tenant_id}</span>
                ) : (
                  <span className="badge badge-deny">
                    <AlertTriangle size={11} /> {log.user_tenant_id}
                  </span>
                )}
              </td>

              <td>
                <span className="perm-tag">{log.required_permission}</span>
              </td>

              <td className="mono">{log.resource}</td>

              <td>
                <span className={`badge ${log.result === 'ALLOW' ? 'badge-allow' : 'badge-deny'}`}>
                  {log.result === 'ALLOW' ? <Check size={11} /> : <X size={11} />}
                  {log.result}
                </span>
              </td>

              {!compact ? <td style={{ fontSize: 13 }}>{truncate(log.reason)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
