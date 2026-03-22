import { useState } from "react"

const ACTORS = {
  consumer: {
    id: "consumer",
    label: "Consumer",
    sub: "Sets spending policy once",
    layer: 0,
    col: 1,
    color: "#1a1814",
    accent: "#8a8278",
  },
  agent: {
    id: "agent",
    label: "AI Agent",
    sub: "Skyfire · Claude · GPT-4o",
    layer: 1,
    col: 0,
    color: "#5a38a0",
    accent: "#9070d8",
  },
  wallet: {
    id: "wallet",
    label: "AgentWallet",
    sub: "Visa VCN · spend limits · passkey",
    layer: 1,
    col: 2,
    color: "#5a38a0",
    accent: "#9070d8",
  },
  tap: {
    id: "tap",
    label: "Trusted Agent Protocol",
    sub: "Visa + Cloudflare · Ed25519 · 90s JWT",
    layer: 2,
    col: 0,
    color: "#1a50a0",
    accent: "#3a78d8",
  },
  vic: {
    id: "vic",
    label: "Visa Intelligent Commerce",
    sub: "VIC · VisaNet · Token Service",
    layer: 2,
    col: 2,
    color: "#1a50a0",
    accent: "#3a78d8",
  },
  issuer: {
    id: "issuer",
    label: "Issuer Bank",
    sub: "Chase · Amex · Barclays",
    layer: 3,
    col: 1,
    color: "#186040",
    accent: "#2aa870",
  },
  acquirer: {
    id: "acquirer",
    label: "Acquirer",
    sub: "Stripe · Adyen · Fiserv",
    layer: 4,
    col: 1,
    color: "#186040",
    accent: "#2aa870",
  },
  merchant: {
    id: "merchant",
    label: "Merchant",
    sub: "Bose.com · Shopify · Jomashop",
    layer: 5,
    col: 1,
    color: "#1a1814",
    accent: "#8a8278",
  },
}

const CONNECTIONS = [
  { from: "consumer", to: "agent",    label: "delegates intent",         type: "delegate" },
  { from: "consumer", to: "wallet",   label: "pre-authorizes",           type: "delegate" },
  { from: "agent",    to: "tap",      label: "signs request · Ed25519",  type: "identity" },
  { from: "wallet",   to: "vic",      label: "tokenized VCN",            type: "payment"  },
  { from: "tap",      to: "vic",      label: "TAP JWT · pi-abc123",      type: "identity" },
  { from: "tap",      to: "merchant", label: "credential · no-code SDK", type: "identity" },
  { from: "vic",      to: "issuer",   label: "MTI 0100 · F022=81",       type: "payment"  },
  { from: "acquirer", to: "vic",      label: "ISO 8583 auth request",    type: "payment"  },
  { from: "merchant", to: "acquirer", label: "PaymentIntent",            type: "payment"  },
  { from: "issuer",   to: "vic",      label: "MTI 0110 · F039=00",       type: "response" },
]

