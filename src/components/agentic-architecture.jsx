import { useState } from "react"

// ─── Data ──────────────────────────────────────────────────────────────────

const ACTORS = {
  consumer: { id: "consumer", label: "Consumer",                  sub: "Sets spending policy once",             layer: 0, col: 1 },
  agent:    { id: "agent",    label: "AI Agent",                  sub: "Skyfire · Claude · GPT-4o",             layer: 1, col: 0 },
  wallet:   { id: "wallet",   label: "AgentWallet",               sub: "Visa VCN · spend limits · passkey",     layer: 1, col: 2 },
  tap:      { id: "tap",      label: "Trusted Agent Protocol",    sub: "Visa + Cloudflare · Ed25519 · 90s JWT", layer: 2, col: 0 },
  vic:      { id: "vic",      label: "Visa Intelligent Commerce", sub: "VIC · VisaNet · Token Service",         layer: 2, col: 2 },
  issuer:   { id: "issuer",   label: "Issuer Bank",               sub: "Chase · Amex · Barclays",               layer: 3, col: 2 },
  acquirer: { id: "acquirer", label: "Acquirer",                  sub: "Stripe · Adyen · Fiserv",               layer: 4, col: 1 },
  merchant: { id: "merchant", label: "Merchant",                  sub: "Bose.com · Shopify · Jomashop",         layer: 5, col: 0 },
}

const CONNECTIONS = [
  { from: "consumer", to: "agent",    label: "delegates intent",    type: "delegate" },
  { from: "consumer", to: "wallet",   label: "pre-authorizes",      type: "delegate" },
  { from: "agent",    to: "tap",      label: "signs · Ed25519",     type: "identity" },
  { from: "wallet",   to: "vic",      label: "tokenized VCN",       type: "payment"  },
  { from: "tap",      to: "vic",      label: "TAP JWT · pi-abc123", type: "identity" },
  { from: "tap",      to: "merchant", label: "credential · SDK",    type: "identity" },
  { from: "merchant", to: "acquirer", label: "PaymentIntent",       type: "payment"  },
  { from: "acquirer", to: "vic",      label: "ISO 8583 · F022=81",  type: "payment"  },
  { from: "vic",      to: "issuer",   label: "MTI 0100 · F022=81",  type: "payment"  },
  { from: "issuer",   to: "vic",      label: "MTI 0110 · F039=00",  type: "response" },
]

const DETAILS = {
  consumer: {
    body: "Sets spending policy once at enrollment — category limits, per-transaction cap, velocity controls. Creates a FIDO2 Passkey. The agent then operates autonomously within those guardrails.",
    facts: ["One-time FIDO2 Passkey setup", "Configures spend policy: category + limit", "Receives push notification after purchase"],
  },
  agent: {
    body: "The LLM runtime that interprets natural language intent and executes tool calls. Holds the consumer's DID credential. Registers with Visa's TAP key directory for a stable agent identity.",
    facts: ["Skyfire KYAPay · Claude · GPT-4o", "Ed25519 key pair registered with Visa TAP", "Tool calls: browse · search · pay"],
  },
  wallet: {
    body: "A Virtual Card Number issued by Visa Token Service and bound exclusively to this agent. The real PAN never leaves Visa's systems. The token activates only when the consumer authenticates via Passkey.",
    facts: ["Agent-specific VCN — not real PAN", "Bound to agent_id — cannot be reused", "Passkey-activated per instruction"],
  },
  tap: {
    body: "The identity layer. Built on HTTP Message Signatures (RFC 9421) and Cloudflare Web Bot Auth. Verifies the agent is registered, the signature is valid, the nonce is unused, and the request is within 60 seconds.",
    facts: ["HTTP Message Signatures · RFC 9421", "Cloudflare + Akamai behavioral layer", "Ed25519 key directory at tap.visa.com"],
  },
  vic: {
    body: "The payment infrastructure layer. Tokenization, payment instructions, authentication, personalization, and commerce signals. VisaNet routes the ISO 8583 message with F022=81 to the issuer.",
    facts: ["VIC APIs · VisaNet · Token Service", "F022=81 triggers agent risk rules", "github.com/visa/mcp — open source MCP"],
  },
  issuer: {
    body: "Sees F022=81 in the authorization request and loads the agent spending policy instead of the human fraud model. Validates balance, limit, merchant category, daily velocity, and token status.",
    facts: ["F022=81 → agent spending policy loaded", "Checks limit · category · velocity", "Dispute window: 120 days"],
  },
  acquirer: {
    body: "Packages the tokenized payment into ISO 8583. Sets F022=81, appends agent-id in F048, and places the TAP instruction reference hash in F126. Sends to VisaNet.",
    facts: ["Stripe · Adyen · Fiserv · Worldpay", "ISO 8583: F002=VCN · F022=81 · F126=TAP", "Settlement: T+1 clearing"],
  },
  merchant: {
    body: "Receives the agent's checkout request with Authorization: TAP-1.0 header. The TAP SDK validates the JWT locally in under 5ms — no external call needed. consumer_recognized=true skips onboarding.",
    facts: ["No-code TAP SDK embed", "JWT validation: <5ms · no external call", "consumer_recognized → skip onboarding"],
  },
}

