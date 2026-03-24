import { useState } from "react"

const C = {
  cream: "#faf9f6",
  cream2: "#f5f3ee",
  cream3: "#ede9e2",
  ink: "#1a1814",
  ink2: "#4a4440",
  ink3: "#8a8278",
  ink4: "#b8b3a8",
  ink5: "#d8d3c8",
  red: "#c02010",
  redLight: "#fff4f2",
  redBorder: "#f0b0a0",
  blue: "#185FA5",
  blueLight: "#eef3ff",
  blueBorder: "#b8d0f0",
  mc: "#8B3012",
  mcLight: "#fff3ee",
  mcBorder: "#f0b898",
  border: "#e0dbd0",
}

const LAYERS = [
  {
    id: "merchant",
    num: "01",
    actor: "Merchant + Gateway",
    accentColor: "#1a1814",
    question: "Is this a human, not a bot?",
    before: [
      { tool: "CAPTCHA", why: "Proves human can solve visual puzzle" },
      { tool: "WAF + device fingerprint", why: "Blocks non-human browser signatures" },
      { tool: "Velocity / IP checks", why: "Flags machine-speed requests" },
    ],
    breakSummary: "Agent has no mouse, runs headless Chrome from AWS — looks identical to a coordinated bot attack.",
    visaAfter: {
      tool: "TAP JWT verification",
      how: "Merchant receives Ed25519-signed JWT from Visa (TTL 90s). Validated locally against cached public key in <5ms. No external call.",
      fields: ["consumer_recognized: true", "instruction_ref: pi-abc123", "aud: merchant-id"],
      standard: "HTTP Message Signatures · RFC 9421",
    },
    mcAfter: {
      tool: "CDN agent verification",
      how: "Cloudflare verifies agent cryptographic identity at edge before request reaches merchant infrastructure. Unregistered agents never get through.",
      fields: ["Web Bot Auth at CDN layer", "No merchant code change", "Dynamic Token Verification Code"],
      standard: "Web Bot Auth · RFC 9421",
    },
  },
  {
    id: "acquirer",
    num: "02",
    actor: "Acquirer + Processor",
    accentColor: "#7a4a10",
    question: "Does this transaction look legitimate?",
    before: [
      { tool: "AVS / CVV matching", why: "Verifies address and card code against issuer" },
      { tool: "ISO 8583 F022 = 01", why: 'POS Entry Mode "manual key entry" — ecommerce default since 1990s' },
      { tool: "IP reputation filters", why: "Blocks known malicious data center ranges" },
    ],
    breakSummary: "No AVS match. Data center IP. F022=01 tells all downstream to apply human rules. Every signal reads as credential stuffing.",
    visaAfter: {
      tool: "F022=81 + F048 + F126",
      how: "Three new ISO 8583 fields propagate agent context through the entire authorization chain.",
      fields: ["F022: 81 (agent-initiated)", "F048: AGNT:skyfire-001", "F126: pi-abc123:sha256:…"],
      standard: "ISO 8583 · Visa VIC spec",
    },
    mcAfter: {
      tool: "Agentic Token + F022 equivalent",
      how: "Agent identity is embedded in the token metadata itself — not in message fields. Token carries binding through the chain.",
      fields: ["Agentic Token (not raw PAN)", "Agent binding in token metadata", "New POS Entry Mode value"],
      standard: "ISO 8583 · Mastercard Agent Pay spec",
    },
  },
  {
    id: "network",
    num: "03",
    actor: "Card Network",
    accentColor: "#186040",
    question: "Is this part of a distributed attack?",
    before: [
      { tool: "ML behavioral risk scoring", why: "Scores against human behavioral baseline across merchants" },
      { tool: "Distributed bot detection", why: "Flags coordinated card testing across thousands of merchants" },
      { tool: "No pre-authorization registry", why: "No way to know consumer already authorized this specific intent" },
    ],
    breakSummary:
      "The most powerful models in the chain were trained to catch exactly this behavior: machine-speed, data center IP, no human baseline.",
    visaAfter: {
      tool: "VIC payment instruction registry",
      how: "VisaNet validates F126 hash against stored payment instruction. Any tamper in amount or merchant = decline with response code 58.",
      fields: ["F126 hash validated vs VIC registry", "Amount + merchant integrity check", "F022=81 triggers agent risk model"],
      standard: "Visa Intelligent Commerce API",
    },
    mcAfter: {
      tool: "Agentic Token binding validation",
      how: "Network validates the Agentic Token was issued for this specific agent, consumer, and context. Token carries the proof.",
      fields: ["Token binding: agent_id + consumer", "Context-specific token validation", "Agent metadata through auth chain"],
      standard: "Mastercard Token Service",
    },
  },
  {
    id: "issuer",
    num: "04",
    actor: "Issuer Bank",
    accentColor: "#185FA5",
    question: "Is the cardholder authorizing this?",
    before: [
      { tool: "Probabilistic risk scoring", why: "Combines network score with cardholder behavioral history" },
      { tool: "3D Secure step-up auth", why: "SMS or biometric challenge to prove human presence in real time" },
      { tool: "Human-in-the-loop fallback", why: "Requires real-time human response — no alternative" },
    ],
    breakSummary: "Step-up is unrecoverable. 3DS sends an SMS challenge. The agent cannot respond. Transaction fails permanently with no fallback.",
    visaAfter: {
      tool: "Agent spending policy + Passkey",
      how: "FIDO2 Passkey assertion happens at instruction time, not transaction time. When F022=81 arrives, issuer loads policy and runs deterministic checks.",
      fields: ["F022=81 → load agent spending policy", "Balance ✓ · limit ✓ · category ✓ · velocity ✓", "No step-up authentication needed"],
      standard: "FIDO2 / WebAuthn · VIC Authentication API",
    },
    mcAfter: {
      tool: "Mastercard Payment Passkey",
      how: "Pre-authorized spending policy replaces step-up entirely. Consumer proves intent once with Passkey. Issuer runs policy checks, not biometric challenges.",
      fields: ["Spending policy: category + limit + velocity", "Passkey pre-authorized at instruction time", "Deterministic rules replace 3DS"],
      standard: "FIDO2 · FIDO Alliance Payments WG",
    },
  },
]