const DETAILS = {
  consumer: {
    title: "Consumer",
    body: "Sets spending policy once at enrollment — category limits, per-transaction cap, velocity controls. Creates a FIDO2 Passkey. After that, the agent operates autonomously within those guardrails without requiring further interaction.",
    facts: ["One-time FIDO2 Passkey setup", "Configures spend policy: category + limit", "Receives push notification after purchase"],
  },
  agent: {
    title: "AI Agent",
    body: "The LLM runtime that interprets natural language intent and executes tool calls. Holds the consumer's DID credential. Registers with Visa's TAP key directory to receive a stable agent identity.",
    facts: ["Skyfire KYAPay · Claude · GPT-4o", "Ed25519 key pair registered with Visa TAP", "Tool calls: browse · search · pay"],
  },
  wallet: {
    title: "AgentWallet",
    body: "A Virtual Card Number issued by Visa Token Service and bound exclusively to this agent. The real PAN never leaves Visa's systems. The token activates only when the consumer authenticates a payment instruction via Passkey.",
    facts: ["Agent-specific VCN — not real PAN", "Bound to agent_id — cannot be reused", "Passkey-activated per instruction"],
  },
  tap: {
    title: "Trusted Agent Protocol",
    body: "The identity layer. Built on HTTP Message Signatures (RFC 9421) and Cloudflare Web Bot Auth. Verifies the agent is registered, the signature is valid, the nonce is unused, and the request is within 60 seconds. Issues a 90-second JWT the merchant will trust.",
    facts: ["HTTP Message Signatures · RFC 9421", "Cloudflare + Akamai behavioral layer", "Ed25519 public key directory at tap.visa.com"],
  },
  vic: {
    title: "Visa Intelligent Commerce",
    body: "The payment infrastructure layer. Tokenization, payment instructions, authentication, personalization, and commerce signals. VisaNet routes the ISO 8583 message with F022=81 to the issuer. Visa Token Service de-tokenizes the VCN for routing.",
    facts: ["VIC APIs · VisaNet · Token Service", "F022=81 triggers agent risk rules at issuer", "github.com/visa/mcp — open source MCP server"],
  },
  issuer: {
    title: "Issuer Bank",
    body: "Sees F022=81 in the authorization request and loads the agent spending policy instead of the human fraud model. Validates balance, per-transaction limit, merchant category, daily velocity, and token status. Returns approval in ~80ms.",
    facts: ["F022=81 → agent spending policy loaded", "Checks limit · category · velocity · status", "Dispute window: 120 days · VIC commerce signals"],
  },
  acquirer: {
    title: "Acquirer",
    body: "Packages the tokenized payment into ISO 8583. Sets F022=81, appends agent-id in F048, and places the TAP instruction reference hash in F126. Sends to VisaNet.",
    facts: ["Stripe · Adyen · Fiserv · Worldpay", "Builds ISO 8583: F002=VCN · F022=81 · F126=TAP", "Settlement: T+1 clearing"],
  },
  merchant: {
    title: "Merchant",
    body: "Receives the agent's checkout request with Authorization: TAP-1.0 header. The TAP SDK validates the JWT locally in under 5ms — no external call needed. consumer_recognized=true skips onboarding. Order created.",
    facts: ["No-code TAP SDK embed", "JWT validation: <5ms · no external call", "consumer_recognized → skip onboarding"],
  },
}

const TYPE_STYLE = {
  delegate: { stroke: "#c8c0b8", dash: "4 3",  label: "#a8a098" },
  identity: { stroke: "#9070d8", dash: "none",  label: "#7050b8" },
  payment:  { stroke: "#3a78d8", dash: "none",  label: "#2a60b8" },
  response: { stroke: "#2aa870", dash: "3 4",   label: "#1a9060" },
}

// Layout: 3 columns (0,1,2), 6 layers
const COL_X = { 0: 100, 1: 340, 2: 580 }
const LAYER_Y = { 0: 40, 1: 160, 2: 290, 3: 420, 4: 510, 5: 600 }
const NODE_W = 180
const NODE_H = 64

function cx(actor) { return COL_X[actor.col] + NODE_W / 2 }
function cy(actor) { return LAYER_Y[actor.layer] + NODE_H / 2 }

function edgePoints(from, to) {
  const fa = ACTORS[from], ta = ACTORS[to]
  const fx = cx(fa), fy = cy(fa)
  const tx = cx(ta), ty = cy(ta)
  // Determine exit/entry sides
  const dx = tx - fx, dy = ty - fy
  let x1 = fx, y1 = fy, x2 = tx, y2 = ty

  if (Math.abs(dy) > Math.abs(dx)) {
    y1 = dy > 0 ? fy + NODE_H / 2 : fy - NODE_H / 2
    y2 = dy > 0 ? ty - NODE_H / 2 : ty + NODE_H / 2
  } else {
    x1 = dx > 0 ? fx + NODE_W / 2 : fx - NODE_W / 2
    x2 = dx > 0 ? tx - NODE_W / 2 : tx + NODE_W / 2
  }

  // Midpoint for label
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return { x1, y1, x2, y2, mx, my }
}

