import { useState } from "react"

const LAYERS = [
  {
    id: 5,
    name: "Settlement & Reconciliation",
    sub: "ISO 8583 net settlement · L3 line items · VDCAP",
    color: "#0f766e",
    dimColor: "#99c4c0",
    bg: "rgba(15,118,110,0.06)",
    border: "rgba(15,118,110,0.22)",
    tag: "L5",
    description: "Transactions batch, net, and settle T+1 — unchanged from traditional card payments. The agent stack adds structural value through automatic L3 data: line-item breakdowns, PO references, GL codes, and cost center tags generated as a byproduct of invoice processing.",
    protocols: [
      { name: "ISO 8583 batch settlement", coverage: "Unchanged — net settlement via existing clearing networks" },
      { name: "VDCAP (Visa, Apr 2026)", coverage: "0.05% interchange reduction for enriched data; +0.05% with network tokens" },
    ],
    vendors: ["Ramp", "Crossmint", "Payman AI"],
    field: null,
    fact: "L3 data historically < 20% populated by humans. AI agents generate it for free as a byproduct of invoice extraction. VDCAP makes this financially rewarding for merchants.",
  },
  {
    id: 4,
    name: "Payment Rail",
    sub: "ISO 8583 auth · DE22 · DE48 · DE105 TLID",
    color: "#065f46",
    dimColor: "#6da88a",
    bg: "rgba(6,95,70,0.06)",
    border: "rgba(6,95,70,0.22)",
    tag: "L4",
    description: "The authorization message — ISO 8583 — has not changed. Agent identity, TAP credentials, and transaction modality (Human Present vs. Human Not Present) ride in existing private-use Data Elements alongside the standard authorization fields. 40M+ merchants receive agent payments today with zero infrastructure changes.",
    protocols: [
      { name: "Visa TAP credential", coverage: "TAP JWT in DE48 Additional Data; agent-initiated flag in DE22 (code 81)" },
      { name: "AP2 PaymentMandate", coverage: "\"Appended to existing authorization packet\" — no format change required" },
      { name: "Mastercard DE105 TLID", coverage: "Transaction Link Identifier chains every lifecycle message to the original human authorization event" },
    ],
    vendors: ["VisaNet", "Mastercard MDES", "Adyen", "Worldpay"],
    field: "DE22=81 · DE48=TAP credential · DE105=TLID",
    fact: "No change to core ISO 8583 format. Backward-compatible by design. The new intelligence rides in fields that already exist.",
  },
  {
    id: 3,
    name: "Policy Enforcement",
    sub: "Spend limits · vendor lists · approval thresholds · anomaly detection",
    color: "#92400e",
    dimColor: "#c49a6a",
    bg: "rgba(146,64,14,0.06)",
    border: "rgba(146,64,14,0.22)",
    tag: "L3",
    description: "Delegation defines what an agent can do. Policy enforcement determines whether it should act right now. For B2B, this is an entire discipline — pre-approved vendor lists, multi-tier approval thresholds, GL code assignments, cost center budget checks. For B2C, it lives inside the agent platform itself. Policy cannot live in the credential — it's too company-specific.",
    protocols: [
      { name: "DAAP anomaly detection", coverage: "5 non-blocking types: unusual_scope, high_frequency, off_hours, new_principal, cascade_delegation" },
      { name: "Faramesh (arXiv:2601.17744)", coverage: "Mandatory policy sidecar — evaluates B(A,P,S) for every financial action. Compatible with OPA, Cedar, Zanzibar." },
      { name: "AP2 Intent Mandate constraints", coverage: "Merchant category, price ceiling, TTL encoded in the signed mandate at session start" },
    ],
    vendors: ["Ramp", "Payman AI", "Signets", "Locus"],
    field: null,
    fact: "Clean architectural division: AP platform evaluates company policy. Visa verifies identity. Two systems, two responsibilities, one combined trust guarantee.",
  },
  {
    id: 2,
    name: "Delegation & Authorization",
    sub: "Intent Mandates · Cart Mandates · SD-JWT chains · OAuth grant tokens",
    color: "#1e40af",
    dimColor: "#6080c8",
    bg: "rgba(30,64,175,0.06)",
    border: "rgba(30,64,175,0.22)",
    tag: "L2",
    description: "Identity tells you who the agent is. Delegation tells you what it is allowed to do. The central principle that emerged across both research and production: the AI reasoning layer should never hold the payment credential. The agent that decides to buy and the system that executes the payment must be architecturally separate.",
    protocols: [
      { name: "Google AP2 Mandates", coverage: "Intent Mandate (human-signed, broad) + Cart Mandate (specific transaction). Non-repudiable chain from intent → payment." },
      { name: "Mastercard Verifiable Intent", coverage: "3-layer SD-JWT: L1 identity → L2 user→agent → L3 agent→network. Each layer is a strict subset of the layer above." },
      { name: "DAAP / IETF draft", coverage: "OAuth 2.0 extension: agt, grnt, scp, bdg claims. Atomic budget debit. Cascade revocation. ≤1hr TTL for payments:initiate." },
    ],
    vendors: ["Google (AP2)", "Mastercard (VI)", "Grantex (DAAP)", "Skyfire"],
    field: null,
    fact: "TessPay (arXiv:2602.00213): \"AI reasoning plane never holds private keys — only settlement plane signs.\" Consensus across all production implementations.",
  },
  {
    id: 1,
    name: "Agent Identity",
    sub: "Ed25519 keypairs · RFC 9421 HTTP signatures · KYA registry · DIDs",
    color: "#5b21b6",
    dimColor: "#9070c8",
    bg: "rgba(91,33,182,0.06)",
    border: "rgba(91,33,182,0.22)",
    tag: "L1",
    description: "Before any payment, the system must answer: who is this agent, and who authorized it? Two approaches dominate. Cryptographic key-based identity (Visa TAP): Ed25519 keypairs, RFC 9421 HTTP Message Signatures on every request, 7-stage CDN verification. Registry-based identity (Mastercard): Know Your Agent verification, MDES agentic token issuance.",
    protocols: [
      { name: "Visa TAP (Oct 2025)", coverage: "Ed25519 keypair per agent. RFC 9421 HTTP sig covering @authority, @path, @method, content-digest. 7-stage CDN pipeline." },
      { name: "Mastercard KYA", coverage: "Agent platform registers as MDES Token Requestor. Agentic tokens carry DSRP cryptogram + Agentic Commerce Identifiers in clearing." },
      { name: "AIP (arXiv:2603.24775)", coverage: "Invocation-Bound Capability Tokens. Scan of ~2,000 MCP servers: all lacked auth. +0.22ms overhead. 100% adversarial rejection." },
    ],
    vendors: ["Visa (tap.visa.com)", "Mastercard (MDES)", "Skyfire (KYAPay)", "Crossmint"],
    field: "RFC 9421 covers: @authority · @path · @method · content-type · content-digest",
    fact: "AIP paper found all ~2,000 scanned MCP servers lacked authentication. The identity gap is real — and the card networks moved faster than the research literature.",
  },
]