const shell = {
  width: "100vw",
  maxWidth: 1040,
  position: "relative",
  left: "50%",
  transform: "translateX(-50%)",
  margin: "20px 0",
}

export default function FourPartyRebuildMap() {
  const [activeLayer, setActiveLayer] = useState(null)
  const [revealed, setRevealed] = useState(() => new Set())

  const toggleLayer = (id) => {
    if (activeLayer === id) {
      setActiveLayer(null)
    } else {
      setActiveLayer(id)
      setRevealed((prev) => new Set(prev).add(id))
    }
  }

  return (
    <div style={shell}>
      <style>{`
        @keyframes fourparty-rebuild-slide {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fourparty-rebuild-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .fourparty-rebuild-slide { animation: fourparty-rebuild-slide 0.35s ease forwards; }
        .fourparty-rebuild-fade { animation: fourparty-rebuild-fade 0.3s ease forwards; }
      `}</style>
      <div
        style={{
          background: C.cream,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
          maxWidth: 720,
          margin: "0 auto",
          fontFamily: "'DM Mono', ui-monospace, monospace",
        }}
      >
        <div style={{ padding: "20px 24px 16px", background: C.cream2, borderBottom: `1px solid ${C.border}` }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.ink4,
              marginBottom: 6,
              fontFamily: "'DM Mono', ui-monospace, monospace",
            }}
          >
            4-party model · the complete rebuild
          </div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 400,
              letterSpacing: "-0.02em",
              margin: "0 0 5px",
              fontFamily: "'Instrument Serif', Georgia, serif",
              color: C.ink,
            }}
          >
            Every tool replaced — layer by layer
          </h2>
          <div style={{ fontSize: 11, color: C.ink4 }}>what existed · what broke · what Visa and Mastercard built to replace it</div>
        </div>

        <div
          style={{
            padding: "10px 24px",
            borderBottom: `1px solid ${C.border}`,
            background: C.cream3,
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 9,
                padding: "1px 7px",
                background: C.cream3,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                color: C.ink4,
                fontFamily: "'DM Mono', ui-monospace, monospace",
              }}
            >
              tool
            </span>
            <span style={{ fontSize: 9, color: C.ink4 }}>human-era tool</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 9,
                padding: "1px 7px",
                background: C.redLight,
                border: `1px solid ${C.redBorder}`,
                borderRadius: 2,
                color: C.red,
                fontFamily: "'DM Mono', ui-monospace, monospace",
                textDecoration: "line-through",
              }}
            >
              tool
            </span>
            <span style={{ fontSize: 9, color: C.ink4 }}>broken for agents</span>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 9, color: C.ink5 }}>click any layer to expand</div>
        </div>

        {LAYERS.map((layer, i) => {
          const isActive = activeLayer === layer.id
          const isRevealed = revealed.has(layer.id)
          const strike = isActive || isRevealed
          const accentColor = layer.accentColor

          return (
            <div
              key={layer.id}
              role="button"
              tabIndex={0}
              onClick={() => toggleLayer(layer.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  toggleLayer(layer.id)
                }
              }}
              style={{
                borderBottom: `1px solid ${C.border}`,
                borderLeft: `3px solid ${isActive ? accentColor : C.border}`,
                background: isActive ? C.cream2 : i % 2 === 0 ? C.cream : C.cream2,
                cursor: "pointer",
                transition: "background 0.15s, border-left-color 0.15s",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "52px 1fr auto",
                  alignItems: "start",
                  padding: "14px 16px 14px 0",
                }}
              >
                <div style={{ padding: "0 0 0 14px" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isActive ? accentColor : C.ink5,
                      fontFamily: "'DM Mono', ui-monospace, monospace",
                      lineHeight: 1,
                    }}
                  >
                    {layer.num}
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: accentColor, fontFamily: "'DM Mono', ui-monospace, monospace" }}>
                      {layer.actor}
                    </span>
                    <span style={{ fontSize: 10, color: C.ink4, fontStyle: "italic", fontFamily: "'Instrument Serif', Georgia, serif" }}>
                      {layer.question}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                    {layer.before.map((b) => (
                      <span
                        key={b.tool}
                        style={{
                          fontSize: 8.5,
                          padding: "2px 7px",
                          borderRadius: 2,
                          fontFamily: "'DM Mono', ui-monospace, monospace",
                          border: `1px solid ${strike ? C.redBorder : C.border}`,
                          background: strike ? C.redLight : C.cream3,
                          color: strike ? C.red : C.ink4,
                          textDecoration: strike ? "line-through" : "none",
                          opacity: strike ? 0.7 : 1,
                          transition: "all 0.25s",
                        }}
                      >
                        {b.tool}
                      </span>
                    ))}
                    {strike && (
                      <span
                        style={{
                          fontSize: 8.5,
                          padding: "2px 7px",
                          borderRadius: 2,
                          background: C.redLight,
                          border: `1px solid ${C.redBorder}`,
                          color: C.red,
                          fontFamily: "'DM Mono', ui-monospace, monospace",
                        }}
                      >
                        ✕ breaks for agents
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <>
                      <div
                        className="fourparty-rebuild-fade"
                        style={{
                          marginTop: 10,
                          padding: "8px 12px",
                          background: C.redLight,
                          border: `1px solid ${C.redBorder}`,
                          borderRadius: 5,
                          fontSize: 10,
                          color: C.red,
                          lineHeight: 1.6,
                          fontStyle: "italic",
                        }}
                      >
                        {layer.breakSummary}
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <div
                          style={{
                            fontSize: 8,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: C.ink4,
                            marginBottom: 8,
                            fontFamily: "'DM Mono', ui-monospace, monospace",
                          }}
                        >
                          rebuilt for agents
                        </div>
                        <div className="fourparty-rebuild-slide" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 2 }}>
                          <div style={{ background: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 8, padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                              <svg width="14" height="9" viewBox="0 0 36 24" aria-hidden>
                                <path
                                  d="M3 19Q18 2 33 19"
                                  fill="none"
                                  stroke={C.blue}
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />
                                <circle cx="3" cy="19" r="2" fill={C.blue} />
                                <circle cx="33" cy="19" r="2" fill={C.blue} />
                              </svg>
                              <span
                                style={{
                                  fontSize: 9,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: C.blue,
                                  fontFamily: "'DM Mono', ui-monospace, monospace",
                                }}
                              >
                                Visa
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: C.blue,
                                fontFamily: "'DM Mono', ui-monospace, monospace",
                                marginBottom: 5,
                              }}
                            >
                              {layer.visaAfter.tool}
                            </div>
                            <div style={{ fontSize: 10, color: "#1a4a90", lineHeight: 1.65, marginBottom: 8 }}>{layer.visaAfter.how}</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 6 }}>
                              {layer.visaAfter.fields.map((f) => (
                                <div key={f} style={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
                                  <span style={{ color: C.blue, fontSize: 9, marginTop: 1, flexShrink: 0 }}>→</span>
                                  <span style={{ fontSize: 9, fontFamily: "'DM Mono', ui-monospace, monospace", color: "#2a5ab0", lineHeight: 1.5 }}>
                                    {f}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <span
                              style={{
                                fontSize: 8,
                                padding: "2px 6px",
                                background: "#dce8ff",
                                color: C.blue,
                                border: `1px solid ${C.blueBorder}`,
                                borderRadius: 2,
                                fontFamily: "'DM Mono', ui-monospace, monospace",
                              }}
                            >
                              {layer.visaAfter.standard}
                            </span>
                          </div>
                          <div style={{ background: C.mcLight, border: `1px solid ${C.mcBorder}`, borderRadius: 8, padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                              <div style={{ position: "relative", width: 22, height: 14 }}>
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    width: 14,
                                    height: 14,
                                    background: "#e8372a",
                                    borderRadius: "50%",
                                    opacity: 0.9,
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 8,
                                    top: 0,
                                    width: 14,
                                    height: 14,
                                    background: "#f5a800",
                                    borderRadius: "50%",
                                    opacity: 0.9,
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontSize: 9,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: C.mc,
                                  fontFamily: "'DM Mono', ui-monospace, monospace",
                                }}
                              >
                                Mastercard
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: C.mc,
                                fontFamily: "'DM Mono', ui-monospace, monospace",
                                marginBottom: 5,
                              }}
                            >
                              {layer.mcAfter.tool}
                            </div>
                            <div style={{ fontSize: 10, color: "#6b2a10", lineHeight: 1.65, marginBottom: 8 }}>{layer.mcAfter.how}</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 6 }}>
                              {layer.mcAfter.fields.map((f) => (
                                <div key={f} style={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
                                  <span style={{ color: C.mc, fontSize: 9, marginTop: 1, flexShrink: 0 }}>→</span>
                                  <span style={{ fontSize: 9, fontFamily: "'DM Mono', ui-monospace, monospace", color: "#7a3010", lineHeight: 1.5 }}>
                                    {f}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <span
                              style={{
                                fontSize: 8,
                                padding: "2px 6px",
                                background: "#ffe8da",
                                color: C.mc,
                                border: `1px solid ${C.mcBorder}`,
                                borderRadius: 2,
                                fontFamily: "'DM Mono', ui-monospace, monospace",
                              }}
                            >
                              {layer.mcAfter.standard}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div
                  style={{
                    padding: "2px 16px 0 12px",
                    fontSize: 11,
                    color: isActive ? accentColor : C.ink5,
                    fontFamily: "'DM Mono', ui-monospace, monospace",
                    transition: "transform 0.2s",
                    transform: isActive ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  →
                </div>
              </div>
            </div>
          )
        })}

        <div style={{ padding: "14px 24px 16px", background: C.cream2, borderTop: `1px solid ${C.border}` }}>
          <div
            style={{
              fontSize: 12,
              color: C.ink3,
              lineHeight: 1.75,
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: "italic",
            }}
          >
            The 4-party settlement model is unchanged. The same ISO 8583 messages flow from acquirer to network to issuer. The same T+1 clearing. The same chargeback rules. What changed is every security tool at every layer — replaced with one that works for non-human principals.
          </div>
        </div>
      </div>
    </div>
  )
}
