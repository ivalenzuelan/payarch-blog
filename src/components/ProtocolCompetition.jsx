import { useState } from "react"

const PROTOCOLS = [
  {
    id: "tap",
    name: "Visa TAP",
    sub: "Trusted Agent Protocol",
    color: "#1a56a0",
    bg: "#f0f4ff",
    border: "#bfdbfe",
    dot: "#2563eb",
  },
  {
    id: "mc",
    name: "Mastercard VI",
    sub: "Agent Pay + Verifiable Intent",
    color: "#b91c1c",
    bg: "#fff0f0",
    border: "#fecaca",
    dot: "#dc2626",
  },
  {
    id: "ap2",
    name: "Google AP2",
    sub: "Agent Payments Protocol",
    color: "#166534",
    bg: "#f0faf0",
    border: "#bbf7d0",
    dot: "#16a34a",
  },
  {
    id: "stripe",
    name: "Stripe ACP",
    sub: "Agentic Commerce Protocol + OpenAI",
    color: "#5b21b6",
    bg: "#f8f4ff",
    border: "#ddd0f8",
    dot: "#7c3aed",
  },
  {
    id: "x402",
    name: "x402",
    sub: "HTTP-native micropayments",
    color: "#92400e",
    bg: "#fffbf0",
    border: "#fcd34d",
    dot: "#d97706",
  },
]

const LAYERS = [
  { id: 1, name: "Agent Identity", tag: "L1", color: "#5b21b6" },
  { id: 2, name: "Delegation & Auth", tag: "L2", color: "#1e40af" },
  { id: 3, name: "Policy Enforcement", tag: "L3", color: "#92400e" },
  { id: 4, name: "Payment Rail", tag: "L4", color: "#065f46" },
  { id: 5, name: "Settlement", tag: "L5", color: "#0f766e" },
]

