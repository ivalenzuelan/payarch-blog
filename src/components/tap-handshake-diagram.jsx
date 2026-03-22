import { useState, useEffect, useRef } from "react"

const STEPS = [
  {
    from: "agent", to: "visa",
    label: "POST /v1/validate",
    sublabel: "HTTP Message Signature · Ed25519",
    color: "#9060d0",
    time: "t + 0ms",
    detail: {
      title: "Agent sends signed HTTP request to TAP",
      fields: [
        { key: "Signature-Input", val: 'tap-sig=("@method" "@target-uri" "x-tap-agent-id" "x-tap-intent"); keyid="skyfire-001"; tag="tap-purchase"; created=1742518234; nonce="a3f8c2e1d9b7"', highlight: true },
        { key: "Signature", val: "tap-sig=:MEQCIBx7zKp9mN3...base64==:", highlight: true },
        { key: "X-Tap-Agent-Id", val: "skyfire-agent-001" },
        { key: "X-Tap-Intent", val: "purchase", highlight: true },
        { key: "X-Tap-Consumer-Token", val: "eyJhbGciOiJFUzI1NiJ9..." },
      ],
      note: "The signature covers method, URI, agent-id, intent, and body hash. The nonce is cryptographically random and unique to this request — stored permanently after use to prevent replay."
    }
  },
  {
    from: "visa", to: "visa",
    label: "Validate signature + policy",
    sublabel: "Key directory · nonce store · behavioral",
    color: "#1a56a0",
    time: "t + 12ms",
    detail: {
      title: "Visa TAP runs three independent checks",
      fields: [
        { key: "1. Key fetch", val: "GET .well-known/agents/skyfire-001 → ed25519:MCowBQYDK2Vd... (cached 5 min)", highlight: false },
        { key: "2. Ed25519 verify", val: "Reconstruct canonical form → verify signature → ✓ valid", highlight: true },
        { key: "3. Nonce check", val: "a3f8c2e1d9b7 not in store → ✓ unused · stored permanently", highlight: true },
        { key: "4. Timestamp", val: "created=1742518234 · delta 8s < 60s limit → ✓ valid", highlight: false },
        { key: "5. Wallet policy", val: "token vts-AGNT-001 · active · $89.99 ≤ $500 → ✓", highlight: false },
        { key: "6. Cloudflare WBA", val: "Request patterns ✓ · TLS fingerprint ✓ · velocity ✓", highlight: false },
      ],
      note: "Two independent trust signals: cryptographic (Ed25519) and behavioral (Cloudflare edge intelligence). Both must pass."
    }
  },
  {
    from: "visa", to: "agent",
    label: "200 OK · TAP JWT",
    sublabel: "Signed credential · TTL 90s",
    color: "#1a56a0",
    time: "t + 48ms",
    detail: {
      title: "Visa issues signed JWT — valid 90 seconds",
      fields: [
        { key: "iss", val: "tap.visa.com" },
        { key: "sub", val: "skyfire-agent-001" },
        { key: "aud", val: "bose.com" },
        { key: "exp", val: "1742518324   ← TTL 90 seconds only", highlight: true },
        { key: "nonce", val: "a3f8c2e1d9b7   ← replay-protected", highlight: true },
        { key: "consumer_recognized", val: "true   ← returning customer", highlight: true },
        { key: "instruction_ref", val: "pi-abc123   ← will appear in ISO 8583 F126", highlight: true },
        { key: "amount", val: "89.99 · currency USD" },
        { key: "risk_score", val: "12 / 100 — low risk" },
      ],
      note: "JWT signed with Visa's private key. Merchant verifies using Visa's public key — no call to Visa needed at checkout. The instruction_ref links this credential to the ISO 8583 message downstream."
    }
  },
  {
    from: "agent", to: "merchant",
    label: "POST /checkout",
    sublabel: "Authorization: TAP-1.0 {jwt}",
    color: "#9060d0",
    time: "t + 52ms",
    detail: {
      title: "Agent presents credential at merchant checkout",
      fields: [
        { key: "Authorization", val: "TAP-1.0 eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...", highlight: true },
        { key: "Body", val: '{ "items": [{"sku": "BOSE-QC45", "qty": 1}], "amount": 89.99, "instruction_ref": "pi-abc123" }' },
      ],
      note: "tag=\"tap-purchase\" in the original Signature-Input tells the MerchantSDK this agent intends to buy, not just browse. The SDK can gate purchase flows differently from catalog browsing."
    }
  },
  {
    from: "merchant", to: "merchant",
    label: "Verify JWT locally",
    sublabel: "No external call · < 5ms",
    color: "#1a7a50",
    time: "t + 56ms",
    detail: {
      title: "MerchantSDK validates — seven checks, all local",
      fields: [
        { key: "Signature", val: "Ed25519 verify with cached Visa public key → ✓ valid", highlight: true },
        { key: "exp", val: "1742518324 > now (1742518288) · 36s remaining → ✓", highlight: false },
        { key: "nonce", val: "a3f8c2e1d9b7 not in local store → ✓ · stored", highlight: true },
        { key: "aud", val: '"bose.com" === this merchant → ✓', highlight: false },
        { key: "amount", val: "89.99 === cart total → ✓", highlight: false },
        { key: "consumer_recognized", val: "true → skip new-customer onboarding", highlight: true },
      ],
      note: "All seven checks pass in under 5ms with no external call. Total TAP handshake: ~60ms. Order created. Stripe PaymentIntent called. The ISO 8583 leg begins."
    }
  },
  {
    from: "merchant", to: "agent",
    label: "200 OK · Order confirmed",
    sublabel: "No CAPTCHA · No redirect · No form",
    color: "#1a7a50",
    time: "t + 60ms",
    detail: {
      title: "Order accepted — zero friction",
      fields: [
        { key: "order_id", val: "BOSE-2026-78234", highlight: true },
        { key: "status", val: "pending_payment", highlight: false },
        { key: "next_step", val: "Stripe PaymentIntent → ISO 8583 0100 → VisaNet → issuer", highlight: true },
      ],
      note: "The consumer never saw a checkout page. No card number was entered. No CAPTCHA was solved. The TAP handshake took 60ms. The payment authorization will take another ~1040ms."
    }
  },
]

