import { useState, useEffect, useRef } from "react"

const T = {
  cream:"#faf9f6", cream2:"#f5f3ee", cream3:"#ede9e2",
  ink:"#1a1814", ink2:"#4a4440", ink3:"#5e5750", ink4:"#8a8278", ink5:"#b8b3a8",
  pass:"#186040", passLight:"#f0f8f4", passBorder:"#a8d8b8",
  fail:"#c02010", failLight:"#fff4f2", failBorder:"#f0b0a0",
  agent:"#6030b0", agentLight:"#f5f0ff", agentBorder:"#c8a8f0",
  visa:"#185FA5", mc:"#993C1D",
  border:"#e0dbd0",
}

// ── GEOMETRY ──────────────────────────────────────────────────────
const ACTORS_HUMAN = {
  consumer: { x: 40,  y: 96,  w: 130, h: 54, label:"Consumer", sub:"initiates",         color:"#1a1814" },
  merchant: { x: 594, y: 96,  w: 130, h: 54, label:"Merchant", sub:"checkout",          color:"#1a1814" },
  acquirer: { x: 594, y: 304, w: 130, h: 54, label:"Acquirer", sub:"Stripe · Adyen",    color:"#7a4a10" },
  network:  { x: 314, y: 304, w: 130, h: 54, label:"Network",  sub:"Visa · Mastercard", color:"#186040" },
  issuer:   { x: 40,  y: 304, w: 130, h: 54, label:"Issuer",   sub:"Chase · Amex",      color:"#185FA5" },
}

const ACTORS_AGENT = {
  consumer: { x: 40,  y: 60, w: 118, h: 50, label:"Consumer", sub:"policy author",     color:"#8a8278" },
  agent:    { x: 313, y: 60, w: 138, h: 50, label:"AI Agent", sub:"executor",          color:"#6030b0" },
  merchant: { x: 606, y: 60, w: 118, h: 50, label:"Merchant", sub:"checkout",          color:"#1a1814" },
  acquirer: { x: 606, y: 304, w: 118, h: 50, label:"Acquirer", sub:"Stripe · Adyen",   color:"#7a4a10" },
  network:  { x: 313, y: 304, w: 138, h: 50, label:"Network",  sub:"Visa · Mastercard", color:"#186040" },
  issuer:   { x: 40,  y: 304, w: 118, h: 50, label:"Issuer",   sub:"Chase · Amex",     color:"#185FA5" },
}

const cx = (A, id) => A[id].x + A[id].w / 2
const cy = (A, id) => A[id].y + A[id].h / 2

const buildHumanPaths = (A) => ({
  "c-m":     `M${A.consumer.x + A.consumer.w},${cy(A,"consumer")} C382,${cy(A,"consumer")} 382,${cy(A,"merchant")} ${A.merchant.x},${cy(A,"merchant")}`,
  "m-acq":   `M${cx(A,"merchant")},${A.merchant.y + A.merchant.h} L${cx(A,"acquirer")},${A.acquirer.y}`,
  "acq-n":   `M${A.acquirer.x},${cy(A,"acquirer")} L${A.network.x + A.network.w},${cy(A,"network")}`,
  "n-iss":   `M${A.network.x},${cy(A,"network")} L${A.issuer.x + A.issuer.w},${cy(A,"issuer")}`,
  "iss-n-r": `M${A.issuer.x + A.issuer.w},${cy(A,"issuer")+12} C252,${cy(A,"issuer")+12} 252,${cy(A,"network")+12} ${A.network.x},${cy(A,"network")+12}`,
  "n-acq-r": `M${A.network.x + A.network.w},${cy(A,"network")+12} L${A.acquirer.x},${cy(A,"acquirer")+12}`,
  "acq-m-r": `M${cx(A,"acquirer")+10},${A.acquirer.y} L${cx(A,"merchant")+10},${A.merchant.y + A.merchant.h}`,
  "m-c-r":   `M${A.merchant.x},${cy(A,"merchant")+12} C382,${cy(A,"merchant")+12} 382,${cy(A,"consumer")+12} ${A.consumer.x + A.consumer.w},${cy(A,"consumer")+12}`,
})