// coverage: "primary" | "partial" | "none"
const MATRIX = {
  tap: {
    1: { coverage: "primary", note: "Core purpose. Ed25519 keypairs, RFC 9421 HTTP Message Signatures, 7-stage CDN verification pipeline. Every request cryptographically bound to a registered agent identity." },
    2: { coverage: "partial", note: "Consumer Recognition JWT carries delegation scope ID and agent DID — verifies the agent was authorized by a specific consumer. Does not define the full mandate chain." },
    3: { coverage: "none", note: "TAP does not enforce business policy. Its job is identity verification only. Policy lives in the AP platform above it (e.g. Ramp's spend rules)." },
    4: { coverage: "primary", note: "TAP credential travels in DE48 (Additional Data). Agent-initiated flag in DE22. Payment Account Reference (PAR) links the token to the agent session in the clearing stream." },
    5: { coverage: "partial", note: "VDCAP incentivizes L3 data enrichment (0.05–0.10% interchange reduction) — adjacent to TAP but a separate Visa program. TAP itself does not define settlement." },
  },
  mc: {
    1: { coverage: "primary", note: "Know Your Agent (KYA) verification with tiered levels. Agent platform registers as MDES Token Requestor. Agentic tokens carry DSRP cryptogram + Agentic Commerce Identifiers in clearing." },
    2: { coverage: "primary", note: "Verifiable Intent — 3-layer SD-JWT credential chain: L1 (identity) → L2 (user→agent, constrained) → L3 (agent→network, specific transaction). Each layer is a strict subset of the layer above." },
    3: { coverage: "partial", note: "Intent Credential encodes constraints (merchant category, price ceiling, 7-day window). Enforcement is at credential verification — not a real-time policy engine." },
    4: { coverage: "primary", note: "Agentic tokens extend MDES tokenization. DE105 Transaction Link Identifier revised (Oct 2025) to chain all lifecycle messages back to the original human authorization event." },
    5: { coverage: "partial", note: "Agentic Commerce Identifiers travel in the clearing stream, enabling issuers to build separate behavioral baselines for agent vs. human transactions. Not a settlement mechanism itself." },
  },
  ap2: {
    1: { coverage: "partial", note: "AP2 uses A2A AgentCards for agent discovery and role declaration. DID-based trust is in the roadmap (v1.x). Short-term: manually curated allowlists per actor." },
    2: { coverage: "primary", note: "Core purpose. Intent Mandate (human-signed, broad scope) + Cart Mandate (specific transaction, counter-signed) + Payment Mandate (appended to auth message). Non-repudiable chain from user intent to payment." },
    3: { coverage: "primary", note: "Intent Mandate encodes constraints (merchant category, price ceiling, TTL) signed by the human at session start. Agent cannot exceed these constraints without a new mandate from the human." },
    4: { coverage: "primary", note: "PaymentMandate is explicitly designed to be 'appended to existing authorization packets' sent to card networks and issuers — without changing the core ISO 8583 format." },
    5: { coverage: "partial", note: "AP2 is payment-method agnostic — covers cards, stablecoins, real-time bank transfers. The A2A x402 extension enables USDC settlement via Coinbase on Base L2 within AP2 flows." },
  },
  stripe: {
    1: { coverage: "partial", note: "OpenAI Delegated Payment Spec uses API key + ECDSA request signature for platform authentication. No cryptographic per-agent identity — trust is established at the platform level (OpenAI → Stripe)." },
    2: { coverage: "primary", note: "Shared Payment Token (SPT) — one-time token scoped to a specific merchant and cart total. Allowance object encodes: reason, max_amount, currency, merchant_id, expires_at. Risk signals passed at delegation time." },
    3: { coverage: "partial", note: "Allowance object carries max_amount and merchant_id constraints. Risk signals (type, score, action: blocked/manual_review/authorized) passed at delegation time. No real-time policy engine." },
    4: { coverage: "partial", note: "ACP defines the application layer protocol (REST endpoints between AI platform and merchant backend). The SPT flows into Stripe's existing payment processing — which handles the ISO 8583 leg." },
    5: { coverage: "none", note: "ACP defines the checkout protocol. Settlement flows through Stripe's standard card processing infrastructure unchanged." },
  },
  x402: {
    1: { coverage: "partial", note: "Agents hold USDC wallets (Coinbase AgentKit or Agentic Wallet). EIP-712 signed authorization payload in X-PAYMENT header. Identity is the wallet address — no separate identity registry." },
    2: { coverage: "partial", note: "EIP-3009 signed pre-authorization separates signing from execution. Payment authorization is encoded in the X-PAYMENT header payload — amount, asset, network, recipient." },
    3: { coverage: "none", note: "x402 has no policy layer. The payment is self-contained in the HTTP headers. Budget enforcement, if any, must be implemented by the agent platform above x402." },
    4: { coverage: "none", note: "x402 is a separate rail — USDC on Base L2, not ISO 8583 / card networks. It targets sub-dollar API micropayments where card rails have never worked." },
    5: { coverage: "primary", note: "Core purpose. ~$0.001 minimum payment. ~2 second end-to-end. ~$0 in gas fees on Base L2. Pay-per-API-call with zero subscriptions, zero accounts, zero human approvals. Already adopted by Cloudflare and 250+ contributors." },
  },
}

const COVERAGE_CONFIG = {
  primary: { label: "Core", dotSize: 14, opacity: 1 },
  partial: { label: "Partial", dotSize: 10, opacity: 0.7 },
  none: { label: "—", dotSize: 0, opacity: 1 },
}