const ACTORS = [
  { id:"agent",    label:"AI Agent",          sub:"Skyfire · Claude", color:"#9060d0", bg:"#f8f4ff", border:"#d4bef8" },
  { id:"visa",     label:"Visa TAP",           sub:"tap.visa.com · Cloudflare WBA", color:"#1a56a0", bg:"#f0f4ff", border:"#b8cef0" },
  { id:"merchant", label:"Merchant",           sub:"bose.com · TAP SDK", color:"#1a7a50", bg:"#f0f8f4", border:"#b0d8c0" },
]

const actorIndex = { agent:0, visa:1, merchant:2 }

export default function TapHandshake() {
  const [open, setOpen] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [step, setStep] = useState(-1)
  const timerRef = useRef(null)

  const toggle = (i) => setOpen(open === i ? null : i)

  useEffect(() => {
    if (!playing) return
    const next = step + 1
    if (next >= STEPS.length) { setPlaying(false); return }
    timerRef.current = setTimeout(() => {
      setStep(next)
      setOpen(next)
    }, next === 0 ? 300 : 2200)
    return () => clearTimeout(timerRef.current)
  }, [playing, step])

  const reset = () => { setStep(-1); setOpen(null); setPlaying(false) }

  const Arrow = ({ s, i }) => {
    const fi = actorIndex[s.from]
    const ti = actorIndex[s.to]
    const self = fi === ti
    const pct = [16.5, 50, 83.5]
    const x1 = pct[fi]
    const x2 = pct[ti]
    const active = i <= step
    const current = i === step

    return (
      <div style={{ position:"relative", height: self ? 44 : 36, margin:"2px 0" }}>
        <svg width="100%" height="100%" style={{ position:"absolute", top:0, left:0, overflow:"visible" }}>
          <defs>
            <marker id={`arr-${i}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M1 1L7 4L1 7" fill="none" stroke={active ? s.color : "#c8c3b8"} strokeWidth="1.5" strokeLinecap="round"/>
            </marker>
          </defs>
          {self ? (
            <path
              d={`M ${x1}% 8 C ${x1+10}% 8, ${x1+10}% 36, ${x1}% 36`}
              fill="none" stroke={active ? s.color : "#d8d3c8"}
              strokeWidth={current ? 2 : 1.5}
              strokeDasharray={active ? "none" : "4 3"}
              markerEnd={`url(#arr-${i})`}
            />
          ) : (
            <line
              x1={`${x1}%`} y1="50%" x2={`${x2}%`} y2="50%"
              stroke={active ? s.color : "#d8d3c8"}
              strokeWidth={current ? 2 : 1.5}
              strokeDasharray={active ? "none" : "4 3"}
              markerEnd={`url(#arr-${i})`}
            />
          )}
        </svg>
        {/* Label centered on arrow */}
        <div style={{
          position:"absolute",
          left: self ? `${x1+6}%` : `${Math.min(x1,x2) + Math.abs(x2-x1)/2 - 10}%`,
          top: self ? "35%" : "50%",
          transform: "translate(-50%, -50%)",
          background: active ? "#faf9f6" : "#f8f7f4",
          border: `1px solid ${active ? s.color : "#d8d3c8"}`,
          borderRadius:4,
          padding:"2px 9px",
          fontSize:10,
          fontFamily:"'Courier New',monospace",
          color: active ? s.color : "#b8b3a8",
          whiteSpace:"nowrap",
          cursor:"pointer",
          fontWeight: current ? 600 : 400,
          boxShadow: current ? `0 1px 4px ${s.color}30` : "none",
          transition:"all .2s",
          zIndex:2,
        }} onClick={() => toggle(i)}>
          {s.label}
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily:"Georgia, 'Times New Roman', serif", color:"#1a1814", background:"#faf9f6", borderRadius:12, border:"1px solid #e0dbd0", overflow:"hidden", maxWidth:800 }}>

      {/* Header */}
      <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #e0dbd0", background:"#f5f3ee" }}>
        <div style={{ fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", color:"#9a9288", fontFamily:"'Courier New',monospace", marginBottom:6 }}>
          Trusted Agent Protocol · Handshake Sequence
        </div>
        <h2 style={{ fontSize:18, fontWeight:400, letterSpacing:"-0.02em", margin:"0 0 4px" }}>
          Agent authentication &amp; credential issuance
        </h2>
        <div style={{ fontSize:12, color:"#9a9288", fontFamily:"'Courier New',monospace" }}>
          6 steps · ~60ms total · Ed25519 · JWT · no-code merchant SDK
        </div>
      </div>

      {/* Sequence diagram */}
      <div style={{ padding:"20px 24px 16px" }}>

        {/* Actor headers */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
          {ACTORS.map(a => (
            <div key={a.id} style={{ background:a.bg, border:`1px solid ${a.border}`, borderRadius:8, padding:"10px 14px", textAlign:"center" }}>
              <div style={{ fontSize:12, fontWeight:600, color:a.color, fontFamily:"'Courier New',monospace", letterSpacing:"0.02em" }}>{a.label}</div>
              <div style={{ fontSize:10, color:"#9a9288", fontFamily:"'Courier New',monospace", marginTop:2 }}>{a.sub}</div>
            </div>
          ))}
        </div>

        {/* Lifelines + arrows */}
        <div style={{ position:"relative" }}>
          {/* Lifeline dots */}
          <div style={{ position:"absolute", top:0, bottom:0, left:"16.5%", width:1, borderLeft:"1px dashed #d8d3c8", zIndex:0 }} />
          <div style={{ position:"absolute", top:0, bottom:0, left:"50%", width:1, borderLeft:"1px dashed #d8d3c8", zIndex:0 }} />
          <div style={{ position:"absolute", top:0, bottom:0, left:"83.5%", width:1, borderLeft:"1px dashed #d8d3c8", zIndex:0 }} />

          {/* Steps */}
          {STEPS.map((s, i) => (
            <div key={i} style={{ position:"relative", zIndex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                <div style={{ fontSize:9, fontFamily:"'Courier New',monospace", color:"#b8b3a8", width:52, textAlign:"right", flexShrink:0 }}>{s.time}</div>
                <div style={{ flex:1 }}><Arrow s={s} i={i} /></div>
              </div>

              {/* Expanded detail */}
              {open === i && (
                <div style={{ margin:"4px 0 8px 58px", background:ACTORS.find(a=>a.id===s.from).bg, border:`1px solid ${s.color}50`, borderRadius:8, padding:"12px 14px", borderLeft:`3px solid ${s.color}` }}>
                  <div style={{ fontSize:12, fontWeight:600, color:s.color, fontFamily:"'Courier New',monospace", marginBottom:8 }}>{STEPS[i].detail.title}</div>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <tbody>
                      {STEPS[i].detail.fields.map((f,j) => (
                        <tr key={j} style={{ borderBottom:"1px solid #e8e3da" }}>
                          <td style={{ padding:"4px 12px 4px 0", fontFamily:"'Courier New',monospace", color:"#9a9288", whiteSpace:"nowrap", verticalAlign:"top", width:140 }}>{f.key}</td>
                          <td style={{ padding:"4px 0", fontFamily:"'Courier New',monospace", fontSize:10.5, color: f.highlight ? s.color : "#4a4440", lineHeight:1.5 }}>{f.val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop:8, fontSize:11, color:"#6b6560", lineHeight:1.6, fontStyle:"italic", borderTop:"1px solid #e0dbd0", paddingTop:8 }}>
                    {STEPS[i].detail.note}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding:"12px 24px", borderTop:"1px solid #e0dbd0", background:"#f5f3ee", display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={() => { setPlaying(true); if(step === -1) setStep(-1) }} disabled={playing || step >= STEPS.length-1}
          style={{ padding:"5px 16px", borderRadius:5, fontSize:11, fontFamily:"'Courier New',monospace", cursor:"pointer", border:"1px solid #c8c3b8", background: playing?"#e8e3da":"#faf9f6", color:"#1a1814" }}>
          {playing ? "⏸ playing" : "▶ play"}
        </button>
        {playing && <button onClick={() => setPlaying(false)}
          style={{ padding:"5px 12px", borderRadius:5, fontSize:11, fontFamily:"'Courier New',monospace", cursor:"pointer", border:"1px solid #c8c3b8", background:"#faf9f6", color:"#1a1814" }}>pause</button>}
        <div style={{ flex:1, height:2, background:"#e0dbd0", borderRadius:1, overflow:"hidden" }}>
          <div style={{ height:"100%", background:"#1a56a0", borderRadius:1, width: step < 0 ? "0%" : `${((step+1)/STEPS.length*100)}%`, transition:"width .4s ease" }} />
        </div>
        <span style={{ fontSize:10, fontFamily:"'Courier New',monospace", color:"#9a9288" }}>{Math.max(0,step+1)} / {STEPS.length}</span>
        <button onClick={reset} style={{ padding:"5px 12px", borderRadius:5, fontSize:10, fontFamily:"'Courier New',monospace", cursor:"pointer", border:"1px solid #c8c3b8", background:"transparent", color:"#9a9288" }}>reset</button>
      </div>

      {/* Click hint */}
      <div style={{ padding:"8px 24px 12px", background:"#f5f3ee" }}>
        <div style={{ fontSize:11, color:"#b8b3a8", fontFamily:"'Courier New',monospace" }}>
          ↑ click any arrow label to expand the message details
        </div>
      </div>

    </div>
  )
}