const buildAgentPaths = (A) => ({
  "c-agent-enroll":  `M${A.consumer.x + A.consumer.w},${cy(A,"consumer")} L${A.agent.x},${cy(A,"agent")}`,
  "agent-tap":       `M${cx(A,"agent")},${A.agent.y + A.agent.h} C${cx(A,"agent")},${A.network.y - 30} ${cx(A,"network")},${A.network.y - 30} ${cx(A,"network")},${A.network.y}`,
  "tap-agent-r":     `M${cx(A,"network")+8},${A.network.y} C${cx(A,"network")+8},${A.agent.y + A.agent.h + 20} ${cx(A,"agent")+8},${A.agent.y + A.agent.h + 20} ${cx(A,"agent")+8},${A.agent.y + A.agent.h}`,
  "agent-m":         `M${A.agent.x + A.agent.w},${cy(A,"agent")} C510,${cy(A,"agent")} 510,${cy(A,"merchant")} ${A.merchant.x},${cy(A,"merchant")}`,
  "m-acq":           `M${cx(A,"merchant")},${A.merchant.y + A.merchant.h} L${cx(A,"acquirer")},${A.acquirer.y}`,
  "acq-n":           `M${A.acquirer.x},${cy(A,"acquirer")} L${A.network.x + A.network.w},${cy(A,"network")}`,
  "n-iss":           `M${A.network.x},${cy(A,"network")} L${A.issuer.x + A.issuer.w},${cy(A,"issuer")}`,
  "iss-n-r":         `M${A.issuer.x + A.issuer.w},${cy(A,"issuer")+12} C235,${cy(A,"issuer")+12} 235,${cy(A,"network")+12} ${A.network.x},${cy(A,"network")+12}`,
  "n-acq-r":         `M${A.network.x + A.network.w},${cy(A,"network")+12} L${A.acquirer.x},${cy(A,"acquirer")+12}`,
  "acq-m-r":         `M${cx(A,"acquirer")+10},${A.acquirer.y} L${cx(A,"merchant")+10},${A.merchant.y + A.merchant.h}`,
  "m-agent-r":       `M${A.merchant.x},${cy(A,"merchant")+14} C510,${cy(A,"merchant")+14} 510,${cy(A,"agent")+14} ${A.agent.x + A.agent.w},${cy(A,"agent")+14}`,
  "agent-c-notify":  `M${A.agent.x},${cy(A,"agent")+14} L${A.consumer.x + A.consumer.w},${cy(A,"consumer")+14}`,
})

// ── FLOWS ─────────────────────────────────────────────────────────
const HUMAN_STEPS = [
  { path:"c-m",     from:"consumer", to:"merchant",  label:"checkout",      status:"pass", info:"Consumer fills form · CAPTCHA solved · Residential IP → WAF passes · AVS / CVV match" },
  { path:"m-acq",   from:"merchant", to:"acquirer",  label:"PaymentIntent", status:"pass", info:"F022=01 · Normal velocity · Merchant profile matches → Layer 2 pass ✓" },
  { path:"acq-n",   from:"acquirer", to:"network",   label:"MTI 0100",      status:"pass", info:"ML risk score: low · Human behavioral baseline matches → Layer 3 pass ✓" },
  { path:"n-iss",   from:"network",  to:"issuer",    label:"authorize",     status:"pass", info:"Low risk score forwarded · Cardholder history matches · No step-up triggered" },
  { path:"iss-n-r", from:"issuer",   to:"network",   label:"F039=00",       status:"pass", info:"APPROVED · Auth code: 123456" },
  { path:"n-acq-r", from:"network",  to:"acquirer",  label:"MTI 0110",      status:"pass", info:"F038=123456 · F039=00 · Authorization confirmed" },
  { path:"acq-m-r", from:"acquirer", to:"merchant",  label:"200 OK",        status:"pass", info:"Payment captured · Order created" },
  { path:"m-c-r",   from:"merchant", to:"consumer",  label:"confirmed",     status:"pass", info:"Order confirmed ✓ · Human checkout complete" },
]