export default function FiveLayerStack() {
  const [openId, setOpenId] = useState(null)

  const toggle = (id) => setOpenId(prev => prev === id ? null : id)

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
          Architecture · Five-Layer Stack
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.02em", margin: "0 0 3px", fontFamily: "'Georgia',serif" }}>
          The agentic payment stack — layer by layer
        </h2>
        <div style={{ fontSize: 11, color: "#9a9288", fontFamily: "'Courier New',monospace" }}>
          Click any layer to expand protocols, vendors, and key data
        </div>
      </div>

      {/* Stack */}
      <div style={{ padding: "20px 24px 24px" }}>

        {/* Visual stack SVG indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18, alignItems: "center" }}>
          {[...LAYERS].reverse().map((l, i) => (
            <div
              key={l.id}
              onClick={() => toggle(l.id)}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: openId === l.id ? l.color : openId ? l.dimColor : l.color,
                opacity: openId && openId !== l.id ? 0.35 : 1,
                cursor: "pointer",
                transition: "all .2s",
              }}
            />
          ))}
          <div style={{ fontSize: 9, color: "#b8b3a8", fontFamily: "'Courier New',monospace", marginLeft: 4, whiteSpace: "nowrap" }}>
            L1 → L5
          </div>
        </div>

        {/* Layers — rendered top to bottom (L5 first) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {LAYERS.map((layer) => {
            const isOpen = openId === layer.id
            const isDimmed = openId && !isOpen

            return (
              <div
                key={layer.id}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${isOpen ? layer.border : "#e0dbd0"}`,
                  background: isOpen ? layer.bg : "#f5f3ee",
                  opacity: isDimmed ? 0.55 : 1,
                  transition: "all .2s",
                  overflow: "hidden",
                }}
              >
                {/* Layer header row */}
                <div
                  onClick={() => toggle(layer.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "13px 16px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {/* Layer number badge */}
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: isOpen ? layer.color : "#e8e3da",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "background .2s",
                  }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Courier New',monospace",
                      color: isOpen ? "#fff" : "#9a9288",
                      letterSpacing: "0.02em",
                    }}>
                      {layer.tag}
                    </span>
                  </div>

                  {/* Name + sub */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: isOpen ? layer.color : "#2a2520",
                      fontFamily: "'Courier New',monospace",
                      letterSpacing: "-0.01em",
                      transition: "color .2s",
                    }}>
                      {layer.name}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: "#9a9288",
                      fontFamily: "'Courier New',monospace",
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {layer.sub}
                    </div>
                  </div>

                  {/* Protocol count + expand indicator */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <div style={{
                      fontSize: 9.5,
                      fontFamily: "'Courier New',monospace",
                      color: isOpen ? layer.color : "#b8b3a8",
                      background: isOpen ? layer.bg : "transparent",
                      border: `1px solid ${isOpen ? layer.border : "#e0dbd0"}`,
                      borderRadius: 4,
                      padding: "2px 7px",
                      transition: "all .2s",
                    }}>
                      {layer.protocols.length} protocols
                    </div>
                    <div style={{
                      fontSize: 14,
                      color: isOpen ? layer.color : "#c8c3b8",
                      fontFamily: "'Courier New',monospace",
                      transition: "all .2s",
                      transform: isOpen ? "rotate(90deg)" : "none",
                    }}>
                      ›
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${layer.border}`, padding: "16px 18px 18px" }}>

                    {/* Description */}
                    <p style={{
                      fontSize: 13,
                      lineHeight: 1.75,
                      color: "#3a3530",
                      fontFamily: "'Georgia',serif",
                      margin: "0 0 16px",
                    }}>
                      {layer.description}
                    </p>

                    {/* Two-column: protocols + vendors */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 16, marginBottom: 14 }}>

                      {/* Protocols */}
                      <div>
                        <div style={{
                          fontSize: 9.5,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: layer.color,
                          fontFamily: "'Courier New',monospace",
                          marginBottom: 8,
                          fontWeight: 600,
                        }}>
                          Protocols at this layer
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {layer.protocols.map((p, i) => (
                            <div key={i} style={{
                              background: "#faf9f6",
                              border: "1px solid #e8e3da",
                              borderLeft: `3px solid ${layer.color}`,
                              borderRadius: "0 6px 6px 0",
                              padding: "7px 10px",
                            }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: layer.color, fontFamily: "'Courier New',monospace", marginBottom: 2 }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: 11, color: "#5a5550", fontFamily: "'Georgia',serif", lineHeight: 1.55 }}>
                                {p.coverage}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right column: vendors + field */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                        <div>
                          <div style={{
                            fontSize: 9.5,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: layer.color,
                            fontFamily: "'Courier New',monospace",
                            marginBottom: 7,
                            fontWeight: 600,
                          }}>
                            Vendors
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {layer.vendors.map((v, i) => (
                              <div key={i} style={{
                                fontSize: 10,
                                fontFamily: "'Courier New',monospace",
                                color: "#5a5550",
                                background: "#f0ede8",
                                border: "1px solid #ddd8d0",
                                borderRadius: 4,
                                padding: "2px 7px",
                              }}>
                                {v}
                              </div>
                            ))}
                          </div>
                        </div>

                        {layer.field && (
                          <div>
                            <div style={{
                              fontSize: 9.5,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              color: layer.color,
                              fontFamily: "'Courier New',monospace",
                              marginBottom: 7,
                              fontWeight: 600,
                            }}>
                              ISO 8583 fields
                            </div>
                            <div style={{
                              background: "#1a1814",
                              borderRadius: 6,
                              padding: "8px 10px",
                              fontFamily: "'Courier New',monospace",
                              fontSize: 10,
                              color: "#c8d8a8",
                              lineHeight: 1.7,
                            }}>
                              {layer.field.split(" · ").map((f, i) => (
                                <div key={i}>{f}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Key insight */}
                    <div style={{
                      background: "#faf9f6",
                      border: `1px solid ${layer.border}`,
                      borderRadius: 8,
                      padding: "10px 12px",
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}>
                      <div style={{ fontSize: 14, color: layer.color, flexShrink: 0, marginTop: 1 }}>◈</div>
                      <div style={{ fontSize: 11.5, color: "#4a4440", fontFamily: "'Georgia',serif", lineHeight: 1.65, fontStyle: "italic" }}>
                        {layer.fact}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Bottom hint */}
        {!openId && (
          <div style={{
            textAlign: "center",
            marginTop: 14,
            fontSize: 10.5,
            color: "#b8b3a8",
            fontFamily: "'Courier New',monospace",
            fontStyle: "italic",
          }}>
            ↑ stack reads bottom-up: L1 (identity) through L5 (settlement)
          </div>
        )}
      </div>
    </div>
  )
}
