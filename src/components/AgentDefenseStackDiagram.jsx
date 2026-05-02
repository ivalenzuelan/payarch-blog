import { useMemo, useState } from "react";

const layers = [
  {
    id: "L0",
    actor: "Consumer",
    question: "Is the cardholder present now?",
    oldSignal: "Physical, behavioral, and temporal presence",
    failure: "The user delegated the purchase and is absent by design.",
    primitive: "Passkey policy root",
    newSignal: "FIDO2 assertion at enrollment plus revocable spend rules.",
    detail:
      "The old root signal was real-time presence. Agent payments move that proof to enrollment, then enforce a policy at transaction time.",
    color: "var(--ink-900)",
    tone: "var(--ink-100)",
    pattern: "solid",
  },
  {
    id: "L1",
    actor: "Merchant + Gateway",
    question: "Is this a human, not a bot?",
    oldSignal: "CAPTCHA, WAF rules, device fingerprint, velocity caps",
    failure: "A legitimate agent has the same observable shape as carding automation.",
    primitive: "Cryptographic agent identity",
    newSignal: "Signed HTTP request, nonce, timestamp, public-key directory.",
    detail:
      "Behavioral heuristics stop being the authority. The gateway verifies that the request was signed by a registered agent and has not been replayed or modified.",
    color: "var(--diagram-2)",
    tone: "color-mix(in srgb, var(--diagram-2) 10%, var(--paper-pure))",
    pattern: "dashed",
  },
  {
    id: "L2",
    actor: "Acquirer + Processor",
    question: "Does this match the merchant baseline?",
    oldSignal: "card-not-present entry signal, AVS, CVV, IP reputation, ecommerce heuristics",
    failure: "The transaction is tagged as manual key entry and inherits human fraud rules.",
    primitive: "Agent-bound credential",
    newSignal: "Token plus agent-context flag and agent context fields.",
    detail:
      "The credential becomes useless outside the agent that owns it. The ISO message now carries an explicit agent mode instead of pretending the card was typed into a form.",
    color: "var(--diagram-3)",
    tone: "color-mix(in srgb, var(--diagram-3) 10%, var(--paper-pure))",
    pattern: "dotted",
  },
  {
    id: "L3",
    actor: "Card Network",
    question: "Is this coordinated fraud?",
    oldSignal: "Cross-merchant ML trained on machine-speed attack patterns",
    failure: "The model correctly scores the agent as high risk because the message has no intent proof.",
    primitive: "Registered instruction",
    newSignal: "Amount, merchant, item, agent, and hash checked before routing.",
    detail:
      "The network no longer relies only on behavior. It compares the authorization message with a consumer-authorized instruction registered before checkout.",
    color: "var(--success)",
    tone: "color-mix(in srgb, var(--success) 8%, var(--paper-pure))",
    pattern: "dashdot",
  },
  {
    id: "L4",
    actor: "Issuer Bank",
    question: "Should the issuer approve?",
    oldSignal: "Risk score and 3DS step-up to the live cardholder",
    failure: "A real-time challenge cannot be answered by an absent consumer.",
    primitive: "Deterministic spend policy",
    newSignal: "Limits, MCC, velocity, geography, token status, revocation state.",
    detail:
      "The issuer replaces a live challenge with policy enforcement. Approval becomes a rules decision against prior consent, not a guess about current presence.",
    color: "var(--diagram-1)",
    tone: "var(--signal-100)",
    pattern: "double",
  },
];

