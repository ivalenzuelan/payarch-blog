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

// ─── Visual Config ─────────────────────────────────────────────────────────

const NODE_ACCENT = {
  consumer: "#b45309",
  agent:    "#6d28d9",
  wallet:   "#6d28d9",
  tap:      "#1d4ed8",
  vic:      "#1d4ed8",
  issuer:   "#065f46",
  acquirer: "#065f46",
  merchant: "#b45309",
}

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

const LAYER_BANDS = [
  { y: 20,  h: 130, label: "Consumer",                color: "rgba(180,83,9,0.05)",  border: "rgba(180,83,9,0.18)"   },
  { y: 166, h: 130, label: "Agent Layer",             color: "rgba(109,40,217,0.05)", border: "rgba(109,40,217,0.18)" },
  { y: 312, h: 130, label: "Trust & Payment Network", color: "rgba(29,78,216,0.05)", border: "rgba(29,78,216,0.18)"  },
  { y: 458, h: 460, label: "Payment Rails & Merchant",color: "rgba(6,95,70,0.05)",   border: "rgba(6,95,70,0.15)"    },
]

const EDGE_STYLE = {
  delegate: { stroke: "#c8b8a2", dash: "5 4",  label: "#a89880" },
  identity: { stroke: "#7c3aed", dash: "none", label: "#5b21b6" },
  payment:  { stroke: "#2563eb", dash: "none", label: "#1d4ed8" },
  response: { stroke: "#059669", dash: "4 3",  label: "#047857" },
}

// ─── Layout ────────────────────────────────────────────────────────────────

const COL_X   = { 0: 58,  1: 278, 2: 498 }
const LAYER_Y = { 0: 50,  1: 196, 2: 342, 3: 493, 4: 653, 5: 813 }
const NODE_W  = 202
const NODE_H  = 70
const SVG_W   = 760
const SVG_H   = 940

function cx(a) { return COL_X[a.col] + NODE_W / 2 }
function cy(a) { return LAYER_Y[a.layer] + NODE_H / 2 }

function getEdge(fromId, toId) {
  const fa = ACTORS[fromId], ta = ACTORS[toId]
  const fx = cx(fa), fy = cy(fa)
  const tx = cx(ta), ty = cy(ta)

  return {
    d: `M${fx},${fy} L${tx},${ty}`,
    mx: (fx + tx) / 2,
    my: (fy + ty) / 2
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function AgenticArchitecture() {
  const [selected, setSelected] = useState(null)

  return (
    <div style={{
      fontFamily: "system-ui",
      background: "#faf9f6",
      borderRadius: 14,
      border: "1px solid #ddd8ce",
      overflow: "hidden",
      width: "100%",
      maxWidth: 1040,
      margin: "2rem auto",
    }}>

      <div style={{ padding: 20 }}>
        <h2 style={{ margin: 0 }}>Agentic Commerce Architecture</h2>
      </div>

      <svg width={SVG_W} height={SVG_H}>

        {/* Layers */}
        {LAYER_BANDS.map((band, i) => (
          <rect key={i}
            x={10}
            y={band.y}
            width={SVG_W - 20}
            height={band.h}
            fill={band.color}
            stroke={band.border}
          />
        ))}

        {/* Edges */}
        {CONNECTIONS.map((c, i) => {
          const { d } = getEdge(c.from, c.to)
          const style = EDGE_STYLE[c.type]
          return (
            <path
              key={i}
              d={d}
              stroke={style.stroke}
              strokeWidth={1.5}
              strokeDasharray={style.dash}
              fill="none"
            />
          )
        })}

        {/* Nodes */}
        {Object.values(ACTORS).map(a => {
          const x = COL_X[a.col]
          const y = LAYER_Y[a.layer]

          return (
            <g key={a.id} onClick={() => setSelected(a.id)} style={{ cursor: "pointer" }}>
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill="#fff"
                stroke={NODE_ACCENT[a.id]}
              />
              <text x={x + 10} y={y + 30} fontSize={12} fontWeight="bold">
                {a.label}
              </text>
              <text x={x + 10} y={y + 50} fontSize={9}>
                {a.sub}
              </text>
            </g>
          )
        })}

      </svg>
    </div>
  )
}