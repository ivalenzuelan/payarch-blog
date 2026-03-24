import { useState, useEffect, useRef } from "react"

// ── COLORS ────────────────────────────────────────────────────────
const T = {
  cream: "#faf9f6", cream2: "#f5f3ee", cream3: "#ede9e2",
  ink: "#1a1814", ink2: "#4a4440", ink3: "#8a8278", ink4: "#b8b3a8", ink5: "#d8d3c8",
  pass: "#186040", passLight: "#f0f8f4", passBorder: "#a8d8b8",
  fail: "#c02010", failLight: "#fff4f2", failBorder: "#f0b0a0",
  visa: "#185FA5", mc: "#993C1D",
  border: "#e0dbd0",
}

// ── GEOMETRY ──────────────────────────────────────────────────────
const ACTORS = {
  consumer: { x: 40,  y: 80,  w: 120, h: 52, label: "Consumer",   sub: "intent",           color: "#1a1814" },
  merchant: { x: 520, y: 80,  w: 120, h: 52, label: "Merchant",   sub: "checkout",         color: "#1a1814" },
  acquirer: { x: 520, y: 290, w: 120, h: 52, label: "Acquirer",   sub: "Stripe · Adyen",   color: "#7a4a10" },
  network:  { x: 280, y: 290, w: 120, h: 52, label: "Network",    sub: "Visa · Mastercard", color: "#186040" },
  issuer:   { x: 40,  y: 290, w: 120, h: 52, label: "Issuer",     sub: "Chase · Amex",     color: "#185FA5" },
}

const cx = (id) => ACTORS[id].x + ACTORS[id].w / 2
const cy = (id) => ACTORS[id].y + ACTORS[id].h / 2

// SVG path for each connection
const PATHS = {
  "consumer-merchant": `M${ACTORS.consumer.x + ACTORS.consumer.w},${cy("consumer")} C340,${cy("consumer")} 340,${cy("merchant")} ${ACTORS.merchant.x},${cy("merchant")}`,
  "merchant-acquirer": `M${cx("merchant")},${ACTORS.merchant.y + ACTORS.merchant.h} L${cx("acquirer")},${ACTORS.acquirer.y}`,
  "acquirer-network":  `M${ACTORS.acquirer.x},${cy("acquirer")} L${ACTORS.network.x + ACTORS.network.w},${cy("network")}`,
  "network-issuer":    `M${ACTORS.network.x},${cy("network")} L${ACTORS.issuer.x + ACTORS.issuer.w},${cy("issuer")}`,
  "issuer-network-r":  `M${ACTORS.issuer.x + ACTORS.issuer.w},${cy("issuer") + 12} C240,${cy("issuer") + 12} 240,${cy("network") + 12} ${ACTORS.network.x},${cy("network") + 12}`,
  "network-acquirer-r":`M${ACTORS.network.x + ACTORS.network.w},${cy("network") + 12} L${ACTORS.acquirer.x},${cy("acquirer") + 12}`,
  "acquirer-merchant-r":`M${cx("acquirer") + 10},${ACTORS.acquirer.y} L${cx("merchant") + 10},${ACTORS.merchant.y + ACTORS.merchant.h}`,
  "merchant-consumer-r":`M${ACTORS.merchant.x},${cy("merchant") + 12} C340,${cy("merchant") + 12} 340,${cy("consumer") + 12} ${ACTORS.consumer.x + ACTORS.consumer.w},${cy("consumer") + 12}`,
}

// ── FLOWS ─────────────────────────────────────────────────────────
const HUMAN_STEPS = [
  { path: "consumer-merchant", from:"consumer", to:"merchant", label:"checkout", status:"pass", info:"Consumer fills form · CAPTCHA solved · Residential IP → WAF passes · AVS / CVV match → Layer 1 pass ✓" },
  { path: "merchant-acquirer", from:"merchant", to:"acquirer", label:"PaymentIntent", status:"pass", info:"F022=01 (manual key) · Normal velocity · Merchant profile matches → Acquirer layer pass ✓" },
  { path: "acquirer-network",  from:"acquirer", to:"network",  label:"MTI 0100", status:"pass", info:"ML risk score: low · Human behavioral baseline matches · No distributed bot signal → Network layer pass ✓" },
  { path: "network-issuer",    from:"network",  to:"issuer",   label:"authorize", status:"pass", info:"Low risk score forwarded · Cardholder history matches · No step-up triggered → Issuer layer pass ✓" },
  { path: "issuer-network-r",  from:"issuer",   to:"network",  label:"F039=00", status:"pass", info:"APPROVED · Auth code: 123456 · Response flows back up the chain" },
  { path: "network-acquirer-r",from:"network",  to:"acquirer", label:"MTI 0110", status:"pass", info:"Authorization response confirmed · F038=123456 · F039=00" },
  { path: "acquirer-merchant-r",from:"acquirer",to:"merchant", label:"200 OK",   status:"pass", info:"Payment captured · Order created" },
  { path: "merchant-consumer-r",from:"merchant",to:"consumer", label:"confirmed", status:"pass", info:"Order confirmed ✓ · Human checkout complete" },
]

