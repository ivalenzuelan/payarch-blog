import { useState } from "react"

const TRADITIONAL = [
  {
    id: "consumer",
    label: "Consumer",
    sub: "Present at checkout",
    color: "var(--ink-900)",
    bg: "var(--ink-100)",
    border: "var(--ink-200)",
    role: "actor",
    detail: "Authenticates in real time. Enters card credentials. Approves each transaction. Present at every step of the checkout flow.",
    changed: false,
  },
  {
    id: "issuer",
    label: "Issuer Bank",
    sub: "Scores human behavior",
    color: "var(--diagram-1)",
    bg: "color-mix(in srgb, var(--diagram-1) 10%, var(--paper-pure))",
    border: "color-mix(in srgb, var(--diagram-1) 30%, var(--ink-200))",
    role: "infrastructure",
    detail: "Risk model trained on human behavioral signals: typing cadence, geolocation patterns, device fingerprint. Approves or declines in ~80ms.",
    changed: false,
  },
  {
    id: "network",
    label: "Card Network",
    sub: "Routes ISO 8583",
    color: "var(--success)",
    bg: "color-mix(in srgb, var(--success) 8%, var(--paper-pure))",
    border: "color-mix(in srgb, var(--success) 28%, var(--ink-200))",
    role: "infrastructure",
    detail: "Routes ISO 8583 MTI 0100 from acquirer to issuer. De-tokenizes PAN. Applies network fraud scoring. Returns authorization response.",
    changed: false,
  },
  {
    id: "acquirer",
    label: "Acquirer",
    sub: "Packages payment",
    color: "var(--diagram-3)",
    bg: "color-mix(in srgb, var(--warning) 6%, var(--paper-pure))",
    border: "color-mix(in srgb, var(--warning) 32%, var(--ink-200))",
    role: "infrastructure",
    detail: "Packages merchant payment into ISO 8583. card-not-present entry signal (manual key entry). No agent fields. Sends to network.",
    changed: false,
  },
  {
    id: "merchant",
    label: "Merchant",
    sub: "Checkout form + CAPTCHA",
    color: "var(--ink-900)",
    bg: "var(--ink-100)",
    border: "var(--ink-200)",
    role: "actor",
    detail: "Presents checkout form. Requires human interaction. Bot protection blocks non-human traffic. Redirects for 3DS if needed.",
    changed: false,
  },
]

const AI_NATIVE = [
  {
    id: "consumer",
    label: "Consumer",
    sub: "Policy author — present once",
    color: "var(--ink-500)",
    bg: "var(--ink-100)",
    border: "var(--ink-200)",
    role: "actor",
    detail: "Enrolls card once. Configures spending policy: category limits, per-transaction cap, daily velocity. Creates FIDO2 Passkey. Receives push notification after purchase. Not present at checkout.",
    changed: true,
    change: "Role shifts from actor to policy author",
  },
  {
    id: "agent",
    label: "AI Agent",
    sub: "New — registered, credentialed",
    color: "var(--diagram-4)",
    bg: "color-mix(in srgb, var(--diagram-4) 8%, var(--paper-pure))",
    border: "color-mix(in srgb, var(--diagram-4) 25%, var(--ink-200))",
    role: "new",
    detail: "New party in the model. Interprets consumer intent. Registered with network key directory. Holds agent-specific token. Signs every request with Ed25519 key pair. Cannot exceed consumer spending policy.",
    changed: true,
    change: "Entirely new role — did not exist in traditional model",
  },
  {
    id: "issuer",
    label: "Issuer Bank",
    sub: "Loads agent spending policy",
    color: "var(--diagram-1)",
    bg: "color-mix(in srgb, var(--diagram-1) 10%, var(--paper-pure))",
    border: "color-mix(in srgb, var(--diagram-1) 30%, var(--ink-200))",
    role: "infrastructure",
    detail: "agent-context flag triggers agent policy instead of human behavioral model. Checks: balance, per-transaction limit, MCC category, velocity, token status. Deterministic rules — not probabilistic scoring.",
    changed: true,
    change: "New agent-context flag rule set — deterministic not probabilistic",
  },
  {
    id: "network",
    label: "Card Network",
    sub: "Identity layer + token service",
    color: "var(--success)",
    bg: "color-mix(in srgb, var(--success) 8%, var(--paper-pure))",
    border: "color-mix(in srgb, var(--success) 28%, var(--ink-200))",
    role: "infrastructure",
    detail: "New: TAP (Visa) or Agent Pay (Mastercard) as identity layer pre-payment. Token service now issues agent-specific tokens. private instruction reference integrity check validates instruction against consumer authorization. agent-context flag triggers agent risk rules.",
    changed: true,
    change: "New identity layer + agent-specific token service",
  },
  {
    id: "acquirer",
    label: "Acquirer",
    sub: "New ISO 8583 fields",
    color: "var(--diagram-3)",
    bg: "color-mix(in srgb, var(--warning) 6%, var(--paper-pure))",
    border: "color-mix(in srgb, var(--warning) 32%, var(--ink-200))",
    role: "infrastructure",
    detail: "F002: agent-specific token (not real PAN). agent-context flag (agent-initiated). F048: agent identifier. private instruction reference: TAP/Agent Pay instruction reference hash. Otherwise unchanged.",
    changed: true,
    change: "F002 + agent-context flag + F048 + private instruction reference",
  },
  {
    id: "merchant",
    label: "Merchant",
    sub: "TAP SDK or CDN verification",
    color: "var(--ink-900)",
    bg: "var(--ink-100)",
    border: "var(--ink-200)",
    role: "actor",
    detail: "Visa: TAP SDK validates JWT locally in local verification. Merchant sees consumer context. Mastercard: CDN layer (Cloudflare) verifies agent identity — no merchant code change needed. Both: consumer_recognized=true skips onboarding.",
    changed: true,
    change: "Bot protection now passes registered agents",
  },
]