export default function AgenticArchitecture() {
  const [selected, setSelected] = useState(null)

  const detail = selected ? DETAILS[selected] : null
  const selActor = selected ? ACTORS[selected] : null

  const SVG_W = 760
  const SVG_H = 700

  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#1a1814", background: "#faf9f6", borderRadius: 12, border: "1px solid #e0dbd0", overflow: "hidden", width: "100vw", maxWidth: 1040, position: "relative", left: "50%", transform: "translateX(-50%)", margin: "2rem 0" }}>

      {/* Header */}
      <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid #e0dbd0", background: "#f5f3ee" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9a9288", fontFamily: "'Courier New', monospace", marginBottom: 6 }}>
          Agentic Commerce · System Architecture
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 400, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
          How an AI agent pays for something
        </h2>
        <div style={{ fontSize: 12, color: "#9a9288", fontFamily: "'Courier New', monospace" }}>
          Eight actors · three protocol layers · ~1100ms end to end
        </div>
      </div>

      <div style={{ display: "flex", gap: 0 }}>

        {/* SVG diagram */}
        <div style={{ flex: 1, padding: "16px 0 16px 16px", overflowX: "auto" }}>
          <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: "block" }}>
            <defs>
              {Object.entries(TYPE_STYLE).map(([type, s]) => (
                <marker key={type} id={`arr-${type}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M1 1.5L6.5 4L1 6.5" fill="none" stroke={s.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              ))}
            </defs>

            {/* Layer bands */}
            {[
              { y: 20, h: 100, label: "consumer", color: "#f0ece4" },
              { y: 130, h: 150, label: "agent layer", color: "#f5f0ff" },
              { y: 270, h: 150, label: "trust & payment network", color: "#eef3ff" },
              { y: 400, h: 240, label: "payment rails & merchant", color: "#f0f8f4" },
            ].map(band => (
              <g key={band.label}>
                <rect x={10} y={band.y} width={SVG_W - 20} height={band.h} rx={6} fill={band.color} />
                <text x={22} y={band.y + 14} style={{ fontSize: 9, fontFamily: "'Courier New', monospace", fill: "#b8b3a8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {band.label}
                </text>
              </g>
            ))}

            {/* Connections */}
            {CONNECTIONS.map((c, i) => {
              const { x1, y1, x2, y2, mx, my } = edgePoints(c.from, c.to)
              const ts = TYPE_STYLE[c.type]
              const isRelated = selected && (c.from === selected || c.to === selected)
              const isFaded = selected && !isRelated

              // Curved path for non-straight connections
              const isHoriz = Math.abs(y2 - y1) < 10
              const path = isHoriz
                ? `M${x1} ${y1} L${x2} ${y2}`
                : `M${x1} ${y1} C${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`

              return (
                <g key={i} style={{ opacity: isFaded ? 0.15 : 1, transition: "opacity .2s" }}>
                  <path
                    d={path}
                    fill="none"
                    stroke={isRelated ? ts.stroke : ts.stroke}
                    strokeWidth={isRelated ? 1.8 : 1.2}
                    strokeDasharray={ts.dash}
                    markerEnd={`url(#arr-${c.type})`}
                    strokeOpacity={isRelated ? 1 : 0.7}
                  />
                  {/* Edge label */}
                  <rect
                    x={mx - 48} y={my - 9}
                    width={96} height={16}
                    rx={3} fill="#faf9f6"
                    fillOpacity={0.9}
                  />
                  <text
                    x={mx} y={my + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: 8.5, fontFamily: "'Courier New', monospace", fill: isRelated ? ts.stroke : ts.label }}
                  >
                    {c.label}
                  </text>
                </g>
              )
            })}

            {/* Nodes */}
            {Object.values(ACTORS).map(a => {
              const x = COL_X[a.col]
              const y = LAYER_Y[a.layer]
              const isSel = selected === a.id
              const isFaded = selected && !isSel

              return (
                <g
                  key={a.id}
                  onClick={() => setSelected(selected === a.id ? null : a.id)}
                  style={{ cursor: "pointer", opacity: isFaded ? 0.3 : 1, transition: "opacity .2s" }}
                >
                  {/* Selection ring */}
                  {isSel && (
                    <rect x={x - 4} y={y - 4} width={NODE_W + 8} height={NODE_H + 8} rx={11}
                      fill="none" stroke={a.accent} strokeWidth={1.5} strokeOpacity={0.5} />
                  )}
                  {/* Node background */}
                  <rect
                    x={x} y={y} width={NODE_W} height={NODE_H} rx={8}
                    fill={isSel ? "#ffffff" : "#fdfcf9"}
                    stroke={isSel ? a.accent : "#d8d3c8"}
                    strokeWidth={isSel ? 1.5 : 1}
                  />
                  {/* Color accent bar */}
                  <rect x={x} y={y} width={4} height={NODE_H} rx={2} fill={a.accent} />
                  <rect x={x + 2} y={y} width={2} height={NODE_H} fill={a.accent} />
                  {/* Label */}
                  <text
                    x={x + 18} y={y + 22}
                    style={{ fontSize: 12, fontWeight: 600, fontFamily: "Georgia, serif", fill: a.color }}
                    dominantBaseline="central"
                  >
                    {a.label}
                  </text>
                  {/* Sublabel */}
                  <text
                    x={x + 18} y={y + 43}
                    style={{ fontSize: 9, fontFamily: "'Courier New', monospace", fill: "#9a9288" }}
                    dominantBaseline="central"
                  >
                    {a.sub}
                  </text>
                </g>
              )
            })}

            {/* Legend */}
            <g transform={`translate(10, ${SVG_H - 36})`}>
              {Object.entries(TYPE_STYLE).map(([type, ts], i) => (
                <g key={type} transform={`translate(${i * 160}, 0)`}>
                  <line x1={0} y1={12} x2={22} y2={12} stroke={ts.stroke} strokeWidth={1.5} strokeDasharray={ts.dash} markerEnd={`url(#arr-${type})`} />
                  <text x={28} y={12} dominantBaseline="central" style={{ fontSize: 9, fontFamily: "'Courier New', monospace", fill: "#9a9288" }}>
                    {type}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Detail panel */}
        <div style={{ width: 220, borderLeft: "1px solid #e0dbd0", background: "#f5f3ee", padding: "20px 16px", flexShrink: 0 }}>
          {detail ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <div style={{ width: 3, height: 24, background: selActor.accent, borderRadius: 2 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: selActor.color }}>{detail.title}</div>
              </div>
              <p style={{ fontSize: 12, color: "#4a4440", lineHeight: 1.7, marginBottom: 14 }}>{detail.body}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {detail.facts.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: selActor.accent, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ fontSize: 11, fontFamily: "'Courier New', monospace", color: "#6b6560", lineHeight: 1.5 }}>{f}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ marginTop: 16, fontSize: 10, fontFamily: "'Courier New', monospace", color: "#9a9288", border: "1px solid #d8d3c8", background: "transparent", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}
              >
                ← back
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, fontFamily: "'Courier New', monospace", color: "#b8b3a8", marginBottom: 16, lineHeight: 1.6 }}>
                Click any actor to learn about its role in the flow.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Consumer", note: "sets policy once" },
                  { label: "AI Agent", note: "executes autonomously" },
                  { label: "TAP", note: "identity layer" },
                  { label: "VIC", note: "payment network" },
                  { label: "Issuer", note: "approves transaction" },
                  { label: "Merchant", note: "no CAPTCHA, no form" },
                ].map(item => (
                  <div key={item.label} style={{ fontSize: 11, fontFamily: "'Courier New', monospace", color: "#9a9288", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4a4440" }}>{item.label}</span>
                    <span>{item.note}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e0dbd0" }}>
                <div style={{ fontSize: 10, fontFamily: "'Courier New', monospace", color: "#b8b3a8", lineHeight: 1.8 }}>
                  ~1100ms end to end<br />
                  T+1 settlement<br />
                  zero consumer friction
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
