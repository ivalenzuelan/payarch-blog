const fields = [
  {
    field: 'F002',
    name: 'Primary Account Number',
    source: 'VIC API',
    value: 'agent-bound VCN',
    purpose: 'Merchant and acquirer handle a token, not the real PAN.',
  },
  {
    field: 'F022',
    name: 'POS Entry Mode',
    source: 'Payment rail',
    value: 'agent context',
    purpose: 'Illustrates how the rail could signal agent-initiated mode instead of human ecommerce rules.',
  },
  {
    field: 'F048',
    name: 'Additional Data',
    source: 'TAP + data enrichment',
    value: 'agent_id, device_id, ip, email_hash',
    purpose: 'Carries agent identity and enriched data for fraud and fee treatment.',
  },
  {
    field: 'private instruction reference',
    name: 'Extended Data',
    source: 'TAP + VIC API',
    value: 'instruction_ref:sha256',
    purpose: 'Binds authorization to the registered instruction. Tamper fails closed.',
  },
  {
    field: 'F039',
    name: 'Response Code',
    source: 'Issuer',
    value: '00 or decline',
    purpose: 'Issuer returns approval after agent policy checks.',
  },
];

export default function Iso8583PacketDiagram() {
  return (
    <div className="iso-packet not-prose" aria-label="ISO 8583 agent authorization packet anatomy">
      <div className="iso-head">
        <span>Packet anatomy</span>
        <strong>The old authorization message becomes the carrier for agent context</strong>
      </div>

      <div className="iso-shell">
        <div className="iso-mti">
          <span>MTI</span>
          <strong>0100 authorization request</strong>
        </div>

        <div className="iso-fields">
          {fields.map((item) => (
            <div className="iso-field" key={item.field}>
              <div className="iso-field-code">{item.field}</div>
              <div className="iso-field-main">
                <div className="iso-field-title">
                  <strong>{item.name}</strong>
                  <span>{item.source}</span>
                </div>
                <code>{item.value}</code>
                <p>{item.purpose}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .iso-packet {
          width: 100vw;
          max-width: 1040px;
          position: relative;
          left: 50%;
          transform: translateX(-50%);
          margin: 32px 0;
          border: 1px solid var(--ink-200);
          border-radius: 10px;
          background: var(--paper);
          overflow: hidden;
          color: var(--ink-900);
        }

        .iso-head {
          padding: 18px 22px;
          border-bottom: 1px solid var(--ink-200);
          background: var(--ink-100);
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .iso-head span,
        .iso-mti span,
        .iso-field-code,
        .iso-field-title span {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-500);
        }

        .iso-head strong {
          font-size: 17px;
          font-weight: 500;
          line-height: 1.25;
        }

        .iso-shell {
          padding: 22px;
          background: linear-gradient(180deg, var(--paper) 0%, var(--ink-100) 100%);
        }

        .iso-mti {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border: 1px solid var(--ink-300);
          border-radius: 8px 8px 0 0;
          background: var(--ink-900);
          color: var(--paper);
          padding: 12px 14px;
        }

        .iso-mti span {
          color: var(--ink-300);
        }

        .iso-mti strong {
          font-size: 13px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight: 500;
        }

        .iso-fields {
          border-left: 1px solid var(--ink-300);
          border-right: 1px solid var(--ink-300);
          border-bottom: 1px solid var(--ink-300);
          border-radius: 0 0 8px 8px;
          overflow: hidden;
        }

        .iso-field {
          display: grid;
          grid-template-columns: 88px 1fr;
          gap: 0;
          background: var(--paper-pure);
          border-top: 1px solid var(--ink-200);
        }

        .iso-field:first-child {
          border-top: 0;
        }

        .iso-field-code {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--ink-100);
          border-right: 1px solid var(--ink-200);
          color: var(--ink-900);
          letter-spacing: 0.04em;
          font-weight: 700;
        }

        .iso-field-main {
          padding: 12px 14px;
          min-width: 0;
        }

        .iso-field-title {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: baseline;
          margin-bottom: 7px;
        }

        .iso-field-title strong {
          font-size: 14px;
          line-height: 1.25;
        }

        .iso-field-title span {
          white-space: nowrap;
        }

        .iso-field code {
          display: inline-block;
          font-size: 12px;
          color: var(--success);
          background: color-mix(in srgb, var(--success) 8%, var(--paper-pure));
          border: 1px solid color-mix(in srgb, var(--success) 25%, var(--ink-200));
          border-radius: 4px;
          padding: 3px 6px;
          overflow-wrap: anywhere;
        }

        .iso-field p {
          margin: 7px 0 0;
          color: var(--ink-700);
          font-size: 12.5px;
          line-height: 1.4;
        }

        @media (max-width: 640px) {
          .iso-shell {
            padding: 14px;
          }

          .iso-mti,
          .iso-field,
          .iso-field-title {
            display: grid;
            grid-template-columns: 1fr;
          }

          .iso-field-code {
            justify-content: flex-start;
            border-right: 0;
            border-bottom: 1px solid var(--ink-200);
            padding: 8px 12px;
          }

          .iso-field-title span {
            white-space: normal;
          }
        }
      `}</style>
    </div>
  );
}
