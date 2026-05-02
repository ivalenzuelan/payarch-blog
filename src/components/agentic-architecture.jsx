import { agenticCheckoutE2E } from "../lib/core"
import { useEffect, useState } from "react"

const ACTOR_ORDER = ["consumer", "agent", "wallet", "keystore", "vic", "issuer", "acquirer", "merchant"]

const ACTOR_LAYOUT = {
  consumer: { id: "consumer", band: "Consumer", layer: 0, col: 1, label: "Consumer", sub: "Sets spending policy once" },
  agent: { id: "agent", band: "Agent Layer", layer: 1, col: 0, nodeId: "n-agent-runtime" },
  wallet: { id: "wallet", band: "Agent Layer", layer: 1, col: 2, nodeId: "n-agent-wallet" },
  keystore: { id: "keystore", band: "Trust & Payment Network", layer: 2, col: 0, nodeId: "n-tap", label: "Agent Key Registry", sub: "TAP · public keys · agent registry" },
  vic: { id: "vic", band: "Trust & Payment Network", layer: 2, col: 2, nodeId: "n-visa", label: "Visa Intelligent Commerce", sub: "VIC API · Visa Token Service" },
  issuer: { id: "issuer", band: "Payment Rails", layer: 3, col: 2, nodeId: "n-issuer" },
  acquirer: { id: "acquirer", band: "Payment Rails", layer: 4, col: 1, nodeId: "n-acquirer" },
  merchant: { id: "merchant", band: "Payment Rails", layer: 5, col: 0, nodeId: "n-merchant" },
}

const CONNECTION_SPECS = [
  { from: "consumer", to: "agent",    label: "delegates intent",       type: "delegate" },
  { from: "consumer", to: "wallet",   label: "passkey enrollment",     type: "delegate" },
  { from: "agent",    to: "vic",      label: "purchase instruction",   type: "api" },
  { from: "agent",    to: "merchant", edgeId: "e-agent-to-merchant",   type: "identity" },
  { from: "merchant", to: "keystore", label: "fetch agent public key", type: "identity" },
  { from: "merchant", to: "vic",      label: "retrieve credential",    type: "api" },
  { from: "merchant", to: "acquirer", edgeId: "e-merchant-to-acquirer", type: "payment" },
  { from: "acquirer", to: "vic",      edgeId: "e-acquirer-to-visa",    type: "payment" },
  { from: "vic",      to: "issuer",   edgeId: "e-visa-to-issuer",      type: "payment" },
  { from: "issuer",   to: "vic",      edgeId: "e-issuer-to-visa",      type: "response" },
  { from: "acquirer", to: "merchant", label: "approval",               type: "response" },
]

const NODE_ACCENT = {
  consumer: "var(--diagram-3)",
  agent: "var(--diagram-4)",
  wallet: "var(--diagram-4)",
  keystore: "var(--diagram-1)",
  vic: "var(--diagram-1)",
  issuer: "var(--success)",
  acquirer: "var(--success)",
  merchant: "var(--diagram-3)",
}

const NODE_ICON_TINT = {
  consumer: "var(--diagram-3)",
  agent: "var(--diagram-4)",
  wallet: "var(--diagram-4)",
  keystore: "var(--diagram-1)",
  vic: "var(--diagram-1)",
  issuer: "var(--success)",
  acquirer: "var(--success)",
  merchant: "var(--diagram-3)",
}

const LAYER_BANDS = [
  { y: 20, h: 130, label: "Consumer", color: "color-mix(in srgb, var(--diagram-3) 5%, transparent)", border: "color-mix(in srgb, var(--diagram-3) 18%, transparent)" },
  { y: 166, h: 130, label: "Agent Layer", color: "color-mix(in srgb, var(--diagram-4) 5%, transparent)", border: "color-mix(in srgb, var(--diagram-4) 18%, transparent)" },
  { y: 312, h: 130, label: "Trust & Payment Network", color: "color-mix(in srgb, var(--diagram-1) 5%, transparent)", border: "color-mix(in srgb, var(--diagram-1) 18%, transparent)" },
  { y: 458, h: 460, label: "Payment Rails & Merchant", color: "color-mix(in srgb, var(--success) 5%, transparent)", border: "color-mix(in srgb, var(--success) 15%, transparent)" },
]