const AGENT_STEPS = [
  { path:"c-agent-enroll", from:"consumer", to:"agent", label:"delegates · enrolls", status:"pass",
    layer:"Enrollment (once)",
    info:"Consumer enrolls card with agent platform · creates FIDO2 Passkey · sets spending policy\nThis happens once — consumer is NOT present during the actual transaction." },
  { path:"agent-tap", from:"agent", to:"network", label:"TAP / identity", status:"fail",
    layer:"Merchant + Gateway",
    info:"✕ Agent sends signed HTTP request to checkout\n✕ Headless Chrome · AWS IP · machine speed\n✕ WAF blocks the agent before payment even starts. Consumer cannot help — they're not there." },
  { path:"agent-m", from:"agent", to:"merchant", label:"agent checkout", status:"fail",
    layer:"Acquirer + Processor",
    info:"✕ No AVS match · Data center IP · F022=01 tells downstream: apply human rules\n✕ Every ISO 8583 signal reads as credential stuffing." },
  { path:"m-acq", from:"merchant", to:"acquirer", label:"PaymentIntent", status:"fail",
    layer:"Card Network",
    info:"✕ Machine-speed transaction · No human behavioral baseline · High risk score\n✕ ML models catch exactly this pattern." },
  { path:"acq-n", from:"acquirer", to:"network", label:"MTI 0100", status:"fail",
    layer:"Issuer Bank",
    info:"✕ Max risk score triggers 3DS step-up\n✕ Agent cannot respond to SMS challenge\n✕ Transaction fails permanently. The consumer receives no notification. The sale is lost." },
]

const FIXED_STEPS = [
  { path:"c-agent-enroll", from:"consumer", to:"agent", label:"delegates · enrolls", status:"pass",
    layer:"Enrollment (once)",
    info:"Consumer enrolls once · creates Passkey · sets policy: $500/txn · retail category · daily velocity\nConsumer is done. Agent now operates autonomously." },
  { path:"agent-tap", from:"agent", to:"network", label:"POST /v1/validate", status:"pass",
    layer:"Identity Layer (TAP / Agent Pay)",
    info:"✓ Ed25519 HTTP Message Signature validated · Agent in key directory\n✓ Visa TAP: issues JWT (TTL 90s) · registers payment instruction\n✓ Mastercard: Cloudflare CDN verifies before request reaches merchant\n✓ Agent identity confirmed in 40–80ms" },
  { path:"tap-agent-r", from:"network", to:"agent", label:"TAP JWT / credential", status:"pass",
    info:"✓ JWT includes: consumer_recognized · instruction_ref: pi-abc123\n✓ Agent holds credential for 90 seconds" },
  { path:"agent-m", from:"agent", to:"merchant", label:"checkout + TAP header", status:"pass",
    layer:"Merchant + Gateway",
    info:"✓ Authorization: TAP-1.0 {jwt}\n✓ Merchant SDK validates JWT locally in <5ms\n✓ consumer_recognized: true → skip onboarding · no CAPTCHA · no form" },
  { path:"m-acq", from:"merchant", to:"acquirer", label:"PaymentIntent", status:"pass",
    layer:"Acquirer + Processor",
    info:"✓ F002: VCN token · F022: 81 (agent-initiated) · F048: AGNT:skyfire-001 · F126: instruction hash\n✓ Agent context propagates through entire ISO 8583 chain" },
  { path:"acq-n", from:"acquirer", to:"network", label:"MTI 0100 · F022=81", status:"pass",
    layer:"Card Network",
    info:"✓ F126 validated vs VIC registry · amount + merchant match\n✓ Agentic Token binding verified · agent-aware risk model applied" },
  { path:"n-iss", from:"network", to:"issuer", label:"agent policy", status:"pass",
    layer:"Issuer Bank",
    info:"✓ F022=81 → load agent spending policy (not human model)\n✓ $89.99 ≤ $500 limit ✓ · MCC ✓ · velocity ✓ · Passkey pre-authorized → APPROVED · No 3DS" },
  { path:"iss-n-r", from:"issuer", to:"network", label:"F039=00", status:"pass",
    info:"APPROVED · F038: 123456 · F039: 00 · F126: agent-confirmed" },
  { path:"n-acq-r", from:"network", to:"acquirer", label:"MTI 0110", status:"pass",
    info:"Authorization response · F038=123456 · F039=00" },
  { path:"acq-m-r", from:"acquirer", to:"merchant", label:"200 OK", status:"pass",
    info:"Payment captured · order created" },
  { path:"m-agent-r", from:"merchant", to:"agent", label:"confirmed", status:"pass",
    info:"✓ Order confirmed → Agent receives result first" },
  { path:"agent-c-notify", from:"agent", to:"consumer", label:"push notification", status:"pass",
    info:"✓ Consumer receives push notification: Bought Bose QC45 · $89.99 · authorized\n✓ 1,100ms total · no checkout page visited · no card number entered" },
]

