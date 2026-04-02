import { useState, useEffect, useRef } from "react"

const ACTORS = [
  { id: "agent", label: "AI Agent", sub: "Skyfire · Claude", color: "#7040c0", bg: "#f8f4ff", border: "#ddd0f8" },
  { id: "visa", label: "Visa TAP", sub: "tap.visa.com · Cloudflare", color: "#1a56a0", bg: "#f0f4ff", border: "#c0d0f0" },
  { id: "merchant", label: "Merchant", sub: "bose.com · TAP SDK", color: "#1a7a50", bg: "#f0f8f4", border: "#b0d8c0" },
]

const STEPS = [
  {
    from: "agent", to: "visa",
    arrow: "agent → visa",
    label: "POST /v1/validate",
    sub: "HTTP Message Signature · Ed25519",
    color: "#7040c0",
    time: "t + 0ms",
    title: "Agent constructs signed HTTP request",
    rows: [
      { key: "Signature-Input", val: 'tap-sig=("@method" "@target-uri" "x-tap-agent-id" "x-tap-intent"); keyid="skyfire-001"; tag="tap-purchase"; created=1742518234; nonce="a3f8c2e1d9b7"', hi: true },
      { key: "Signature", val: "tap-sig=:MEQCIBx7zKp9mN3...base64==:", hi: true },
      { key: "X-Tap-Agent-Id", val: "skyfire-agent-001", hi: false },
      { key: "X-Tap-Intent", val: "purchase", hi: true },
      { key: "X-Tap-Consumer-Token", val: "eyJhbGciOiJFUzI1NiJ9...", hi: false },
    ],
    note: "The signature covers method, URI, agent-id, intent, and body hash. The nonce is cryptographically random and unique to this request — stored permanently after use to prevent replay.",
  },
  {
    from: "visa", to: "visa",
    arrow: "visa internal",
    label: "Validate signature + policy",
    sub: "Key directory · nonce store · behavioral",
    color: "#1a56a0",
    time: "t + 12ms",
    title: "Visa TAP runs three independent checks",
    rows: [
      { key: "1. Key fetch", val: "GET .well-known/agents/skyfire-001 → ed25519:MCowBQYDK2Vd... (cached 5 min)", hi: false },
      { key: "2. Ed25519 verify", val: "Reconstruct canonical form → verify signature → ✓ valid", hi: true },
      { key: "3. Nonce check", val: "a3f8c2e1d9b7 not in store → ✓ unused · stored permanently", hi: true },
      { key: "4. Timestamp", val: "created=1742518234 · delta 8s < 60s limit → ✓", hi: false },
      { key: "5. Wallet policy", val: "token vts-AGNT-001 · active · $89.99 ≤ $500 → ✓", hi: false },
      { key: "6. Cloudflare WBA", val: "Request patterns ✓ · TLS fingerprint ✓ · velocity ✓", hi: false },
    ],
    note: "Two independent trust signals: cryptographic (Ed25519) and behavioral (Cloudflare edge). Both must pass.",
  },
  {
    from: "visa", to: "agent",
    arrow: "visa → agent",
    label: "200 OK · TAP JWT",
    sub: "Signed credential · TTL 90s",
    color: "#1a56a0",
    time: "t + 48ms",
    title: "Visa issues signed JWT — valid 90 seconds",
    rows: [
      { key: "iss", val: "tap.visa.com", hi: false },
      { key: "sub", val: "skyfire-agent-001", hi: false },
      { key: "aud", val: "bose.com", hi: false },
      { key: "exp", val: "1742518324 — TTL 90 seconds only", hi: true },
      { key: "nonce", val: "a3f8c2e1d9b7 — replay-protected", hi: true },
      { key: "consumer_recognized", val: "true — returning customer", hi: true },
      { key: "instruction_ref", val: "pi-abc123 — will appear in ISO 8583 F126", hi: true },
      { key: "risk_score", val: "12 / 100 — low risk", hi: false },
    ],
    note: "JWT signed with Visa's private key. Merchant verifies using Visa's public key — no call to Visa needed at checkout. The instruction_ref links this credential to the ISO 8583 message downstream.",
  },
  {
    from: "agent", to: "merchant",
    arrow: "agent → merchant",
    label: "POST /checkout",
    sub: "Authorization: TAP-1.0 {jwt}",
    color: "#7040c0",
    time: "t + 52ms",
    title: "Agent presents credential at merchant checkout",
    rows: [
      { key: "Authorization", val: "TAP-1.0 eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...", hi: true },
      { key: "Body", val: '{ "items": [{"sku":"BOSE-QC45","qty":1}], "amount":89.99, "instruction_ref":"pi-abc123" }', hi: false },
    ],
    note: 'tag="tap-purchase" in the original Signature-Input tells the MerchantSDK this agent intends to buy, not just browse. The SDK can gate purchase flows differently from catalog browsing.',
  },
  {
    from: "merchant", to: "merchant",
    arrow: "merchant internal",
    label: "Verify JWT locally",
    sub: "No external call · < 5ms",
    color: "#1a7a50",
    time: "t + 56ms",
    title: "MerchantSDK validates — seven checks, all local",
    rows: [
      { key: "Signature", val: "Ed25519 verify with cached Visa public key → ✓ valid", hi: true },
      { key: "exp", val: "1742518324 > now · 36s remaining → ✓", hi: false },
      { key: "nonce", val: "a3f8c2e1d9b7 not in local store → ✓ · stored", hi: true },
      { key: "aud", val: '"bose.com" === this merchant → ✓', hi: false },
      { key: "amount", val: "89.99 === cart total → ✓", hi: false },
      { key: "consumer_recognized", val: "true → skip new-customer onboarding", hi: true },
    ],
    note: "All checks pass in under 5ms with no external call. Total TAP handshake: ~60ms. Order created. Stripe PaymentIntent called. The ISO 8583 leg begins.",
  },
  {
    from: "merchant", to: "agent",
    arrow: "merchant → agent",
    label: "200 OK · Order confirmed",
    sub: "No CAPTCHA · No redirect · No form",
    color: "#1a7a50",
    time: "t + 60ms · total",
    title: "Order accepted — zero friction",
    rows: [
      { key: "order_id", val: "BOSE-2026-78234", hi: true },
      { key: "status", val: "pending_payment", hi: false },
      { key: "next_step", val: "Stripe PaymentIntent → ISO 8583 0100 → VisaNet → issuer", hi: true },
    ],
    note: "The consumer never saw a checkout page. No card number entered. No CAPTCHA solved. The TAP handshake took 60ms. Payment authorization will take another ~1040ms.",
  },
]

