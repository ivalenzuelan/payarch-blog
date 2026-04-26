const systems = [
  {
    id: 'api',
    name: 'VIC API',
    role: 'Credential lifecycle',
    color: '#1a4a90',
    bg: '#f1f5fb',
    items: ['enroll card', 'register instruction', 'retrieve VCN', 'close signal'],
    output: 'instruction_ref + agent-bound token',
  },
  {
    id: 'tap',
    name: 'TAP',
    role: 'HTTP identity',
    color: '#0f766e',
    bg: '#eef8f6',
    items: ['Ed25519 key', 'RFC 9421 signature', 'nonce check', 'edge verdict'],
    output: 'verified agent request',
  },
  {
    id: 'vdcap',
    name: 'VDCAP',
    role: 'Data economics',
    color: '#9a4a18',
    bg: '#fff4ed',
    items: ['device ID', 'IP address', 'email hash', 'AVS data'],
    output: '0.05-0.10% fee incentive',
  },
];

export default function VicSystemMap() {
  return (
    <div className="vic-map not-prose" aria-label="Visa Intelligent Commerce system map">
      <div className="vic-map-head">
        <span>Architecture</span>
        <strong>Visa Intelligent Commerce is three separate systems converging at authorization</strong>
      </div>

      <div className="vic-map-grid">
        {systems.map((system) => (
          <div className="vic-card" style={{ '--accent': system.color, '--card-bg': system.bg }} key={system.id}>
            <div className="vic-card-top">
              <span>{system.role}</span>
              <strong>{system.name}</strong>
            </div>
            <ul>
              {system.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="vic-output">{system.output}</div>
          </div>
        ))}
      </div>

      <div className="vic-converge">
        <div className="vic-line" />
        <div className="vic-auth">
          <span>Convergence point</span>
          <strong>ISO 8583 authorization</strong>
          <p>F002 carries the token, F022 marks agent mode, F048 carries identity and enriched data, F126 binds the authorization to the original instruction.</p>
        </div>
      </div>

      <style>{`
        .vic-map {
          width: 100vw;
          max-width: 1040px;
          position: relative;
          left: 50%;
          transform: translateX(-50%);
          margin: 32px 0;
          border: 1px solid #e0dbd0;
          border-radius: 10px;
          background: #faf9f6;
          overflow: hidden;
          color: #1a1814;
        }

        .vic-map-head {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 18px 22px;
          border-bottom: 1px solid #e0dbd0;
          background: #f5f3ee;
        }

        .vic-map-head span,
        .vic-card-top span,
        .vic-output,
        .vic-auth span {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #8a8278;
        }

        .vic-map-head strong {
          font-size: 17px;
          font-weight: 500;
          line-height: 1.25;
        }

        .vic-map-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          background: #e0dbd0;
        }

        .vic-card {
          background: var(--card-bg);
          padding: 18px;
          min-width: 0;
          border-top: 3px solid var(--accent);
        }

        .vic-card-top {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-bottom: 14px;
        }

        .vic-card-top strong {
          color: var(--accent);
          font-size: 19px;
          line-height: 1.2;
        }

        .vic-card ul {
          display: grid;
          gap: 7px;
          list-style: none;
          padding: 0;
          margin: 0 0 16px;
        }

        .vic-card li {
          font-size: 13px;
          line-height: 1.3;
          color: #4a4840;
        }

        .vic-card li::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--accent);
          margin-right: 8px;
          transform: translateY(-1px);
        }

        .vic-output {
          border: 1px solid rgba(26,24,20,0.12);
          border-radius: 5px;
          padding: 8px 9px;
          background: rgba(255,255,255,0.55);
          color: #4a4840;
          line-height: 1.35;
        }

        .vic-converge {
          padding: 20px 22px 22px;
          background: #faf9f6;
        }

        .vic-line {
          height: 16px;
          border-left: 1px solid #d8d3c8;
          border-right: 1px solid #d8d3c8;
          border-bottom: 1px solid #d8d3c8;
          margin: -1px 16% 14px;
        }

        .vic-auth {
          border: 1px solid #d8d3c8;
          border-radius: 8px;
          background: #fffdfa;
          padding: 16px;
        }

        .vic-auth strong {
          display: block;
          font-size: 18px;
          margin: 4px 0 6px;
        }

        .vic-auth p {
          margin: 0;
          color: #4a4840;
          font-size: 13px;
          line-height: 1.45;
        }

        @media (max-width: 820px) {
          .vic-map-grid {
            grid-template-columns: 1fr;
          }

          .vic-line {
            margin-left: 50%;
            margin-right: 50%;
            border-right: 0;
          }
        }
      `}</style>
    </div>
  );
}
