import { useState, useRef, useCallback } from "react"

const C = {
  cream: "#faf9f6",
  cream2: "#f5f3ee",
  cream3: "#ede9e2",
  ink: "#1a1814",
  ink2: "#4a4440",
  ink3: "#8a8278",
  ink4: "#b8b3a8",
  ink5: "#d8d3c8",
  red: "#c02010",
  green: "#186040",
  visa: "#185FA5",
  border: "#e0dbd0",
}

const ACTORS = [
  { id: "consumer", label: "Consumer", sub: "intent", x: 60, y: 200, w: 110, h: 52 },
  { id: "merchant", label: "Merchant", sub: "checkout", x: 510, y: 200, w: 110, h: 52 },
  { id: "acquirer", label: "Acquirer", sub: "Stripe · Adyen", x: 510, y: 360, w: 110, h: 52 },
  { id: "network", label: "Network", sub: "Visa · Mastercard", x: 285, y: 360, w: 110, h: 52 },
  { id: "issuer", label: "Issuer", sub: "Chase · Amex", x: 60, y: 360, w: 110, h: 52 },
]

const FLOW_HUMAN = [
  {
    from: "consumer",
    to: "merchant",
    label: "checkout intent",
    msg: "Consumer fills form\nTyping detected · CAPTCHA solved\nResidential IP → WAF passes",
    status: "pass",
  },
  {
    from: "merchant",
    to: "acquirer",
    label: "PaymentIntent",
    msg: "AVS matches · CVV correct\nF022=01 · Normal velocity\nRisk score: low",
    status: "pass",
  },
  {
    from: "acquirer",
    to: "network",
    label: "MTI 0100",
    msg: "ISO 8583 routed\nML score: low risk\nBehavioral baseline: human ✓",
    status: "pass",
  },
  {
    from: "network",
    to: "issuer",
    label: "authorize",
    msg: "Low risk score forwarded\nBehavior matches history\nNo step-up needed",
    status: "pass",
  },
  {
    from: "issuer",
    to: "network",
    label: "F039=00",
    msg: "APPROVED\nAuth code: 123456",
    status: "pass",
  },
  {
    from: "network",
    to: "acquirer",
    label: "MTI 0110",
    msg: "Authorization confirmed",
    status: "pass",
  },
  {
    from: "acquirer",
    to: "merchant",
    label: "200 OK",
    msg: "Payment captured",
    status: "pass",
  },
  {
    from: "merchant",
    to: "consumer",
    label: "confirmed",
    msg: "Order confirmed ✓",
    status: "pass",
  },
]

const FLOW_AGENT = [
  {
    from: "consumer",
    to: "merchant",
    label: "agent checkout",
    msg: "No mouse movement\nMachine speed · AWS IP\nHeadless Chrome fingerprint\n→ WAF BLOCKED",
    status: "fail",
    layer: "Merchant + Gateway",
  },
  {
    from: "merchant",
    to: "acquirer",
    label: "PaymentIntent",
    msg: "No AVS match\nData center IP\nF022=01 → human rules applied\n→ HIGH RISK",
    status: "fail",
    layer: "Acquirer + Processor",
  },
  {
    from: "acquirer",
    to: "network",
    label: "MTI 0100",
    msg: "Machine-speed pattern\nNo human behavioral baseline\nML flags as bot attack\n→ FLAGGED MAX RISK",
    status: "fail",
    layer: "Card Network",
  },
  {
    from: "network",
    to: "issuer",
    label: "HIGH RISK",
    msg: "Max risk score forwarded\n3DS step-up triggered\nAgent cannot respond to SMS\n→ TRANSACTION FAILS",
    status: "fail",
    layer: "Issuer Bank",
  },
]