export default function AgentDefenseStackDiagram() {
  const [activeId, setActiveId] = useState("L3");
  const active = useMemo(
    () => layers.find((layer) => layer.id === activeId) ?? layers[0],
    [activeId],
  );

  return (
    <section className="agent-defense not-prose" aria-label="4-party model defense stack for agent payments">
      <header className="agent-defense-head">
        <span>Defense stack</span>
        <strong>The 4-party model is a fraud system before it is a settlement diagram</strong>
        <p>Every layer reads a version of human presence. Agent payments rebuild those reads with cryptographic evidence.</p>
      </header>

      <div className="agent-defense-root">
        <div>
          <span className="root-label">Old root signal</span>
          <strong>human present and reactive at transaction time</strong>
        </div>
        <div className="root-break">removed by delegation</div>
        <div>
          <span className="root-label">New root signal</span>
          <strong>human who delegated, with policy and evidence, before transaction time</strong>
        </div>
      </div>

      <div className="agent-defense-grid" role="list">
        {layers.map((layer) => (
          <button
            type="button"
            className={`agent-defense-row ${activeId === layer.id ? "is-active" : ""}`}
            key={layer.id}
            onClick={() => setActiveId(layer.id)}
            style={{
              "--accent": layer.color,
              "--tone": layer.tone,
              "--pattern": layer.pattern === "dashdot" ? "dashed" : layer.pattern,
            }}
            role="listitem"
          >
            <div className="layer-id">
              <span>{layer.id}</span>
            </div>
            <div className="layer-actor">
              <strong>{layer.actor}</strong>
              <span>{layer.question}</span>
            </div>
            <div className="layer-cell old">
              <span>old mechanism</span>
              <strong>{layer.oldSignal}</strong>
            </div>
            <div className="layer-fail">
              <span>break</span>
              <strong>{layer.failure}</strong>
            </div>
            <div className="layer-cell primitive">
              <span>{layer.primitive}</span>
              <strong>{layer.newSignal}</strong>
            </div>
          </button>
        ))}
      </div>

      <div className="agent-defense-detail" style={{ "--accent": active.color, "--tone": active.tone }}>
        <span>{active.id} trust invariant</span>
        <strong>{active.primitive}</strong>
        <p>{active.detail}</p>
      </div>

      <style>{`
        .agent-defense {
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

        .agent-defense-head {
          padding: 20px 22px 18px;
          border-bottom: 1px solid var(--ink-200);
          background: var(--ink-100);
        }

        .agent-defense-head span,
        .root-label,
        .root-break,
        .layer-id,
        .layer-cell span,
        .layer-fail span,
        .agent-defense-detail span {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-500);
        }

        .agent-defense-head strong {
          display: block;
          margin-top: 5px;
          font-size: 18px;
          font-weight: 560;
          line-height: 1.25;
        }

        .agent-defense-head p {
          margin: 7px 0 0;
          max-width: 760px;
          color: var(--ink-700);
          font-size: 13px;
          line-height: 1.5;
        }

        .agent-defense-root {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          padding: 14px 22px;
          border-bottom: 1px solid var(--ink-200);
          background: var(--paper-pure);
        }

        .agent-defense-root strong {
          display: block;
          margin-top: 3px;
          font-size: 14px;
          line-height: 1.3;
          font-weight: 620;
        }

        .root-break {
          color: var(--danger);
          border: 1px solid color-mix(in srgb, var(--danger) 32%, var(--ink-200));
          border-radius: 999px;
          padding: 5px 10px;
          background: color-mix(in srgb, var(--danger) 7%, var(--paper-pure));
          white-space: nowrap;
        }

        .agent-defense-grid {
          display: grid;
          gap: 1px;
          background: var(--ink-200);
        }

        .agent-defense-row {
          display: grid;
          grid-template-columns: 54px 1.08fr 1.22fr 1.22fr 1.32fr;
          gap: 0;
          align-items: stretch;
          width: 100%;
          text-align: left;
          border: 0;
          border-left: 4px solid var(--accent);
          background: var(--paper);
          color: inherit;
          cursor: pointer;
          padding: 0;
          transition: background 150ms ease, box-shadow 150ms ease;
        }

        .agent-defense-row:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: -2px;
        }

        .agent-defense-row.is-active {
          background: var(--tone);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent);
        }

        .layer-id,
        .layer-actor,
        .layer-cell,
        .layer-fail {
          padding: 13px 12px;
          min-width: 0;
        }

        .layer-id {
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid var(--ink-200);
        }

        .layer-id span {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px var(--pattern) var(--accent);
          background: color-mix(in srgb, var(--paper-pure) 72%, transparent);
          letter-spacing: 0;
        }

        .layer-actor {
          border-right: 1px solid var(--ink-200);
        }

        .layer-actor strong {
          display: block;
          color: var(--accent);
          font-size: 13px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          line-height: 1.25;
        }

        .layer-actor span {
          display: block;
          margin-top: 4px;
          color: var(--ink-700);
          font-size: 12px;
          line-height: 1.35;
        }

        .layer-cell,
        .layer-fail {
          border-right: 1px solid var(--ink-200);
        }

        .layer-cell strong,
        .layer-fail strong {
          display: block;
          margin-top: 5px;
          font-size: 12px;
          line-height: 1.42;
          font-weight: 520;
          color: var(--ink-800);
        }

        .layer-fail {
          background: color-mix(in srgb, var(--danger) 5%, transparent);
        }

        .layer-fail span {
          color: var(--danger);
        }

        .primitive {
          border-right: 0;
        }

        .primitive span {
          color: var(--accent);
        }

        .agent-defense-detail {
          margin: 18px 22px 22px;
          border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--ink-200));
          border-radius: 8px;
          background: var(--tone);
          padding: 15px 16px;
        }

        .agent-defense-detail span {
          color: var(--accent);
        }

        .agent-defense-detail strong {
          display: block;
          margin-top: 4px;
          font-size: 17px;
          line-height: 1.25;
          font-weight: 620;
        }

        .agent-defense-detail p {
          margin: 7px 0 0;
          color: var(--ink-700);
          font-size: 13px;
          line-height: 1.55;
        }

        @media (max-width: 920px) {
          .agent-defense-row {
            grid-template-columns: 54px 1fr;
          }

          .layer-actor {
            border-right: 0;
          }

          .layer-cell,
          .layer-fail {
            grid-column: 2;
            border-top: 1px solid var(--ink-200);
          }
        }

        @media (max-width: 620px) {
          .agent-defense {
            width: min(100%, calc(100vw - 20px));
            margin: 28px 0;
          }

          .agent-defense-head,
          .agent-defense-root {
            padding-left: 16px;
            padding-right: 16px;
          }

          .agent-defense-root {
            grid-template-columns: 1fr;
          }

          .root-break {
            width: fit-content;
          }

          .agent-defense-detail {
            margin-left: 16px;
            margin-right: 16px;
          }
        }
      `}</style>
    </section>
  );
}
