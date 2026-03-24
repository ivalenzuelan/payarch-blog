import { useState } from "react"

// ─── Data ──────────────────────────────────────────────────────────────────
const ACTORS = {
  consumer: { id: "consumer", label: "Consumer", sub: "Sets spending policy once", layer: 0, col: 1, xOffset: 0, color: "#1a1814", accent: "#b45309" },
  agent: { id: "agent", label: "AI Agent", sub: "Skyfire · Claude · GPT-4o", layer: 1, col: 0, xOffset: 20, color: "#5a38a0", accent: "#6d28d9" },
  wallet: { id: "wallet", label: "AgentWallet", sub: "Visa VCN · spend limits · passkey", layer: 1, col: 2, xOffset: -20, color: "#5a38a0", accent: "#6d28d9" },
  tap: { id: "tap", label: "Trusted Agent Protocol", sub: "Visa + Cloudflare · Ed25519 · 90s JWT", layer: 2, col: 0, xOffset: 20, color: "#1a50a0", accent: "#1d4ed8" },
  vic: { id: "vic", label: "Visa Intelligent Commerce", sub: "VIC · VisaNet · Token Service", layer: 2, col: 2, xOffset: -20, color: "#1a50a0", accent: "#1d4ed8" },
  
  // Staggered bottom layers for cleaner line routing
  issuer: { id: "issuer", label: "Issuer Bank", sub: "Chase · Amex · Barclays", layer: 3, col: 1, xOffset: 120, color: "#186040", accent: "#065f46" },
  acquirer: { id: "acquirer", label: "Acquirer", sub: "Stripe · Adyen · Fiserv", layer: 4, col: 1, xOffset: 0, color: "#186040", accent: "#065f46" },
  merchant: { id: "merchant", label: "Merchant", sub: "Bose.com · Shopify · Jomashop", layer: 5, col: 1, xOffset: -120, color: "#1a1814", accent: "#b45309" },
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
    body: "Sets spending policy once at enrollment — category limits, per-transaction cap, velocity controls. Creates a FIDO2 Passkey. After that, the agent operates autonomously within those guardrails without requiring further interaction.",
    facts: ["One-time FIDO2 Passkey setup", "Configures spend policy: category + limit", "Receives push notification after purchase"],
  },
  agent: {
    body: "The LLM runtime that interprets natural language intent and executes tool calls. Holds the consumer's DID credential. Registers with Visa's TAP key directory to receive a stable agent identity.",
    facts: ["Skyfire KYAPay · Claude · GPT-4o", "Ed25519 key pair registered with Visa TAP", "Tool calls: browse · search · pay"],
  },
  wallet: {
    body: "A Virtual Card Number issued by Visa Token Service and bound exclusively to this agent. The real PAN never leaves Visa's systems. The token activates only when the consumer authenticates a payment instruction via Passkey.",
    facts: ["Agent-specific VCN — not real PAN", "Bound to agent_id — cannot be reused", "Passkey-activated per instruction"],
  },
  tap: {
    body: "A signing protocol, not a server. The agent holds a pre-registered Ed25519 private key. When sending HTTP requests to merchants, the agent signs them locally using RFC 9421 HTTP Message Signatures. The signature (Signature-Input + Signature headers) carries: agent identity, consumer token, and a hash of the VCN credential. No round-trip to Visa during the request — the merchant verifies against Visa's cached public Key Store.",
    facts: ["HTTP Message Signatures · RFC 9421", "Ed25519 signing is local — no Visa round-trip", "Merchant/CDN fetches public key from Visa Key Store (cached)"],
  },
  vic: {
    body: "The payment infrastructure layer. Agent calls VIC API to retrieve the VCN (agent-specific token) before going to the merchant — this is the real pre-checkout server call. VIC also handles payment instruction registration, commerce signals, and tokenization. VisaNet routes ISO 8583 with F022=81 to the issuer.",
    facts: ["VIC API: retrieve_payment_credentials(agent_id)", "Returns: VCN + payment_instruction_ref", "github.com/visa/mcp — open source MCP server"],
  },
  issuer: {
    body: "Sees F022=81 in the authorization request and loads the agent spending policy instead of the human fraud model. Validates balance, per-transaction limit, merchant category, daily velocity, and token status. Returns approval in ~80ms. No 3DS step-up required — Passkey was pre-authorized at enrollment.",
    facts: ["F022=81 → agent spending policy loaded", "Checks limit · category · velocity · status", "No 3DS — Passkey pre-authorized at instruction time"],
  },
  acquirer: {
    body: "Packages the tokenized payment into ISO 8583. Sets F022=81 (agent-initiated), appends the agent identifier in F048, and places the VIC instruction reference hash in F126. Sends to VisaNet. Merchants verify TAP signature at request time; acquirer processes the actual payment.",
    facts: ["Stripe · Adyen · Fiserv · Worldpay", "ISO 8583: F002=VCN · F022=81 · F048 · F126", "Settlement: T+1 clearing — unchanged"],
  },
  merchant: {
    body: "Receives the agent's HTTP request with Signature-Input and Signature headers (TAP). The merchant (or its CDN — Cloudflare, Akamai) verifies the Ed25519 signature against Visa's public Key Store. If valid: consumer_recognized=true, no CAPTCHA, no bot block. Agent submits VCN at checkout. Takes ~40–80ms at CDN edge.",
    facts: ["Verifies signature against Visa Key Store (cached)", "consumer_recognized: true → no onboarding friction", "Cloudflare/Akamai verify at CDN edge before infra"],
  },
}