const AGENT_STEPS = [
  { path: "consumer-merchant", from:"consumer", to:"merchant", label:"agent checkout", status:"fail",
    layer:"Merchant + Gateway",
    info:"✕ No mouse movement · Headless Chrome fingerprint · AWS IP · Machine speed\n→ WAF blocks before payment is even attempted. Nothing downstream matters." },
  { path: "merchant-acquirer", from:"merchant", to:"acquirer", label:"PaymentIntent", status:"fail",
    layer:"Acquirer + Processor",
    info:"✕ No AVS match · Data center IP · F022=01 tells downstream: apply human rules\n→ Every ISO 8583 signal reads as credential stuffing." },
  { path: "acquirer-network",  from:"acquirer", to:"network",  label:"MTI 0100", status:"fail",
    layer:"Card Network",
    info:"✕ Machine-speed transaction · No human behavioral baseline · High risk score\n→ The most powerful models in the chain were trained to catch exactly this." },
  { path: "network-issuer",    from:"network",  to:"issuer",   label:"HIGH RISK", status:"fail",
    layer:"Issuer Bank",
    info:"✕ Max risk score triggers 3DS step-up · Agent cannot respond to SMS challenge\n→ Transaction fails permanently. No fallback. The sale is lost." },
]

const FIXED_STEPS = [
  { path: "consumer-merchant", from:"consumer", to:"merchant", label:"TAP JWT · CDN", status:"pass",
    info:"✓ Ed25519 signature verified · Agent in key directory · consumer_recognized: true\n→ Cloudflare WBA + TAP: agent identity confirmed in 40–80ms" },
  { path: "merchant-acquirer", from:"merchant", to:"acquirer", label:"F022=81 · F126", status:"pass",
    info:"✓ F002: VCN token · F022: 81 (agent-initiated) · F048: AGNT:skyfire-001 · F126: instruction hash\n→ New ISO 8583 fields propagate agent context through entire chain" },
  { path: "acquirer-network",  from:"acquirer", to:"network",  label:"MTI 0100", status:"pass",
    info:"✓ F126 validated vs VIC payment instruction registry · Amount + merchant match\n→ Agentic Token binding verified · Agent-aware risk model applied" },
  { path: "network-issuer",    from:"network",  to:"issuer",   label:"agent policy", status:"pass",
    info:"✓ F022=81 → load agent spending policy (not human model) · Passkey pre-authorized\n→ $89.99 ≤ $500 limit ✓ · MCC ✓ · velocity ✓ · No step-up needed" },
  { path: "issuer-network-r",  from:"issuer",   to:"network",  label:"F039=00", status:"pass",
    info:"APPROVED · Agent spending policy matched · Auth code issued" },
  { path: "network-acquirer-r",from:"network",  to:"acquirer", label:"MTI 0110", status:"pass",
    info:"F126: agent-confirmed · F038: 123456 · F039: 00" },
  { path: "acquirer-merchant-r",from:"acquirer",to:"merchant", label:"200 OK",   status:"pass",
    info:"Payment captured · Order created: BOSE-2026-78234" },
  { path: "merchant-consumer-r",from:"merchant",to:"consumer", label:"confirmed", status:"pass",
    info:"✓ Purchase complete · No checkout page · 1,100ms total · Consumer receives push notification" },
]

const FLOWS = { human: HUMAN_STEPS, agent: AGENT_STEPS, fixed: FIXED_STEPS }
const FLOW_LABELS = { human: "Human checkout — every layer passes", agent: "Agent checkout — every layer fails", fixed: "Agent checkout — with TAP + Agent Pay" }
const MODE_OPTIONS = [["human","human"],["agent","AI agent"],["fixed","with new protocols"]]