const isAgentMode = (m) => m === "agent" || m === "fixed"

export default function FourPartyFlow() {
  const [mode, setMode]       = useState("human")
  const [step, setStep]       = useState(-1)
  const [playing, setPlaying] = useState(false)
  const playRef  = useRef(false)
  const timerRef = useRef(null)

  const actors = isAgentMode(mode) ? ACTORS_AGENT : ACTORS_HUMAN
  const paths  = isAgentMode(mode) ? buildAgentPaths(actors) : buildHumanPaths(actors)
  const flow   = mode === "human" ? HUMAN_STEPS : mode === "agent" ? AGENT_STEPS : FIXED_STEPS

  const switchMode = (m) => { setMode(m); setStep(-1); setPlaying(false); playRef.current = false }

  useEffect(() => {
    if (!playing) return
    playRef.current = true
    const run = async () => {
      for (let i = 0; i < flow.length; i++) {
        if (!playRef.current) break
        setStep(i)
        await new Promise(r => { timerRef.current = setTimeout(r, mode === "fixed" ? 1400 : 1500) })
      }
      playRef.current = false
      setPlaying(false)
    }
    run()
    return () => { clearTimeout(timerRef.current); playRef.current = false }
  }, [playing, mode])

  const reset = () => { playRef.current = false; clearTimeout(timerRef.current); setPlaying(false); setStep(-1) }

  const activeStep = step >= 0 && step < flow.length ? flow[step] : null
  const isFail     = mode === "agent"
  const progress   = step < 0 ? 0 : ((step + 1) / flow.length) * 100

  const visitedActors = new Set()
  const failedActors  = new Set()
  flow.slice(0, step + 1).forEach(s => {
    visitedActors.add(s.from); visitedActors.add(s.to)
    if (s.status === "fail") { failedActors.add(s.from); failedActors.add(s.to) }
  })

  const getActorStyle = (id) => {
    const a        = actors[id]
    const isFailed  = failedActors.has(id)
    const isVisited = visitedActors.has(id)
    const isActive  = activeStep && (activeStep.from === id || activeStep.to === id)
    if (id === "consumer" && isAgentMode(mode)) return { fill: T.cream, stroke: T.ink5, sw: 1, passive: true }
    if (isFailed)  return { fill: T.failLight,  stroke: T.fail,   sw: isActive ? 2 : 1.5 }
    if (id === "agent" && (isActive || isVisited)) return { fill: T.agentLight, stroke: T.agent, sw: isActive ? 2 : 1.5 }
    if (isActive)  return { fill: T.cream3,     stroke: a.color,  sw: 2 }
    if (isVisited) return { fill: T.cream2,     stroke: T.pass,   sw: 1.5 }
    return              { fill: T.cream,      stroke: T.ink5,   sw: 1 }
  }

  const SVG_H = isAgentMode(mode) ? 440 : 420

  return (
    <div style={{ fontFamily:"'Georgia','Times New Roman',serif", background:T.cream, borderRadius:12, border:`1px solid ${T.border}`, overflow:"hidden" }}>

      {/* Header */}
      <div style={{ padding:"18px 24px 14px", background:T.cream2, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:T.ink4, fontFamily:"'Courier New',monospace", marginBottom:5 }}>
          4-party model — 5-party model · authorization flow
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <h2 style={{ fontSize:17, fontWeight:400, letterSpacing:"-.02em", margin:0, color:T.ink }}>
            {mode === "human"
              ? "4-party: human checkout — every layer passes"
              : mode === "agent"
              ? "5-party: agent checkout — consumer is passive · every layer fails"
              : "5-party: agent checkout — with TAP + Agent Pay"}
          </h2>
          <div style={{ display:"flex", gap:2, background:T.cream3, borderRadius:5, padding:2 }}>
            {[["human","4-party: human"],["agent","5-party: agent fails"],["fixed","5-party: fixed"]].map(([v, label]) => (
              <button key={v} onClick={() => switchMode(v)} style={{
                padding:"4px 11px", borderRadius:3, fontSize:9.5, fontFamily:"'Courier New',monospace",
                cursor:"pointer", border:"none", letterSpacing:"0.04em",
                background:mode===v?T.cream:"transparent",
                color:mode===v?T.ink:T.ink4,
                fontWeight:mode===v?600:400, transition:"all .15s",
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent mode callout */}
      {isAgentMode(mode) && (
        <div style={{ margin:"12px 20px 0", padding:"9px 14px", background:"#f5f0ff", border:`1px solid ${T.agentBorder}`, borderRadius:8, display:"flex", gap:10, alignItems:"flex-start" }}>
          <span style={{ fontSize:10, color:T.agent, fontFamily:"'Courier New',monospace", flexShrink:0, marginTop:1 }}>→</span>
          <span style={{ fontSize:11, color:"#3a1880", lineHeight:1.6 }}>
            The AI Agent is a <strong>new, distinct party</strong> — not the consumer. The consumer sets policy once at enrollment and receives the final notification. During the 1,100ms of the transaction, the consumer is absent. The agent operates as an independent principal with its own cryptographic identity.
          </span>
        </div>
      )}

      {/* SVG */}
      <div style={{ padding:"16px 20px 8px", overflowX:"auto" }}>
        <svg width="100%" viewBox={`0 0 764 ${SVG_H}`} style={{ display:"block", minWidth:540, overflow:"visible" }}>
          <defs>
            {["pass","fail","dim","agent-line","passive"].map(type => (
              <marker key={type} id={`arr-${type}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M1 1.5L6.5 4L1 6.5" fill="none"
                  stroke={type==="pass"?T.pass : type==="fail"?T.fail : type==="agent-line"?T.agent : type==="passive"?"#c8c0d8" : T.ink5}
                  strokeWidth="1.5" strokeLinecap="round"/>
              </marker>
            ))}
            {Object.entries(paths).map(([id, d]) => (
              <path key={id} id={`path-${id}`} d={d} fill="none" stroke="none"/>
            ))}
          </defs>

          {/* Layer bands */}
          {isAgentMode(mode) ? (
            <>
              <rect x={10} y={30} width={744} height={102} rx={6} fill="#f8f5ff" opacity={0.7}/>
              <text x={24} y={46} style={{ fontSize:9, fontFamily:"'Courier New',monospace", fill:"#7050b0", letterSpacing:"0.08em", textTransform:"uppercase" }}>consumer · agent layer (5th party)</text>
              <rect x={10} y={268} width={744} height={108} rx={6} fill={T.cream3} opacity={0.8}/>
              <text x={24} y={284} style={{ fontSize:9, fontFamily:"'Courier New',monospace", fill:T.ink3, letterSpacing:"0.08em", textTransform:"uppercase" }}>payment rails (unchanged)</text>
            </>
          ) : (
            <>
              <rect x={10} y={64} width={744} height={104} rx={6} fill={T.cream2} opacity={0.7}/>
              <text x={24} y={80} style={{ fontSize:9, fontFamily:"'Courier New',monospace", fill:T.ink3, letterSpacing:"0.08em", textTransform:"uppercase" }}>consumer · merchant layer</text>
              <rect x={10} y={272} width={744} height={108} rx={6} fill={T.cream3} opacity={0.8}/>
              <text x={24} y={288} style={{ fontSize:9, fontFamily:"'Courier New',monospace", fill:T.ink3, letterSpacing:"0.08em", textTransform:"uppercase" }}>payment rails layer</text>
            </>
          )}

          {/* Edges */}
          {flow.map((s, i) => {
            const isPast   = i < step
            const isActive = i === step
            const isAgentEdge = s.path === "c-agent-enroll" || s.path === "agent-c-notify"
            const color    = isAgentEdge
              ? (s.status === "pass" ? "#9060d8" : T.fail)
              : s.status === "fail" ? T.fail : T.pass
            const dimColor = isAgentEdge ? "#c0a8e8" : T.ink5
            const opacity  = isPast ? 0.6 : isActive ? 1 : 0.18
            const sw       = isActive ? 2 : isPast ? 1.5 : 0.8
            const useColor = (isPast || isActive) ? color : dimColor
            const mType    = (isPast || isActive)
              ? isAgentEdge ? "agent-line" : s.status === "pass" ? "pass" : "fail"
              : isAgentEdge ? "passive" : "dim"
            const dash     = (isPast || isActive) ? "none" : "3 5"
            const pathD    = paths[s.path]
            if (!pathD) return null

            const coords = pathD.match(/-?[\d.]+/g)?.map(Number) ?? []
            const lx     = coords.length >= 4 ? (coords[0] + coords[coords.length - 2]) / 2 : 382
            const ly     = coords.length >= 4 ? (coords[1] + coords[coords.length - 1]) / 2 : 200

            return (
              <g key={i} opacity={opacity} style={{ transition:"opacity .3s" }}>
                <path d={pathD} fill="none" stroke={useColor} strokeWidth={sw}
                  strokeDasharray={dash} markerEnd={`url(#arr-${mType})`}/>
                {isActive && (
                  <circle r={5} fill={color} opacity={0.9}>
                    <animateMotion dur="1.4s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1" keyTimes="0;1">
                      <mpath href={`#path-${s.path}`}/>
                    </animateMotion>
                  </circle>
                )}
                {(isPast || isActive) && (
                  <g>
                    <rect x={lx - 44} y={ly - 9} width={88} height={16} rx={3} fill={T.cream} opacity={0.92}/>
                    <text x={lx} y={ly + 1} textAnchor="middle" dominantBaseline="central"
                      style={{ fontSize:8.5, fontFamily:"'Courier New',monospace", fill:useColor, fontWeight:isActive?600:400 }}>
                      {s.label}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {Object.entries(actors).map(([id, actor]) => {
            const s        = getActorStyle(id)
            const isFailed  = failedActors.has(id)
            const isVisited = visitedActors.has(id)
            const isActive  = activeStep && (activeStep.from === id || activeStep.to === id)
            const passive   = s.passive

            return (
              <g key={id}>
                {isActive && !passive && (
                  <rect x={actor.x - 5} y={actor.y - 5} width={actor.w + 10} height={actor.h + 10} rx={11}
                    fill="none" stroke={isFailed ? T.fail : id === "agent" ? T.agent : actor.color} strokeWidth={1} opacity={0.25}>
                    <animate attributeName="opacity" values="0.35;0.08;0.35" dur="1.8s" repeatCount="indefinite"/>
                  </rect>
                )}
                <rect x={actor.x} y={actor.y} width={actor.w} height={actor.h} rx={8}
                  fill={s.fill} stroke={s.stroke} strokeWidth={s.sw}
                  style={{ transition:"all .3s" }}
                />
                {passive && (
                  <text x={actor.x + actor.w - 10} y={actor.y + 12} textAnchor="middle" dominantBaseline="central"
                    style={{ fontSize:9, fill:"#b8a8d0", fontFamily:"'Courier New',monospace" }}>passive</text>
                )}
                {!passive && (isActive || isVisited) && (
                  <text x={actor.x + actor.w - 12} y={actor.y + 13} textAnchor="middle" dominantBaseline="central"
                    style={{ fontSize:11, fill:isFailed ? T.fail : id === "agent" ? T.agent : T.pass }}>
                    {isFailed ? "✕" : "✓"}
                  </text>
                )}
                <text x={actor.x + actor.w / 2} y={actor.y + 19} textAnchor="middle" dominantBaseline="central"
                  style={{ fontSize:11, fontWeight:600, fontFamily:"'Courier New',monospace",
                    fill: passive ? "#b8a8d0"
                      : isFailed ? T.fail
                      : id === "agent" && (isActive || isVisited) ? T.agent
                      : isActive ? actor.color
                      : isVisited ? T.ink2
                      : T.ink4,
                    transition:"fill .3s" }}>
                  {actor.label}
                </text>
                <text x={actor.x + actor.w / 2} y={actor.y + 34} textAnchor="middle" dominantBaseline="central"
                  style={{ fontSize:9, fontFamily:"'Courier New',monospace", fill: passive ? "#c8b8e0" : isActive ? T.ink4 : T.ink4 }}>
                  {actor.sub}
                </text>
              </g>
            )
          })}

          <text x={382} y={SVG_H - 8} textAnchor="middle"
            style={{ fontSize:8, fontFamily:"'Courier New',monospace", fill:T.ink4 }}>
            {isAgentMode(mode)
              ? "Consumer absent during transaction · AI Agent is the active party · T+1 settlement unchanged"
              : "ISO 8583 flows through network rails · T+1 settlement · chargebacks unchanged"}
          </text>
        </svg>
      </div>

      {/* Info panel */}
      <div style={{ margin:"0 20px 12px", minHeight:72,
        background: activeStep
          ? activeStep.status === "fail" ? T.failLight
            : activeStep.path?.includes("agent") ? T.agentLight
            : T.passLight
          : T.cream2,
        border:`1px solid ${activeStep
          ? activeStep.status === "fail" ? T.failBorder
            : activeStep.path?.includes("agent") ? T.agentBorder
            : T.passBorder
          : T.border}`,
        borderRadius:8, padding:"10px 14px", transition:"all .25s" }}>
        {activeStep ? (
          <>
            <div style={{ fontFamily:"'Courier New',monospace", fontSize:10, fontWeight:600, marginBottom:5,
              color: activeStep.status === "fail" ? T.fail : activeStep.path?.includes("agent") ? T.agent : T.pass }}>
              {activeStep.layer ? `${activeStep.layer} — ` : ""}{activeStep.status === "fail" ? "BLOCKED" : "PASS"} · {activeStep.label}
            </div>
            <div style={{ fontSize:11, color:T.ink2, lineHeight:1.65, whiteSpace:"pre-line", fontFamily:"'Courier New',monospace" }}>
              {activeStep.info}
            </div>
          </>
        ) : (
          <div style={{ fontSize:10, color:T.ink3, fontFamily:"'Courier New',monospace", paddingTop:6 }}>
            press play · or click ← → to step through the flow
          </div>
        )}
      </div>

      {mode === "agent" && step >= AGENT_STEPS.length - 1 && (
        <div style={{ margin:"-4px 20px 12px", padding:"9px 14px", background:"#eef3ff", border:`1px solid ${T.visa}40`, borderRadius:8 }}>
          <div style={{ fontSize:10, color:T.visa, fontFamily:"'Courier New',monospace" }}>
            every layer failed — switch to "5-party: fixed" to see what TAP and Agent Pay replace
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ padding:"10px 22px 13px", borderTop:`1px solid ${T.border}`, background:T.cream2, display:"flex", alignItems:"center", gap:8 }}>
        <button onClick={() => { reset(); setTimeout(() => setPlaying(true), 50) }}
          style={{ padding:"5px 14px", borderRadius:5, fontSize:10, fontFamily:"'Courier New',monospace", cursor:"pointer", border:`1px solid ${T.ink5}`, background:T.cream, color:T.ink }}>▶ play</button>
        <button onClick={() => setStep(s => Math.max(-1, s - 1))}
          style={{ padding:"5px 10px", borderRadius:5, fontSize:10, fontFamily:"'Courier New',monospace", cursor:"pointer", border:`1px solid ${T.border}`, background:"transparent", color:T.ink3 }}>←</button>
        <button onClick={() => setStep(s => Math.min(flow.length - 1, s + 1))}
          style={{ padding:"5px 10px", borderRadius:5, fontSize:10, fontFamily:"'Courier New',monospace", cursor:"pointer", border:`1px solid ${T.border}`, background:"transparent", color:T.ink3 }}>→</button>
        <div style={{ flex:1, height:2, background:T.border, borderRadius:1, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:1, transition:"width .4s ease",
            background: isFail ? T.fail : T.pass, width:`${progress}%` }}/>
        </div>
        <span style={{ fontSize:9, color:T.ink3, fontFamily:"'Courier New',monospace" }}>
          {Math.max(0, step + 1)} / {flow.length}
        </span>
        <button onClick={reset} style={{ padding:"5px 9px", borderRadius:5, fontSize:9, fontFamily:"'Courier New',monospace", cursor:"pointer", border:`1px solid ${T.border}`, background:"transparent", color:T.ink4 }}>reset</button>
      </div>
    </div>
  )
}
