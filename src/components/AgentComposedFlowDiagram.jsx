const phases = [
  {
    name: "Enrollment",
    purpose: "Move trust work before checkout",
    color: "var(--diagram-4)",
    steps: [
      {
        num: "01",
        actor: "Consumer",
        action: "Creates passkey and policy",
        detail: "$500 limit, allowed MCCs, velocity, revocation rules.",
        primitives: ["P4"],
      },
      {
        num: "02",
        actor: "Network",
        action: "Issues agent-bound credential",
        detail: "VCN, Agentic Token, or payment-method extension.",
        primitives: ["P2"],
      },
      {
        num: "03",
        actor: "Agent",
        action: "Registers public key",
        detail: "Directory entry lets merchants verify future requests.",
        primitives: ["P1"],
      },
    ],
  },
  {
    name: "Instruction",
    purpose: "Create auditable intent",
    color: "var(--success)",
    steps: [
      {
        num: "04",
        actor: "Consumer + Agent",
        action: "Constructs payment instruction",
        detail: "Merchant, amount, item, agent, expiration, policy context.",
        primitives: ["P3", "P4"],
      },
      {
        num: "05",
        actor: "Network",
        action: "Registers instruction reference",
        detail: "Integrity hash becomes the object later carried in the authorization.",
        primitives: ["P3"],
      },
    ],
  },
  {
    name: "Transaction",
    purpose: "Carry evidence through existing rails",
    color: "var(--diagram-2)",
    steps: [
      {
        num: "06",
        actor: "Agent",
        action: "Signs checkout HTTP request",
        detail: "RFC 9421 signature covers method, authority, path, digest, timestamp, nonce.",
        primitives: ["P1"],
      },
      {
        num: "07",
        actor: "Merchant",
        action: "Verifies agent identity",
        detail: "TAP SDK, Web Bot Auth at edge, or equivalent verification path.",
        primitives: ["P1"],
      },
      {
        num: "08",
        actor: "Acquirer",
        action: "Builds ISO 8583 authorization",
        detail: "The standard card rails stay in place. The message fields change.",
        primitives: ["P2", "P3"],
      },
    ],
  },
  {
    name: "Authorization",
    purpose: "Approve without live step-up",
    color: "var(--diagram-1)",
    steps: [
      {
        num: "09",
        actor: "Network",
        action: "Matches private instruction reference to instruction",
        detail: "Amount and merchant tampering fails before issuer routing.",
        primitives: ["P3"],
      },
      {
        num: "10",
        actor: "Issuer",
        action: "Runs deterministic policy checks",
        detail: "Limit, category, velocity, token status, revocation. No 3DS fallback.",
        primitives: ["P4"],
      },
    ],
  },
];

const fields = [
  ["F002", "agent-bound token", "credential"],
  ["entry", "agent context", "routing signal"],
  ["F048", "agent identity", "context"],
  ["private instruction reference", "instruction hash", "integrity"],
];

const primitiveTone = {
  P1: "color-mix(in srgb, var(--diagram-2) 10%, var(--paper-pure))",
  P2: "color-mix(in srgb, var(--diagram-3) 10%, var(--paper-pure))",
  P3: "color-mix(in srgb, var(--success) 8%, var(--paper-pure))",
  P4: "var(--signal-100)",
};

const primitiveColor = {
  P1: "var(--diagram-2)",
  P2: "var(--diagram-3)",
  P3: "var(--success)",
  P4: "var(--diagram-1)",
};

function PrimitiveBadge({ id }) {
  return (
    <span
      className="composed-primitive"
      style={{
        "--primitive-bg": primitiveTone[id],
        "--primitive-color": primitiveColor[id],
      }}
    >
      {id}
    </span>
  );
}