const FLOW_FIXED = [
  {
    from: "consumer",
    to: "merchant",
    label: "TAP JWT / CDN",
    msg: "Cloudflare verifies Ed25519 sig\nAgent registered in key directory\nconsumer_recognized: true\n→ PASS ✓",
    status: "pass",
  },
  {
    from: "merchant",
    to: "acquirer",
    label: "F022=81 · F126",
    msg: "F002: VCN token\nF022: 81 (agent-initiated)\nF048: AGNT:skyfire-001\nF126: instruction hash → PASS ✓",
    status: "pass",
  },
  {
    from: "acquirer",
    to: "network",
    label: "MTI 0100",
    msg: "F126 validated vs VIC registry\nAmount + merchant match ✓\nAgentic Token binding verified\n→ PASS ✓",
    status: "pass",
  },
  {
    from: "network",
    to: "issuer",
    label: "agent policy",
    msg: "F022=81 → load agent policy\n$89.99 ≤ $500 limit ✓\nMCC 5065 in allowed categories ✓\nPasskey pre-authorized → APPROVED",
    status: "pass",
  },
  {
    from: "issuer",
    to: "network",
    label: "F039=00",
    msg: "APPROVED\nAgent spending policy matched",
    status: "pass",
  },
  {
    from: "network",
    to: "acquirer",
    label: "MTI 0110",
    msg: "F126: agent-confirmed",
    status: "pass",
  },
  {
    from: "acquirer",
    to: "merchant",
    label: "200 OK",
    msg: "Payment captured",
    status: "pass",
  },
  {
    from: "merchant",
    to: "consumer",
    label: "confirmed",
    msg: "✓ Purchase complete\nNo checkout page visited\n1,100ms total",
    status: "pass",
  },
]

function getFlow(mode) {
  if (mode === "human") return FLOW_HUMAN
  if (mode === "fixed") return FLOW_FIXED
  return FLOW_AGENT
}

function actorCenter(id) {
  const a = ACTORS.find((x) => x.id === id)
  return { x: a.x + a.w / 2, y: a.y + a.h / 2 }
}

function edgePoints(from, to) {
  const f = actorCenter(from)
  const t = actorCenter(to)
  const fa = ACTORS.find((a) => a.id === from)
  const ta = ACTORS.find((a) => a.id === to)
  const dx = t.x - f.x
  const dy = t.y - f.y
  let x1 = f.x
  let y1 = f.y
  let x2 = t.x
  let y2 = t.y
  if (Math.abs(dy) > Math.abs(dx) * 0.7) {
    y1 = dy > 0 ? fa.y + fa.h : fa.y
    y2 = dy > 0 ? ta.y : ta.y + ta.h
    x1 = f.x
    x2 = t.x
  } else {
    x1 = dx > 0 ? fa.x + fa.w : fa.x
    x2 = dx > 0 ? ta.x : ta.x + ta.w
    y1 = f.y
    y2 = t.y
  }
  return { x1, y1, x2, y2, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 }
}

function offsetLine(x1, y1, x2, y2, step) {
  const isReturn =
    (step.from === "issuer" && step.to === "network") ||
    (step.from === "network" && step.to === "acquirer") ||
    (step.from === "acquirer" && step.to === "merchant") ||
    (step.from === "merchant" && step.to === "consumer")

  let cx1 = x1
  let cy1 = y1
  let cx2 = x2
  let cy2 = y2
  if (isReturn) {
    cx1 += y1 === y2 ? 0 : 12
    cx2 += y1 === y2 ? 0 : 12
    cy1 += x1 === x2 ? 0 : 10
    cy2 += x1 === x2 ? 0 : 10
  } else {
    cx1 -= y1 === y2 ? 0 : 12
    cx2 -= y1 === y2 ? 0 : 12
    cy1 -= x1 === x2 ? 0 : 10
    cy2 -= x1 === x2 ? 0 : 10
  }
  return { cx1, cy1, cx2, cy2 }
}

const shell = {
  width: "100vw",
  maxWidth: 1040,
  position: "relative",
  left: "50%",
  transform: "translateX(-50%)",
  margin: "20px 0",
}