// ─── Visual Config ─────────────────────────────────────────────────────────

// Per-actor accent colour (warm, readable on light background)
const NODE_ACCENT = {
  consumer: "#b45309",  // amber-700
  agent:    "#6d28d9",  // violet-700
  wallet:   "#6d28d9",
  tap:      "#1d4ed8",  // blue-700
  vic:      "#1d4ed8",
  issuer:   "#065f46",  // emerald-800
  acquirer: "#065f46",
  merchant: "#b45309",
}

// Lighter icon tint used inside node
const NODE_ICON_TINT = {
  consumer: "#d97706",
  agent:    "#7c3aed",
  wallet:   "#7c3aed",
  tap:      "#2563eb",
  vic:      "#2563eb",
  issuer:   "#059669",
  acquirer: "#059669",
  merchant: "#d97706",
}

// Layer band fills + labels
const LAYER_BANDS = [
  { y: 22,  h: 106, label: "Consumer",                color: "rgba(180,83,9,0.05)",  border: "rgba(180,83,9,0.18)"   },
  { y: 138, h: 118, label: "Agent Layer",              color: "rgba(109,40,217,0.05)", border: "rgba(109,40,217,0.18)" },
  { y: 266, h: 118, label: "Trust & Payment Network",  color: "rgba(29,78,216,0.05)", border: "rgba(29,78,216,0.18)"  },
  { y: 394, h: 310, label: "Payment Rails & Merchant", color: "rgba(6,95,70,0.05)",   border: "rgba(6,95,70,0.15)"    },
]

// Edge types
const EDGE_STYLE = {
  delegate: { stroke: "#c8b8a2", glow: "#d4c4ae", dash: "5 4",  label: "#a89880", animDur: "4s",   dotR: 2.5 },
  identity: { stroke: "#7c3aed", glow: "#7c3aed", dash: "none", label: "#5b21b6", animDur: "2.2s", dotR: 2.5 },
  payment:  { stroke: "#2563eb", glow: "#2563eb", dash: "none", label: "#1d4ed8", animDur: "1.9s", dotR: 2.5 },
  response: { stroke: "#059669", glow: "#059669", dash: "4 3",  label: "#047857", animDur: "2.7s", dotR: 2   },
}

// ─── Layout ────────────────────────────────────────────────────────────────

const COL_X   = { 0: 58,  1: 278, 2: 498 }
const LAYER_Y = { 0: 38,  1: 150, 2: 278, 3: 410, 4: 508, 5: 606 }
const NODE_W  = 202
const NODE_H  = 70
const SVG_W   = 760
const SVG_H   = 718