// ─── Visual Config ─────────────────────────────────────────────────────────
const NODE_ACCENT = {
  consumer: "#b45309", agent: "#6d28d9", wallet: "#6d28d9", tap: "#1d4ed8",
  vic: "#1d4ed8", issuer: "#065f46", acquirer: "#065f46", merchant: "#b45309",
}

const NODE_ICON_TINT = {
  consumer: "#d97706", agent: "#7c3aed", wallet: "#7c3aed", tap: "#2563eb",
  vic: "#2563eb", issuer: "#059669", acquirer: "#059669", merchant: "#d97706",
}

// Stretched Y coordinates for a taller, more elegant layout
const LAYER_Y = { 0: 60, 1: 220, 2: 380, 3: 560, 4: 720, 5: 880 }

const LAYER_BANDS = [
  { y: 30, h: 120, label: "Consumer", color: "rgba(180,83,9,0.03)", border: "rgba(180,83,9,0.15)" },
  { y: 190, h: 120, label: "Agent Layer", color: "rgba(109,40,217,0.03)", border: "rgba(109,40,217,0.15)" },
  { y: 350, h: 120, label: "Trust & Payment Network", color: "rgba(29,78,216,0.03)", border: "rgba(29,78,216,0.15)" },
  { y: 510, h: 460, label: "Payment Rails & Merchant", color: "rgba(6,95,70,0.03)", border: "rgba(6,95,70,0.12)" },
]

const EDGE_STYLE = {
  delegate: { stroke: "#c8b8a2", glow: "#d4c4ae", dash: "5 4", label: "#a89880", animDur: "4s", dotR: 2.5 },
  identity: { stroke: "#7c3aed", glow: "#7c3aed", dash: "none", label: "#5b21b6", animDur: "2.2s", dotR: 2.5 },
  payment: { stroke: "#2563eb", glow: "#2563eb", dash: "none", label: "#1d4ed8", animDur: "1.9s", dotR: 2.5 },
  response: { stroke: "#059669", glow: "#059669", dash: "4 3", label: "#047857", animDur: "2.7s", dotR: 2 },
}

// ─── Layout ────────────────────────────────────────────────────────────────
const COL_X = { 0: 120, 1: 360, 2: 600 }
const NODE_W = 190
const NODE_H = 68
const SVG_W = 800
const SVG_H = 1000

function cx(a) { return COL_X[a.col] + a.xOffset + NODE_W / 2 }
function cy(a) { return LAYER_Y[a.layer] + NODE_H / 2 }

