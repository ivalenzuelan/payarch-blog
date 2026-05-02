import { useState } from "react"

const rows = [
  {
    id: "credential",
    label: "Credential",
    human: "Card or stored credential",
    agent: "Tokenized, scoped credential",
    note: "Public Visa material supports tokenized credentials for agentic commerce. The exact production payload is not public.",
  },
  {
    id: "context",
    label: "Initiation context",
    human: "Ordinary ecommerce context",
    agent: "Agent-assisted context",
    note: "A rail may need extra context so downstream systems avoid treating an approved agent exactly like unknown automation.",
  },
  {
    id: "trust",
    label: "Trust evidence",
    human: "Merchant risk signals",
    agent: "Signed-request verification and agent identity",
    note: "TAP is an HTTP identity layer. Public sources do not publish a complete card-network data-element mapping for this evidence.",
  },
  {
    id: "mandate",
    label: "Consumer authorization",
    human: "Checkout-time consent or stored credential rules",
    agent: "Pre-authorized instruction or spending policy",
    note: "The consumer control boundary is the key difference: the agent should spend only inside a delegated scope.",
  },
  {
    id: "decision",
    label: "Issuer decision",
    human: "Approve or decline using normal issuer controls",
    agent: "Approve or decline using issuer controls plus token/policy context",
    note: "Approval codes, decline codes, and private validation rules are network and issuer implementation details.",
  },
]

const packets = {
  human: [
    ["Merchant checkout", "Order amount, merchant, credential"],
    ["PSP / acquirer", "Build network authorization request"],
    ["Network", "Route to issuer"],
    ["Issuer", "Funds, risk, card status, policy"],
  ],
  agent: [
    ["Agent checkout", "Cart, trust result, scoped payment context"],
    ["Merchant / PSP", "Create payment request with tokenized credential"],
    ["Network", "Route with authorization metadata"],
    ["Issuer", "Funds, risk, token status, delegated policy"],
  ],
}

export default function Iso8583Diagram() {
  const [mode, setMode] = useState("agent")
  const packet = packets[mode]

  return (
    <div className="iso-safe not-prose" aria-label="Conceptual card authorization anatomy for agentic commerce">
      <div className="iso-safe-head">
        <div>
          <span>Card authorization anatomy</span>
          <strong>What changes for an agent-assisted checkout</strong>
        </div>
        <div className="iso-toggle" role="tablist" aria-label="transaction mode">
          <button type="button" className={mode === "human" ? "active" : ""} onClick={() => setMode("human")}>Human CNP</button>
          <button type="button" className={mode === "agent" ? "active" : ""} onClick={() => setMode("agent")}>Agent-assisted</button>
        </div>
      </div>

      <div className="iso-safe-note">
        This is a conceptual packet map, not a Visa field specification. Public sources do not disclose exact agentic ISO 8583 data elements, private fields, or response-code behavior.
      </div>

      <div className="iso-flow">
        {packet.map(([title, detail], index) => (
          <div className="iso-flow-step" key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{title}</strong>
            <p>{detail}</p>
          </div>
        ))}
      </div>

      <div className="iso-compare">
        {rows.map((row) => (
          <button
            type="button"
            className={`iso-row ${mode === "agent" ? "agent" : "human"}`}
            key={row.id}
            onClick={() => setMode(mode === "agent" ? "human" : "agent")}
          >
            <div className="iso-row-main">
              <span>{row.label}</span>
              <strong>{mode === "agent" ? row.agent : row.human}</strong>
            </div>
            <p>{row.note}</p>
          </button>
        ))}
      </div>

      <style>{`
        .iso-safe {
          width: 100vw;
          max-width: 1040px;
          position: relative;
          left: 50%;
          transform: translateX(-50%);
          margin: 36px 0;
          border: 1px solid var(--ink-200);
          border-radius: 10px;
          overflow: hidden;
          background: var(--paper);
          color: var(--ink-900);
        }

        .iso-safe-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 18px 22px;
          border-bottom: 1px solid var(--ink-200);
          background: var(--ink-100);
        }

        .iso-safe-head span,
        .iso-safe-note,
        .iso-flow-step span,
        .iso-row-main span {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-500);
        }

        .iso-safe-head strong {
          display: block;
          margin-top: 5px;
          font-size: 18px;
          line-height: 1.2;
          font-weight: 600;
        }

        .iso-toggle {
          display: flex;
          gap: 4px;
          padding: 4px;
          border: 1px solid var(--ink-200);
          border-radius: 8px;
          background: var(--paper-pure);
          flex-shrink: 0;
        }

        .iso-toggle button {
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: var(--ink-600);
          padding: 7px 10px;
          font-size: 12px;
          cursor: pointer;
        }

        .iso-toggle button.active {
          background: var(--ink-900);
          color: var(--paper-pure);
        }

        .iso-safe-note {
          padding: 12px 22px;
          border-bottom: 1px solid var(--ink-200);
          background: color-mix(in srgb, var(--diagram-3) 8%, var(--paper-pure));
          line-height: 1.5;
          text-transform: none;
          letter-spacing: 0;
        }

        .iso-flow {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          background: var(--ink-200);
        }

        .iso-flow-step {
          background: var(--paper-pure);
          padding: 16px;
          min-width: 0;
        }

        .iso-flow-step strong {
          display: block;
          margin-top: 8px;
          font-size: 14px;
          line-height: 1.25;
        }

        .iso-flow-step p,
        .iso-row p {
          margin: 7px 0 0;
          color: var(--ink-600);
          line-height: 1.55;
          font-size: 12px;
        }

        .iso-compare {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1px;
          background: var(--ink-200);
          border-top: 1px solid var(--ink-200);
        }

        .iso-row {
          border: 0;
          text-align: left;
          padding: 16px;
          background: var(--paper);
          cursor: pointer;
          min-width: 0;
        }

        .iso-row.agent {
          border-top: 3px solid var(--diagram-1);
        }

        .iso-row.human {
          border-top: 3px solid var(--ink-400);
        }

        .iso-row-main strong {
          display: block;
          margin-top: 8px;
          color: var(--ink-900);
          font-size: 13px;
          line-height: 1.25;
        }

        @media (max-width: 760px) {
          .iso-safe {
            width: 100%;
            left: auto;
            transform: none;
          }

          .iso-safe-head {
            flex-direction: column;
            align-items: flex-start;
          }

          .iso-flow,
          .iso-compare {
            grid-template-columns: 1fr;
          }

          .iso-toggle {
            width: 100%;
          }

          .iso-toggle button {
            flex: 1;
          }
        }
      `}</style>
    </div>
  )
}