export default function ProtocolCompetition() {
  const [activeCell, setActiveCell] = useState(null) // { protocolId, layerId }
  const [hoverCell, setHoverCell] = useState(null)

  const selectCell = (protocolId, layerId) => {
    if (activeCell?.protocolId === protocolId && activeCell?.layerId === layerId) {
      setActiveCell(null)
    } else {
      setActiveCell({ protocolId, layerId })
    }
  }

  const activeProtocol = activeCell ? PROTOCOLS.find(p => p.id === activeCell.protocolId) : null
  const activeLayer = activeCell ? LAYERS.find(l => l.id === activeCell.layerId) : null
  const activeData = activeCell ? MATRIX[activeCell.protocolId]?.[activeCell.layerId] : null

  return (
    <div style={{
      fontFamily: "'Georgia','Times New Roman',serif",
      color: "#1a1814",
      background: "#faf9f6",
      borderRadius: 14,
      border: "1px solid #e0dbd0",
      overflow: "hidden",
      width: "100vw",
      maxWidth: 1040,
      position: "relative",
      left: "50%",
      transform: "translateX(-50%)",
      margin: "28px 0",
    }}>

      {/* Header */}
      <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #e0dbd0", background: "#f5f3ee" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9a9288", fontFamily: "'Courier New',monospace", marginBottom: 5 }}>
          Protocol Analysis · Competition Matrix
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.02em", margin: "0 0 3px", fontFamily: "'Georgia',serif" }}>
          Five protocols competing at different layers
        </h2>
        <div style={{ fontSize: 11, color: "#9a9288", fontFamily: "'Courier New',monospace" }}>
          Click any cell to see what each protocol does at that layer
        </div>
      </div>

      <div style={{ padding: "20px 24px 24px" }}>

        {/* Matrix */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                {/* Empty corner */}
                <th style={{ width: 120, padding: "0 12px 12px 0" }} />
                {PROTOCOLS.map(p => (
                  <th key={p.id} style={{ padding: "0 6px 12px", textAlign: "center", minWidth: 140 }}>
                    <div style={{
                      background: p.bg,
                      border: `1px solid ${p.border}`,
                      borderRadius: 8,
                      padding: "8px 10px",
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: p.color, fontFamily: "'Courier New',monospace", letterSpacing: "-0.01em" }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 9, color: p.color, fontFamily: "'Courier New',monospace", opacity: 0.7, marginTop: 2, lineHeight: 1.3 }}>
                        {p.sub}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...LAYERS].reverse().map((layer, rowIdx) => (
                <tr key={layer.id}>
                  {/* Layer label */}
                  <td style={{ padding: "5px 12px 5px 0", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: layer.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: "#fff", fontFamily: "'Courier New',monospace" }}>
                          {layer.tag}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#3a3530", fontFamily: "'Courier New',monospace", lineHeight: 1.3 }}>
                        {layer.name}
                      </div>
                    </div>
                  </td>

                  {/* Cells */}
                  {PROTOCOLS.map(protocol => {
                    const cellData = MATRIX[protocol.id]?.[layer.id]
                    const coverage = cellData?.coverage ?? "none"
                    const cfg = COVERAGE_CONFIG[coverage]
                    const isActive = activeCell?.protocolId === protocol.id && activeCell?.layerId === layer.id
                    const isHover = hoverCell?.protocolId === protocol.id && hoverCell?.layerId === layer.id

                    return (
                      <td
                        key={protocol.id}
                        onClick={() => coverage !== "none" && selectCell(protocol.id, layer.id)}
                        onMouseEnter={() => setHoverCell({ protocolId: protocol.id, layerId: layer.id })}
                        onMouseLeave={() => setHoverCell(null)}
                        style={{
                          padding: "5px 6px",
                          textAlign: "center",
                          verticalAlign: "middle",
                        }}
                      >
                        <div style={{
                          borderRadius: 8,
                          padding: "12px 8px",
                          border: `1px solid ${isActive ? protocol.border : isHover && coverage !== "none" ? "#d8d3c8" : "#ece8e2"}`,
                          background: isActive ? protocol.bg : isHover && coverage !== "none" ? "#f5f3ee" : "#f5f3ee",
                          cursor: coverage !== "none" ? "pointer" : "default",
                          transition: "all .15s",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 5,
                          minHeight: 60,
                          justifyContent: "center",
                        }}>
                          {coverage !== "none" ? (
                            <>
                              <div style={{
                                width: cfg.dotSize,
                                height: cfg.dotSize,
                                borderRadius: "50%",
                                background: protocol.dot,
                                opacity: cfg.opacity,
                                border: coverage === "partial" ? `2px solid ${protocol.dot}` : "none",
                                boxSizing: "border-box",
                                ...(coverage === "partial" ? { background: "transparent" } : {}),
                                transition: "all .15s",
                                transform: isActive ? "scale(1.15)" : "scale(1)",
                              }} />
                              <div style={{
                                fontSize: 8.5,
                                fontFamily: "'Courier New',monospace",
                                color: isActive ? protocol.color : "#b8b3a8",
                                fontWeight: isActive ? 600 : 400,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                transition: "color .15s",
                              }}>
                                {cfg.label}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: 16, color: "#ddd8d0" }}>—</div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 20, marginTop: 10, marginBottom: activeCell ? 16 : 0, paddingLeft: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#6b6560" }} />
            <span style={{ fontSize: 10, color: "#9a9288", fontFamily: "'Courier New',monospace" }}>Core — primary scope</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #6b6560", background: "transparent", boxSizing: "border-box" }} />
            <span style={{ fontSize: 10, color: "#9a9288", fontFamily: "'Courier New',monospace" }}>Partial — adjacent coverage</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, color: "#ddd8d0" }}>—</span>
            <span style={{ fontSize: 10, color: "#9a9288", fontFamily: "'Courier New',monospace" }}>Not addressed</span>
          </div>
        </div>

        {/* Detail panel */}
        {activeCell && activeData && activeProtocol && activeLayer && (
          <div style={{
            background: activeProtocol.bg,
            border: `1px solid ${activeProtocol.border}`,
            borderLeft: `4px solid ${activeProtocol.dot}`,
            borderRadius: "0 10px 10px 0",
            padding: "14px 16px",
            marginTop: 4,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: activeProtocol.color,
                fontFamily: "'Courier New',monospace",
                background: activeProtocol.bg,
                border: `1px solid ${activeProtocol.border}`,
                borderRadius: 5,
                padding: "2px 8px",
              }}>
                {activeProtocol.name}
              </div>
              <span style={{ fontSize: 11, color: "#9a9288", fontFamily: "'Courier New',monospace" }}>at</span>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: activeLayer.color,
                fontFamily: "'Courier New',monospace",
                background: "rgba(0,0,0,0.04)",
                border: "1px solid #e0dbd0",
                borderRadius: 5,
                padding: "2px 8px",
              }}>
                {activeLayer.tag} — {activeLayer.name}
              </div>
              <div style={{
                fontSize: 9,
                fontFamily: "'Courier New',monospace",
                color: "#fff",
                background: activeData.coverage === "primary" ? activeProtocol.dot : "#9a9288",
                borderRadius: 4,
                padding: "2px 6px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}>
                {COVERAGE_CONFIG[activeData.coverage].label}
              </div>
            </div>
            <p style={{
              fontSize: 12.5,
              lineHeight: 1.72,
              color: "#3a3530",
              fontFamily: "'Georgia',serif",
              margin: 0,
            }}>
              {activeData.note}
            </p>
          </div>
        )}

        {/* Bottom insight */}
        <div style={{
          marginTop: activeCell ? 14 : 4,
          padding: "10px 14px",
          background: "#f0ede8",
          borderRadius: 8,
          border: "1px solid #ddd8d0",
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
        }}>
          <div style={{ fontSize: 13, color: "#9a9288", flexShrink: 0, marginTop: 1 }}>◈</div>
          <div style={{ fontSize: 11.5, color: "#5a5550", fontFamily: "'Georgia',serif", lineHeight: 1.65, fontStyle: "italic" }}>
            None of these protocols is likely to win alone. Layers 1 and 4 will stay owned by the card networks. Layers 2 and 3 are contested between AP2-style open protocols and proprietary implementations. x402 carves out the micro-API-economy niche where card rails have never worked.
          </div>
        </div>
      </div>
    </div>
  )
}