function getEdge(fromId, toId) {
  const fa = ACTORS[fromId], ta = ACTORS[toId]
  const fx = cx(fa), fy = cy(fa)
  const tx = cx(ta), ty = cy(ta)
  const dx = tx - fx, dy = ty - fy

  let x1 = fx, y1 = fy, x2 = tx, y2 = ty
  
  // Connect to top/bottom or left/right depending on primary direction
  if (Math.abs(dy) > Math.abs(dx) * 0.4) {
    y1 = dy > 0 ? fy + NODE_H / 2 : fy - NODE_H / 2
    y2 = dy > 0 ? ty - NODE_H / 2 : ty + NODE_H / 2
  } else {
    x1 = dx > 0 ? fx + NODE_W / 2 : fx - NODE_W / 2
    x2 = dx > 0 ? tx - NODE_W / 2 : tx + NODE_W / 2
  }

  // Prevent overlap for bidirectional Vic/Issuer lines
  const isVicIssuer = (fromId === "vic" && toId === "issuer") || (fromId === "issuer" && toId === "vic")
  if (isVicIssuer) {
    if (fromId === "vic") { x1 -= 16; x2 -= 16 }
    else { x1 += 16; x2 += 16 }
  }

  // Calculate smooth Bezier control points
  const tension = 0.45;
  const c1x = x1, c1y = y1 + (y2 - y1) * tension;
  const c2x = x2, c2y = y2 - (y2 - y1) * tension;
  
  const d = `M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`
  
  // Calculate a reasonable midpoint for the label pill
  const t = 0.5; // Midpoint of bezier
  const mx = Math.pow(1-t, 3)*x1 + 3*Math.pow(1-t, 2)*t*c1x + 3*(1-t)*Math.pow(t, 2)*c2x + Math.pow(t, 3)*x2;
  const my = Math.pow(1-t, 3)*y1 + 3*Math.pow(1-t, 2)*t*c1y + 3*(1-t)*Math.pow(t, 2)*c2y + Math.pow(t, 3)*y2;

  return { mx, my, d }
}