// Arrow direction labels mapped to actor column positions (0=agent,1=visa,2=merchant)
const COL = { agent: 0, visa: 1, merchant: 2 }

// Crypto internals data — shown when crypto mode is active
const CRYPTO_DETAILS = {
  0: {
    title: "Canonical string construction (RFC 9421 §2.3)",
    sections: [
      {
        label: "1. Collect covered components",
        mono: true,
        lines: [
          '"@method": POST',
          '"@target-uri": https://tap.visa.com/v1/validate',
          '"x-tap-agent-id": skyfire-agent-001',
          '"x-tap-intent": purchase',
          '"content-digest": sha-256=:YjMzMDQ5YjQ4YzA=:',
        ]
      },
      {
        label: "2. Append signature params",
        mono: true,
        lines: [
          '"@signature-params": ("@method" "@target-uri" "x-tap-agent-id"',
          '  "x-tap-intent" "content-digest");keyid="skyfire-001";',
          '  tag="tap-purchase";created=1742518234;nonce="a3f8c2e1d9b7"',
        ]
      },
      {
        label: "3. Sign with Ed25519 private key",
        mono: false,
        lines: [
          "The canonical string is hashed with SHA-512, then signed with the agent's Ed25519 private key. Ed25519 signatures are deterministic — the same input always produces the same signature. Key length: 32 bytes (256 bits).",
        ]
      },
      {
        label: "4. Encode as base64url",
        mono: true,
        lines: [
          "tap-sig=:MEQCIBx7zKp9mN3vQs8Tr...base64==:",
        ]
      },
    ],
    note: "The private key never leaves the agent's secure enclave. Visa only stores the corresponding public key, retrieved from .well-known/agents/{agent_id}."
  },
  1: {
    title: "Signature verification internals (Ed25519)",
    sections: [
      {
        label: "1. Fetch public key",
        mono: true,
        lines: [
          "GET https://skyfire.xyz/.well-known/agents/skyfire-001",
          "→ { alg: Ed25519, pub: MCowBQYDK2VdA3IA... }",
          "   (cached 5 min, invalidated on key rotation)",
        ]
      },
      {
        label: "2. Reconstruct canonical string",
        mono: false,
        lines: [
          "Visa rebuilds the same canonical string from the incoming request's headers in exactly the same order listed in Signature-Input. Any discrepancy → reject.",
        ]
      },
      {
        label: "3. Ed25519 verify",
        mono: true,
        lines: [
          "ed25519.verify(",
          "  pubkey:    MCowBQYDK2Vd...",
          "  message:   SHA-512(canonical_string)",
          "  signature: MEQCIBx7zKp9mN3...",
          ") → true ✓",
        ]
      },
      {
        label: "4. Nonce deduplication",
        mono: true,
        lines: [
          "SETNX tap:nonce:a3f8c2e1d9b7 1 EX 300",
          "→ 1  (key did not exist → unused → store it)",
          "Any replay attempt: → 0 → reject immediately",
        ]
      },
    ],
    note: "Ed25519 verification takes ~0.05ms. The nonce check adds ~0.3ms (Redis lookup). Timestamp delta check is pure arithmetic. Total: <1ms of the 12ms validation window."
  },
  2: {
    title: "JWT structure (RFC 7519 + TAP extensions)",
    sections: [
      {
        label: "Header",
        mono: true,
        lines: [
          '{ "alg": "ES256", "typ": "JWT" }',
          "// Signed with Visa's ECDSA P-256 private key",
          "// Merchant verifies using Visa's cached public key",
        ]
      },
      {
        label: "Payload",
        mono: true,
        lines: [
          '{ "iss": "tap.visa.com",',
          '  "sub": "skyfire-agent-001",',
          '  "aud": "bose.com",',
          '  "iat": 1742518234,',
          '  "exp": 1742518324,          // +90 seconds only',
          '  "nonce": "a3f8c2e1d9b7",   // replay protection',
          '  "consumer_recognized": true,',
          '  "instruction_ref": "pi-abc123",',
          '  "risk_score": 12',
          '}',
        ]
      },
      {
        label: "Why 90 seconds TTL?",
        mono: false,
        lines: [
          "Long enough for the agent to reach the merchant and complete checkout. Short enough that a stolen JWT is useless — the nonce is bound to the token and already consumed at Visa. The aud claim is merchant-bound, so it cannot be replayed at a different merchant.",
        ]
      },
    ],
    note: "The merchant never calls Visa during checkout. It verifies the JWT signature using Visa's public key (fetched once on startup, rotated quarterly). Verification: <5ms, zero network calls."
  },
}

