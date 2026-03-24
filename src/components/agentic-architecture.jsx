import { useState } from "react"

const ACTORS = {
  consumer: { id: "consumer", label: "Consumer", sub: "Sets spending policy once", layer: 0, col: 1, xOffset: 0, color: "#1a1814", accent: "#8a8278" },
  agent: { id: "agent", label: "AI Agent", sub: "Skyfire · Claude · GPT-4o", layer: 1, col: 0, xOffset: 20, color: "#5a38a0", accent: "#9070d8" },
  wallet: { id: "wallet", label: "AgentWallet", sub: "Visa VCN · spend limits · passkey", layer: 1, col: 2, xOffset: -20, color: "#5a38a0", accent: "#9070d8" },
  tap: { id: "tap", label: "Trusted Agent Protocol", sub: "Visa + Cloudflare · Ed25519", layer: 2, col: 0, xOffset: 20, color: "#1a50a0", accent: "#3a78d8" },
  vic: { id: "vic", label: "Visa Intelligent Commerce", sub: "VIC · VisaNet · Token Service", layer: 2, col: 2, xOffset: -20, color: "#1a50a0", accent: "#3a78d8" },
  
  // Staggered bottom layers for cleaner line routing
  issuer: { id: "issuer", label: "Issuer Bank", sub: "Chase · Amex · Barclays", layer: 3, col: 1, xOffset: 120, color: "#186040", accent: "#2aa870" },
  acquirer: { id: "acquirer", label: "Acquirer", sub: "Stripe · Adyen · Fiserv", layer: 4, col: 1, xOffset: 0, color: "#186040", accent: "#2aa870" },
  merchant: { id: "merchant", label: "Merchant", sub: "Bose.com · Shopify · Jomashop", layer: 5, col: 1, xOffset: -120, color: "#1a1814", accent: "#8a8278" },
}

const CONNECTIONS = [
  { from: "consumer", to: "agent", label: "delegates intent", type: "delegate" },
  { from: "consumer", to: "wallet", label: "pre-authorizes + Passkey", type: "delegate" },
  { from: "agent", to: "vic", label: "get credentials (VCN)", type: "identity" },
  { from: "wallet", to: "vic", label: "VCN bound to agent_id", type: "payment" },
  { from: "agent", to: "merchant", label: "HTTP + TAP signature", type: "identity" },
  { from: "merchant", to: "acquirer", label: "PaymentIntent", type: "payment" },
  { from: "acquirer", to: "vic", label: "ISO 8583 · F022=81 · F126", type: "payment" },
  { from: "vic", to: "issuer", label: "MTI 0100 · F022=81", type: "payment" },
  { from: "issuer", to: "vic", label: "MTI 0110 · F039=00", type: "response" },
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
    body: "A signing protocol, not a server. The agent holds a pre-registered Ed25519 private key. When sending HTTP requests to merchants, the agent signs them locally using RFC 9421 HTTP Message Signatures. The signature carries: agent identity, consumer token, and a hash of the VCN credential.",
    facts: ["HTTP Message Signatures · RFC 9421", "Ed25519 signing is local — no Visa round-trip", "Merchant/CDN fetches public key from Visa Key Store"],
  },
  vic: {
    title: "Visa Intelligent Commerce",
    body: "The payment infrastructure layer. Agent calls VIC API to retrieve the VCN (agent-specific token) before going to the merchant — this is the real pre-checkout server call. VIC also handles payment instruction registration, commerce signals, and tokenization.",
    facts: ["VIC API: retrieve_payment_credentials(agent_id)", "Returns: VCN + payment_instruction_ref", "github.com/visa/mcp — open source MCP server"],
  },
  issuer: {
    title: "Issuer Bank",
    body: "Sees F022=81 in the authorization request and loads the agent spending policy instead of the human fraud model. Validates balance, per-transaction limit, merchant category, daily velocity, and token status. Returns approval in ~80ms.",
    facts: ["F022=81 → agent spending policy loaded", "Checks limit · category · velocity · status", "No 3DS — Passkey pre-authorized at instruction time"],
  },
  acquirer: {
    title: "Acquirer",
    body: "Packages the tokenized payment into ISO 8583. Sets F022=81 (agent-initiated), appends the agent identifier in F048, and places the VIC instruction reference hash in F126. Sends to VisaNet. Merchants verify TAP signature at request time; acquirer processes the actual payment.",
    facts: ["Stripe · Adyen · Fiserv · Worldpay", "ISO 8583: F002=VCN · F022=81 · F048 · F126", "Settlement: T+1 clearing — unchanged"],
  },
  merchant: {
    title: "Merchant",
    body: "Receives the agent's HTTP request with Signature-Input and Signature headers (TAP). The merchant (or its CDN — Cloudflare, Akamai) verifies the Ed25519 signature against Visa's public Key Store. If valid: consumer_recognized=true, no CAPTCHA, no bot block.",
    facts: ["Verifies signature against Visa Key Store (cached)", "consumer_recognized: true → no onboarding friction", "Cloudflare/Akamai verify at CDN edge before infra"],
  },
}

