import { useEffect, useMemo, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import { agenticCheckoutE2E } from "../lib/core"

const SVG_W = 900
const SVG_H = 1424
const ACTOR_HEAD_W = 118
const ACTOR_HEAD_H = 50
const LIFELINE_TOP = 118
const LIFELINE_BOTTOM = 1346
const MARKER_ID = "vic-sequence-arrow"

const ACTORS = [
  {
    id: "consumer",
    label: "Consumer",
    sublabel: "policy + passkey",
    x: 76,
    accent: "var(--ink-500)",
    fill: "var(--paper-pure)",
  },
  {
    id: "agent",
    label: "AI agent",
    sublabel: "runtime + tools",
    x: 224,
    accent: "var(--diagram-4)",
    fill: "color-mix(in srgb, var(--diagram-4) 10%, var(--paper-pure))",
  },
  {
    id: "vic",
    label: "VIC",
    sublabel: "TAP + tokens",
    x: 372,
    accent: "var(--diagram-1)",
    fill: "color-mix(in srgb, var(--diagram-1) 10%, var(--paper-pure))",
  },
  {
    id: "merchant",
    label: "Merchant",
    sublabel: "checkout",
    x: 520,
    accent: "var(--diagram-3)",
    fill: "color-mix(in srgb, var(--diagram-3) 10%, var(--paper-pure))",
  },
  {
    id: "acquirer",
    label: "Acquirer",
    sublabel: "PSP / gateway",
    x: 668,
    accent: "var(--success)",
    fill: "color-mix(in srgb, var(--success) 10%, var(--paper-pure))",
  },
  {
    id: "issuer",
    label: "Issuer",
    sublabel: "auth decision",
    x: 816,
    accent: "var(--diagram-2)",
    fill: "color-mix(in srgb, var(--diagram-2) 10%, var(--paper-pure))",
  },
]

const PHASES = [
  {
    id: "setup",
    shortLabel: "Enrollment",
    label: "Phase 1 - one-time enrollment",
    y: 130,
    h: 158,
    accent: "var(--diagram-3)",
    fill: "color-mix(in srgb, var(--diagram-3) 9%, var(--paper-pure))",
    delay: 0.08,
  },
  {
    id: "intent",
    shortLabel: "Intent",
    label: "Phase 2 - shopping and instruction capture",
    y: 320,
    h: 338,
    accent: "var(--diagram-4)",
    fill: "color-mix(in srgb, var(--diagram-4) 9%, var(--paper-pure))",
    delay: 1.12,
  },
  {
    id: "trust",
    shortLabel: "Trust",
    label: "Phase 3 - checkout trust and credential retrieval",
    y: 690,
    h: 294,
    accent: "var(--diagram-1)",
    fill: "color-mix(in srgb, var(--diagram-1) 9%, var(--paper-pure))",
    delay: 4.12,
  },
  {
    id: "rails",
    shortLabel: "Rails",
    label: "Phase 4 - authorization on existing card rails",
    y: 1016,
    h: 340,
    accent: "var(--success)",
    fill: "color-mix(in srgb, var(--success) 9%, var(--paper-pure))",
    delay: 6.56,
  },
]

const MESSAGES = [
  {
    phase: "setup",
    from: "consumer",
    to: "agent",
    y: 198,
    label: ["Passkey + spending policy"],
    width: 168,
    delay: 0.32,
  },
  {
    phase: "setup",
    from: "agent",
    to: "vic",
    y: 236,
    label: ["Register agent", "and enroll card"],
    width: 142,
    delay: 0.64,
  },
  {
    phase: "setup",
    from: "vic",
    to: "agent",
    y: 274,
    label: ["Agent token + registry entry"],
    width: 180,
    response: true,
    delay: 0.96,
  },
  {
    phase: "intent",
    from: "consumer",
    to: "agent",
    y: 398,
    label: ["Buy a padel racket", "under $250"],
    width: 144,
    delay: 1.42,
  },
  {
    phase: "intent",
    from: "agent",
    to: "merchant",
    y: 440,
    label: ["Browse merchant catalog"],
    width: 172,
    delay: 1.72,
  },
  {
    phase: "intent",
    from: "merchant",
    to: "agent",
    y: 482,
    label: ["Product + final price"],
    width: 152,
    response: true,
    delay: 2.02,
  },
  {
    phase: "intent",
    from: "agent",
    to: "consumer",
    y: 524,
    label: ["Confirm purchase intent"],
    width: 162,
    response: true,
    delay: 2.34,
  },
  {
    phase: "intent",
    from: "consumer",
    to: "agent",
    y: 566,
    label: ["Passkey assertion"],
    width: 132,
    delay: 2.66,
  },
  {
    phase: "intent",
    from: "agent",
    to: "vic",
    y: 608,
    label: ["Create payment instruction"],
    width: 176,
    delay: 2.98,
  },
  {
    phase: "intent",
    from: "vic",
    to: "agent",
    y: 646,
    label: ["Instruction reference"],
    width: 150,
    response: true,
    delay: 3.3,
  },
  {
    phase: "trust",
    from: "agent",
    to: "merchant",
    y: 768,
    label: ["Signed checkout request", "(RFC 9421)"],
    width: 180,
    delay: 4.42,
  },
  {
    phase: "trust",
    from: "merchant",
    to: "vic",
    y: 812,
    label: ["Verify TAP signature"],
    width: 154,
    delay: 4.76,
  },
  {
    phase: "trust",
    from: "vic",
    to: "merchant",
    y: 856,
    label: ["Agent identity verified"],
    width: 164,
    response: true,
    delay: 5.1,
  },
  {
    phase: "trust",
    from: "agent",
    to: "vic",
    y: 900,
    label: ["Request scoped credential"],
    width: 178,
    delay: 5.44,
  },
  {
    phase: "trust",
    from: "vic",
    to: "agent",
    y: 940,
    label: ["Agent-bound network token"],
    width: 178,
    response: true,
    delay: 5.78,
  },
  {
    phase: "trust",
    from: "agent",
    to: "merchant",
    y: 974,
    label: ["Submit token at checkout"],
    width: 172,
    delay: 6.12,
  },
  {
    phase: "rails",
    from: "merchant",
    to: "acquirer",
    y: 1094,
    label: ["ISO 8583 auth request"],
    width: 168,
    delay: 6.86,
  },
  {
    phase: "rails",
    from: "acquirer",
    to: "vic",
    y: 1136,
    label: ["Route through VisaNet"],
    width: 158,
    delay: 7.18,
  },
  {
    phase: "rails",
    from: "vic",
    to: "issuer",
    y: 1178,
    label: ["Token + policy context"],
    width: 170,
    delay: 7.5,
  },
  {
    phase: "rails",
    from: "issuer",
    to: "vic",
    y: 1220,
    label: ["Approval response"],
    width: 142,
    response: true,
    delay: 7.82,
  },
  {
    phase: "rails",
    from: "vic",
    to: "acquirer",
    y: 1262,
    label: ["Network response"],
    width: 138,
    response: true,
    delay: 8.14,
  },
  {
    phase: "rails",
    from: "acquirer",
    to: "merchant",
    y: 1304,
    label: ["Approval to merchant"],
    width: 150,
    response: true,
    delay: 8.46,
  },
  {
    phase: "rails",
    from: "merchant",
    to: "consumer",
    y: 1342,
    label: ["Order confirmation"],
    width: 148,
    response: true,
    delay: 8.78,
  },
]

const SPEEDS = [
  { id: "slow", label: "Slow", value: 0.72 },
  { id: "normal", label: "Normal", value: 1 },
  { id: "fast", label: "Fast", value: 1.45 },
]

function actorMap() {
  return ACTORS.reduce((acc, actor) => {
    acc[actor.id] = actor
    return acc
  }, {})
}

function phaseMap() {
  return PHASES.reduce((acc, phase) => {
    acc[phase.id] = phase
    return acc
  }, {})
}

function lineGeometry(from, to) {
  const direction = to.x > from.x ? 1 : -1
  const startOffset = Math.min(ACTOR_HEAD_W / 2 - 10, Math.abs(to.x - from.x) / 4)
  const endOffset = Math.min(ACTOR_HEAD_W / 2 - 10, Math.abs(to.x - from.x) / 4)

  return {
    x1: from.x + direction * startOffset,
    x2: to.x - direction * endOffset,
    mid: (from.x + to.x) / 2,
  }
}

function Message({ message, actorsById, phasesById, activePhase, speed }) {
  const from = actorsById[message.from]
  const to = actorsById[message.to]
  const phase = phasesById[message.phase]
  const { x1, x2, mid } = lineGeometry(from, to)
  const labelHeight = message.label.length * 13 + 9
  const muted = activePhase !== "all" && activePhase !== message.phase
  const color = message.response ? "var(--ink-500)" : phase.accent

  return (
    <g opacity={muted ? 0.16 : 1}>
      <g
        className="seq-item"
        style={{
          animationDelay: `${message.delay / speed}s`,
          animationDuration: `${0.34 / speed}s`,
        }}
      >
        <rect
          x={mid - message.width / 2}
          y={message.y - labelHeight - 8}
          width={message.width}
          height={labelHeight}
          rx="5"
          fill="var(--paper-pure)"
          stroke={message.response ? "var(--ink-200)" : color}
          strokeWidth={message.response ? 0.7 : 0.9}
          strokeOpacity={message.response ? 1 : 0.75}
        />
        <text
          x={mid}
          y={message.y - labelHeight + 8}
          textAnchor="middle"
          className="seq-message-label"
        >
          {message.label.map((line, index) => (
            <tspan key={line} x={mid} dy={index === 0 ? 0 : 13}>
              {line}
            </tspan>
          ))}
        </text>
        <line
          x1={x1}
          y1={message.y}
          x2={x2}
          y2={message.y}
          stroke={color}
          strokeWidth={message.response ? 1 : 1.35}
          strokeDasharray={message.response ? "5 4" : undefined}
          markerEnd={`url(#${MARKER_ID})`}
          className="seq-line"
        />
        {!message.response && (
          <circle r="3.4" fill={color} opacity="0.72">
            <animateMotion dur={`${1.8 / speed}s`} begin={`${message.delay / speed}s`} repeatCount="indefinite">
              <mpath href={`#path-${message.phase}-${message.y}`} />
            </animateMotion>
          </circle>
        )}
        <path
          id={`path-${message.phase}-${message.y}`}
          d={`M${x1},${message.y} L${x2},${message.y}`}
          fill="none"
          stroke="none"
        />
      </g>
    </g>
  )
}

function Actor({ actor }) {
  return (
    <g>
      <rect
        x={actor.x - ACTOR_HEAD_W / 2}
        y="54"
        width={ACTOR_HEAD_W}
        height={ACTOR_HEAD_H}
        rx="8"
        fill={actor.fill}
        stroke={actor.accent}
        strokeWidth="1"
      />
      <rect
        x={actor.x - ACTOR_HEAD_W / 2 + 1}
        y="54"
        width={ACTOR_HEAD_W - 2}
        height="4"
        rx="2"
        fill={actor.accent}
        opacity="0.75"
      />
      <text x={actor.x} y="76" textAnchor="middle" className="seq-actor-label">
        {actor.label}
      </text>
      <text x={actor.x} y="94" textAnchor="middle" className="seq-actor-sub">
        {actor.sublabel}
      </text>
      <line
        x1={actor.x}
        y1={LIFELINE_TOP}
        x2={actor.x}
        y2={LIFELINE_BOTTOM}
        stroke={actor.accent}
        strokeWidth="0.65"
        strokeDasharray="3 6"
        opacity="0.38"
      />
    </g>
  )
}

function PhaseBand({ phase, activePhase, speed }) {
  const muted = activePhase !== "all" && activePhase !== phase.id

  return (
    <g opacity={muted ? 0.18 : 1}>
      <g
        className="seq-phase"
        style={{
          animationDelay: `${phase.delay / speed}s`,
          animationDuration: `${0.36 / speed}s`,
        }}
      >
        <rect
          x="36"
          y={phase.y}
          width={SVG_W - 72}
          height={phase.h}
          rx="9"
          fill={phase.fill}
          stroke={phase.accent}
          strokeWidth="0.7"
          strokeOpacity="0.38"
        />
        <rect
          x="52"
          y={phase.y + 15}
          width="4"
          height="24"
          rx="2"
          fill={phase.accent}
        />
        <text
          x="66"
          y={phase.y + 31}
          className="seq-phase-label"
          fill={phase.accent}
        >
          {phase.label}
        </text>
      </g>
    </g>
  )
}

export default function AgenticArchitecture({ diagram = agenticCheckoutE2E }) {
  const [activePhase, setActivePhase] = useState("all")
  const [speed, setSpeed] = useState(1)
  const [animationKey, setAnimationKey] = useState(0)
  const rootRef = useRef(null)
  const actorsById = useMemo(actorMap, [])
  const phasesById = useMemo(phaseMap, [])

  useEffect(() => {
    let wasVisible = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !wasVisible) {
          wasVisible = true
          setAnimationKey((key) => key + 1)
        }
        if (!entry.isIntersecting) {
          wasVisible = false
        }
      },
      { threshold: 0.28 }
    )

    if (rootRef.current) observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [])

  const replay = () => setAnimationKey((key) => key + 1)

  return (
    <figure className="vic-sequence" ref={rootRef}>
      <div className="vic-sequence__header">
        <div>
          <div className="vic-sequence__eyebrow">Agentic Commerce - Sequence View</div>
          <h2 className="vic-sequence__title">Agentic checkout - end-to-end sequence</h2>
          <p className="vic-sequence__subtitle">
            VIC groups TAP verification, token services and VisaNet routing while the issuer remains the authorization decision point.
          </p>
        </div>
        <div className="vic-sequence__meta">
          <span>{ACTORS.length} actors</span>
          <span>{MESSAGES.length} messages</span>
        </div>
      </div>

      <div className="vic-sequence__toolbar" aria-label="Diagram controls">
        <div className="vic-sequence__segments" aria-label="Phase filter">
          {[{ id: "all", shortLabel: "All" }, ...PHASES].map((phase) => (
            <button
              key={phase.id}
              type="button"
              aria-pressed={activePhase === phase.id}
              onClick={() => setActivePhase(phase.id)}
              className={activePhase === phase.id ? "is-active" : ""}
            >
              {phase.shortLabel}
            </button>
          ))}
        </div>
        <div className="vic-sequence__segments vic-sequence__segments--speed" aria-label="Animation speed">
          {SPEEDS.map((speedOption) => (
            <button
              key={speedOption.id}
              type="button"
              aria-pressed={speed === speedOption.value}
              onClick={() => {
                setSpeed(speedOption.value)
                setAnimationKey((key) => key + 1)
              }}
              className={speed === speedOption.value ? "is-active" : ""}
            >
              {speedOption.label}
            </button>
          ))}
        </div>
        <button type="button" className="vic-sequence__replay" onClick={replay}>
          <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />
          Replay
        </button>
      </div>

      <div className="vic-sequence__canvas" tabIndex="0">
        <svg
          key={`${animationKey}-${speed}`}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          role="img"
          aria-labelledby="vic-sequence-title vic-sequence-desc"
          preserveAspectRatio="xMidYMin meet"
        >
          <title id="vic-sequence-title">VIC agentic checkout sequence</title>
          <desc id="vic-sequence-desc">
            Sequence diagram showing one-time enrollment, shopping intent capture, TAP trust verification, scoped credential retrieval and card authorization through merchant, acquirer, VIC and issuer.
          </desc>

          <defs>
            <marker
              id={MARKER_ID}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M2 1L8 5L2 9"
                fill="none"
                stroke="context-stroke"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>
            <filter id="seq-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="6" floodOpacity="0.08" />
            </filter>
          </defs>

          <rect width={SVG_W} height={SVG_H} fill="var(--paper)" />

          {PHASES.map((phase) => (
            <PhaseBand key={phase.id} phase={phase} activePhase={activePhase} speed={speed} />
          ))}

          <g filter="url(#seq-soft-shadow)">
            {ACTORS.map((actor) => (
              <Actor key={actor.id} actor={actor} />
            ))}
          </g>

          {MESSAGES.map((message) => (
            <Message
              key={`${message.phase}-${message.y}`}
              message={message}
              actorsById={actorsById}
              phasesById={phasesById}
              activePhase={activePhase}
              speed={speed}
            />
          ))}

          <g className="seq-footer">
            <line x1="44" y1="1390" x2="96" y2="1390" stroke="var(--diagram-1)" strokeWidth="1.35" />
            <text x="106" y="1394">solid = request</text>
            <line x1="226" y1="1390" x2="278" y2="1390" stroke="var(--ink-500)" strokeWidth="1" strokeDasharray="5 4" />
            <text x="288" y="1394">dashed = response or verification result</text>
            <text x="574" y="1394">
              {diagram?.settlementCycle ?? "existing card-clearing cycle"}
            </text>
          </g>
        </svg>
      </div>

      <figcaption className="vic-sequence__caption">
        Public architecture view. Field-level ISO 8583 mappings and private VisaNet controls are intentionally left out.
      </figcaption>

      <style>{`
        .vic-sequence {
          width: 100vw;
          max-width: 1040px;
          position: relative;
          left: 50%;
          transform: translateX(-50%);
          margin: 2.5rem 0;
          border: 1px solid var(--ink-200);
          border-radius: 14px;
          overflow: hidden;
          background: var(--paper);
          box-shadow:
            0 2px 8px color-mix(in srgb, var(--ink-900) 7%, transparent),
            0 14px 36px color-mix(in srgb, var(--ink-900) 6%, transparent);
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .vic-sequence__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 28px 14px;
          border-bottom: 1px solid var(--ink-200);
          background: var(--ink-100);
        }

        .vic-sequence__eyebrow {
          margin-bottom: 5px;
          color: var(--ink-500);
          font-family: ui-monospace, "Courier New", monospace;
          font-size: 10px;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .vic-sequence__title {
          margin: 0;
          color: var(--ink-900);
          font-size: 19px;
          font-weight: 650;
          line-height: 1.2;
          letter-spacing: 0;
        }

        .vic-sequence__subtitle {
          max-width: 660px;
          margin: 7px 0 0;
          color: var(--ink-700);
          font-size: 13px;
          line-height: 1.55;
        }

        .vic-sequence__meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-end;
          color: var(--ink-500);
          font-family: ui-monospace, "Courier New", monospace;
          font-size: 10px;
          white-space: nowrap;
        }

        .vic-sequence__toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 28px;
          border-bottom: 1px solid var(--ink-200);
          background: var(--paper-pure);
        }

        .vic-sequence__segments {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .vic-sequence button {
          min-height: 28px;
          border: 1px solid var(--ink-200);
          border-radius: 6px;
          background: transparent;
          color: var(--ink-500);
          font: 500 10px/1 ui-monospace, "Courier New", monospace;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
        }

        .vic-sequence button:hover {
          border-color: var(--ink-300);
          color: var(--ink-700);
        }

        .vic-sequence button.is-active {
          border-color: var(--diagram-1);
          background: color-mix(in srgb, var(--diagram-1) 11%, var(--paper-pure));
          color: var(--diagram-1);
        }

        .vic-sequence__segments button {
          padding: 5px 10px;
        }

        .vic-sequence__segments--speed button.is-active {
          border-color: var(--diagram-4);
          background: color-mix(in srgb, var(--diagram-4) 11%, var(--paper-pure));
          color: var(--diagram-4);
        }

        .vic-sequence__replay {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 11px;
          flex-shrink: 0;
        }

        .vic-sequence__canvas {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          background: var(--paper);
        }

        .vic-sequence__canvas svg {
          display: block;
          width: 100%;
          min-width: 860px;
          height: auto;
        }

        .seq-actor-label {
          fill: var(--ink-900);
          font: 650 12px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
          letter-spacing: 0;
        }

        .seq-actor-sub {
          fill: var(--ink-500);
          font: 500 8.5px/1 ui-monospace, "Courier New", monospace;
          letter-spacing: 0.01em;
        }

        .seq-phase {
          opacity: 0;
          animation-name: seqFadeUp;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }

        .seq-phase-label {
          font: 650 11px/1 ui-monospace, "Courier New", monospace;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .seq-item {
          opacity: 0;
          animation-name: seqFadeUp;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }

        .seq-line {
          fill: none;
          stroke-linecap: round;
        }

        .seq-message-label {
          fill: var(--ink-700);
          font: 500 10px/1.25 system-ui, -apple-system, "Segoe UI", sans-serif;
          letter-spacing: 0;
        }

        .seq-footer text {
          fill: var(--ink-500);
          font: 500 10px/1 ui-monospace, "Courier New", monospace;
          letter-spacing: 0.01em;
        }

        .vic-sequence__caption {
          margin: 0;
          padding: 10px 28px 12px;
          border-top: 1px solid var(--ink-200);
          color: var(--ink-500);
          background: var(--paper-pure);
          font-family: ui-monospace, "Courier New", monospace;
          font-size: 10px;
          line-height: 1.55;
        }

        @keyframes seqFadeUp {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .seq-item,
          .seq-phase {
            opacity: 1;
            animation: none !important;
          }

          .seq-item circle {
            display: none;
          }
        }

        @media (max-width: 720px) {
          .vic-sequence {
            width: 100%;
            left: auto;
            transform: none;
            margin: 2rem 0;
            border-radius: 10px;
          }

          .vic-sequence__header,
          .vic-sequence__toolbar {
            padding-left: 16px;
            padding-right: 16px;
          }

          .vic-sequence__header {
            flex-direction: column;
            gap: 10px;
          }

          .vic-sequence__title {
            font-size: 16px;
          }

          .vic-sequence__subtitle {
            font-size: 12px;
          }

          .vic-sequence__meta {
            flex-direction: row;
            align-items: center;
          }

          .vic-sequence__toolbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .vic-sequence__segments--speed {
            display: none;
          }

          .vic-sequence__replay {
            align-self: stretch;
            justify-content: center;
          }

          .vic-sequence__canvas svg {
            min-width: 860px;
          }

          .vic-sequence__caption {
            padding-left: 16px;
            padding-right: 16px;
          }
        }
      `}</style>
    </figure>
  )
}
