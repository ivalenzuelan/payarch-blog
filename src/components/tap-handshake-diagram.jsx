import { useState, useEffect, useRef } from "react"

const ACTORS = [
  { id: "agent", label: "AI Agent", sub: "registered key", color: "var(--diagram-4)", bg: "color-mix(in srgb, var(--diagram-4) 8%, var(--paper-pure))", border: "color-mix(in srgb, var(--diagram-4) 25%, var(--ink-200))" },
  { id: "visa", label: "TAP verifier", sub: "key registry · edge/backend", color: "var(--diagram-1)", bg: "color-mix(in srgb, var(--diagram-1) 10%, var(--paper-pure))", border: "color-mix(in srgb, var(--diagram-1) 30%, var(--ink-200))" },
  { id: "merchant", label: "Merchant", sub: "checkout integration", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 8%, var(--paper-pure))", border: "color-mix(in srgb, var(--success) 28%, var(--ink-200))" },
]

const STEPS = [
  {
    from: "agent", to: "visa",
    arrow: "agent -> verifier",
    label: "Signed HTTP request",
    sub: "HTTP Message Signature · Ed25519",
    color: "var(--diagram-4)",
    time: "step 1",
    title: "Agent constructs signed HTTP request",
    rows: [
      { key: "Signature-Input", val: 'sig1=("@method" "@target-uri" "content-digest"); keyid="agent-key-001"; tag="agent-checkout"; created=...; nonce="..."', hi: true },
      { key: "Signature", val: "tap-sig=:MEQCIBx7zKp9mN3...base64==:", hi: true },
      { key: "Content-Digest", val: "sha-256=:base64-digest:", hi: false },
      { key: "Request tag", val: "agent-checkout", hi: true },
      { key: "Key id", val: "registered agent key", hi: false },
    ],
    note: "The signature covers selected request components and binds them to a key identifier, timestamp, nonce, and action tag. The exact covered components are integration choices.",
  },
  {
    from: "visa", to: "visa",
    arrow: "verifier internal",
    label: "Validate signature + policy",
    sub: "key directory · freshness · replay",
    color: "var(--diagram-1)",
    time: "step 2",
    title: "Verifier checks request integrity",
    rows: [
      { key: "1. Key lookup", val: "Find registered public key for keyid", hi: false },
      { key: "2. Ed25519 verify", val: "Reconstruct signature base -> verify signature", hi: true },
      { key: "3. Freshness", val: "Check timestamp window and clock tolerance", hi: false },
      { key: "4. Replay", val: "Reject nonce values already seen by the verifier", hi: true },
      { key: "5. Action tag", val: "Confirm the tag matches an allowed agent action", hi: true },
      { key: "6. Edge policy", val: "Optional behavioral and merchant policy checks", hi: false },
    ],
    note: "Public TAP material supports the cryptographic verification pattern. Cache lifetimes, headers, verdict objects, and latency budgets are not published production guarantees.",
  },
  {
    from: "visa", to: "agent",
    arrow: "verifier -> agent",
    label: "Trust result",
    sub: "scoped proof or verdict",
    color: "var(--diagram-1)",
    time: "step 3",
    title: "Verifier returns an implementation-specific result",
    rows: [
      { key: "Agent", val: "registered agent key passed verification", hi: true },
      { key: "Action", val: "checkout tag accepted by verifier policy", hi: true },
      { key: "Scope", val: "merchant and payment context can be bound by implementation", hi: false },
      { key: "Freshness", val: "timestamp and nonce checks passed", hi: true },
      { key: "Format", val: "not publicly specified as a single required object", hi: false },
    ],
    note: "This diagram intentionally avoids a concrete Visa-issued token type, header, or lifetime. Public sources show the signed-request trust model, not a complete production credential contract.",
  },
  {
    from: "agent", to: "merchant",
    arrow: "agent -> merchant",
    label: "POST /checkout",
    sub: "cart + trust evidence",
    color: "var(--diagram-4)",
    time: "step 4",
    title: "Agent presents checkout context",
    rows: [
      { key: "Trust evidence", val: "verified signed request or verifier result", hi: true },
      { key: "Body", val: '{ "items": [...], "amount": "249.00", "currency": "USD" }', hi: false },
    ],
    note: 'The action tag tells the verifier and merchant whether the agent is browsing, checking out, or performing another scoped action.',
  },
  {
    from: "merchant", to: "merchant",
    arrow: "merchant internal",
    label: "Apply checkout policy",
    sub: "merchant or edge verification",
    color: "var(--success)",
    time: "step 5",
    title: "Merchant accepts or rejects the agent flow",
    rows: [
      { key: "Verifier result", val: "agent request passed trust checks", hi: true },
      { key: "Merchant match", val: "proof is scoped to this merchant or checkout context", hi: false },
      { key: "Amount match", val: "payment context matches the cart", hi: false },
      { key: "Replay controls", val: "fresh request and nonce policy passed", hi: true },
      { key: "Customer logic", val: "merchant decides whether returning-customer shortcuts apply", hi: false },
    ],
    note: "The payment authorization leg begins only after the merchant accepts the order. Exact SDK names and local/edge split are implementation-specific.",
  },
  {
    from: "merchant", to: "agent",
    arrow: "merchant -> agent",
    label: "200 OK · Order confirmed",
    sub: "No CAPTCHA · No redirect · No form",
    color: "var(--success)",
    time: "illustrative",
    title: "Order accepted — zero friction",
    rows: [
      { key: "order_id", val: "HEAD-2026-78234", hi: true },
      { key: "status", val: "pending_payment", hi: false },
      { key: "next_step", val: "Stripe PaymentIntent → ISO 8583 0100 → card network → issuer", hi: true },
    ],
    note: "The consumer never saw a checkout page. No card number entered. No CAPTCHA solved. Exact production timing depends on the merchant, verifier, PSP, and issuer path.",
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
          '"@target-uri": merchant or verifier endpoint',
          '"content-digest": sha-256=:YjMzMDQ5YjQ4YzA=:',
        ]
      },
      {
        label: "2. Append signature params",
        mono: true,
        lines: [
          '"@signature-params": ("@method" "@target-uri" "content-digest");',
          '  keyid="agent-key-001";tag="agent-checkout";created=...;nonce="..."',
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
    note: "The private key stays with the agent or its platform. The verifier needs the corresponding registered public key."
  },
  1: {
    title: "Signature verification internals (Ed25519)",
    sections: [
      {
        label: "1. Fetch public key",
        mono: true,
        lines: [
          "lookup keyid in the agent public-key registry",
          "-> { alg: Ed25519, pub: MCowBQYDK2VdA3IA... }",
          "cache and rotation behavior are implementation-specific",
        ]
      },
      {
        label: "2. Reconstruct canonical string",
        mono: false,
        lines: [
          "The verifier rebuilds the same canonical string from the incoming request components in exactly the order listed in Signature-Input. Any discrepancy means the signature no longer verifies.",
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
          "nonce_store.check_and_record(nonce)",
          "-> unused: accept this freshness check",
          "-> already seen: reject as replay",
        ]
      },
    ],
    note: "Ed25519 verification is cheap compared with network I/O, but exact production latency depends on the verifier and nonce-store implementation."
  },
  2: {
    title: "Scoped proof shape (illustrative)",
    sections: [
      {
        label: "Envelope",
        mono: true,
        lines: [
          '{ "type": "agent-trust-result",',
          '  "alg": "Ed25519",',
          '  "format": "implementation-specific" }',
        ]
      },
      {
        label: "Claims / fields",
        mono: true,
        lines: [
          '{ "agent_key": "registered key id",',
          '  "merchant": "checkout merchant",',
          '  "action": "agent-checkout",',
          '  "freshness": "timestamp + nonce checked",',
          '  "payment_scope": "merchant/amount policy, if provided"',
          '}',
        ]
      },
      {
        label: "What is intentionally omitted",
        mono: false,
        lines: [
          "No production header name, exact lifetime, token schema, cache interval, or Visa private field is claimed here. Public material supports the signed-request verification model, not those private implementation details.",
        ]
      },
    ],
    note: "A real deployment can verify at an edge layer, merchant backend, or both. The public sources do not require one fixed topology."
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
      fontFamily: "'Georgia','Times New Roman',serif", color: "var(--ink-900)", background: "var(--paper)", borderRadius: 12, border: "1px solid var(--ink-200)", overflow: "hidden", 
      width: "100vw", maxWidth: 1040, position: "relative", left: "50%", transform: "translateX(-50%)", margin: "20px 0"
    }}>

      {/* Header */}
      <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid var(--ink-200)", background: "var(--ink-100)" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-500)", fontFamily: "'Courier New',monospace", marginBottom: 5 }}>
          Trusted Agent Protocol · Handshake Sequence
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.02em", margin: "0 0 3px" }}>
              Agent authentication &amp; credential issuance
            </h2>
            <div style={{ fontSize: 11, color: "var(--ink-500)", fontFamily: "'Courier New',monospace" }}>
              6 illustrative steps · click any step to expand
            </div>
          </div>
          <button
            onClick={() => setShowCrypto(c => !c)}
            style={{
              padding: "5px 12px", borderRadius: 5, fontSize: 10, flexShrink: 0,
              fontFamily: "'Courier New',monospace", cursor: "pointer",
              border: `1px solid ${showCrypto ? "var(--diagram-4)" : "var(--ink-300)"}`,
              background: showCrypto ? "color-mix(in srgb, var(--diagram-4) 10%, var(--paper-pure))" : "transparent",
              color: showCrypto ? "var(--diagram-4)" : "var(--ink-500)",
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
              <div style={{ fontSize: 9.5, color: "var(--ink-500)", fontFamily: "'Courier New',monospace", marginTop: 2 }}>{a.sub}</div>
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
            width: 1, borderLeft: "1px dashed var(--ink-200)", pointerEvents: "none", zIndex: 0
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
                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 70, textAlign: "left", fontFamily: "'Courier New',monospace", fontSize: 9, color: "var(--ink-300)" }}>
                  {s.time}
                </div>

                {/* Arrow SVG */}
                <svg width="100%" height="100%" style={{ overflow: "visible", display: "block", position: "absolute", left: 0, top: 0 }}>
                  <defs>
                    <marker id={`arr-${i}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M1 1.5L6.5 4L1 6.5" fill="none" stroke={isActive ? s.color : "var(--ink-300)"} strokeWidth="1.5" strokeLinecap="round" />
                    </marker>
                  </defs>

                  {isSelf ? (
                    // Self-loop (internal processing)
                    <path
                      d={`M ${x1}% 4 C ${x1 + 8}% 4, ${x1 + 8}% 36, ${x1}% 36`}
                      fill="none"
                      stroke={isActive ? s.color : "var(--ink-300)"}
                      strokeWidth={isCurrent ? 1.8 : 1.2}
                      strokeDasharray={isActive ? "none" : "3 4"}
                      markerEnd={`url(#arr-${i})`}
                    />
                  ) : (
                    <line
                      x1={`${x1}%`} y1="50%"
                      x2={`${x2 + (goingLeft ? 1.5 : -1.5)}%`} y2="50%"
                      stroke={isActive ? s.color : "var(--ink-300)"}
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
                        background: isActive ? "var(--paper)" : "var(--ink-100)",
                        border: `1px solid ${isActive ? s.color : "var(--ink-300)"}`,
                        borderRadius: 4,
                        padding: "2px 7px",
                        fontSize: 9.5,
                        fontFamily: "'Courier New',monospace",
                        color: isActive ? s.color : "var(--ink-400)",
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
                        <tr key={j} style={{ borderBottom: "1px solid var(--ink-200)" }}>
                          <td style={{ padding: "4px 12px 4px 0", fontFamily: "'Courier New',monospace", color: "var(--ink-500)", whiteSpace: "nowrap", verticalAlign: "top", width: 160, fontSize: 10.5 }}>
                            {row.key}
                          </td>
                          <td style={{ padding: "4px 0", fontFamily: "'Courier New',monospace", fontSize: 10.5, color: row.hi ? s.color : "var(--ink-700)", lineHeight: 1.55 }}>
                            {row.val}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-500)", lineHeight: 1.65, fontStyle: "italic", borderTop: "1px solid var(--ink-200)", paddingTop: 8, fontFamily: "Georgia,serif" }}>
                    {s.note}
                  </div>

                  {/* Crypto internals panel */}
                  {showCrypto && CRYPTO_DETAILS[i] && (
                    <div style={{ marginTop: 12, borderTop: "1px solid color-mix(in srgb, var(--diagram-4) 25%, var(--ink-200))", paddingTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--diagram-4)", fontFamily: "'Courier New',monospace", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
                        ◈ {CRYPTO_DETAILS[i].title}
                      </div>
                      {CRYPTO_DETAILS[i].sections.map((sec, si) => (
                        <div key={si} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "var(--diagram-4)", fontFamily: "'Courier New',monospace", marginBottom: 4, fontWeight: 500 }}>
                            {sec.label}
                          </div>
                          {sec.mono ? (
                            <div style={{
                              background: "var(--ink-900)", borderRadius: 6, padding: "8px 12px",
                              fontFamily: "'Courier New',monospace", fontSize: 10.5, lineHeight: 1.7,
                              color: "var(--ink-300)", overflowX: "auto",
                            }}>
                              {sec.lines.map((line, li) => (
                                <div key={li} style={{ whiteSpace: "pre" }}>{line}</div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: "var(--ink-700)", lineHeight: 1.65, fontFamily: "Georgia,serif" }}>
                              {sec.lines[0]}
                            </div>
                          )}
                        </div>
                      ))}
                      <div style={{ fontSize: 11, color: "var(--diagram-4)", lineHeight: 1.65, fontStyle: "italic", borderTop: "1px solid color-mix(in srgb, var(--diagram-4) 25%, var(--ink-200))", paddingTop: 8, fontFamily: "Georgia,serif", opacity: 0.85 }}>
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
      <div style={{ padding: "11px 20px", borderTop: "1px solid var(--ink-200)", background: "var(--ink-100)", display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => { if (playing) { playingRef.current = false; setPlaying(false) } else { setPlaying(true) } }}
          style={{ padding: "5px 14px", borderRadius: 5, fontSize: 11, fontFamily: "'Courier New',monospace", cursor: "pointer", border: `1px solid ${playing ? "var(--diagram-1)" : "var(--ink-300)"}`, background: playing ? "color-mix(in srgb, var(--diagram-1) 10%, var(--paper-pure))" : "var(--paper)", color: playing ? "var(--diagram-1)" : "var(--ink-700)", transition: "all .15s" }}>
          {playing ? "⏸ pause" : "▶ play"}
        </button>
        <button
          onClick={() => activeStep > 0 && goTo(activeStep - 1)}
          disabled={activeStep <= 0}
          style={{ padding: "5px 11px", borderRadius: 5, fontSize: 11, fontFamily: "'Courier New',monospace", cursor: activeStep <= 0 ? "default" : "pointer", border: "1px solid var(--ink-300)", background: "transparent", color: activeStep <= 0 ? "var(--ink-300)" : "var(--ink-700)" }}>
          ←
        </button>
        <button
          onClick={() => activeStep < STEPS.length - 1 && goTo(activeStep + 1)}
          disabled={activeStep >= STEPS.length - 1}
          style={{ padding: "5px 11px", borderRadius: 5, fontSize: 11, fontFamily: "'Courier New',monospace", cursor: activeStep >= STEPS.length - 1 ? "default" : "pointer", border: "1px solid var(--ink-300)", background: "transparent", color: activeStep >= STEPS.length - 1 ? "var(--ink-300)" : "var(--ink-700)" }}>
          →
        </button>

        {/* Progress bar */}
        <div style={{ flex: 1, height: 3, background: "var(--ink-200)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "var(--diagram-1)", borderRadius: 2, width: `${progress}%`, transition: "width .4s ease" }} />
        </div>

        <span style={{ fontSize: 10, fontFamily: "'Courier New',monospace", color: "var(--ink-500)", flexShrink: 0 }}>
          {Math.max(0, activeStep + 1)} / {STEPS.length}
        </span>
        <button
          onClick={reset}
          style={{ padding: "5px 10px", borderRadius: 5, fontSize: 10, fontFamily: "'Courier New',monospace", cursor: "pointer", border: "1px solid var(--ink-300)", background: "transparent", color: "var(--ink-500)" }}>
          reset
        </button>
        {showCrypto && (
          <div style={{ fontSize: 9.5, fontFamily: "'Courier New',monospace", color: "var(--diagram-4)", padding: "3px 8px", background: "color-mix(in srgb, var(--diagram-4) 10%, var(--paper-pure))", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--diagram-4) 25%, var(--ink-200))" }}>
            crypto on
          </div>
        )}
      </div>

    </div>
  )
}