const TYPE_STYLE = {
  delegate: { stroke: "#c8c0b8", dash: "4 3", label: "#a8a098" },
  identity: { stroke: "#9070d8", dash: "none", label: "#7050b8" },
  payment: { stroke: "#3a78d8", dash: "none", label: "#2a60b8" },
  response: { stroke: "#2aa870", dash: "3 4", label: "#1a9060" },
}

// ─── Layout ────────────────────────────────────────────────────────────────
const COL_X = { 0: 100, 1: 340, 2: 580 }
// Expanded vertical layers
const LAYER_Y = { 0: 60, 1: 220, 2: 380, 3: 560, 4: 720, 5: 880 }
const NODE_W = 190
const NODE_H = 68
const SVG_W = 800
const SVG_H = 1000

function cx(actor) { return COL_X[actor.col] + actor.xOffset + NODE_W / 2 }
function cy(actor) { return LAYER_Y[actor.layer] + NODE_H / 2 }

function edgePoints(fromId, toId) {
  const fa = ACTORS[fromId], ta = ACTORS[toId]
  const fx = cx(fa), fy = cy(fa)
  const tx = cx(ta), ty = cy(ta)
  
  const dx = tx - fx, dy = ty - fy
  let x1 = fx, y1 = fy, x2 = tx, y2 = ty

  // Connect to top/bottom if primary direction is vertical
  if (Math.abs(dy) > Math.abs(dx) * 0.4) {
    y1 = dy > 0 ? fy + NODE_H / 2 : fy - NODE_H / 2
    y2 = dy > 0 ? ty - NODE_H / 2 : ty + NODE_H / 2
  } else {
    x1 = dx > 0 ? fx + NODE_W / 2 : fx - NODE_W / 2
    x2 = dx > 0 ? tx - NODE_W / 2 : tx + NODE_W / 2
  }

  // Offset bidirectional Vic/Issuer lines to prevent overlapping
  const isVicIssuer = (fromId === "vic" && toId === "issuer") || (fromId === "issuer" && toId === "vic")
  if (isVicIssuer) {
    if (fromId === "vic") { x1 -= 16; x2 -= 16 }
    else { x1 += 16; x2 += 16 }
  }

  // Smooth Bezier control points calculation
  const tension = 0.45;
  const c1x = x1, c1y = y1 + (y2 - y1) * tension;
  const c2x = x2, c2y = y2 - (y2 - y1) * tension;
  
  const path = `M${x1} ${y1} C${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`
  
  // Find midpoint of cubic bezier for the label placement
  const t = 0.5; 
  const mx = Math.pow(1-t, 3)*x1 + 3*Math.pow(1-t, 2)*t*c1x + 3*(1-t)*Math.pow(t, 2)*c2x + Math.pow(t, 3)*x2;
  const my = Math.pow(1-t, 3)*y1 + 3*Math.pow(1-t, 2)*t*c1y + 3*(1-t)*Math.pow(t, 2)*c2y + Math.pow(t, 3)*y2;

  return { path, mx, my }
}

