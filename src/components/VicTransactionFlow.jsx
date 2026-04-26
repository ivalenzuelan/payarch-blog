const phases = [
  {
    group: 'Enrollment',
    steps: [
      ['01', 'Consumer enrolls card', 'VIC API', 'Issuer step-up, spending controls, agent-bound token reference.'],
      ['02', 'Device creates passkey', 'Device', 'FIDO2 credential stays in the secure enclave.'],
    ],
  },
  {
    group: 'Purchase',
    steps: [
      ['03', 'Instruction registered', 'VIC API', 'Passkey assertion creates instruction_ref for merchant, amount, and item.'],
      ['04', 'Agent reaches checkout', 'TAP', 'Signed HTTP request is verified at the edge before merchant origin.'],
      ['05', 'Credential retrieved', 'VIC API', 'Merchant receives VCN plus enriched VDCAP data.'],
      ['06', 'Authorization sent', 'ISO 8583', 'F002, F022, F048, and F126 carry the new agent context.'],
      ['07', 'Issuer approves', 'VisaNet + issuer', 'Agent policy checks replace the human 3DS path.'],
      ['08', 'Commerce signal closes loop', 'VIC API', 'Order outcome feeds dispute evidence and fraud intelligence.'],
    ],
  },
];

const ownerClass = {
  'VIC API': 'vic-owner-api',
  TAP: 'vic-owner-tap',
  Device: 'vic-owner-device',
  'ISO 8583': 'vic-owner-iso',
  'VisaNet + issuer': 'vic-owner-network',
};

export default function VicTransactionFlow() {
  return (
    <div className="vic-flow not-prose" aria-label="Visa Intelligent Commerce transaction flow">
      <div className="vic-flow-head">
        <span>System attribution</span>
        <strong>The transaction is one flow, but ownership changes at each hop</strong>
      </div>

      <div className="vic-flow-body">
        {phases.map((phase) => (
          <section className="vic-phase" key={phase.group}>
            <div className="vic-phase-label">{phase.group}</div>
            <div className="vic-steps">
              {phase.steps.map(([num, title, owner, detail]) => (
                <div className="vic-flow-step" key={num}>
                  <span className="vic-step-num">{num}</span>
                  <div className="vic-step-main">
                    <div className="vic-step-title">{title}</div>
                    <p>{detail}</p>
                  </div>
                  <div className={`vic-owner ${ownerClass[owner] ?? ''}`}>{owner}</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <style>{`
        .vic-flow {
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

        .vic-flow-head {
          padding: 18px 22px;
          border-bottom: 1px solid #e0dbd0;
          background: #f5f3ee;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .vic-flow-head span,
        .vic-phase-label,
        .vic-step-num,
        .vic-owner {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #8a8278;
        }

        .vic-flow-head strong {
          font-size: 17px;
          font-weight: 500;
          line-height: 1.25;
        }

        .vic-flow-body {
          display: grid;
          gap: 18px;
          padding: 22px;
        }

        .vic-phase {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 16px;
          align-items: start;
        }

        .vic-phase-label {
          position: sticky;
          top: 80px;
          border: 1px solid #e0dbd0;
          background: #fffdfa;
          border-radius: 5px;
          padding: 8px 10px;
          text-align: center;
        }

        .vic-steps {
          display: grid;
          gap: 8px;
          position: relative;
        }

        .vic-steps::before {
          content: '';
          position: absolute;
          top: 16px;
          bottom: 16px;
          left: 16px;
          width: 1px;
          background: #d8d3c8;
        }

        .vic-flow-step {
          position: relative;
          display: grid;
          grid-template-columns: 34px 1fr auto;
          gap: 12px;
          align-items: center;
          border: 1px solid #e0dbd0;
          border-radius: 8px;
          background: #fffdfa;
          padding: 10px;
        }

        .vic-step-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          border: 1px solid #d8d3c8;
          background: #f5f3ee;
          color: #4a4840;
          letter-spacing: 0;
          z-index: 1;
        }

        .vic-step-title {
          font-size: 14px;
          font-weight: 650;
          line-height: 1.25;
        }

        .vic-step-main p {
          margin: 3px 0 0;
          color: #4a4840;
          font-size: 12.5px;
          line-height: 1.4;
        }

        .vic-owner {
          border: 1px solid #d8d3c8;
          border-radius: 5px;
          padding: 5px 8px;
          background: #f5f3ee;
          color: #4a4840;
          white-space: nowrap;
        }

        .vic-owner-api { border-color: #b9c9e4; background: #f1f5fb; color: #1a4a90; }
        .vic-owner-tap { border-color: #b8d9d3; background: #eef8f6; color: #0f766e; }
        .vic-owner-device { border-color: #d4c5e8; background: #f8f4ff; color: #5b21b6; }
        .vic-owner-iso { border-color: #c8decf; background: #f3faf5; color: #065f46; }
        .vic-owner-network { border-color: #e8cdbb; background: #fff4ed; color: #9a4a18; }

        @media (max-width: 760px) {
          .vic-phase {
            grid-template-columns: 1fr;
          }

          .vic-phase-label {
            position: static;
            text-align: left;
          }

          .vic-flow-step {
            grid-template-columns: 34px 1fr;
          }

          .vic-owner {
            grid-column: 2;
            width: fit-content;
          }
        }
      `}</style>
    </div>
  );
}
