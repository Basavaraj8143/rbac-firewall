import { CheckCircle2, XCircle, Search } from 'lucide-react';

export default function FirewallResult({ result }) {
  if (!result) {
    return null;
  }

  const isAllow = result.decision === 'ALLOW';
  const isDeny = result.decision === 'DENY';

  return (
    <section className={`firewall-result ${isAllow ? 'allow' : 'deny'} fade-up delay-3`}>
      <div className="result-header">
        {isAllow ? (
          <CheckCircle2 size={34} color="var(--success)" />
        ) : (
          <XCircle size={34} color="var(--error)" />
        )}

        <div>
          <h3 className={`result-decision ${isAllow ? 'allow' : 'deny'}`}>
            {isAllow ? 'ACCESS GRANTED' : isDeny ? 'ACCESS DENIED' : 'REQUEST ERROR'}
          </h3>
          <div className="section-label">Permission Firewall Decision</div>
        </div>
      </div>

      <p className="result-reason">{result.reason}</p>

      {result.escalationPath && result.escalationPath.length > 0 ? (
        <div>
          <div className="section-label" style={{ marginTop: 14, marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Search size={13} /> Detected Escalation Chain
          </div>

          <div className="escalation-path">
            {result.escalationPath.map((node, index) => (
              <span key={`${node}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="path-node">{node}</span>
                {index < result.escalationPath.length - 1 ? <span className="path-arrow">&rarr;</span> : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {result.details && Object.keys(result.details).length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <div className="divider" style={{ marginBottom: 8 }} />
          {Object.entries(result.details).map(([key, value]) => (
            <div key={key} className="info-row">
              <span className="info-key">{key.replace(/_/g, ' ')}</span>
              <span className="info-value">{String(value)}</span>
            </div>
          ))}
          {result.auditId ? (
            <div className="info-row">
              <span className="info-key">audit id</span>
              <span className="info-value">{result.auditId}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
