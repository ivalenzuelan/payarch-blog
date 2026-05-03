const primitives = [
  {
    id: "P1",
    name: "Cryptographic agent identity",
    short: "identity",
    old: "CAPTCHA, device fingerprint, IP reputation",
    layer: "Merchant + gateway",
    evidence: ["Signature-Input", "Signature", "agent public key"],
    mechanism: "The request is signed over method, authority, path, digest, timestamp, and nonce.",
    color: "var(--diagram-2)",
    tone: "color-mix(in srgb, var(--diagram-2) 10%, var(--paper-pure))",
    border: "dashed",
  },
  {
    id: "P2",
    name: "Agent-bound credential",
    short: "credential",
    old: "Reusable PAN or token without agent context",
    layer: "Acquirer + processor",
    evidence: ["tokenized credential", "agent context", "network metadata"],
    mechanism: "The credential only works when presented by the agent identity it was issued to.",
    color: "var(--diagram-3)",
    tone: "color-mix(in srgb, var(--diagram-3) 10%, var(--paper-pure))",
    border: "dotted",
  },
  {
    id: "P3",
    name: "Registered payment instruction",
    short: "instruction",
    old: "ML risk score without prior intent proof",
    layer: "Card network",
    evidence: ["payment scope", "merchant match", "amount match"],
    mechanism: "The network compares the authorization message against the consumer-authorized instruction.",
    color: "var(--success)",
    tone: "color-mix(in srgb, var(--success) 8%, var(--paper-pure))",
    border: "dashed",
  },
  {
    id: "P4",
    name: "Pre-authorized spending policy",
    short: "policy",
    old: "3DS challenge to a live cardholder",
    layer: "Issuer bank",
    evidence: ["Passkey assertion", "limit", "MCC", "velocity"],
    mechanism: "The issuer enforces deterministic rules created before the transaction.",
    color: "var(--diagram-1)",
    tone: "var(--signal-100)",
    border: "double",
  },
];

const systems = [
  {
    name: "Visa",
    architecture: "TAP + VIC + VTS",
    fit: ["native", "native", "native", "native"],
    note: "Illustrative ISO 8583 mapping: entry context, additional data, and private-use fields can carry agent evidence downstream.",
    color: "var(--diagram-1)",
  },
  {
    name: "Mastercard",
    architecture: "Agent Pay + token service",
    fit: ["native", "native", "native", "native"],
    note: "Token-first design. More of the binding lives in token metadata and edge verification.",
    color: "var(--diagram-3)",
  },
  {
    name: "AP2",
    architecture: "Mandates + payment extensions",
    fit: ["partial", "external", "native", "partial"],
    note: "Strong instruction evidence. Card credential binding depends on the payment method extension.",
    color: "var(--diagram-4)",
  },
  {
    name: "x402",
    architecture: "HTTP 402 payment transport",
    fit: ["external", "native", "partial", "external"],
    note: "Excellent for internet-native settlement. Regulated card-style policy still needs companion identity and authorization layers.",
    color: "var(--success)",
  },
];

const fitLabel = {
  native: "native",
  partial: "partial",
  external: "paired",
};