// ─── Icon paths ────────────────────────────────────────────
const ICON = {
  consumer: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  agent: "M4 6h2V4H4v2zm4 0h2V4H8v2zm4 0h2V4h-2v2zm4 0h2V4h-2v2zM4 10h2V8H4v2zm4 0h2V8H8v2zm4 0h2V8h-2v2zm4 0h2V8h-2v2zM4 14h2v-2H4v2zm4 0h2v-2H8v2zm4 0h2v-2h-2v2zm4 0h2v-2h-2v2zM2 4v16h20V4H2zm18 14H4V6h16v12z",
  wallet: "M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z",
  tap: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4.9l5 2.23V11c0 3.12-2.09 6.04-5 7.09-2.91-1.05-5-3.97-5-7.09V7.9l5-2.23z",
  vic: "M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z",
  issuer: "M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zM11.5 1L2 6v2h19V6l-9.5-5z",
  acquirer: "M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-9-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-6v11c0 1.1-.9 2-2 2H4v-2h17V7h2z",
  merchant: "M19 6H17C17 3.24 14.76 1 12 1S7 3.24 7 6H5C3.9 6 3 6.9 3 8V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V8C21 6.9 20.1 6 19 6ZM12 3C13.65 3 15 4.35 15 6H9C9 4.35 10.35 3 12 3ZM12 13C10.35 13 9 11.65 9 10H11C11 10.55 11.45 11 12 11S13 10.55 13 10H15C15 11.65 13.65 13 12 13Z",
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function AgenticArchitecture() {
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  
  const detail = selected ? DETAILS[selected] : null
  const selActor = selected ? ACTORS[selected] : null
  const selAccent = selected ? NODE_ACCENT[selected] : null

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        background: "#faf9f6",
        borderRadius: 16,
        border: "1px solid #ddd8ce",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(60,50,30,0.05), 0 24px 48px rgba(60,50,30,0.08)",
        width: "100vw",
        maxWidth: 1100,
        position: "relative",
        left: "50%",
        transform: "translateX(-50%)",
        margin: "3rem 0",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "24px 32px",
          borderBottom: "1px solid #e8e3da",
          background: "linear-gradient(to bottom, #fcfbf9, #f5f2ec)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#a89880", fontFamily: "ui-monospace, monospace", marginBottom: 6 }}>
            Agentic Commerce · System Architecture
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1814", letterSpacing: "-0.03em" }}>
            How an AI agent pays for something
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", gap: 14 }}>
            {Object.entries(EDGE_STYLE).map(([type, es]) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="24" height="10" style={{ overflow: "visible" }}>
                  <line x1="0" y1="5" x2="20" y2="5" stroke={es.stroke} strokeWidth="2" strokeDasharray={es.dash} />
                  <polygon points="18,2 23,5 18,8" fill={es.stroke} />
                </svg>
                <span style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#8a7868", letterSpacing: "0.05em" }}>
                  {type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", height: 750 }}>
        {/* ── SVG ── */}
        <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", position: "relative" }}>
          <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: "block" }}>
            <defs>
              {Object.entries(EDGE_STYLE).map(([type, es]) => (
                <marker key={type} id={`arr-${type}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M1 1.5L6.5 4L1 6.5" fill="none" stroke={es.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              ))}
              <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.1" />
              </filter>
              <filter id="edge-glow" x="-40%" y="-300%" width="180%" height="700%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <pattern id="dotgrid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#ddd8ce" opacity="0.6" />
              </pattern>
            </defs>

            <rect width={SVG_W} height={SVG_H} fill="#faf9f6" />
            <rect width={SVG_W} height={SVG_H} fill="url(#dotgrid)" />

            {/* ── Layer bands ── */}
            {LAYER_BANDS.map((band, i) => (
              <g key={i}>
                <rect x={20} y={band.y} width={SVG_W - 40} height={band.h} rx={12} fill={band.color} stroke={band.border} strokeWidth={1} strokeDasharray="4 4" />
                <text x={40} y={band.y + 18} style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", fill: band.border, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
                  {band.label}
                </text>
              </g>
            ))}

            {/* ── Connections ── */}
            {CONNECTIONS.map((conn, i) => {
              const { d, mx, my } = getEdge(conn.from, conn.to)
              const es = EDGE_STYLE[conn.type]
              const isRelated = selected && (conn.from === selected || conn.to === selected)
              const isFaded = selected && !isRelated
              
              // Dynamic pill width based on text length
              const pillWidth = Math.max(90, conn.label.length * 5.8 + 20);
              
              return (
                <g key={i} style={{ opacity: isFaded ? 0.08 : 1, transition: "opacity 0.3s" }}>
                  {isRelated && <path d={d} fill="none" stroke={es.glow} strokeWidth={6} strokeOpacity={0.2} filter="url(#edge-glow)" />}
                  
                  <path d={d} fill="none" stroke={es.stroke} strokeWidth={isRelated ? 2 : 1.3} strokeDasharray={es.dash} strokeOpacity={isRelated ? 1 : 0.7} markerEnd={`url(#arr-${conn.type})`} style={{ transition: "stroke-width 0.2s" }} />
                  
                  {!isFaded && (
                    <circle r={isRelated ? es.dotR + 1 : es.dotR} fill={es.stroke} opacity={isRelated ? 1 : 0.5}>
                      <animateMotion dur={isRelated ? String(parseFloat(es.animDur) * 0.6) + "s" : es.animDur} repeatCount="indefinite" begin={`${i * 0.4}s`}>
                        <mpath href={`#ep-${i}`} />
                      </animateMotion>
                    </circle>
                  )}
                  <path id={`ep-${i}`} d={d} fill="none" stroke="none" />
                  
                  <g style={{ opacity: isFaded ? 0 : 1, transition: "opacity 0.2s" }}>
                    <rect x={mx - pillWidth / 2} y={my - 11} width={pillWidth} height={22} rx={6} fill={isRelated ? "#ffffff" : "#faf9f6"} stroke={isRelated ? es.stroke : "#ddd8ce"} strokeWidth={isRelated ? 1.5 : 1} />
                    <text x={mx} y={my + 0.5} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9.5, fontFamily: "ui-monospace, monospace", fill: isRelated ? es.label : "#8a7868", letterSpacing: "0.02em", fontWeight: isRelated ? 600 : 400 }}>
                      {conn.label}
                    </text>
                  </g>
                </g>
              )
            })}

            {/* ── Nodes ── */}
            {Object.values(ACTORS).map((actor) => {
              const x = COL_X[actor.col] + actor.xOffset
              const y = LAYER_Y[actor.layer]
              const accent = NODE_ACCENT[actor.id]
              const tint = NODE_ICON_TINT[actor.id]
              const isSel = selected === actor.id
              const isHov = hovered === actor.id
              const isFade = selected && !isSel

              return (
                <g
                  key={actor.id}
                  onClick={() => setSelected(selected === actor.id ? null : actor.id)}
                  onMouseEnter={() => setHovered(actor.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "pointer", opacity: isFade ? 0.25 : 1, transition: "opacity 0.3s, transform 0.2s", transformOrigin: `${x + NODE_W/2}px ${y + NODE_H/2}px`, transform: isHov && !isSel ? "scale(1.02)" : "scale(1)" }}
                >
                  {isSel && <rect x={x - 6} y={y - 6} width={NODE_W + 12} height={NODE_H + 12} rx={16} fill="none" stroke={accent} strokeWidth={2} strokeOpacity={0.4} />}
                  
                  <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={12} fill={isSel ? "#ffffff" : isHov ? "#ffffff" : "#fdfcf9"} stroke={isSel ? accent : isHov ? "#ccc5b8" : "#ddd8ce"} strokeWidth={isSel ? 2 : 1} filter={isSel || isHov ? "url(#node-shadow)" : undefined} style={{ transition: "all 0.2s" }} />
                  
                  <rect x={x + 1} y={y + 1} width={NODE_W - 2} height={4} rx={3} fill={accent} fillOpacity={isSel ? 1 : isHov ? 0.8 : 0.6} />
                  
                  <g transform={`translate(${x + 16}, ${y + NODE_H / 2 - 10}) scale(0.85)`}>
                    <path d={ICON[actor.id]} fill={tint} opacity={isSel ? 1 : isHov ? 0.8 : 0.5} />
                  </g>
                  
                  <text x={x + 44} y={y + 28} dominantBaseline="central" style={{ fontSize: 13, fontWeight: 700, fontFamily: "system-ui, sans-serif", fill: isSel ? "#1a1410" : isHov ? "#2a2218" : "#3a3028", letterSpacing: "-0.01em" }}>
                    {actor.label}
                  </text>
                  
                  <text x={x + 44} y={y + 48} dominantBaseline="central" style={{ fontSize: 9, fontFamily: "ui-monospace, monospace", fill: isSel ? "#8a7868" : "#a89880" }}>
                    {actor.sub}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* ── Detail Panel ── */}
        <div style={{ width: 280, borderLeft: "1px solid #e8e3da", background: "#f8f6f2", padding: "28px 24px", flexShrink: 0, overflowY: "auto", boxShadow: "-4px 0 16px rgba(0,0,0,0.02)" }}>
          {detail && selActor ? (
            <div style={{ animation: "fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 4, height: 36, background: selAccent, borderRadius: 2 }} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1410" }}>{selActor.label}</div>
                  <div style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#a89880", marginTop: 4 }}>{selActor.sub}</div>
                </div>
              </div>
              
              <p style={{ fontSize: 13, color: "#4a4038", lineHeight: 1.6, margin: "0 0 20px" }}>{detail.body}</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {detail.facts.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(255,255,255,0.5)", padding: "8px 10px", borderRadius: 8, border: "1px solid #efeae0" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: selAccent, marginTop: 4, flexShrink: 0 }} />
                    <div style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#6a5e54", lineHeight: 1.4 }}>{f}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #e8e3da" }}>
                <div style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#a89880", marginBottom: 12, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>Related Connections</div>
                {CONNECTIONS.filter((c) => c.from === selected || c.to === selected).map((c, i) => {
                  const es = EDGE_STYLE[c.type]
                  const other = c.from === selected ? c.to : c.from
                  const dir = c.from === selected ? "→" : "←"
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 24, height: 2, background: es.stroke, borderRadius: 1 }} />
                      <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#6a5e54" }}>{dir} {ACTORS[other].label}</span>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={() => setSelected(null)}
                style={{ marginTop: 24, fontSize: 12, fontWeight: 600, color: "#6a5e54", border: "1px solid #d8d3c8", background: "#ffffff", borderRadius: 8, padding: "8px 16px", cursor: "pointer", width: "100%", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                onMouseEnter={(e) => { e.target.style.borderColor = "#b8a898"; e.target.style.background = "#faf9f6" }}
                onMouseLeave={(e) => { e.target.style.borderColor = "#d8d3c8"; e.target.style.background = "#ffffff" }}
              >
                Clear Selection
              </button>
            </div>
          ) : (
            <div style={{ animation: "fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
              <div style={{ fontSize: 12, fontFamily: "ui-monospace, monospace", color: "#a89880", marginBottom: 24, lineHeight: 1.6 }}>
                Click any architecture node to inspect its specific role and security facts.
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.values(ACTORS).map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setSelected(a.id)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#ede8e0")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" }}
                  >
                    <div style={{ width: 4, height: 24, background: NODE_ACCENT[a.id], borderRadius: 2 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#4a4038" }}>{a.label}</div>
                      <div style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#a89880" }}>{a.sub.split("·")[0].trim()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Custom scrollbar for webkit to keep the elegant aesthetic */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d8d3c8; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #b8a898; }
      `}</style>
    </div>
  )
}