export default function FourPartyFlow() {
  const [mode, setMode]   = useState("human")
  const [step, setStep]   = useState(-1)
  const [playing, setPlaying] = useState(false)
  const playRef = useRef(false)
  const timerRef = useRef(null)

  const flow = FLOWS[mode]

  const switchMode = (m) => { setMode(m); setStep(-1); setPlaying(false); playRef.current = false }

  useEffect(() => {
    if (!playing) return
    playRef.current = true
    const run = async () => {
      for (let i = 0; i < flow.length; i++) {
        if (!playRef.current) break
        setStep(i)
        await new Promise(r => { timerRef.current = setTimeout(r, 1500) })
      }
      playRef.current = false
      setPlaying(false)
    }
    run()
    return () => { clearTimeout(timerRef.current); playRef.current = false }
  }, [playing, mode])

  const reset = () => { playRef.current = false; clearTimeout(timerRef.current); setPlaying(false); setStep(-1) }

  const activeStep  = step >= 0 && step < flow.length ? flow[step] : null
  const isFail      = mode === "agent"
  const progress    = step < 0 ? 0 : ((step + 1) / flow.length) * 100

  // Which actors are involved in completed steps
  const visitedActors = new Set()
  const failedActors  = new Set()
  flow.slice(0, step + 1).forEach(s => {
    visitedActors.add(s.from); visitedActors.add(s.to)
    if (s.status === "fail") { failedActors.add(s.from); failedActors.add(s.to) }
  })

  // Which paths are completed
  const visitedPaths = new Set(flow.slice(0, step).map(s => s.path))
  const failedPaths  = new Set(flow.slice(0, step + 1).filter(s => s.status === "fail").map(s => s.path))

  const getActorStyle = (id) => {
    const isFailed  = failedActors.has(id)
    const isVisited = visitedActors.has(id)
    const isActive  = activeStep && (activeStep.from === id || activeStep.to === id)
    if (isFailed)  return { fill: "#fff4f2", stroke: T.fail, sw: isActive ? 2 : 1.5 }
    if (isActive)  return { fill: T.cream3,  stroke: ACTORS[id].color, sw: 2 }
    if (isVisited) return { fill: T.cream2,  stroke: T.pass,  sw: 1.5 }
    return              { fill: T.cream,   stroke: T.ink5,  sw: 1 }
  }

  const getEdgeColor = (pathKey, stepStatus) => {
    if (failedPaths.has(pathKey)) return T.fail
    if (visitedPaths.has(pathKey) || (activeStep && activeStep.path === pathKey && stepStatus === "pass")) return T.pass
    return T.ink5
  }

  const edgeOpacity = (pathKey) => {
    if (visitedPaths.has(pathKey) || failedPaths.has(pathKey)) return 0.7
    if (activeStep && activeStep.path === pathKey) return 1
    return 0.25
  }

  return (
    <div style={{ fontFamily: "'Georgia','Times New Roman',serif", background: T.cream, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "18px 24px 14px", background: T.cream2, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.ink4, fontFamily: "'Courier New',monospace", marginBottom: 5 }}>
          4-party model · authorization flow
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.02em", margin: 0, color: T.ink }}>
            {FLOW_LABELS[mode]}
          </h2>
          <div style={{ display: "flex", gap: 2, background: T.cream3, borderRadius: 5, padding: 2 }}>
            {MODE_OPTIONS.map(([v, label]) => (
              <button key={v} onClick={() => switchMode(v)} style={{
                padding: "4px 11px", borderRadius: 3, fontSize: 10, fontFamily: "'Courier New',monospace",
                cursor: "pointer", border: "none", letterSpacing: "0.04em",
                background: mode === v ? T.cream : "transparent",
                color: mode === v ? T.ink : T.ink4,
                fontWeight: mode === v ? 600 : 400, transition: "all .15s",
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG */}
      <div style={{ padding: "16px 20px 8px", overflowX: "auto" }}>
        <svg width="100%" viewBox="0 0 680 400" style={{ display: "block", minWidth: 440, overflow: "visible" }}>
          <defs>
            {/* Arrow markers */}
            {["pass","fail","dim"].map(type => (
              <marker key={type} id={`arr-${type}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M1 1.5L6.5 4L1 6.5" fill="none"
                  stroke={type === "pass" ? T.pass : type === "fail" ? T.fail : T.ink5}
                  strokeWidth="1.5" strokeLinecap="round"/>
              </marker>
            ))}
            {/* Path definitions */}
            {Object.entries(PATHS).map(([id, d]) => (
              <path key={id} id={`path-${id}`} d={d} fill="none" stroke="none"/>
            ))}
          </defs>

          {/* Layer bands */}
          <rect x={10} y={62} width={660} height={90} rx={6} fill={T.cream2} opacity={0.7}/>
          <text x={22} y={78} style={{ fontSize: 8, fontFamily: "'Courier New',monospace", fill: T.ink4, letterSpacing: "0.08em", textTransform: "uppercase" }}>consumer · merchant layer</text>

          <rect x={10} y={272} width={660} height={90} rx={6} fill={T.cream3} opacity={0.8}/>
          <text x={22} y={288} style={{ fontSize: 8, fontFamily: "'Courier New',monospace", fill: T.ink4, letterSpacing: "0.08em", textTransform: "uppercase" }}>payment rails layer</text>

          {/* Edges — draw all paths faded, active ones colored */}
          {flow.map((s, i) => {
            const isPast   = i < step
            const isActive = i === step
            const color    = s.status === "fail" ? T.fail : T.pass
            const dimColor = T.ink5
            const opacity  = isPast ? 0.6 : isActive ? 1 : 0.2
            const sw       = isActive ? 2 : isPast ? 1.5 : 0.8
            const useColor = (isPast || isActive) ? color : dimColor
            const markerType = (isPast || isActive) ? (s.status === "pass" ? "pass" : "fail") : "dim"
            const dasharray = (isPast || isActive) ? "none" : "3 5"

            return (
              <g key={i} opacity={opacity} style={{ transition: "opacity .3s" }}>
                <path d={PATHS[s.path]} fill="none" stroke={useColor} strokeWidth={sw}
                  strokeDasharray={dasharray}
                  markerEnd={`url(#arr-${markerType})`}
                />
                {/* Traveling dot */}
                {isActive && (
                  <circle r={5} fill={color} opacity={0.9}>
                    <animateMotion dur="1.4s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1" keyTimes="0;1">
                      <mpath href={`#path-${s.path}`}/>
                    </animateMotion>
                  </circle>
                )}
                {/* Edge label */}
                {(isPast || isActive) && (() => {
                  const d = PATHS[s.path]
                  const coords = d.match(/-?[\d.]+/g)?.map(Number) ?? []
                  const lx = coords[0] !== undefined ? (coords[0] + (coords[coords.length - 2] ?? coords[0])) / 2 : 340
                  const ly = coords[1] !== undefined ? (coords[1] + (coords[coords.length - 1] ?? coords[1])) / 2 : 200
                  return (
                    <g>
                      <rect x={lx - 42} y={ly - 9} width={84} height={16} rx={3} fill={T.cream} opacity={0.92}/>
                      <text x={lx} y={ly + 1} textAnchor="middle" dominantBaseline="central"
                        style={{ fontSize: 8.5, fontFamily: "'Courier New',monospace", fill: useColor, fontWeight: isActive ? 600 : 400 }}>
                        {s.label}
                      </text>
                    </g>
                  )
                })()}
              </g>
            )
          })}

          {/* Nodes */}
          {Object.entries(ACTORS).map(([id, actor]) => {
            const s = getActorStyle(id)
            const isFailed = failedActors.has(id)
            const isVisited = visitedActors.has(id)
            const isActive  = activeStep && (activeStep.from === id || activeStep.to === id)
            return (
              <g key={id}>
                {/* Glow ring */}
                {isActive && (
                  <rect x={actor.x - 5} y={actor.y - 5} width={actor.w + 10} height={actor.h + 10} rx={11}
                    fill="none" stroke={isFailed ? T.fail : actor.color} strokeWidth={1}
                    opacity={0.25}>
                    <animate attributeName="opacity" values="0.35;0.08;0.35" dur="1.8s" repeatCount="indefinite"/>
                  </rect>
                )}
                <rect x={actor.x} y={actor.y} width={actor.w} height={actor.h} rx={8}
                  fill={s.fill} stroke={s.stroke} strokeWidth={s.sw}
                  style={{ transition: "all .3s" }}
                />
                {/* Status icon */}
                {(isActive || isVisited) && (
                  <text x={actor.x + actor.w - 12} y={actor.y + 14} textAnchor="middle" dominantBaseline="central"
                    style={{ fontSize: 11, fill: isFailed ? T.fail : T.pass }}>
                    {isFailed ? "✕" : "✓"}
                  </text>
                )}
                <text x={actor.x + actor.w / 2} y={actor.y + 20} textAnchor="middle" dominantBaseline="central"
                  style={{ fontSize: 11, fontWeight: 600, fontFamily: "'Courier New',monospace",
                    fill: isFailed ? T.fail : isActive ? actor.color : isVisited ? T.ink2 : T.ink4,
                    transition: "fill .3s"
                  }}>
                  {actor.label}
                </text>
                <text x={actor.x + actor.w / 2} y={actor.y + 36} textAnchor="middle" dominantBaseline="central"
                  style={{ fontSize: 9, fontFamily: "'Courier New',monospace", fill: isActive ? T.ink4 : T.ink5 }}>
                  {actor.sub}
                </text>
              </g>
            )
          })}

          {/* T+1 annotation */}
          <text x={340} y={393} textAnchor="middle"
            style={{ fontSize: 8, fontFamily: "'Courier New',monospace", fill: T.ink5 }}>
            ISO 8583 flows through network rails · T+1 settlement · chargebacks unchanged
          </text>
        </svg>
      </div>

      {/* Info panel */}
      <div style={{ margin: "0 20px 12px", minHeight: 70,
        background: activeStep ? (activeStep.status === "fail" ? T.failLight : T.passLight) : T.cream2,
        border: `1px solid ${activeStep ? (activeStep.status === "fail" ? T.failBorder : T.passBorder) : T.border}`,
        borderRadius: 8, padding: "10px 14px", transition: "all .25s"
      }}>
        {activeStep ? (
          <>
            <div style={{ fontFamily: "'Courier New',monospace", fontSize: 10, fontWeight: 600,
              color: activeStep.status === "fail" ? T.fail : T.pass, marginBottom: 5 }}>
              {activeStep.layer ? `${activeStep.layer} — ` : ""}{activeStep.status === "fail" ? "BLOCKED" : "PASS"} · {activeStep.label}
            </div>
            <div style={{ fontSize: 11, color: T.ink2, lineHeight: 1.65, whiteSpace: "pre-line", fontFamily: "'Courier New',monospace" }}>
              {activeStep.info}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 10, color: T.ink5, fontFamily: "'Courier New',monospace", paddingTop: 6 }}>
            press play to walk through the authorization flow
          </div>
        )}
      </div>

      {/* Hint after agent fails */}
      {mode === "agent" && step >= AGENT_STEPS.length - 1 && (
        <div style={{ margin: "-4px 20px 12px", padding: "10px 14px",
          background: "#eef3ff", border: `1px solid ${T.visa}40`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: T.visa, fontFamily: "'Courier New',monospace" }}>
            all four layers blocked the agent — switch to "with new protocols" to see the fix
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ padding: "10px 22px 13px", borderTop: `1px solid ${T.border}`, background: T.cream2,
        display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => { reset(); setTimeout(() => setPlaying(true), 50) }}
          style={{ padding: "5px 14px", borderRadius: 5, fontSize: 10, fontFamily: "'Courier New',monospace",
            cursor: "pointer", border: `1px solid ${T.ink5}`, background: T.cream, color: T.ink }}>▶ play</button>
        <button onClick={() => setStep(s => Math.max(-1, s - 1))}
          style={{ padding: "5px 10px", borderRadius: 5, fontSize: 10, fontFamily: "'Courier New',monospace",
            cursor: "pointer", border: `1px solid ${T.border}`, background: "transparent", color: T.ink3 }}>←</button>
        <button onClick={() => setStep(s => Math.min(flow.length - 1, s + 1))}
          style={{ padding: "5px 10px", borderRadius: 5, fontSize: 10, fontFamily: "'Courier New',monospace",
            cursor: "pointer", border: `1px solid ${T.border}`, background: "transparent", color: T.ink3 }}>→</button>
        <div style={{ flex: 1, height: 2, background: T.border, borderRadius: 1, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 1, transition: "width .4s ease",
            background: isFail ? T.fail : T.pass, width: `${progress}%` }}/>
        </div>
        <span style={{ fontSize: 9, color: T.ink4, fontFamily: "'Courier New',monospace" }}>
          {Math.max(0, step + 1)} / {flow.length}
        </span>
        <button onClick={reset} style={{ padding: "5px 9px", borderRadius: 5, fontSize: 9, fontFamily: "'Courier New',monospace",
          cursor: "pointer", border: `1px solid ${T.border}`, background: "transparent", color: T.ink5 }}>reset</button>
      </div>
    </div>
  )
}