export default function AgentPrimitiveMapDiagram() {
  return (
    <section className="primitive-map not-prose" aria-label="Four agent payment primitives mapped to 4-party layers">
      <header className="primitive-head">
        <span>Primitive map</span>
        <strong>Every workable design rebuilds the same four trust signals</strong>
        <p>Products differ in packaging. The architecture keeps converging on the same replacements.</p>
      </header>

      <div className="primitive-rows">
        {primitives.map((primitive) => (
          <article
            className="primitive-row"
            key={primitive.id}
            style={{
              "--accent": primitive.color,
              "--tone": primitive.tone,
              "--border-style": primitive.border,
            }}
          >
            <div className="primitive-id">
              <span>{primitive.id}</span>
            </div>
            <div className="primitive-main">
              <span>{primitive.layer}</span>
              <strong>{primitive.name}</strong>
              <p>{primitive.mechanism}</p>
            </div>
            <div className="primitive-old">
              <span>replaces</span>
              <strong>{primitive.old}</strong>
            </div>
            <div className="primitive-evidence">
              <span>evidence on the wire</span>
              <div>
                {primitive.evidence.map((item) => (
                  <b key={item}>{item}</b>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="primitive-fit">
        <div className="fit-header">
          <span>Implementation fit</span>
          <strong>Same primitives, different ownership boundaries</strong>
        </div>
        <div className="fit-table">
          <div className="fit-row fit-labels">
            <span>system</span>
            {primitives.map((primitive) => (
              <div className="fit-prim-label" key={primitive.id} style={{ "--prim-color": primitive.color }}>
                <b>{primitive.id}</b>
                <span>{primitive.short}</span>
              </div>
            ))}
            <span>architecture note</span>
          </div>
          {systems.map((system) => (
            <div className="fit-row" key={system.name} style={{ "--system": system.color }}>
              <div className="fit-system">
                <strong>{system.name}</strong>
                <span>{system.architecture}</span>
              </div>
              {system.fit.map((fit, index) => (
                <div
                  className={`fit-cell ${fit}`}
                  data-primitive={primitives[index].id}
                  key={`${system.name}-${primitives[index].id}`}
                >
                  <div className="fit-dot" />
                  <span>{fitLabel[fit]}</span>
                </div>
              ))}
              <p className="fit-note">{system.note}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .primitive-map {
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

        .primitive-head {
          padding: 20px 22px 18px;
          border-bottom: 1px solid var(--ink-200);
          background: var(--ink-100);
        }

        .primitive-head span,
        .primitive-main span,
        .primitive-old span,
        .primitive-evidence span,
        .fit-header span,
        .fit-labels span,
        .fit-cell span,
        .fit-system span {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-500);
        }

        .primitive-head strong {
          display: block;
          margin-top: 5px;
          font-size: 18px;
          font-weight: 560;
          line-height: 1.25;
        }

        .primitive-head p {
          margin: 7px 0 0;
          color: var(--ink-700);
          font-size: 13px;
          line-height: 1.5;
        }

        .primitive-rows {
          display: grid;
          gap: 1px;
          background: var(--ink-200);
        }

        .primitive-row {
          display: grid;
          grid-template-columns: 60px 1.35fr 1fr 1.1fr;
          background: var(--paper);
          border-left: 4px solid var(--accent);
        }

        .primitive-row > div {
          min-width: 0;
          padding: 14px 14px;
          border-right: 1px solid var(--ink-200);
        }

        .primitive-row > div:last-child {
          border-right: 0;
        }

        .primitive-id {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--tone);
        }

        .primitive-id span {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px var(--border-style) var(--accent);
          color: var(--accent);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0;
          background: color-mix(in srgb, var(--paper-pure) 64%, transparent);
        }

        .primitive-main span {
          color: var(--accent);
        }

        .primitive-main strong {
          display: block;
          margin-top: 4px;
          font-size: 15px;
          line-height: 1.25;
          font-weight: 650;
        }

        .primitive-main p {
          margin: 6px 0 0;
          color: var(--ink-700);
          font-size: 12px;
          line-height: 1.5;
        }

        .primitive-old strong {
          display: block;
          margin-top: 5px;
          color: var(--ink-700);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 520;
        }

        .primitive-evidence div {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 7px;
        }

        .primitive-evidence b {
          border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--ink-200));
          border-radius: 5px;
          background: var(--tone);
          color: var(--accent);
          padding: 4px 6px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 10px;
          line-height: 1.15;
          font-weight: 650;
        }

        .primitive-fit {
          padding: 20px 22px 22px;
          background: var(--paper-pure);
          border-top: 1px solid var(--ink-200);
        }

        .fit-header {
          margin-bottom: 12px;
        }

        .fit-header strong {
          display: block;
          margin-top: 4px;
          font-size: 16px;
          line-height: 1.25;
          font-weight: 620;
        }

        .fit-table {
          border: 1px solid var(--ink-200);
          border-radius: 8px;
          overflow: hidden;
          background: var(--paper);
        }

        .fit-row {
          display: grid;
          grid-template-columns: minmax(160px, 0.95fr) repeat(4, 90px) minmax(220px, 1.25fr);
          align-items: stretch;
          border-bottom: 1px solid var(--ink-200);
        }

        .fit-row:last-child {
          border-bottom: 0;
        }

        .fit-row > * {
          padding: 11px 12px;
          border-right: 1px solid var(--ink-200);
        }

        .fit-row > *:last-child {
          border-right: 0;
        }

        .fit-labels {
          background: var(--ink-100);
        }

        .fit-labels > span {
          display: flex;
          align-items: center;
        }

        .fit-prim-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }

        .fit-prim-label b {
          color: var(--prim-color);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .fit-system {
          border-left: 3px solid var(--system);
          padding-left: 10px;
        }

        .fit-system strong {
          display: block;
          color: var(--system);
          font-size: 13px;
          line-height: 1.25;
          font-weight: 700;
        }

        .fit-system span {
          display: block;
          margin-top: 4px;
          color: var(--ink-500);
          letter-spacing: 0.03em;
        }

        .fit-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: var(--paper);
        }

        .fit-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          border: 1.5px solid var(--ink-300);
          background: transparent;
        }

        .fit-cell.native .fit-dot {
          background: var(--success);
          border-color: var(--success);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--success) 18%, transparent);
        }

        .fit-cell.partial .fit-dot {
          background: linear-gradient(to right, var(--warning) 50%, transparent 50%);
          border-color: var(--warning);
        }

        .fit-cell span {
          border: 1px solid var(--ink-300);
          border-radius: 999px;
          padding: 3px 7px;
          background: var(--paper-pure);
          color: var(--ink-700);
          letter-spacing: 0.04em;
        }

        .fit-cell.native span {
          border-color: color-mix(in srgb, var(--success) 34%, var(--ink-200));
          background: color-mix(in srgb, var(--success) 8%, var(--paper-pure));
          color: var(--success);
        }

        .fit-cell.partial span {
          border-style: dashed;
          border-color: color-mix(in srgb, var(--warning) 40%, var(--ink-200));
          background: color-mix(in srgb, var(--warning) 8%, var(--paper-pure));
          color: color-mix(in srgb, var(--warning) 80%, var(--ink-900));
        }

        .fit-cell.external span {
          border-style: dotted;
          color: var(--ink-600);
        }

        .fit-note {
          margin: 0;
          color: var(--ink-700);
          font-size: 12px;
          line-height: 1.45;
        }

        @media (max-width: 940px) {
          .primitive-row {
            grid-template-columns: 58px 1fr;
          }

          .primitive-main {
            border-right: 0 !important;
          }

          .primitive-old,
          .primitive-evidence {
            grid-column: 2;
            border-top: 1px solid var(--ink-200);
          }

          .fit-row {
            grid-template-columns: minmax(150px, 0.9fr) repeat(4, minmax(72px, 1fr)) minmax(190px, 1.15fr);
          }
        }

        @media (max-width: 620px) {
          .primitive-map {
            width: min(100%, calc(100vw - 20px));
          }

          .primitive-head,
          .primitive-fit {
            padding-left: 16px;
            padding-right: 16px;
          }

          .fit-labels {
            display: none;
          }

          .fit-row {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .fit-row > * {
            border-right: 1px solid var(--ink-200);
          }

          .fit-system,
          .fit-note {
            grid-column: 1 / -1;
            border-right: 0;
          }

          .fit-system {
            border-left: 3px solid var(--system);
            padding-left: 10px;
          }

          .fit-cell {
            min-height: 64px;
          }

          .fit-cell::before {
            content: attr(data-primitive);
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
            font-size: 10px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--ink-500);
          }

          .fit-note {
            border-top: 1px solid var(--ink-200);
          }
        }
      `}</style>
    </section>
  );
}