function cx(a) { return COL_X[a.col]    + NODE_W / 2 }
function cy(a) { return LAYER_Y[a.layer] + NODE_H / 2 }

function getEdge(fromId, toId) {
  const fa = ACTORS[fromId], ta = ACTORS[toId]
  const fx = cx(fa), fy = cy(fa)
  const tx = cx(ta), ty = cy(ta)
  const dx = tx - fx, dy = ty - fy
  let x1 = fx, y1 = fy, x2 = tx, y2 = ty

  const isVertical = fa.layer !== ta.layer;
  const isVicIssuer = (fromId === "vic" && toId === "issuer") || (fromId === "issuer" && toId === "vic");

  if (isVertical) {
    y1 = dy > 0 ? fy + NODE_H / 2 : fy - NODE_H / 2
    y2 = dy > 0 ? ty - NODE_H / 2 : ty + NODE_H / 2
    
    // Offset bidirectional edges to prevent overlaps
    if (isVicIssuer) {
      if (dy > 0) {
        x1 -= 20; x2 -= 20;
      } else {
        x1 += 20; x2 += 20;
      }
    }
  } else {
    x1 = dx > 0 ? fx + NODE_W / 2 : fx - NODE_W / 2
    x2 = dx > 0 ? tx - NODE_W / 2 : tx + NODE_W / 2
  }

  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const d = isVertical
    ? `M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}`
    : `M${x1},${y1} L${x2},${y2}`

  return { mx, my, d }
}

// ─── Icon paths (24×24 viewBox) ────────────────────────────────────────────