const EDGE_STYLE = {
  delegate: { stroke: "var(--ink-400)", glow: "var(--ink-300)", dash: "5 4", label: "var(--ink-500)", animDur: "4s", dotR: 2.5 },
  api: { stroke: "var(--diagram-4)", glow: "var(--diagram-4)", dash: "none", label: "var(--diagram-4)", animDur: "1.8s", dotR: 2.5 },
  identity: { stroke: "var(--diagram-1)", glow: "var(--diagram-1)", dash: "none", label: "var(--diagram-1)", animDur: "2.2s", dotR: 2.5 },
  payment: { stroke: "var(--diagram-1)", glow: "var(--diagram-1)", dash: "none", label: "var(--diagram-1)", animDur: "1.9s", dotR: 2.5 },
  response: { stroke: "var(--success)", glow: "var(--success)", dash: "4 3", label: "var(--success)", animDur: "2.7s", dotR: 2 },
}

const COL_X = { 0: 58, 1: 278, 2: 498 }
const LAYER_Y = { 0: 50, 1: 196, 2: 342, 3: 493, 4: 653, 5: 813 }
const NODE_W = 202
const NODE_H = 70
const SVG_W = 760
const SVG_H = 940

const ICON = {
  consumer: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  agent: "M4 6h2V4H4v2zm4 0h2V4H8v2zm4 0h2V4h-2v2zm4 0h2V4h-2v2zM4 10h2V8H4v2zm4 0h2V8H8v2zm4 0h2V8h-2v2zm4 0h2V8h-2v2zM4 14h2v-2H4v2zm4 0h2v-2H8v2zm4 0h2v-2h-2v2zm4 0h2v-2h-2v2zM2 4v16h20V4H2zm18 14H4V6h16v12z",
  wallet: "M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z",
  keystore: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4.9l5 2.23V11c0 3.12-2.09 6.04-5 7.09-2.91-1.05-5-3.97-5-7.09V7.9l5-2.23z",
  vic: "M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z",
  issuer: "M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zM11.5 1L2 6v2h19V6l-9.5-5z",
  acquirer: "M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-9-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-6v11c0 1.1-.9 2-2 2H4v-2h17V7h2z",
  merchant: "M19 6H17C17 3.24 14.76 1 12 1S7 3.24 7 6H5C3.9 6 3 6.9 3 8V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V8C21 6.9 20.1 6 19 6ZM12 3C13.65 3 15 4.35 15 6H9C9 4.35 10.35 3 12 3ZM12 13C10.35 13 9 11.65 9 10H11C11 10.55 11.45 11 12 11S13 10.55 13 10H15C15 11.65 13.65 13 12 13Z",
}

function cx(actor) {
  return COL_X[actor.col] + NODE_W / 2
}

function cy(actor) {
  return LAYER_Y[actor.layer] + NODE_H / 2
}

function getNode(diagram, nodeId) {
  return diagram.nodes.find((node) => node.id === nodeId)
}

function getEdgeById(diagram, edgeId) {
  return diagram.edges.find((edge) => edge.id === edgeId)
}

function getStepText(node, stepId, layer = "business") {
  return node?.data?.steps?.[stepId]?.layerText?.[layer] ?? ""
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.length > 3
      ? `${value.slice(0, 3).join(" · ")} +${value.length - 3} more`
      : value.join(" · ")
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value)
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .slice(0, 3)
      .map(([key, entryValue]) => `${key}: ${formatValue(entryValue)}`)
      .join(" · ")
  }

  return ""
}

function propertyFact(node, key, label) {
  const value = node?.data?.properties?.[key]
  if (value == null) return null
  const formatted = formatValue(value)
  return formatted ? `${label}: ${formatted}` : null
}

function compactCategories(categories) {
  if (!Array.isArray(categories) || categories.length === 0) return null
  return categories.join(" · ")
}

