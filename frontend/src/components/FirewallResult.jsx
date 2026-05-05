/**
 * FirewallResult.jsx
 * Animated ALLOW / DENY result card with escalation path visualization.
 */
import { CheckCircle2, XCircle, Search } from 'lucide-react';

export default function FirewallResult({ result }) {
  if (!result) return null;

  const isAllow = result.decision === 'ALLOW';

  return (
    <div className={`firewall-result ${isAllow ? 'allow' : 'deny'} animate-in`}>
      <div className="result-header">
        <div className="result-icon">{isAllow ? <CheckCircle2 size={40} color="var(--allow)" /> : <XCircle size={40} color="var(--deny)" />}</div>
        <div>
          <div className={`result-decision ${isAllow ? 'allow' : 'deny'}`}>
            {isAllow ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Permission Firewall Decision
          </div>
        </div>
      </div>

      <div className="result-reason">{result.reason}</div>

      {result.escalationPath && result.escalationPath.length > 0 && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--deny)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ marginRight: 4 }} /> Detected Escalation Chain
          </div>
          <div className="escalation-path">
            {result.escalationPath.map((node, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="path-node">{node}</span>
                {i < result.escalationPath.length - 1 && (
                  <span className="path-arrow">→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.details && Object.keys(result.details).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {Object.entries(result.details).map(([k, v]) => (
              <div className="info-row" key={k}>
                <span className="info-key">{k.replace(/_/g, ' ')}</span>
                <span className="info-value">{String(v)}</span>
              </div>
            ))}
            {result.auditId && (
              <div className="info-row">
                <span className="info-key">audit id</span>
                <span className="info-value" style={{ fontSize: '0.68rem' }}>{result.auditId}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
