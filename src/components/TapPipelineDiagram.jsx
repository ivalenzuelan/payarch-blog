const checks = [
  ['03', 'Timestamp', 'created within +/-300s'],
  ['04', 'Nonce', 'not seen before'],
  ['05', 'Domain', '@authority matches Host'],
  ['06', 'Signature', 'Ed25519.verify(sig, base)'],
];

export default function TapPipelineDiagram() {
  return (
    <div className="tap-pipeline not-prose" aria-label="TAP verification pipeline at Cloudflare edge">
      <div className="tap-node tap-agent">
        <span>Agent</span>
        <strong>POST /checkout</strong>
      </div>

      <div className="tap-arrow" aria-hidden="true">{'->'}</div>

      <div className="tap-edge">
        <div className="tap-edge-header">
          <span>Cloudflare edge</span>
          <strong>TAP verifier</strong>
        </div>

        <div className="tap-flow">
          <div className="tap-step">
            <span className="tap-num">01</span>
            <div>
              <strong>Parse Signature-Input</strong>
              <p>Extract covered components and signing base.</p>
            </div>
          </div>

          <div className="tap-step tap-key-step">
            <span className="tap-num">02</span>
            <div>
              <strong>Fetch public key</strong>
              <p>Read `tap.visa.com/.well-known/agents`; cache for 5 minutes.</p>
            </div>
          </div>

          <div className="tap-gates">
            <div className="tap-gate-list">
              {checks.map(([num, name, detail]) => (
                <div className="tap-gate" key={num}>
                  <span className="tap-num">{num}</span>
                  <div>
                    <strong>{name}</strong>
                    <p>{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="tap-reject">
              <span>fail</span>
              <strong>401</strong>
            </div>
          </div>

          <div className="tap-step tap-pass">
            <span className="tap-num">07</span>
            <div>
              <strong>Inject verification headers</strong>
              <p>`X-Tap-Verified: true` and agent metadata continue to origin.</p>
            </div>
          </div>
        </div>

        <div className="tap-budget">budget: 2-4ms at edge</div>
      </div>

      <div className="tap-arrow" aria-hidden="true">{'->'}</div>

      <div className="tap-node tap-origin">
        <span>Merchant origin</span>
        <strong>X-Tap-Verified: true</strong>
        <em>X-Tap-Agent-Id: skyfire-agent-001</em>
      </div>

      <style>{`
        .tap-pipeline {
          display: grid;
          grid-template-columns: minmax(120px, 0.7fr) auto minmax(320px, 2.8fr) auto minmax(180px, 1fr);
          gap: 12px;
          align-items: center;
          margin: 32px 0;
          color: var(--ink-900);
        }

        .tap-node,
        .tap-edge {
          border: 1px solid var(--ink-300);
          background: var(--paper);
          border-radius: 8px;
        }

        .tap-node {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .tap-node span,
        .tap-edge-header span,
        .tap-num,
        .tap-budget,
        .tap-reject span {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-500);
        }

        .tap-node strong,
        .tap-step strong,
        .tap-gate strong,
        .tap-edge-header strong,
        .tap-reject strong {
          font-size: 13px;
          line-height: 1.25;
          color: var(--ink-900);
        }

        .tap-origin em {
          font-style: normal;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 10px;
          color: var(--ink-700);
          overflow-wrap: anywhere;
        }

        .tap-arrow {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          color: var(--ink-500);
          text-align: center;
        }

        .tap-edge {
          padding: 16px;
          background: var(--ink-100);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--paper-pure) 50%, transparent);
        }

        .tap-edge-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid var(--ink-200);
          padding-bottom: 10px;
          margin-bottom: 12px;
        }

        .tap-flow {
          display: grid;
          gap: 10px;
        }

        .tap-step,
        .tap-gate {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 10px;
          align-items: start;
          border: 1px solid var(--ink-200);
          background: var(--paper-pure);
          border-radius: 6px;
          padding: 10px;
        }

        .tap-step p,
        .tap-gate p {
          margin: 2px 0 0;
          font-size: 12px;
          line-height: 1.35;
          color: var(--ink-700);
        }

        .tap-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 24px;
          border: 1px solid var(--ink-200);
          border-radius: 4px;
          background: var(--ink-100);
          letter-spacing: 0;
        }

        .tap-gates {
          display: grid;
          grid-template-columns: 1fr 72px;
          gap: 10px;
          align-items: stretch;
        }

        .tap-gate-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .tap-reject {
          border: 1px solid color-mix(in srgb, var(--danger) 25%, var(--ink-200));
          background: color-mix(in srgb, var(--danger) 6%, var(--paper-pure));
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 4px;
        }

        .tap-reject strong {
          color: var(--diagram-3);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        }

        .tap-pass {
          border-color: color-mix(in srgb, var(--success) 25%, var(--ink-200));
          background: color-mix(in srgb, var(--success) 6%, var(--paper-pure));
        }

        .tap-budget {
          margin-top: 12px;
          border-top: 1px solid var(--ink-200);
          padding-top: 10px;
          text-align: right;
        }

        @media (max-width: 900px) {
          .tap-pipeline {
            grid-template-columns: 1fr;
          }

          .tap-arrow {
            transform: rotate(90deg);
          }
        }

        @media (max-width: 560px) {
          .tap-edge {
            padding: 12px;
          }

          .tap-gates,
          .tap-gate-list {
            grid-template-columns: 1fr;
          }

          .tap-reject {
            min-height: 58px;
          }
        }
      `}</style>
    </div>
  );
}