export default function FourPartyDiagram() {
  const [mode, setMode] = useState("compare")
  const [selected, setSelected] = useState(null)

  return (
    <div style={{ fontFamily: "'Georgia','Times New Roman',serif", color: "var(--ink-900)", background: "var(--paper)", borderRadius: 12, border: "1px solid var(--ink-200)", overflow: "hidden", maxWidth: 820 }}>

      {/* Header */}
      <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid var(--ink-200)", background: "var(--ink-100)" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-500)", fontFamily: "'Courier New',monospace", marginBottom: 5 }}>
          The 4-party model · traditional vs AI-native
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.02em", margin: 0 }}>
            What changes when an AI agent pays
          </h2>
          <div style={{ display: "flex", gap: 2, background: "var(--ink-200)", borderRadius: 5, padding: 2 }}>
            {[["compare", "side by side"], ["traditional", "traditional"], ["ai", "AI-native"]].map(([v, label]) => (
              <button key={v} onClick={() => { setMode(v); setSelected(null) }} style={{
                padding: "4px 12px", borderRadius: 3, fontSize: 10, fontFamily: "'Courier New',monospace",
                cursor: "pointer", border: "none", letterSpacing: "0.04em",
                background: mode === v ? "var(--paper)" : "transparent",
                color: mode === v ? "var(--ink-900)" : "var(--ink-500)",
                fontWeight: mode === v ? 600 : 400, transition: "all .15s"
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Diagram */}
      <div style={{ padding: "20px 20px 16px" }}>
        {mode === "compare" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Traditional */}
            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-500)", fontFamily: "'Courier New',monospace", marginBottom: 10, textAlign: "center" }}>traditional</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {TRADITIONAL.map((n, i) => (
                  <div key={n.id}>
                    <div onClick={() => setSelected(selected === n.id ? null : n.id)} style={{
                      background: n.bg, border: `1px solid ${n.border}`,
                      borderRadius: 6, padding: "8px 12px", cursor: "pointer",
                      transition: "background .1s",
                      borderLeft: `3px solid ${n.color}`,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: n.color, fontFamily: "'Courier New',monospace" }}>{n.label}</div>
                      <div style={{ fontSize: 10, color: "var(--ink-500)", fontFamily: "'Courier New',monospace", marginTop: 2 }}>{n.sub}</div>
                    </div>
                    {i < TRADITIONAL.length - 1 && (
                      <div style={{ display: "flex", justifyContent: "center", margin: "2px 0" }}>
                        <div style={{ width: 1, height: 10, background: "var(--ink-300)" }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* AI-native */}
            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--diagram-4)", fontFamily: "'Courier New',monospace", marginBottom: 10, textAlign: "center" }}>AI-native</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {AI_NATIVE.map((n, i) => (
                  <div key={n.id}>
                    <div onClick={() => setSelected(selected === n.id ? null : n.id)} style={{
                      background: n.id === "agent" ? "color-mix(in srgb, var(--diagram-4) 8%, var(--paper-pure))" : n.bg,
                      border: `1px solid ${n.id === "agent" ? "color-mix(in srgb, var(--diagram-4) 32%, var(--ink-200))" : n.border}`,
                      borderRadius: 6, padding: "8px 12px", cursor: "pointer",
                      transition: "background .1s",
                      borderLeft: `3px solid ${n.color}`,
                      position: "relative",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: n.color, fontFamily: "'Courier New',monospace" }}>{n.label}</div>
                          <div style={{ fontSize: 10, color: "var(--ink-500)", fontFamily: "'Courier New',monospace", marginTop: 2 }}>{n.sub}</div>
                        </div>
                        {n.id === "agent" && (
                          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 2, background: "color-mix(in srgb, var(--diagram-4) 10%, var(--paper-pure))", color: "var(--diagram-4)", border: "1px solid color-mix(in srgb, var(--diagram-4) 32%, var(--ink-200))", fontFamily: "'Courier New',monospace", letterSpacing: "0.05em" }}>NEW</span>
                        )}
                        {n.changed && n.id !== "agent" && (
                          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 2, background: "color-mix(in srgb, var(--diagram-3) 6%, var(--paper-pure))", color: "var(--signal-600)", border: "1px solid color-mix(in srgb, var(--diagram-3) 35%, var(--ink-200))", fontFamily: "'Courier New',monospace", letterSpacing: "0.05em" }}>MOD</span>
                        )}
                      </div>
                    </div>
                    {i < AI_NATIVE.length - 1 && (
                      <div style={{ display: "flex", justifyContent: "center", margin: "2px 0" }}>
                        <div style={{ width: 1, height: 10, background: "var(--ink-300)" }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Single mode view
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {(mode === "traditional" ? TRADITIONAL : AI_NATIVE).map((n, i, arr) => (
              <div key={n.id}>
                <div onClick={() => setSelected(selected === n.id ? null : n.id)} style={{
                  background: n.bg, border: `1px solid ${selected === n.id ? n.color : n.border}`,
                  borderRadius: 8, padding: "10px 16px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  transition: "all .1s", borderLeft: `3px solid ${n.color}`,
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: n.color, fontFamily: "'Courier New',monospace" }}>{n.label}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-500)", fontFamily: "'Courier New',monospace", marginTop: 2 }}>{n.sub}</div>
                  </div>
                  {mode === "ai" && n.id === "agent" && (
                    <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 2, background: "color-mix(in srgb, var(--diagram-4) 10%, var(--paper-pure))", color: "var(--diagram-4)", border: "1px solid color-mix(in srgb, var(--diagram-4) 32%, var(--ink-200))", fontFamily: "'Courier New',monospace" }}>NEW PARTY</span>
                  )}
                  {mode === "ai" && n.changed && n.id !== "agent" && (
                    <span style={{ fontSize: 9, color: "var(--signal-600)", fontFamily: "'Courier New',monospace" }}>{n.change}</span>
                  )}
                </div>
                {selected === n.id && (
                  <div style={{ margin: "4px 0 6px", background: n.bg, border: `1px solid ${n.color}40`, borderLeft: `3px solid ${n.color}`, borderRadius: "0 8px 8px 0", padding: "10px 14px" }}>
                    <div style={{ fontSize: 12, color: "var(--ink-700)", lineHeight: 1.65, fontFamily: "Georgia, serif" }}>{n.detail}</div>
                  </div>
                )}
                {i < arr.length - 1 && (
                  <div style={{ display: "flex", justifyContent: "center", height: 16, alignItems: "center" }}>
                    <div style={{ width: 1, height: "100%", background: "var(--ink-300)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ padding: "10px 20px 14px", borderTop: "1px solid var(--ink-200)", background: "var(--ink-100)", display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "'Courier New',monospace", color: "var(--ink-500)" }}>
          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 2, background: "color-mix(in srgb, var(--diagram-4) 10%, var(--paper-pure))", color: "var(--diagram-4)", border: "1px solid color-mix(in srgb, var(--diagram-4) 32%, var(--ink-200))" }}>NEW</span>
          AI Agent — new party
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "'Courier New',monospace", color: "var(--ink-500)" }}>
          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 2, background: "color-mix(in srgb, var(--diagram-3) 6%, var(--paper-pure))", color: "var(--signal-600)", border: "1px solid color-mix(in srgb, var(--diagram-3) 35%, var(--ink-200))" }}>MOD</span>
          Role or behavior modified
        </div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-400)", fontFamily: "'Courier New',monospace" }}>click any node to expand</div>
      </div>

    </div>
  )
}