export default function TapHandshake() {
  const [openStep, setOpenStep] = useState(null)
  const [activeStep, setActiveStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [showCrypto, setShowCrypto] = useState(false)
  const playingRef = useRef(false)

  // toggle is used for keyboard/accessibility; goTo handles click interactions
  const _toggle = (i) => setOpenStep(prev => prev === i ? null : i)

  // Play through steps
  useEffect(() => {
    if (!playing) return
    playingRef.current = true

    const run = async () => {
      const start = activeStep < 0 ? 0 : activeStep + 1
      for (let i = start; i < STEPS.length; i++) {
        if (!playingRef.current) break
        setActiveStep(i)
        setOpenStep(i)
        await new Promise(r => setTimeout(r, 2400))
      }
      playingRef.current = false
      setPlaying(false)
    }
    run()

    return () => { playingRef.current = false }
  }, [playing])

  const reset = () => {
    playingRef.current = false
    setPlaying(false)
    setActiveStep(-1)
    setOpenStep(null)
  }

  const goTo = (i) => {
    setActiveStep(i)
    setOpenStep(openStep === i ? null : i)
  }

  const progress = activeStep < 0 ? 0 : ((activeStep + 1) / STEPS.length) * 100

  return (
    <div style={{ 
      fontFamily: "'Georgia','Times New Roman',serif", color: "#1a1814", background: "#faf9f6", borderRadius: 12, border: "1px solid #e0dbd0", overflow: "hidden", 
      width: "100vw", maxWidth: 1040, position: "relative", left: "50%", transform: "translateX(-50%)", margin: "20px 0"
    }}>

      {/* Header */}
      <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #e0dbd0", background: "#f5f3ee" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9a9288", fontFamily: "'Courier New',monospace", marginBottom: 5 }}>
          Trusted Agent Protocol · Handshake Sequence
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.02em", margin: "0 0 3px" }}>
              Agent authentication &amp; credential issuance
            </h2>
            <div style={{ fontSize: 11, color: "#9a9288", fontFamily: "'Courier New',monospace" }}>
              6 steps · ~60ms total · click any step to expand
            </div>
          </div>
          <button
            onClick={() => setShowCrypto(c => !c)}
            style={{
              padding: "5px 12px", borderRadius: 5, fontSize: 10, flexShrink: 0,
              fontFamily: "'Courier New',monospace", cursor: "pointer",
              border: `1px solid ${showCrypto ? "#7040c0" : "#d8d3c8"}`,
              background: showCrypto ? "#f5f0ff" : "transparent",
              color: showCrypto ? "#7040c0" : "#9a9288",
              transition: "all .15s",
            }}>
            {showCrypto ? "▾ crypto internals" : "▸ crypto internals"}
          </button>
        </div>
      </div>

      {/* Actor columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", paddingTop: 14 }}>
        {ACTORS.map(a => (
          <div key={a.id} style={{ padding: "0 15px" }}>
            <div style={{ background: a.bg, border: `1px solid ${a.border}`, borderRadius: 8, padding: "9px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: a.color, fontFamily: "'Courier New',monospace" }}>{a.label}</div>
              <div style={{ fontSize: 9.5, color: "#9a9288", fontFamily: "'Courier New',monospace", marginTop: 2 }}>{a.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Sequence */}
      <div style={{ padding: "6px 0 16px", position: "relative" }}>

        {/* Lifelines */}
        {[16.666, 50, 83.333].map((pos, i) => (
          <div key={i} style={{
            position: "absolute", top: 6, bottom: 16,
            left: `${pos}%`,
            width: 1, borderLeft: "1px dashed #ddd8d0", pointerEvents: "none", zIndex: 0
          }} />
        ))}

        {STEPS.map((s, i) => {
          const fromCol = COL[s.from]
          const toCol = COL[s.to]
          const isSelf = s.from === s.to
          const isActive = i <= activeStep
          const isCurrent = i === activeStep
          const actor = ACTORS.find(a => a.id === s.from)

          // Arrow direction
          const goingLeft = toCol < fromCol

          // Center of each column in percent (3 cols: 16.6%, 50%, 83.3%)
          const colPct = [16.666, 50, 83.333]
          const x1 = colPct[fromCol]
          const x2 = colPct[toCol]

          return (
            <div key={i} style={{ position: "relative", zIndex: 1, marginTop: 4 }}>

              {/* Arrow row */}
              <div style={{ position: "relative", height: isSelf ? 40 : 28, marginBottom: 2 }}>

                {/* Time label */}
                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 70, textAlign: "left", fontFamily: "'Courier New',monospace", fontSize: 9, color: "#c8c3b8" }}>
                  {s.time}
                </div>

                {/* Arrow SVG */}
                <svg width="100%" height="100%" style={{ overflow: "visible", display: "block", position: "absolute", left: 0, top: 0 }}>
                  <defs>
                    <marker id={`arr-${i}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M1 1.5L6.5 4L1 6.5" fill="none" stroke={isActive ? s.color : "#d0cbc0"} strokeWidth="1.5" strokeLinecap="round" />
                    </marker>
                  </defs>

                  {isSelf ? (
                    // Self-loop (internal processing)
                    <path
                      d={`M ${x1}% 4 C ${x1 + 8}% 4, ${x1 + 8}% 36, ${x1}% 36`}
                      fill="none"
                      stroke={isActive ? s.color : "#d0cbc0"}
                      strokeWidth={isCurrent ? 1.8 : 1.2}
                      strokeDasharray={isActive ? "none" : "3 4"}
                      markerEnd={`url(#arr-${i})`}
                    />
                  ) : (
                    <line
                      x1={`${x1}%`} y1="50%"
                      x2={`${x2 + (goingLeft ? 1.5 : -1.5)}%`} y2="50%"
                      stroke={isActive ? s.color : "#d0cbc0"}
                      strokeWidth={isCurrent ? 1.8 : 1.2}
                      strokeDasharray={isActive ? "none" : "3 4"}
                      markerEnd={`url(#arr-${i})`}
                    />
                  )}

                  {/* Label chip on arrow */}
                  <foreignObject
                    x={isSelf ? `${x1 + 5}%` : `${Math.min(x1, x2) + Math.abs(x2 - x1) / 2}%`}
                    y={isSelf ? "24%" : "10%"}
                    width="10"
                    height="10"
                    style={{ overflow: "visible" }}
                  >
                    <div
                      onClick={() => goTo(i)}
                      style={{
                        display: "inline-block",
                        background: isActive ? "#faf9f6" : "#f5f3ee",
                        border: `1px solid ${isActive ? s.color : "#d8d3c8"}`,
                        borderRadius: 4,
                        padding: "2px 7px",
                        fontSize: 9.5,
                        fontFamily: "'Courier New',monospace",
                        color: isActive ? s.color : "#b8b3a8",
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                        fontWeight: isCurrent ? 600 : 400,
                        boxShadow: isCurrent ? `0 1px 4px ${s.color}25` : "none",
                        transition: "all .2s",
                        userSelect: "none",
                        transform: "translateX(-50%)",
                      }}>
                      {s.label}
                    </div>
                  </foreignObject>
                </svg>
              </div>

              {/* Expanded detail */}
              {openStep === i && (
                <div style={{
                  margin: "2px 20px 6px 120px",
                  background: actor.bg,
                  border: `1px solid ${s.color}40`,
                  borderLeft: `3px solid ${s.color}`,
                  borderRadius: "0 8px 8px 0",
                  padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: s.color, fontFamily: "'Courier New',monospace", marginBottom: 8 }}>
                    {s.title}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <tbody>
                      {s.rows.map((row, j) => (
                        <tr key={j} style={{ borderBottom: "1px solid #e8e3da" }}>
                          <td style={{ padding: "4px 12px 4px 0", fontFamily: "'Courier New',monospace", color: "#9a9288", whiteSpace: "nowrap", verticalAlign: "top", width: 160, fontSize: 10.5 }}>
                            {row.key}
                          </td>
                          <td style={{ padding: "4px 0", fontFamily: "'Courier New',monospace", fontSize: 10.5, color: row.hi ? s.color : "#4a4440", lineHeight: 1.55 }}>
                            {row.val}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 8, fontSize: 11, color: "#6b6560", lineHeight: 1.65, fontStyle: "italic", borderTop: "1px solid #e0dbd0", paddingTop: 8, fontFamily: "Georgia,serif" }}>
                    {s.note}
                  </div>

                  {/* Crypto internals panel */}
                  {showCrypto && CRYPTO_DETAILS[i] && (
                    <div style={{ marginTop: 12, borderTop: "1px solid #ddd0f8", paddingTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#7040c0", fontFamily: "'Courier New',monospace", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
                        ◈ {CRYPTO_DETAILS[i].title}
                      </div>
                      {CRYPTO_DETAILS[i].sections.map((sec, si) => (
                        <div key={si} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "#7040c0", fontFamily: "'Courier New',monospace", marginBottom: 4, fontWeight: 500 }}>
                            {sec.label}
                          </div>
                          {sec.mono ? (
                            <div style={{
                              background: "#1a1814", borderRadius: 6, padding: "8px 12px",
                              fontFamily: "'Courier New',monospace", fontSize: 10.5, lineHeight: 1.7,
                              color: "#d8d0c8", overflowX: "auto",
                            }}>
                              {sec.lines.map((line, li) => (
                                <div key={li} style={{ whiteSpace: "pre" }}>{line}</div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: "#5e5750", lineHeight: 1.65, fontFamily: "Georgia,serif" }}>
                              {sec.lines[0]}
                            </div>
                          )}
                        </div>
                      ))}
                      <div style={{ fontSize: 11, color: "#7040c0", lineHeight: 1.65, fontStyle: "italic", borderTop: "1px solid #ddd0f8", paddingTop: 8, fontFamily: "Georgia,serif", opacity: 0.85 }}>
                        {CRYPTO_DETAILS[i].note}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Controls */}
      <div style={{ padding: "11px 20px", borderTop: "1px solid #e0dbd0", background: "#f5f3ee", display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => { if (playing) { playingRef.current = false; setPlaying(false) } else { setPlaying(true) } }}
          style={{ padding: "5px 14px", borderRadius: 5, fontSize: 11, fontFamily: "'Courier New',monospace", cursor: "pointer", border: `1px solid ${playing ? "#1a56a0" : "#c8c3b8"}`, background: playing ? "#f0f4ff" : "#faf9f6", color: playing ? "#1a56a0" : "#4a4440", transition: "all .15s" }}>
          {playing ? "⏸ pause" : "▶ play"}
        </button>
        <button
          onClick={() => activeStep > 0 && goTo(activeStep - 1)}
          disabled={activeStep <= 0}
          style={{ padding: "5px 11px", borderRadius: 5, fontSize: 11, fontFamily: "'Courier New',monospace", cursor: activeStep <= 0 ? "default" : "pointer", border: "1px solid #d8d3c8", background: "transparent", color: activeStep <= 0 ? "#c8c3b8" : "#4a4440" }}>
          ←
        </button>
        <button
          onClick={() => activeStep < STEPS.length - 1 && goTo(activeStep + 1)}
          disabled={activeStep >= STEPS.length - 1}
          style={{ padding: "5px 11px", borderRadius: 5, fontSize: 11, fontFamily: "'Courier New',monospace", cursor: activeStep >= STEPS.length - 1 ? "default" : "pointer", border: "1px solid #d8d3c8", background: "transparent", color: activeStep >= STEPS.length - 1 ? "#c8c3b8" : "#4a4440" }}>
          →
        </button>

        {/* Progress bar */}
        <div style={{ flex: 1, height: 3, background: "#e0dbd0", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#1a56a0", borderRadius: 2, width: `${progress}%`, transition: "width .4s ease" }} />
        </div>

        <span style={{ fontSize: 10, fontFamily: "'Courier New',monospace", color: "#9a9288", flexShrink: 0 }}>
          {Math.max(0, activeStep + 1)} / {STEPS.length}
        </span>
        <button
          onClick={reset}
          style={{ padding: "5px 10px", borderRadius: 5, fontSize: 10, fontFamily: "'Courier New',monospace", cursor: "pointer", border: "1px solid #d8d3c8", background: "transparent", color: "#9a9288" }}>
          reset
        </button>
        {showCrypto && (
          <div style={{ fontSize: 9.5, fontFamily: "'Courier New',monospace", color: "#7040c0", padding: "3px 8px", background: "#f5f0ff", borderRadius: 4, border: "1px solid #ddd0f8" }}>
            crypto on
          </div>
        )}
      </div>

    </div>
  )
}