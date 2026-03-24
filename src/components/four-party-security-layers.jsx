import { useState } from "react"

const C = {
  cream: "#faf9f6",
  cream2: "#f5f3ee",
  cream3: "#ede9e2",
  ink: "#1a1814",
  ink2: "#4a4440",
  ink3: "#8a8278",
  ink4: "#b8b3a8",
  red: "#c02010",
  redLight: "#fff4f2",
  redBorder: "#f0b0a0",
  green: "#186040",
  greenLight: "#f0f8f4",
  greenBorder: "#b0d8c0",
  blue: "#185FA5",
  blueLight: "#f0f4ff",
  blueBorder: "#c0d0f0",
  mc: "#993C1D",
  mcLight: "#fff4f0",
  mcBorder: "#f0c0a0",
  border: "#e0dbd0",
}

const ACCENTS = ["#1a1814", "#7a4a10", "#186040", "#185FA5"]

const LAYERS = [
  {
    num: "01",
    actor: "Merchant + Gateway",
    humanTools: ["CAPTCHA", "WAF rules", "Device fingerprint", "Velocity checks"],
    agentFails: [
      { x: "✕", t: "No mouse / keyboard events → CAPTCHA fails" },
      { x: "✕", t: "Headless Chrome fingerprint → WAF blocks" },
      { x: "✕", t: "Machine speed from AWS IP → velocity flagged" },
    ],
    agentNote: "Blocked before generating an authorization request.",
    visaFix: "TAP JWT — merchant validates Ed25519 agent credential in <5ms via cached Visa public key",
    mcFix: "Web Bot Auth at CDN layer — Cloudflare verifies agent before request reaches merchant",
  },
  {
    num: "02",
    actor: "Acquirer + Processor",
    humanTools: ["AVS match", "CVV verify", "IP reputation", "F022=01 rules"],
    agentFails: [
      { x: "✕", t: "No AVS — agent submits credentials programmatically" },
      { x: "✕", t: "Data center IP → malicious IP heuristic triggered" },
      { x: "✕", t: "F022=01 tells downstream: apply human fraud rules" },
    ],
    agentNote: 'Every ISO 8583 signal says "this looks like credential stuffing."',
    visaFix: "F022=81 + F048 (agent-id) + F126 (TAP instruction hash) — new fields signal agent context to entire downstream chain",
    mcFix: "Agentic Token metadata + F022 equivalent — agent identity flows through token, not message fields",
  },
  {
    num: "03",
    actor: "Card Network",
    humanTools: ["ML behavioral score", "Cross-merchant velocity", "Human baseline model", "Distributed bot detection"],
    agentFails: [
      { x: "✕", t: "Machine speed → ML model scores maximum risk" },
      { x: "✕", t: "No human behavioral baseline to compare against" },
      { x: "✕", t: "No way to validate consumer pre-authorized this intent" },
    ],
    agentNote: "The most powerful models in the chain were trained to catch exactly this pattern.",
    visaFix: "VIC payment instruction registry — VisaNet validates F126 hash against pre-authorized intent. Amount + merchant tamper = immediate decline",
    mcFix: "Agentic Token binding — network validates token was issued for this specific agent + consumer + context",
  },
  {
    num: "04",
    actor: "Issuer Bank",
    humanTools: ["Cardholder history", "Probabilistic risk engine", "Step-up 3DS auth", "SMS / biometric challenge"],
    agentFails: [
      { x: "✕", t: "High risk score from network → step-up triggered" },
      { x: "✕", t: "3DS SMS challenge sent — agent cannot respond" },
      { x: "✕", t: "Transaction fails permanently — no fallback path" },
    ],
    agentNote: "Step-up is unrecoverable. The agent cannot prove human presence in real time.",
    visaFix: "FIDO2 Passkey pre-authorized at instruction time. F022=81 → issuer loads agent spending policy. Deterministic rules replace probabilistic scoring + 3DS",
    mcFix: "Mastercard Payment Passkey pre-authorized. Agent spending policy: limit ✓ · category ✓ · velocity ✓. No step-up required",
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

export default function FourPartySecurityLayers() {
  const [mode, setMode] = useState("human")
  const [openLayer, setOpenLayer] = useState(null)

  const isHuman = mode === "human"

  const setModeAndClose = (m) => {
    setMode(m)
    setOpenLayer(null)
  }

  const toggleLayer = (num) => {
    setOpenLayer((o) => (o === num ? null : num))
  }

  return (
    <div style={shell}>
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
        <div style={{ padding: "16px 22px 13px", background: C.cream2, borderBottom: `1px solid ${C.border}` }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.ink4,
              marginBottom: 5,
            }}
          >
            4-party model · layered fraud defense
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 400,
                letterSpacing: "-0.02em",
                margin: 0,
                fontFamily: "'Instrument Serif', Georgia, serif",
                color: C.ink,
              }}
            >
              {isHuman
                ? "Human transaction — how each layer verifies"
                : "AI agent transaction — how each layer breaks"}
            </h2>
            <div
              style={{
                display: "flex",
                gap: 2,
                background: C.cream3,
                borderRadius: 5,
                padding: 2,
              }}
            >
              {["human", "agent"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeAndClose(m)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 3,
                    fontSize: 9,
                    fontFamily: "'DM Mono', ui-monospace, monospace",
                    cursor: "pointer",
                    border: "none",
                    letterSpacing: "0.04em",
                    background: mode === m ? C.cream : "transparent",
                    color: mode === m ? C.ink : C.ink4,
                    fontWeight: mode === m ? 600 : 400,
                  }}
                >
                  {m === "agent" ? "AI agent" : m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "44px 150px 1fr 28px",
            background: C.cream3,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div />
          <div style={{ padding: "7px 12px", fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", color: C.ink4 }}>
            Layer
          </div>
          <div
            style={{
              padding: "7px 12px",
              fontSize: 8,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.ink4,
              borderLeft: `1px solid ${C.border}`,
            }}
          >
            {isHuman ? "Tools (all pass for humans)" : "What breaks for AI agents (click to expand)"}
          </div>
          <div />
        </div>

        {LAYERS.map((layer, idx) => {
          const isOpen = openLayer === layer.num
          const accentColor = ACCENTS[idx]
          const bgColor = isOpen ? (isHuman ? C.greenLight : C.redLight) : C.cream
          const borderColor = isOpen ? (isHuman ? C.greenBorder : C.redBorder) : C.border

          return (
            <div
              key={layer.num}
              role="button"
              tabIndex={0}
              onClick={() => toggleLayer(layer.num)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  toggleLayer(layer.num)
                }
              }}
              style={{
                cursor: "pointer",
                borderBottom: `1px solid ${C.border}`,
                borderLeft: `3px solid ${isOpen ? accentColor : C.border}`,
                background: bgColor,
                transition: "background 0.15s",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 150px 1fr 28px",
                  alignItems: "center",
                  gap: 0,
                  padding: 0,
                }}
              >
                <div
                  style={{
                    padding: "14px 0 14px 12px",
                    fontSize: 11,
                    fontFamily: "'DM Mono', ui-monospace, monospace",
                    color: isOpen ? accentColor : C.ink4,
                    fontWeight: 600,
                  }}
                >
                  {layer.num}
                </div>
                <div style={{ padding: "14px 12px" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: accentColor,
                      fontFamily: "'DM Mono', ui-monospace, monospace",
                      lineHeight: 1.3,
                    }}
                  >
                    {layer.actor}
                  </div>
                </div>
                <div style={{ padding: "10px 12px", display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                  {isHuman
                    ? layer.humanTools.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: 8,
                            padding: "2px 6px",
                            background: C.greenLight,
                            border: `1px solid ${C.greenBorder}`,
                            borderRadius: 2,
                            color: C.green,
                            fontFamily: "'DM Mono', ui-monospace, monospace",
                          }}
                        >
                          ✓ {t}
                        </span>
                      ))
                    : layer.agentFails.map((f) => (
                        <span
                          key={f.t}
                          style={{
                            fontSize: 8,
                            padding: "2px 6px",
                            background: C.redLight,
                            border: `1px solid ${C.redBorder}`,
                            borderRadius: 2,
                            color: C.red,
                            fontFamily: "'DM Mono', ui-monospace, monospace",
                          }}
                        >
                          {f.x} {f.t.split(" ")[0]}
                        </span>
                      ))}
                </div>
                <div style={{ padding: "14px 10px", fontSize: 11, color: C.ink4, fontFamily: "'DM Mono', ui-monospace, monospace" }}>
                  {isOpen ? "↑" : "↓"}
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: "0 12px 14px 44px", borderTop: `1px solid ${borderColor}` }}>
                  {isHuman ? (
                    <div style={{ paddingTop: 10 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {layer.humanTools.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: 9,
                              padding: "2px 7px",
                              background: C.greenLight,
                              border: `1px solid ${C.greenBorder}`,
                              borderRadius: 2,
                              color: C.green,
                              fontFamily: "'DM Mono', ui-monospace, monospace",
                            }}
                          >
                            ✓ {t}
                          </span>
                        ))}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: C.ink2,
                          fontStyle: "italic",
                          padding: "6px 10px",
                          background: C.cream,
                          border: `1px solid ${C.border}`,
                          borderRadius: 4,
                        }}
                      >
                        All signals indicate human presence — layer passes.
                      </div>
                    </div>
                  ) : (
                    <div style={{ paddingTop: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
                        {layer.agentFails.map((f) => (
                          <div key={f.t} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span
                              style={{
                                color: C.red,
                                fontSize: 10,
                                fontFamily: "'DM Mono', ui-monospace, monospace",
                                flexShrink: 0,
                                marginTop: 1,
                              }}
                            >
                              ✕
                            </span>
                            <span style={{ fontSize: 11, color: C.ink2, lineHeight: 1.6 }}>{f.t}</span>
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: C.red,
                          padding: "7px 10px",
                          background: C.redLight,
                          border: `1px solid ${C.redBorder}`,
                          borderRadius: 4,
                          marginBottom: 10,
                          fontStyle: "italic",
                        }}
                      >
                        {layer.agentNote}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div style={{ background: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: "10px 12px" }}>
                          <div
                            style={{
                              fontSize: 8,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: C.blue,
                              marginBottom: 5,
                              fontFamily: "'DM Mono', ui-monospace, monospace",
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <svg width="12" height="8" viewBox="0 0 36 24" aria-hidden>
                              <path
                                d="M3 19Q18 2 33 19"
                                fill="none"
                                stroke={C.blue}
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                              <circle cx="3" cy="19" r="1.5" fill={C.blue} />
                              <circle cx="33" cy="19" r="1.5" fill={C.blue} />
                            </svg>
                            Visa
                          </div>
                          <div style={{ fontSize: 10, color: C.blue, lineHeight: 1.6 }}>{layer.visaFix}</div>
                        </div>
                        <div style={{ background: C.mcLight, border: `1px solid ${C.mcBorder}`, borderRadius: 6, padding: "10px 12px" }}>
                          <div
                            style={{
                              fontSize: 8,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: C.mc,
                              marginBottom: 5,
                              fontFamily: "'DM Mono', ui-monospace, monospace",
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <div style={{ width: 12, height: 8, background: "#e8372a", borderRadius: 1 }} />
                            MC
                          </div>
                          <div style={{ fontSize: 10, color: C.mc, lineHeight: 1.6 }}>{layer.mcFix}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <div style={{ padding: "12px 22px", background: C.cream2, borderTop: `1px solid ${C.border}` }}>
          <div
            style={{
              fontSize: 11,
              color: C.ink3,
              lineHeight: 1.7,
              fontStyle: "italic",
              fontFamily: "'Instrument Serif', Georgia, serif",
            }}
          >
            {isHuman
              ? "Every layer passes because every tool assumes human presence. Remove the human — and the entire stack fails simultaneously."
              : "The layered defense is preserved. Each party still has its responsibility. But every tool has been replaced with one that works for non-human principals."}
          </div>
        </div>
      </div>
    </div>
  )
}