export default function AgenticArchitecture() {
  const [selected, setSelected] = useState(null)
  const detail = selected ? DETAILS[selected] : null
  const selActor = selected ? ACTORS[selected] : null

  return (
    <div style={{
      fontFamily: "Georgia, 'Times New Roman', serif",
      color: "#1a1814",
      background: "#faf9f6",
      borderRadius: 12,
      border: "1px solid #e0dbd0",
      overflow: "hidden",
      width: "100vw",
      maxWidth: 1040,
      position: "relative",
      left: "50%",
      transform: "translateX(-50%)",
      margin: "3rem 0",
      boxShadow: "0 4px 16px rgba(0,0,0,0.04)"
    }}>
      {/* Header */}
      <div style={{ padding: "24px 32px 20px", borderBottom: "1px solid #e0dbd0", background: "#f5f3ee" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a9288", fontFamily: "'Courier New', monospace", marginBottom: 8 }}>
          Agentic Commerce · System Architecture
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.02em", margin: "0 0 6px" }}>
          How an AI agent pays for something
        </h2>
        <div style={{ fontSize: 12, color: "#9a9288", fontFamily: "'Courier New', monospace" }}>
          Eight actors · three protocol layers · ~1100ms end to end
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, height: 750 }}>
        {/* SVG diagram */}
        <div style={{ flex: 1, padding: "16px 0 16px 16px", overflowX: "auto", overflowY: "auto" }}>
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
              { y: 30, h: 120, label: "consumer", color: "#f0ece4" },
              { y: 190, h: 120, label: "agent layer", color: "#f5f0ff" },
              { y: 350, h: 120, label: "trust & payment network", color: "#eef3ff" },
              { y: 510, h: 460, label: "payment rails & merchant", color: "#f0f8f4" },
            ].map((band) => (
              <g key={band.label}>
                <rect x={10} y={band.y} width={SVG_W - 20} height={band.h} rx={8} fill={band.color} opacity={0.6} />
                <text x={26} y={band.y + 18} style={{ fontSize: 10, fontFamily: "'Courier New', monospace", fill: "#b8b3a8", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {band.label}
                </text>
              </g>
            ))}

            {/* Connections */}
            {CONNECTIONS.map((c, i) => {
              const { path, mx, my } = edgePoints(c.from, c.to)
              const ts = TYPE_STYLE[c.type]
              const isRelated = selected && (c.from === selected || c.to === selected)
              const isFaded = selected && !isRelated
              
              // Dynamic pill width
              const pillWidth = Math.max(90, c.label.length * 6 + 18);

              return (
                <g key={i} style={{ opacity: isFaded ? 0.15 : 1, transition: "opacity .3s" }}>
                  <path
                    d={path}
                    fill="none"
                    stroke={ts.stroke}
                    strokeWidth={isRelated ? 2.2 : 1.4}
                    strokeDasharray={ts.dash}
                    markerEnd={`url(#arr-${c.type})`}
                    strokeOpacity={isRelated ? 1 : 0.7}
                    style={{ transition: "stroke-width .2s" }}
                  />
                  {/* Edge label pill */}
                  <rect x={mx - pillWidth / 2} y={my - 10} width={pillWidth} height={20} rx={4} fill="#faf9f6" fillOpacity={isRelated ? 1 : 0.9} stroke={isRelated ? ts.stroke : "transparent"} strokeWidth={1} />
                  <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9.5, fontFamily: "'Courier New', monospace", fill: isRelated ? ts.stroke : ts.label }}>
                    {c.label}
                  </text>
                </g>
              )
            })}

            {/* Nodes */}
            {Object.values(ACTORS).map((a) => {
              const x = cx(a) - NODE_W / 2
              const y = cy(a) - NODE_H / 2
              const isSel = selected === a.id
              const isFaded = selected && !isSel

              return (
                <g key={a.id} onClick={() => setSelected(selected === a.id ? null : a.id)} style={{ cursor: "pointer", opacity: isFaded ? 0.25 : 1, transition: "opacity .3s" }}>
                  {/* Selection ring */}
                  {isSel && (
                    <rect x={x - 6} y={y - 6} width={NODE_W + 12} height={NODE_H + 12} rx={14} fill="none" stroke={a.accent} strokeWidth={2} strokeOpacity={0.4} />
                  )}
                  {/* Node background */}
                  <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={10} fill={isSel ? "#ffffff" : "#fdfcf9"} stroke={isSel ? a.accent : "#d8d3c8"} strokeWidth={isSel ? 1.8 : 1} style={{ transition: "all .2s" }} />
                  
                  {/* Color accent bar (Old Style Design) */}
                  <rect x={x} y={y} width={5} height={NODE_H} rx={2} fill={a.accent} />
                  <rect x={x + 3} y={y} width={2} height={NODE_H} fill={a.accent} />
                  
                  {/* Label */}
                  <text x={x + 20} y={y + 24} style={{ fontSize: 14, fontWeight: 600, fontFamily: "Georgia, serif", fill: a.color }} dominantBaseline="central">
                    {a.label}
                  </text>
                  
                  {/* Sublabel */}
                  <text x={x + 20} y={y + 46} style={{ fontSize: 10, fontFamily: "'Courier New', monospace", fill: "#9a9288" }} dominantBaseline="central">
                    {a.sub.split("·")[0].trim()} {a.sub.split("·").length > 1 ? "..." : ""}
                  </text>
                </g>
              )
            })}

            {/* Legend inside SVG */}
            <g transform={`translate(20, ${SVG_H - 40})`}>
              {Object.entries(TYPE_STYLE).map(([type, ts], i) => (
                <g key={type} transform={`translate(${i * 180}, 0)`}>
                  <line x1={0} y1={12} x2={26} y2={12} stroke={ts.stroke} strokeWidth={1.8} strokeDasharray={ts.dash} markerEnd={`url(#arr-${type})`} />
                  <text x={34} y={12} dominantBaseline="central" style={{ fontSize: 10, fontFamily: "'Courier New', monospace", fill: "#9a9288", textTransform: "capitalize" }}>
                    {type}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Detail panel */}
        <div style={{ width: 280, borderLeft: "1px solid #e0dbd0", background: "#f5f3ee", padding: "28px 24px", flexShrink: 0, overflowY: "auto", boxShadow: "-4px 0 16px rgba(0,0,0,0.02)" }}>
          {detail ? (
            <div style={{ animation: "fadeUp 0.3s ease-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 4, height: 28, background: selActor.accent, borderRadius: 2 }} />
                <div style={{ fontSize: 16, fontWeight: 600, color: selActor.color }}>{detail.title}</div>
              </div>
              
              <p style={{ fontSize: 13, color: "#4a4440", lineHeight: 1.7, marginBottom: 20 }}>
                {detail.body}
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {detail.facts.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: selActor.accent, marginTop: 6, flexShrink: 0 }} />
                    <div style={{ fontSize: 12, fontFamily: "'Courier New', monospace", color: "#6b6560", lineHeight: 1.5 }}>
                      {f}
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setSelected(null)}
                style={{ marginTop: 24, fontSize: 12, fontFamily: "'Courier New', monospace", color: "#9a9288", border: "1px solid #d8d3c8", background: "#ffffff", borderRadius: 6, padding: "8px 16px", cursor: "pointer", width: "100%", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.target.style.borderColor = "#b8a898"; e.target.style.color = "#6b6560" }}
                onMouseLeave={(e) => { e.target.style.borderColor = "#d8d3c8"; e.target.style.color = "#9a9288" }}
              >
                ← Back to Overview
              </button>
            </div>
          ) : (
            <div style={{ animation: "fadeUp 0.3s ease-out" }}>
              <div style={{ fontSize: 12, fontFamily: "'Courier New', monospace", color: "#b8b3a8", marginBottom: 24, lineHeight: 1.6 }}>
                Click any architecture node to inspect its specific role and security facts.
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Consumer", note: "sets policy once", id: "consumer" },
                  { label: "AI Agent", note: "executes autonomously", id: "agent" },
                  { label: "TAP", note: "identity layer", id: "tap" },
                  { label: "VIC", note: "payment network", id: "vic" },
                  { label: "Issuer", note: "approves transaction", id: "issuer" },
                  { label: "Merchant", note: "no friction checkout", id: "merchant" },
                ].map((item) => (
                  <div key={item.label} onClick={() => setSelected(item.id)} style={{ fontSize: 12, fontFamily: "'Courier New', monospace", color: "#9a9288", display: "flex", justifyContent: "space-between", padding: "8px", borderRadius: "6px", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#ece9e2"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ color: "#4a4440", fontWeight: 600 }}>{item.label}</span>
                    <span>{item.note}</span>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #e0dbd0" }}>
                <div style={{ fontSize: 11, fontFamily: "'Courier New', monospace", color: "#b8b3a8", lineHeight: 2 }}>
                  ~1100ms end to end<br />
                  T+1 settlement<br />
                  zero consumer friction
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d8d3c8; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #b8a898; }
      `}</style>
    </div>
  )
}