function keyDirectoryHost(url) {
  if (typeof url !== "string") return null
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function getEdge(fromId, toId, actors) {
  const fromActor = actors[fromId]
  const toActor = actors[toId]
  const fx = cx(fromActor)
  const fy = cy(fromActor)
  const tx = cx(toActor)
  const ty = cy(toActor)
  const dy = ty - fy
  const dx = tx - fx
  let x1 = fx
  let y1 = fy
  let x2 = tx
  let y2 = ty

  const isVertical = fromActor.layer !== toActor.layer
  const isBidi =
    (fromId === "vic" && toId === "issuer") ||
    (fromId === "issuer" && toId === "vic") ||
    (fromId === "merchant" && toId === "acquirer") ||
    (fromId === "acquirer" && toId === "merchant")

  if (isVertical) {
    y1 = dy > 0 ? fy + NODE_H / 2 : fy - NODE_H / 2
    y2 = dy > 0 ? ty - NODE_H / 2 : ty + NODE_H / 2
    if (isBidi) {
      const offset = dy > 0 ? -20 : 20
      x1 += offset
      x2 += offset
    }
  } else {
    x1 = dx > 0 ? fx + NODE_W / 2 : fx - NODE_W / 2
    x2 = dx > 0 ? tx - NODE_W / 2 : tx + NODE_W / 2
  }

  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const d = isVertical
    ? `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`
    : `M${x1},${y1} L${x2},${y2}`

  return { d, mx, my }
}

function buildConsumerDetail(diagram) {
  const wallet = getNode(diagram, "n-agent-wallet")
  const props = wallet?.data?.properties ?? {}
  const categories = compactCategories(props.categories)

  return {
    body: `The consumer is present once, at enrollment, not during checkout. They provision the wallet with ${props.token_type ?? "an agent-specific payment credential"}, configure controls like ${props.spend_limit ?? "per-transaction limits"}${categories ? ` and category rules for ${categories}` : ""}, and bind the flow to a Passkey before the agent is allowed to spend.`,
    facts: [
      props.spend_limit ? `Per-transaction limit: ${props.spend_limit}` : null,
      categories ? `Allowed categories: ${categories}` : null,
      props.passkey_bound ? "Passkey required before instructions become spendable" : null,
    ].filter(Boolean),
  }
}

function buildDetails(diagram) {
  const agent = getNode(diagram, "n-agent-runtime")
  const wallet = getNode(diagram, "n-agent-wallet")
  const tap = getNode(diagram, "n-tap")
  const merchant = getNode(diagram, "n-merchant")
  const acquirer = getNode(diagram, "n-acquirer")
  const visa = getNode(diagram, "n-visa")
  const issuer = getNode(diagram, "n-issuer")

  const tapDirectoryHost = keyDirectoryHost(tap?.data?.properties?.key_directory)

  return {
    consumer: buildConsumerDetail(diagram),
    agent: {
      body: getStepText(agent, "consumer-intent", "business"),
      facts: [
        propertyFact(agent, "runtime", "Runtime"),
        propertyFact(agent, "identity_protocol", "Identity protocol"),
        propertyFact(agent, "tool_calls", "Tool calls"),
      ].filter(Boolean),
    },
    wallet: {
      body: getStepText(wallet, "consumer-intent", "business"),
      facts: [
        propertyFact(wallet, "token_type", "Credential"),
        propertyFact(wallet, "spend_limit", "Spend limit"),
        propertyFact(wallet, "provisioning", "Provisioning"),
      ].filter(Boolean),
    },
    keystore: {
      body: `${tap?.data?.label ?? "The TAP trust layer"} exposes the key directory${tapDirectoryHost ? ` at ${tapDirectoryHost}` : ""} so merchants and CDNs can fetch agent public keys, verify ${tap?.data?.properties?.algorithm ?? "agent signatures"}, and enforce ${tap?.data?.properties?.replay_protection ?? "replay protection"} before checkout traffic reaches payment rails.`,
      facts: [
        propertyFact(tap, "standard", "Standard"),
        propertyFact(tap, "algorithm", "Algorithm"),
        propertyFact(tap, "key_directory", "Key directory"),
      ].filter(Boolean),
    },
    vic: {
      body: getStepText(visa, "visanet-routes", "business"),
      facts: [
        propertyFact(visa, "platform", "Platform"),
        propertyFact(visa, "token_service", "Token service"),
        propertyFact(visa, "mcp_server", "Open source"),
      ].filter(Boolean),
    },
    issuer: {
      body: getStepText(issuer, "issuer-auth", "business"),
      facts: [
        propertyFact(issuer, "decision_factors", "Decision factors"),
        propertyFact(issuer, "passkey_validation", "Passkey validation"),
        propertyFact(issuer, "response_time", "Typical latency"),
      ].filter(Boolean),
    },
    acquirer: {
      body: getStepText(acquirer, "acquirer-iso8583", "business"),
      facts: [
        propertyFact(acquirer, "key_modifications", "Authorization metadata"),
        propertyFact(acquirer, "connection", "Connection"),
        propertyFact(acquirer, "message_encryption", "Transport"),
      ].filter(Boolean),
    },
    merchant: {
      body: getStepText(merchant, "merchant-accepts", "business"),
      facts: [
        propertyFact(merchant, "tap_integration", "Integration"),
        propertyFact(merchant, "bot_protection", "Bot protection"),
        propertyFact(merchant, "consumer_recognition", "Recognition signal"),
      ].filter(Boolean),
    },
  }
}

function buildActors(diagram) {
  const details = buildDetails(diagram)

  return ACTOR_ORDER.reduce((acc, id) => {
    const spec = ACTOR_LAYOUT[id]
    const node = spec.nodeId ? getNode(diagram, spec.nodeId) : null

    acc[id] = {
      ...spec,
      label: spec.label ?? node?.data?.label ?? id,
      sub: spec.sub ?? node?.data?.sublabel ?? node?.type ?? "",
      detail: details[id],
    }

    return acc
  }, {})
}

function buildConnections(diagram) {
  return CONNECTION_SPECS.map((connection) => ({
    ...connection,
    label: connection.edgeId
      ? getEdgeById(diagram, connection.edgeId)?.label ?? connection.label
      : connection.label,
  }))
}

export default function AgenticArchitecture({ diagram = agenticCheckoutE2E }) {
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  const actors = buildActors(diagram)
  const connections = buildConnections(diagram)
  const detail = selected ? actors[selected]?.detail : null
  const selActor = selected ? actors[selected] : null
  const selAccent = selected ? NODE_ACCENT[selected] : null

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  return (
    <div style={{
      fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
      background: "var(--paper)",
      borderRadius: 14,
      border: "1px solid var(--ink-200)",
      overflow: "hidden",
      boxShadow: "0 2px 8px color-mix(in srgb, var(--ink-900) 7%, transparent), 0 12px 32px color-mix(in srgb, var(--ink-900) 6%, transparent)",
      width: isMobile ? "100%" : "100vw",
      maxWidth: 1040,
      position: isMobile ? "static" : "relative",
      left: isMobile ? "auto" : "50%",
      transform: isMobile ? "none" : "translateX(-50%)",
      margin: "2.5rem 0",
    }}>

      <div style={{
        padding: isMobile ? "14px 16px 12px" : "18px 28px 15px",
        borderBottom: "1px solid var(--ink-200)",
        background: "var(--ink-100)",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: isMobile ? 8 : 16,
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--ink-500)", fontFamily: "ui-monospace,'Courier New',monospace", marginBottom: 5 }}>
            Agentic Commerce · System Architecture
          </div>
          <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 600, color: "var(--ink-800)", letterSpacing: 0, lineHeight: 1 }}>
            {diagram.title}
          </div>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 10 }}>
              {Object.entries(EDGE_STYLE).map(([type, edgeStyle]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="22" height="10" style={{ overflow: "visible" }}>
                    <line x1="0" y1="5" x2="18" y2="5" stroke={edgeStyle.stroke} strokeWidth="1.5" strokeDasharray={edgeStyle.dash} />
                    <polygon points="16,2.5 20,5 16,7.5" fill={edgeStyle.stroke} />
                  </svg>
                  <span style={{ fontSize: 9, fontFamily: "ui-monospace,monospace", color: "var(--ink-500)", letterSpacing: "0.05em" }}>{type}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, fontFamily: "ui-monospace,monospace", color: "var(--ink-400)" }}>
              {ACTOR_ORDER.length} actors · {connections.length} connections · {diagram.metadata?.totalLatency ?? "timing varies"} end to end
            </div>
          </div>
        )}
        {isMobile && (
          <div style={{ fontSize: 10, fontFamily: "ui-monospace,monospace", color: "var(--ink-400)" }}>
            {ACTOR_ORDER.length} actors · {connections.length} connections · {diagram.metadata?.totalLatency ?? "timing varies"} · tap any node
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row" }}>
        {isMobile && (
          <div style={{ padding: "12px 16px 4px" }}>
            <div style={{ fontSize: 10, fontFamily: "ui-monospace,monospace", color: "var(--ink-400)", marginBottom: 10, letterSpacing: "0.06em" }}>
              TAP ANY ACTOR TO INSPECT
            </div>
            {ACTOR_ORDER.map((id, index) => {
              const actor = actors[id]
              const accent = NODE_ACCENT[id]
              const isSelected = selected === id
              const previousId = index > 0 ? ACTOR_ORDER[index - 1] : null
              const showBand = !previousId || actors[previousId].band !== actor.band

              return (
                <div key={id}>
                  {showBand && (
                    <div style={{ fontSize: 9, fontFamily: "ui-monospace,monospace", color: "var(--ink-400)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: index === 0 ? 0 : 10, marginBottom: 4 }}>
                      {actor.band}
                    </div>
                  )}
                  <div
                    onClick={() => setSelected(selected === id ? null : id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      marginBottom: 3,
                      borderRadius: 8,
                      cursor: "pointer",
                      background: isSelected ? "var(--paper-pure)" : "var(--paper-pure)",
                      border: `1px solid ${isSelected ? accent : "var(--ink-200)"}`,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ width: 3, height: 32, background: accent, borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-800)", letterSpacing: 0 }}>{actor.label}</div>
                      <div style={{ fontSize: 9, fontFamily: "ui-monospace,monospace", color: "var(--ink-400)", marginTop: 2 }}>{actor.sub}</div>
                    </div>
                    <div style={{ fontSize: 12, color: isSelected ? accent : "var(--ink-200)" }}>{isSelected ? "▲" : "▼"}</div>
                  </div>
                  {isSelected && actor.detail && (
                    <div style={{ margin: "0 0 8px 14px", padding: "12px 14px", background: "var(--ink-100)", borderRadius: "0 0 8px 8px", borderLeft: `2px solid ${accent}` }}>
                      <p style={{ fontSize: 12, color: "var(--ink-700)", lineHeight: 1.7, margin: "0 0 10px" }}>{actor.detail.body}</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {actor.detail.facts.map((fact, factIndex) => (
                          <div key={factIndex} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                            <div style={{ width: 4, height: 4, borderRadius: "50%", background: accent, flexShrink: 0, marginTop: 5 }} />
                            <div style={{ fontSize: 10.5, fontFamily: "ui-monospace,monospace", color: "var(--ink-500)", lineHeight: 1.5 }}>{fact}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!isMobile && (
          <div style={{ flex: 1, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: "block", minWidth: SVG_W }}>
              <defs>
                {Object.entries(EDGE_STYLE).map(([type, edgeStyle]) => (
                  <marker key={type} id={`arr-${type}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M1 1.5L6.5 4L1 6.5" fill="none" stroke={edgeStyle.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                ))}
                <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.12" />
                </filter>
                <filter id="edge-glow" x="-40%" y="-300%" width="180%" height="700%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <pattern id="dotgrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="0.8" fill="var(--ink-200)" opacity="0.5" />
                </pattern>
              </defs>

              <rect width={SVG_W} height={SVG_H} fill="var(--paper)" />
              <rect width={SVG_W} height={SVG_H} fill="url(#dotgrid)" />

              {LAYER_BANDS.map((band) => (
                <g key={band.label}>
                  <rect x={14} y={band.y} width={SVG_W - 28} height={band.h} rx={8} fill={band.color} stroke={band.border} strokeWidth={1} />
                  <text x={30} y={band.y + 13} style={{ fontSize: 8.5, fontFamily: "ui-monospace,monospace", fill: band.border, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {band.label}
                  </text>
                </g>
              ))}

              {connections.map((connection, index) => {
                const { d, mx, my } = getEdge(connection.from, connection.to, actors)
                const edgeStyle = EDGE_STYLE[connection.type]
                const isRelated = selected && (connection.from === selected || connection.to === selected)
                const isFaded = selected && !isRelated

                return (
                  <g key={`${connection.from}-${connection.to}`} style={{ opacity: isFaded ? 0.1 : 1, transition: "opacity 0.25s" }}>
                    {isRelated && (
                      <path d={d} fill="none" stroke={edgeStyle.glow} strokeWidth={5} strokeOpacity={0.15} filter="url(#edge-glow)" />
                    )}
                    <path
                      d={d}
                      fill="none"
                      stroke={edgeStyle.stroke}
                      strokeWidth={isRelated ? 1.8 : 1.1}
                      strokeDasharray={edgeStyle.dash}
                      strokeOpacity={isRelated ? 1 : 0.6}
                      markerEnd={`url(#arr-${connection.type})`}
                      style={{ transition: "stroke-width 0.2s, stroke-opacity 0.2s" }}
                    />
                    <circle r={isRelated ? edgeStyle.dotR + 0.5 : edgeStyle.dotR} fill={edgeStyle.stroke} opacity={isRelated ? 0.9 : 0.4}>
                      <animateMotion dur={isRelated ? `${parseFloat(edgeStyle.animDur) * 0.65}s` : edgeStyle.animDur} repeatCount="indefinite" begin={`${index * 0.38}s`}>
                        <mpath href={`#ep-${index}`} />
                      </animateMotion>
                    </circle>
                    <path id={`ep-${index}`} d={d} fill="none" stroke="none" />
                    <g style={{ opacity: isFaded ? 0 : 1, transition: "opacity 0.2s" }}>
                      <rect
                        x={mx - 46}
                        y={my - 9}
                        width={92}
                        height={17}
                        rx={4}
                        fill={isRelated ? "var(--paper-pure)" : "var(--paper)"}
                        stroke={isRelated ? edgeStyle.stroke : "var(--ink-200)"}
                        strokeWidth={isRelated ? 1 : 0.8}
                        strokeOpacity={isRelated ? 0.7 : 0.6}
                      />
                      <text x={mx} y={my + 0.5} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 8, fontFamily: "ui-monospace,monospace", fill: isRelated ? edgeStyle.label : "var(--ink-500)", letterSpacing: "0.02em" }}>
                        {connection.label}
                      </text>
                    </g>
                  </g>
                )
              })}

              {ACTOR_ORDER.map((id) => {
                const actor = actors[id]
                const x = COL_X[actor.col]
                const y = LAYER_Y[actor.layer]
                const accent = NODE_ACCENT[actor.id]
                const tint = NODE_ICON_TINT[actor.id]
                const isSelected = selected === actor.id
                const isHovered = hovered === actor.id
                const isFaded = selected && !isSelected

                return (
                  <g
                    key={actor.id}
                    onClick={() => setSelected(selected === actor.id ? null : actor.id)}
                    onMouseEnter={() => setHovered(actor.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: "pointer", opacity: isFaded ? 0.22 : 1, transition: "opacity 0.25s" }}
                  >
                    {isSelected && (
                      <rect x={x - 5} y={y - 5} width={NODE_W + 10} height={NODE_H + 10} rx={13} fill="none" stroke={accent} strokeWidth={1.5} strokeOpacity={0.35} />
                    )}
                    <rect
                      x={x}
                      y={y}
                      width={NODE_W}
                      height={NODE_H}
                      rx={9}
                      fill={isSelected ? "var(--paper-pure)" : isHovered ? "var(--paper)" : "var(--paper-pure)"}
                      stroke={isSelected ? accent : isHovered ? "var(--ink-300)" : "var(--ink-200)"}
                      strokeWidth={isSelected ? 1.5 : 1}
                      filter={isSelected ? "url(#node-shadow)" : undefined}
                      style={{ transition: "fill 0.15s, stroke 0.15s" }}
                    />
                    <rect x={x + 1} y={y} width={NODE_W - 2} height={3} rx={2} fill={accent} fillOpacity={isSelected ? 1 : isHovered ? 0.75 : 0.5} style={{ transition: "fill-opacity 0.15s" }} />
                    <g transform={`translate(${x + 14},${y + NODE_H / 2 - 9}) scale(0.75)`}>
                      <path d={ICON[actor.id]} fill={tint} opacity={isSelected ? 0.85 : isHovered ? 0.65 : 0.45} style={{ transition: "opacity 0.15s" }} />
                    </g>
                    <text x={x + 37} y={y + 27} dominantBaseline="central" style={{ fontSize: 12, fontWeight: 600, fontFamily: "system-ui,sans-serif", fill: isSelected ? "var(--ink-900)" : isHovered ? "var(--ink-800)" : "var(--ink-800)", letterSpacing: 0, transition: "fill 0.15s" }}>
                      {actor.label}
                    </text>
                    <text x={x + 37} y={y + 46} dominantBaseline="central" style={{ fontSize: 8.5, fontFamily: "ui-monospace,monospace", fill: isSelected ? "var(--ink-500)" : "var(--ink-400)", letterSpacing: "0.01em", transition: "fill 0.15s" }}>
                      {actor.sub}
                    </text>
                    {!selected && (
                      <circle cx={x + NODE_W - 13} cy={y + NODE_H / 2} r={3} fill={accent} opacity={isHovered ? 0.6 : 0.18} style={{ transition: "opacity 0.15s" }} />
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        )}

        {!isMobile && (
          <div style={{ width: 236, borderLeft: "1px solid var(--ink-200)", background: "var(--ink-100)", padding: "20px 18px", flexShrink: 0 }}>
            {detail && selActor ? (
              <div style={{ animation: "fadeUp 0.2s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 3, height: 28, background: selAccent, borderRadius: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)", lineHeight: 1.2 }}>{selActor.label}</div>
                    <div style={{ fontSize: 9, fontFamily: "ui-monospace,monospace", color: "var(--ink-500)", marginTop: 2 }}>{selActor.sub}</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "var(--ink-700)", lineHeight: 1.75, margin: "0 0 16px" }}>
                  {detail.body}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {detail.facts.map((fact, index) => (
                    <div key={index} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: selAccent, flexShrink: 0, marginTop: 4 }} />
                      <div style={{ fontSize: 10.5, fontFamily: "ui-monospace,monospace", color: "var(--ink-500)", lineHeight: 1.55 }}>{fact}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--ink-200)" }}>
                  <div style={{ fontSize: 9, fontFamily: "ui-monospace,monospace", color: "var(--ink-400)", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>Connections</div>
                  {connections.filter((connection) => connection.from === selected || connection.to === selected).map((connection, index) => {
                    const edgeStyle = EDGE_STYLE[connection.type]
                    const other = connection.from === selected ? connection.to : connection.from
                    const direction = connection.from === selected ? "→" : "←"
                    return (
                      <div key={index} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                        <div style={{ width: 18, height: 1.5, background: edgeStyle.stroke, borderRadius: 1, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontFamily: "ui-monospace,monospace", color: "var(--ink-500)" }}>
                          {direction} {actors[other].label}
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
                    fontFamily: "ui-monospace,monospace",
                    color: "var(--ink-500)",
                    border: "1px solid var(--ink-300)",
                    background: "transparent",
                    borderRadius: 6,
                    padding: "5px 12px",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    width: "100%",
                  }}
                  onMouseEnter={(event) => {
                    event.target.style.borderColor = "var(--ink-400)"
                    event.target.style.color = "var(--ink-700)"
                  }}
                  onMouseLeave={(event) => {
                    event.target.style.borderColor = "var(--ink-300)"
                    event.target.style.color = "var(--ink-500)"
                  }}
                >
                  ← deselect
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, fontFamily: "ui-monospace,monospace", color: "var(--ink-400)", marginBottom: 18, lineHeight: 1.65 }}>
                  Click any node to inspect its role and connections.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {ACTOR_ORDER.map((id) => {
                    const actor = actors[id]
                    return (
                      <div
                        key={actor.id}
                        onClick={() => setSelected(actor.id)}
                        onMouseEnter={(event) => { event.currentTarget.style.background = "var(--ink-100)" }}
                        onMouseLeave={(event) => { event.currentTarget.style.background = "transparent" }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "5px 6px",
                          borderRadius: 6,
                          cursor: "pointer",
                          transition: "background 0.12s",
                        }}
                      >
                        <div style={{ width: 3, height: 22, background: NODE_ACCENT[actor.id], borderRadius: 2, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-800)" }}>{actor.label}</div>
                          <div style={{ fontSize: 9, fontFamily: "ui-monospace,monospace", color: "var(--ink-400)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {actor.sub}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--ink-200)" }}>
                  {[
                    [diagram.metadata?.totalLatency ?? "timing varies", "end to end"],
                    [diagram.settlementCycle ?? "T+1", "settlement"],
                    ["trust context", "agent signal"],
                    [getNode(diagram, "n-tap")?.data?.properties?.algorithm?.split(" ")[0] ?? "Ed25519", "local signing"],
                    ["policy-based", "consumer friction"],
                  ].map(([value, label]) => (
                    <div key={`${value}-${label}`} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontFamily: "ui-monospace,monospace", color: "var(--ink-500)" }}>{value}</span>
                      <span style={{ fontSize: 9, fontFamily: "ui-monospace,monospace", color: "var(--ink-400)" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(5px); }
          to   { opacity:1; transform:translateY(0);   }
        }
      `}</style>
    </div>
  )
}