export default function FourPartyFlowDiagram() {
  const [mode, setMode] = useState("human")
  const [animStep, setAnimStep] = useState(-1)
  const playIdRef = useRef(0)

  const flow = getFlow(mode)
  const activeEdge = animStep >= 0 && animStep < flow.length ? flow[animStep] : null
  const info = activeEdge

  const reset = useCallback(() => {
    playIdRef.current += 1
    setAnimStep(-1)
  }, [])

  const setModeAndReset = (m) => {
    setMode(m)
    playIdRef.current += 1
    setAnimStep(-1)
  }

  const step = (dir) => {
    playIdRef.current += 1
    setAnimStep((s) => Math.max(-1, Math.min(flow.length - 1, s + dir)))
  }

  const play = async () => {
    reset()
    const id = playIdRef.current
    const f = getFlow(mode)
    for (let i = 0; i < f.length; i++) {
      if (playIdRef.current !== id) break
      setAnimStep(i)
      await new Promise((r) => setTimeout(r, 1400))
    }
  }

  const activeActors = new Set()
  if (activeEdge) {
    activeActors.add(activeEdge.from)
    activeActors.add(activeEdge.to)
  }

  const progress = animStep < 0 ? 0 : ((animStep + 1) / flow.length) * 100
  const progColor = mode === "agent" ? C.red : C.green

  const isFailPanel = info && info.status === "fail" && mode === "agent"

  return (
    <div style={shell}>
      <div
        style={{
          background: C.cream,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
          maxWidth: 700,
          margin: "0 auto",
          fontFamily: "'DM Mono', ui-monospace, monospace",
        }}
      >
        <div style={{ padding: "16px 22px 13px", background: C.cream2, borderBottom: `1px solid ${C.border}` }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.ink4,
              marginBottom: 5,
            }}
          >
            4-party model · authorization flow
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 400,
                letterSpacing: "-0.02em",
                margin: 0,
                fontFamily: "'Instrument Serif', Georgia, serif",
                color: C.ink,
              }}
            >
              {mode === "human"
                ? "Human checkout — every layer passes"
                : mode === "agent"
                  ? "Agent checkout — every layer fails"
                  : "Agent checkout — with TAP + Agent Pay"}
            </h2>
            <div
              style={{
                display: "flex",
                gap: 2,
                background: C.cream3,
                borderRadius: 5,
                padding: 2,
              }}
            >
              {["human", "agent", "fixed"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeAndReset(m)}
                  style={{
                    padding: "4px 11px",
                    borderRadius: 3,
                    fontSize: 9,
                    fontFamily: "'DM Mono', ui-monospace, monospace",
                    cursor: "pointer",
                    border: "none",
                    letterSpacing: "0.04em",
                    background: mode === m ? C.cream : "transparent",
                    color: mode === m ? C.ink : C.ink4,
                    fontWeight: mode === m ? 600 : 400,
                  }}
                >
                  {m === "fixed" ? "AI + new protocols" : m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 20px 8px", overflowX: "auto" }}>
          <svg width="100%" viewBox="0 0 680 460" style={{ display: "block", minWidth: 440 }}>
            <defs>
              {flow.map((s, i) => {
                const { x1, y1, x2, y2 } = edgePoints(s.from, s.to)
                const { cx1, cy1, cx2, cy2 } = offsetLine(x1, y1, x2, y2, s)
                const isActive = i === animStep
                const isPast = i < animStep
                const color =
                  isPast || isActive
                    ? s.status === "pass"
                      ? C.green
                      : C.red
                    : C.ink5
                return (
                  <marker
                    key={`m-${i}`}
                    id={`arr-fpflow-${i}`}
                    viewBox="0 0 8 8"
                    refX={6}
                    refY={4}
                    markerWidth={5}
                    markerHeight={5}
                    orient="auto-start-reverse"
                  >
                    <path
                      d="M1 1.5L6.5 4L1 6.5"
                      fill="none"
                      stroke={color}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </marker>
                )
              })}
            </defs>

            <rect x="10" y="140" width="660" height="130" rx="6" fill={C.cream2} opacity="0.6" />
            <text x="22" y="162" style={{ fontSize: 8, fontFamily: "'DM Mono', monospace", fill: C.ink4, letterSpacing: "0.08em" }}>
              consumer + merchant layer
            </text>
            <rect x="10" y="300" width="660" height="130" rx="6" fill={C.cream3} opacity="0.7" />
            <text x="22" y="322" style={{ fontSize: 8, fontFamily: "'DM Mono', monospace", fill: C.ink4, letterSpacing: "0.08em" }}>
              payment rails layer
            </text>

            {flow.map((s, i) => {
              const { x1, y1, x2, y2, mx, my } = edgePoints(s.from, s.to)
              const { cx1, cy1, cx2, cy2 } = offsetLine(x1, y1, x2, y2, s)
              const isActive = i === animStep
              const isPast = i < animStep
              const color = isPast ? (s.status === "pass" ? C.green : C.red) : isActive ? (s.status === "pass" ? C.green : C.red) : C.ink5
              const width = isActive ? 2 : isPast ? 1.5 : 0.8
              const dash = isPast || isActive ? "none" : "3 5"
              const opacity = isPast ? 0.6 : isActive ? 1 : 0.4

              return (
                <g key={`e-${i}`}>
                  <line
                    x1={cx1}
                    y1={cy1}
                    x2={cx2}
                    y2={cy2}
                    stroke={color}
                    strokeWidth={width}
                    strokeDasharray={dash}
                    opacity={opacity}
                    markerEnd={`url(#arr-fpflow-${i})`}
                  />
                  {isActive && (
                    <>
                      <path id={`path-fpflow-${i}`} d={`M${cx1} ${cy1} L${cx2} ${cy2}`} fill="none" stroke="none" />
                      <circle r="4" fill={color} opacity="0.9">
                        <animateMotion dur="0.8s" repeatCount="indefinite">
                          <mpath href={`#path-fpflow-${i}`} />
                        </animateMotion>
                      </circle>
                    </>
                  )}
                  {(isPast || isActive) && (
                    <g>
                      <rect x={mx - 38} y={my - 9} width="76" height="16" rx="3" fill={C.cream} opacity="0.9" />
                      <text
                        x={mx}
                        y={my + 1}
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          fontSize: 8,
                          fontFamily: "'DM Mono', monospace",
                          fill: color,
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        {s.label}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {ACTORS.map((actor) => {
              const isActive = activeActors.has(actor.id)
              const visitedSteps = animStep < 0 ? [] : flow.slice(0, animStep)
              const wasVisited = visitedSteps.some((s) => s.from === actor.id || s.to === actor.id)
              const hasFail =
                mode === "agent" && flow.slice(0, animStep + 1).some((s) => (s.from === actor.id || s.to === actor.id) && s.status === "fail")

              const borderColor = hasFail ? C.red : isActive ? C.ink : wasVisited ? C.ink3 : C.ink5
              const fillColor = hasFail ? "#fff4f2" : isActive ? C.cream3 : C.cream
              const textColor = hasFail ? C.red : isActive ? C.ink : wasVisited ? C.ink2 : C.ink4
              const bw = isActive ? 2 : wasVisited ? 1.5 : 1

              return (
                <g key={actor.id}>
                  <rect
                    x={actor.x}
                    y={actor.y}
                    width={actor.w}
                    height={actor.h}
                    rx="8"
                    fill={fillColor}
                    stroke={borderColor}
                    strokeWidth={bw}
                  />
                  <text
                    x={actor.x + actor.w / 2}
                    y={actor.y + 20}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: 12, fontWeight: 600, fontFamily: "'DM Mono', monospace", fill: textColor }}
                  >
                    {actor.label}
                  </text>
                  <text
                    x={actor.x + actor.w / 2}
                    y={actor.y + 36}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", fill: isActive ? textColor : C.ink4 }}
                  >
                    {actor.sub}
                  </text>
                  {isActive && (
                    <text
                      x={actor.x + actor.w - 10}
                      y={actor.y + 12}
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fontSize: 10, fill: hasFail ? C.red : C.ink3 }}
                    >
                      {hasFail ? "✕" : "○"}
                    </text>
                  )}
                  {wasVisited && !isActive && (() => {
                    const icon = hasFail ? "✕" : "✓"
                    const ic = hasFail ? C.red : C.green
                    return (
                      <text
                        x={actor.x + actor.w - 10}
                        y={actor.y + 12}
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{ fontSize: 10, fill: ic }}
                      >
                        {icon}
                      </text>
                    )
                  })()}
                </g>
              )
            })}

            <text x="344" y="460" textAnchor="middle" style={{ fontSize: 8, fontFamily: "'DM Mono', monospace", fill: C.ink5 }}>
              ISO 8583 flows through network rails → T+1 settlement unchanged
            </text>
          </svg>
        </div>

        <div
          style={{
            margin: "0 20px 12px",
            minHeight: 68,
            background: info ? (isFailPanel ? "#fff6f4" : "#f4faf6") : C.cream2,
            border: `1px solid ${info ? (isFailPanel ? "#f0c0b0" : "#b0d8c0") : C.border}`,
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          {info ? (
            <>
              <div
                style={{
                  fontFamily: "'DM Mono', ui-monospace, monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  color: isFailPanel ? C.red : C.green,
                  marginBottom: 5,
                }}
              >
                {info.layer ? `${info.layer} — ` : ""}
                {info.status === "fail" ? "BLOCKED" : "PASS"} · {info.label}
              </div>
              <div style={{ fontSize: 11, color: C.ink2, lineHeight: 1.65, whiteSpace: "pre-line", fontFamily: "'DM Mono', ui-monospace, monospace" }}>
                {info.msg}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 10, color: C.ink5, fontFamily: "'DM Mono', ui-monospace, monospace", paddingTop: 8 }}>
              press play to walk through the transaction flow
            </div>
          )}
        </div>

        {mode === "agent" && animStep >= FLOW_AGENT.length - 1 && (
          <div style={{ margin: "0 20px 12px", padding: "10px 14px", background: "#f0f4ff", border: "1px solid #c0d0f0", borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: C.visa, marginBottom: 8, fontFamily: "'DM Mono', ui-monospace, monospace" }}>
              every layer blocked the agent — switch to &quot;AI + new protocols&quot; to see the fix
            </div>
          </div>
        )}

        <div
          style={{
            padding: "10px 22px 13px",
            borderTop: `1px solid ${C.border}`,
            background: C.cream2,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={play}
            style={{
              padding: "5px 14px",
              borderRadius: 5,
              fontSize: 10,
              fontFamily: "'DM Mono', ui-monospace, monospace",
              cursor: "pointer",
              border: `1px solid ${C.ink5}`,
              background: C.cream,
              color: C.ink,
            }}
          >
            ▶ play
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            style={{
              padding: "5px 11px",
              borderRadius: 5,
              fontSize: 10,
              fontFamily: "'DM Mono', ui-monospace, monospace",
              cursor: "pointer",
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.ink3,
            }}
          >
            →
          </button>
          <button
            type="button"
            onClick={() => step(-1)}
            style={{
              padding: "5px 11px",
              borderRadius: 5,
              fontSize: 10,
              fontFamily: "'DM Mono', ui-monospace, monospace",
              cursor: "pointer",
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.ink3,
            }}
          >
            ←
          </button>
          <div style={{ flex: 1, height: 2, background: C.border, borderRadius: 1, overflow: "hidden" }}>
            <div style={{ height: "100%", background: progColor, borderRadius: 1, width: `${progress}%`, transition: "width 0.4s ease" }} />
          </div>
          <span style={{ fontSize: 9, color: C.ink4, fontFamily: "'DM Mono', ui-monospace, monospace" }}>
            {Math.max(0, animStep + 1)} / {flow.length}
          </span>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "5px 10px",
              borderRadius: 5,
              fontSize: 9,
              fontFamily: "'DM Mono', ui-monospace, monospace",
              cursor: "pointer",
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.ink4,
            }}
          >
            reset
          </button>
        </div>
      </div>
    </div>
  )
}