const ICON = {
  consumer: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  agent:    "M4 6h2V4H4v2zm4 0h2V4H8v2zm4 0h2V4h-2v2zm4 0h2V4h-2v2zM4 10h2V8H4v2zm4 0h2V8H8v2zm4 0h2V8h-2v2zm4 0h2V8h-2v2zM4 14h2v-2H4v2zm4 0h2v-2H8v2zm4 0h2v-2h-2v2zm4 0h2v-2h-2v2zM2 4v16h20V4H2zm18 14H4V6h16v12z",
  wallet:   "M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z",
  tap:      "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4.9l5 2.23V11c0 3.12-2.09 6.04-5 7.09-2.91-1.05-5-3.97-5-7.09V7.9l5-2.23z",
  vic:      "M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z",
  issuer:   "M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zM11.5 1L2 6v2h19V6l-9.5-5z",
  acquirer: "M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-9-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-6v11c0 1.1-.9 2-2 2H4v-2h17V7h2z",
  merchant: "M19 6H17C17 3.24 14.76 1 12 1S7 3.24 7 6H5C3.9 6 3 6.9 3 8V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V8C21 6.9 20.1 6 19 6ZM12 3C13.65 3 15 4.35 15 6H9C9 4.35 10.35 3 12 3ZM12 13C10.35 13 9 11.65 9 10H11C11 10.55 11.45 11 12 11S13 10.55 13 10H15C15 11.65 13.65 13 12 13Z",
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function AgenticArchitecture() {
  const [selected, setSelected] = useState(null)
  const [hovered,  setHovered]  = useState(null)

  const detail    = selected ? DETAILS[selected]    : null
  const selActor  = selected ? ACTORS[selected]     : null
  const selAccent = selected ? NODE_ACCENT[selected]: null

  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      background: "#faf9f6",
      borderRadius: 14,
      border: "1px solid #ddd8ce",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(60,50,30,0.07), 0 12px 32px rgba(60,50,30,0.06)",
      width: "100vw",
      maxWidth: 1040,
      position: "relative",
      left: "50%",
      transform: "translateX(-50%)",
      margin: "2.5rem 0",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: "18px 28px 15px",
        borderBottom: "1px solid #e8e3da",
        background: "#f5f2ec",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.13em", textTransform: "uppercase", color: "#a89880", fontFamily: "ui-monospace, 'Courier New', monospace", marginBottom: 5 }}>
            Agentic Commerce · System Architecture
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#2a2218", letterSpacing: "-0.02em", lineHeight: 1 }}>
            How an AI agent pays for something
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {Object.entries(EDGE_STYLE).map(([type, es]) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="22" height="10" style={{ overflow: "visible" }}>
                  <line x1="0" y1="5" x2="18" y2="5" stroke={es.stroke} strokeWidth="1.5" strokeDasharray={es.dash} />
                  <polygon points="16,2.5 20,5 16,7.5" fill={es.stroke} />
                </svg>
                <span style={{ fontSize: 9, fontFamily: "ui-monospace, monospace", color: "#a89880", letterSpacing: "0.05em" }}>{type}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#c8b8a2" }}>
            8 actors · 10 connections · ~1,100ms end to end
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex" }}>

        {/* ── SVG ── */}
        <div style={{ flex: 1, overflowX: "auto" }}>
          <svg
            width={SVG_W}
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ display: "block" }}
          >
            <defs>
              {/* Arrowheads */}
              {Object.entries(EDGE_STYLE).map(([type, es]) => (
                <marker key={type} id={`arr-${type}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M1 1.5L6.5 4L1 6.5" fill="none" stroke={es.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              ))}
              {/* Subtle drop shadow for selected nodes */}
              <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.12" />
              </filter>
              {/* Glow for selected edges */}
              <filter id="edge-glow" x="-40%" y="-300%" width="180%" height="700%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Very faint dot grid */}
              <pattern id="dotgrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.8" fill="#ddd8ce" opacity="0.5" />
              </pattern>
            </defs>

            {/* Background */}
            <rect width={SVG_W} height={SVG_H} fill="#faf9f6" />
            <rect width={SVG_W} height={SVG_H} fill="url(#dotgrid)" />

            {/* ── Layer bands ── */}
            {LAYER_BANDS.map((band, i) => (
              <g key={i}>
                <rect
                  x={14} y={band.y}
                  width={SVG_W - 28} height={band.h}
                  rx={8}
                  fill={band.color}
                  stroke={band.border}
                  strokeWidth={1}
                />
                <text
                  x={30} y={band.y + 13}
                  style={{ fontSize: 8.5, fontFamily: "ui-monospace, monospace", fill: band.border, letterSpacing: "0.1em", textTransform: "uppercase" }}
                >
                  {band.label}
                </text>
              </g>
            ))}

            {/* ── Connections ── */}
            {CONNECTIONS.map((conn, i) => {
              const { d, mx, my } = getEdge(conn.from, conn.to)
              const es = EDGE_STYLE[conn.type]
              const isRelated = selected && (conn.from === selected || conn.to === selected)
              const isFaded   = selected && !isRelated
              const showDot   = !isFaded

              return (
                <g key={i} style={{ opacity: isFaded ? 0.1 : 1, transition: "opacity 0.25s" }}>
                  {/* Glow behind active edges */}
                  {isRelated && (
                    <path d={d} fill="none" stroke={es.glow} strokeWidth={5} strokeOpacity={0.15} filter="url(#edge-glow)" />
                  )}

                  {/* Main line */}
                  <path
                    d={d}
                    fill="none"
                    stroke={es.stroke}
                    strokeWidth={isRelated ? 1.8 : 1.1}
                    strokeDasharray={es.dash}
                    strokeOpacity={isRelated ? 1 : 0.6}
                    markerEnd={`url(#arr-${conn.type})`}
                    style={{ transition: "stroke-width 0.2s, stroke-opacity 0.2s" }}
                  />

                  {/* Animated flow dot */}
                  {showDot && (
                    <circle r={isRelated ? es.dotR + 0.5 : es.dotR} fill={es.stroke} opacity={isRelated ? 0.9 : 0.4}>
                      <animateMotion
                        dur={isRelated ? String(parseFloat(es.animDur) * 0.65) + "s" : es.animDur}
                        repeatCount="indefinite"
                        begin={`${i * 0.38}s`}
                      >
                        <mpath href={`#ep-${i}`} />
                      </animateMotion>
                    </circle>
                  )}
                  <path id={`ep-${i}`} d={d} fill="none" stroke="none" />

                  {/* Label pill */}
                  <g style={{ opacity: isFaded ? 0 : 1, transition: "opacity 0.2s" }}>
                    <rect
                      x={mx - 46} y={my - 9}
                      width={92} height={17}
                      rx={4}
                      fill={isRelated ? "#fffdf8" : "#faf9f6"}
                      stroke={isRelated ? es.stroke : "#ddd8ce"}
                      strokeWidth={isRelated ? 1 : 0.8}
                      strokeOpacity={isRelated ? 0.7 : 0.6}
                    />
                    <text
                      x={mx} y={my + 0.5}
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{
                        fontSize: 8,
                        fontFamily: "ui-monospace, monospace",
                        fill: isRelated ? es.label : "#a89880",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {conn.label}
                    </text>
                  </g>
                </g>
              )
            })}

            {/* ── Nodes ── */}
            {Object.values(ACTORS).map(actor => {
              const x      = COL_X[actor.col]
              const y      = LAYER_Y[actor.layer]
              const accent = NODE_ACCENT[actor.id]
              const tint   = NODE_ICON_TINT[actor.id]
              const isSel  = selected === actor.id
              const isHov  = hovered  === actor.id
              const isFade = selected && !isSel

              return (
                <g
                  key={actor.id}
                  onClick={() => setSelected(selected === actor.id ? null : actor.id)}
                  onMouseEnter={() => setHovered(actor.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "pointer", opacity: isFade ? 0.22 : 1, transition: "opacity 0.25s" }}
                >
                  {/* Selection ring */}
                  {isSel && (
                    <rect
                      x={x - 5} y={y - 5}
                      width={NODE_W + 10} height={NODE_H + 10}
                      rx={13}
                      fill="none"
                      stroke={accent}
                      strokeWidth={1.5}
                      strokeOpacity={0.35}
                    />
                  )}

                  {/* Node body */}
                  <rect
                    x={x} y={y}
                    width={NODE_W} height={NODE_H}
                    rx={9}
                    fill={isSel ? "#ffffff" : isHov ? "#fcfaf7" : "#fdfcf9"}
                    stroke={isSel ? accent : isHov ? "#ccc5b8" : "#ddd8ce"}
                    strokeWidth={isSel ? 1.5 : 1}
                    filter={isSel ? "url(#node-shadow)" : undefined}
                    style={{ transition: "fill 0.15s, stroke 0.15s" }}
                  />

                  {/* Top accent bar */}
                  <rect
                    x={x + 1} y={y}
                    width={NODE_W - 2} height={3}
                    rx={2}
                    fill={accent}
                    fillOpacity={isSel ? 1 : isHov ? 0.75 : 0.5}
                    style={{ transition: "fill-opacity 0.15s" }}
                  />

                  {/* Icon */}
                  <g transform={`translate(${x + 14}, ${y + NODE_H / 2 - 9}) scale(0.75)`}>
                    <path d={ICON[actor.id]} fill={tint} opacity={isSel ? 0.85 : isHov ? 0.65 : 0.45} style={{ transition: "opacity 0.15s" }} />
                  </g>

                  {/* Label */}
                  <text
                    x={x + 37} y={y + 27}
                    dominantBaseline="central"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "system-ui, sans-serif",
                      fill: isSel ? "#1a1410" : isHov ? "#2a2218" : "#3a3028",
                      letterSpacing: "-0.01em",
                      transition: "fill 0.15s",
                    }}
                  >
                    {actor.label}
                  </text>

                  {/* Sub-label */}
                  <text
                    x={x + 37} y={y + 46}
                    dominantBaseline="central"
                    style={{
                      fontSize: 8.5,
                      fontFamily: "ui-monospace, monospace",
                      fill: isSel ? "#8a7868" : "#b8a898",
                      letterSpacing: "0.01em",
                      transition: "fill 0.15s",
                    }}
                  >
                    {actor.sub}
                  </text>

                  {/* Hover cue dot */}
                  {!selected && (
                    <circle
                      cx={x + NODE_W - 13} cy={y + NODE_H / 2}
                      r={3}
                      fill={accent}
                      opacity={isHov ? 0.6 : 0.18}
                      style={{ transition: "opacity 0.15s" }}
                    />
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* ── Detail Panel ── */}
        <div style={{
          width: 236,
          borderLeft: "1px solid #e8e3da",
          background: "#f5f2ec",
          padding: "20px 18px",
          flexShrink: 0,
        }}>
          {detail && selActor ? (
            <div style={{ animation: "fadeUp 0.2s ease" }}>
              {/* Title */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 3, height: 28, background: selAccent, borderRadius: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1410", lineHeight: 1.2 }}>{selActor.label}</div>
                  <div style={{ fontSize: 9, fontFamily: "ui-monospace, monospace", color: "#a89880", marginTop: 2 }}>{selActor.sub}</div>
                </div>
              </div>

              {/* Body */}
              <p style={{ fontSize: 12, color: "#5a4f44", lineHeight: 1.75, margin: "0 0 16px" }}>
                {detail.body}
              </p>

              {/* Facts */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {detail.facts.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: selAccent, flexShrink: 0, marginTop: 4,
                    }} />
                    <div style={{ fontSize: 10.5, fontFamily: "ui-monospace, monospace", color: "#7a6e64", lineHeight: 1.55 }}>{f}</div>
                  </div>
                ))}
              </div>

              {/* Related connections */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e0dbd0" }}>
                <div style={{ fontSize: 9, fontFamily: "ui-monospace, monospace", color: "#c8b8a2", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Connections
                </div>
                {CONNECTIONS.filter(c => c.from === selected || c.to === selected).map((c, i) => {
                  const es    = EDGE_STYLE[c.type]
                  const other = c.from === selected ? c.to : c.from
                  const dir   = c.from === selected ? "→" : "←"
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                      <div style={{ width: 18, height: 1.5, background: es.stroke, borderRadius: 1, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#8a7868" }}>
                        {dir} {ACTORS[other].label}
                      </span>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={() => setSelected(null)}
                style={{
                  marginTop: 14,
                  fontSize: 10,
                  fontFamily: "ui-monospace, monospace",
                  color: "#a89880",
                  border: "1px solid #d8d3c8",
                  background: "transparent",
                  borderRadius: 6,
                  padding: "5px 12px",
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  width: "100%",
                }}
                onMouseEnter={e => { e.target.style.borderColor = "#b8a898"; e.target.style.color = "#6a5e54" }}
                onMouseLeave={e => { e.target.style.borderColor = "#d8d3c8"; e.target.style.color = "#a89880" }}
              >
                ← deselect
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#c8b8a2", marginBottom: 18, lineHeight: 1.65 }}>
                Click any node to inspect its role and connections.
              </div>

              {/* Actor index */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {Object.values(ACTORS).map(a => (
                  <div
                    key={a.id}
                    onClick={() => setSelected(a.id)}
                    onMouseEnter={e => e.currentTarget.style.background = "#ede8e0"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 6, cursor: "pointer", transition: "background 0.12s" }}
                  >
                    <div style={{ width: 3, height: 22, background: NODE_ACCENT[a.id], borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "#4a4038" }}>{a.label}</div>
                      <div style={{ fontSize: 9, fontFamily: "ui-monospace, monospace", color: "#c8b8a2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #e0dbd0" }}>
                {[["~1,100ms", "end to end"], ["T+1", "settlement"], ["F022=81", "agent flag"], ["zero", "consumer friction"]].map(([val, lbl]) => (
                  <div key={val} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#8a7868" }}>{val}</span>
                    <span style={{ fontSize: 9,  fontFamily: "ui-monospace, monospace", color: "#c8b8a2" }}>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  )
}