export default function AgentComposedFlowDiagram() {
  return (
    <section className="composed-flow not-prose" aria-label="Composed agentic 4-party flow">
      <header className="composed-head">
        <span>Composed architecture</span>
        <strong>The rails stay boring. The trust substrate moves forward in time.</strong>
        <p>Enrollment and instruction carry the hard trust work. Authorization becomes evidence matching plus policy enforcement.</p>
      </header>

      <div className="composed-phases">
        {phases.map((phase, phaseIndex) => (
          <section className="composed-phase" key={phase.name} style={{ "--phase": phase.color }}>
            <div className="phase-top">
              <span>{phase.name}</span>
              <strong>{phase.purpose}</strong>
            </div>
            <div className="phase-steps">
              {phase.steps.map((step, stepIndex) => (
                <article className="composed-step" key={step.num}>
                  <div className="step-num">{step.num}</div>
                  <div className="step-body">
                    <span>{step.actor}</span>
                    <strong>{step.action}</strong>
                    <p>{step.detail}</p>
                    <div className="step-primitives">
                      {step.primitives.map((primitive) => (
                        <PrimitiveBadge id={primitive} key={primitive} />
                      ))}
                    </div>
                  </div>
                  {(phaseIndex < phases.length - 1 || stepIndex < phase.steps.length - 1) && (
                    <div className="step-connector" aria-hidden="true" />
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="iso-rail" aria-label="ISO 8583 authorization fields">
        <div className="iso-rail-head">
          <span>authorization payload</span>
          <strong>MTI 0100 carries the new evidence in old rails</strong>
        </div>
        <div className="iso-fields">
          {fields.map(([field, value, role]) => (
            <div className="iso-field" key={field}>
              <span>{field}</span>
              <strong>{value}</strong>
              <small>{role}</small>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .composed-flow {
          width: min(1040px, calc(100vw - 32px));
          position: relative;
          left: 50%;
          transform: translateX(-50%);
          margin: 34px 0;
          border: 1px solid var(--ink-200);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink-900);
          overflow: hidden;
        }

        .composed-head {
          padding: 20px 22px 18px;
          border-bottom: 1px solid var(--ink-200);
          background: var(--ink-100);
        }

        .composed-head span,
        .phase-top span,
        .step-body span,
        .composed-primitive,
        .iso-rail-head span,
        .iso-field span,
        .iso-field small {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-500);
        }

        .composed-head strong {
          display: block;
          margin-top: 5px;
          font-size: 18px;
          line-height: 1.25;
          font-weight: 560;
        }

        .composed-head p {
          margin: 7px 0 0;
          max-width: 760px;
          color: var(--ink-700);
          font-size: 13px;
          line-height: 1.5;
        }

        .composed-phases {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          background: var(--ink-200);
        }

        .composed-phase {
          min-width: 0;
          background: var(--paper);
          border-top: 4px solid var(--phase);
        }

        .phase-top {
          min-height: 92px;
          padding: 14px 14px 12px;
          background: color-mix(in srgb, var(--phase) 8%, var(--paper-pure));
          border-bottom: 1px solid var(--ink-200);
        }

        .phase-top span {
          color: var(--phase);
        }

        .phase-top strong {
          display: block;
          margin-top: 5px;
          font-size: 14px;
          line-height: 1.25;
          font-weight: 650;
        }

        .phase-steps {
          padding: 12px;
          display: grid;
          gap: 10px;
        }

        .composed-step {
          position: relative;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 9px;
          min-height: 146px;
        }

        .step-num {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid color-mix(in srgb, var(--phase) 40%, var(--ink-200));
          background: var(--paper-pure);
          color: var(--phase);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 10px;
          font-weight: 700;
          z-index: 1;
        }

        .step-body {
          border: 1px solid var(--ink-200);
          border-radius: 8px;
          background: var(--paper-pure);
          padding: 10px 10px 11px;
          min-width: 0;
        }

        .step-body span {
          color: var(--phase);
        }

        .step-body strong {
          display: block;
          margin-top: 4px;
          font-size: 13px;
          line-height: 1.25;
          font-weight: 650;
        }

        .step-body p {
          margin: 6px 0 0;
          color: var(--ink-700);
          font-size: 11.5px;
          line-height: 1.45;
        }

        .step-primitives {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }

        .composed-primitive {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          border: 1px solid color-mix(in srgb, var(--primitive-color) 34%, var(--ink-200));
          border-radius: 999px;
          background: var(--primitive-bg);
          color: var(--primitive-color);
          padding: 2px 6px;
          letter-spacing: 0;
          font-weight: 700;
        }

        .step-connector {
          position: absolute;
          left: 16px;
          top: 34px;
          bottom: -10px;
          width: 1px;
          background: repeating-linear-gradient(
            to bottom,
            color-mix(in srgb, var(--phase) 36%, var(--ink-200)) 0 5px,
            transparent 5px 9px
          );
        }

        .iso-rail {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 18px;
          padding: 20px 22px 22px;
          border-top: 1px solid var(--ink-200);
          background: var(--paper-pure);
        }

        .iso-rail-head strong {
          display: block;
          margin-top: 5px;
          font-size: 16px;
          line-height: 1.25;
          font-weight: 620;
        }

        .iso-fields {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .iso-field {
          border: 1px solid var(--ink-200);
          border-radius: 8px;
          background: var(--paper);
          padding: 11px 12px;
          min-width: 0;
        }

        .iso-field span {
          color: var(--ink-700);
          letter-spacing: 0.04em;
        }

        .iso-field strong {
          display: block;
          margin-top: 5px;
          font-size: 13px;
          line-height: 1.25;
          font-weight: 700;
        }

        .iso-field small {
          display: block;
          margin-top: 6px;
          color: var(--ink-500);
          letter-spacing: 0.04em;
        }

        @media (max-width: 980px) {
          .composed-phases {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .iso-rail {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 680px) {
          .composed-flow {
            width: min(100%, calc(100vw - 20px));
          }

          .composed-head,
          .iso-rail {
            padding-left: 16px;
            padding-right: 16px;
          }

          .composed-phases,
          .iso-fields {
            grid-template-columns: 1fr;
          }

          .phase-top {
            min-height: auto;
          }

          .composed-step {
            min-height: auto;
          }
        }
      `}</style>
    </section>
  );
}
