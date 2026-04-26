import { useState, useEffect, useRef } from "react"

const T = {
  cream:"var(--paper)", cream2:"var(--ink-100)", cream3:"var(--ink-200)",
  ink:"var(--ink-900)", ink2:"var(--ink-700)", ink3:"var(--ink-700)", ink4:"var(--ink-500)", ink5:"var(--ink-400)",
  pass:"var(--success)", passLight:"color-mix(in srgb, var(--success) 8%, var(--paper-pure))", passBorder:"color-mix(in srgb, var(--success) 25%, var(--ink-200))",
  fail:"var(--danger)", failLight:"color-mix(in srgb, var(--danger) 6%, var(--paper-pure))", failBorder:"color-mix(in srgb, var(--danger) 25%, var(--ink-200))",
  visa:"var(--diagram-1)", blueLight:"color-mix(in srgb, var(--diagram-1) 10%, var(--paper-pure))", blueBorder:"color-mix(in srgb, var(--diagram-1) 30%, var(--ink-200))",
  mc:"var(--diagram-3)", mcLight:"color-mix(in srgb, var(--diagram-3) 8%, var(--paper-pure))", mcBorder:"color-mix(in srgb, var(--diagram-3) 35%, var(--ink-200))",
  border:"var(--ink-200)",
}

const LAYERS = [
  {
    id:"merchant", num:"01",
    actor:"Merchant + Gateway",
    question:"Is this a human, not a bot?",
    color:"var(--ink-900)",
    svgIcon: <path d="M8 2h16v18H8z M8 2L4 6v14h4 M16 14v6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>,
    humanTools:[
      { name:"CAPTCHA",             check:"Visual puzzle proves human" },
      { name:"Device fingerprint",  check:"Browser signature matches human" },
      { name:"Velocity checks",     check:"Request speed within human range" },
      { name:"WAF rules",           check:"Residential IP · normal patterns" },
    ],
    fails:[
      "No mouse movement — CAPTCHA fails immediately",
      "Headless Chrome fingerprint — flagged as bot",
      "Machine speed from AWS IP — velocity blocked",
      "Identical pattern to credential stuffing attack",
    ],
    failNote:"Blocked before generating an authorization request.",
    visaFix:{ tool:"TAP JWT", detail:"Ed25519-signed credential from Visa (TTL 90s) validated locally in <5ms. Merchant sees consumer_recognized + instruction_ref." },
    mcFix:  { tool:"CDN verification", detail:"Cloudflare verifies agent at edge via Web Bot Auth — before the request reaches merchant infrastructure. No merchant code change." },
  },
  {
    id:"acquirer", num:"02",
    actor:"Acquirer + Processor",
    question:"Does this transaction look legitimate?",
    color:"var(--diagram-3)",
    svgIcon: <path d="M4 4h16v4H4z M4 8v12h16V8 M8 12h8 M8 16h5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>,
    humanTools:[
      { name:"AVS matching",        check:"Address verified against issuer records" },
      { name:"CVV validation",      check:"Card code matches issuer data" },
      { name:"IP reputation",       check:"Residential IP · not on blacklist" },
      { name:"F022 = 01",           check:"Manual key entry — ecommerce standard" },
    ],
    fails:[
      "No AVS match — agent submits credentials programmatically",
      "Data center IP triggers every malicious IP heuristic",
      "F022=01 tells ALL downstream: apply human fraud rules",
      "Machine-speed pattern reads as coordinated attack",
    ],
    failNote:"F022=01 is the root cause — the ecommerce default since the 1990s. No field existed for agents.",
    visaFix:{ tool:"F022=81 + F048 + F126", detail:"Three new ISO 8583 fields: F022=81 (agent-initiated) · F048: agent identifier · F126: TAP instruction hash. Propagate agent context through entire chain." },
    mcFix:  { tool:"Agentic Token + F022 equivalent", detail:"Agent identity embedded in the token metadata itself — not in message fields. New POS Entry Mode value signals agent rules downstream." },
  },
  {
    id:"network", num:"03",
    actor:"Card Network",
    question:"Is this part of a distributed attack?",
    color:"var(--success)",
    svgIcon: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z M2 12h20 M12 2c-2.76 4-4 8-4 10s1.24 6 4 10 M12 2c2.76 4 4 8 4 10s-1.24 6-4 10" fill="none" stroke="currentColor" strokeWidth="1.5"/>,
    humanTools:[
      { name:"ML risk scoring",     check:"Behavioral baseline: human patterns match" },
      { name:"Cross-merchant view", check:"Velocity normal across merchant network" },
      { name:"Bot network detection",check:"Not flagged across global transaction graph" },
      { name:"500+ data points",    check:"All signals consistent with human" },
    ],
    fails:[
      "ML models trained to catch exactly this: machine-speed + data center",
      "No human behavioral baseline — maximum risk score assigned",
      "Cross-merchant pattern flags as coordinated bot campaign",
      "No way to validate consumer pre-authorized this specific intent",
    ],
    failNote:"The most powerful models in the entire chain were built to catch this exact pattern.",
    visaFix:{ tool:"VIC instruction registry", detail:"VisaNet validates F126 hash against pre-authorized payment instruction. Amount + merchant tamper = immediate decline (response code 58). F022=81 triggers agent risk model." },
    mcFix:  { tool:"Agentic Token binding", detail:"Network validates token was issued for this specific agent + consumer + context. Token carries agent proof through the entire authorization chain." },
  },
  {
    id:"issuer", num:"04",
    actor:"Issuer Bank",
    question:"Is the cardholder authorizing this?",
    color:"var(--diagram-1)",
    svgIcon: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>,
    humanTools:[
      { name:"Behavioral history",  check:"Transaction matches cardholder patterns" },
      { name:"Risk score",          check:"Low risk from network → no step-up" },
      { name:"3DS fallback",        check:"If needed — human responds to SMS" },
      { name:"Rules engine",        check:"Standard card-level policies applied" },
    ],
    fails:[
      "High network risk score → 3DS step-up authentication triggered",
      "3DS sends SMS challenge requiring real-time human response",
      "Agent cannot respond to SMS — transaction fails permanently",
      "No fallback path exists — the sale is irreversibly lost",
    ],
    failNote:"Step-up is unrecoverable. There is no path back once 3DS is triggered for an agent.",
    visaFix:{ tool:"Agent spending policy + Passkey", detail:"FIDO2 Passkey assertion at instruction time, not transaction time. F022=81 → issuer loads agent policy. Deterministic checks: balance ✓ · limit ✓ · category ✓ · velocity ✓. No 3DS." },
    mcFix:  { tool:"Mastercard Payment Passkey", detail:"Pre-authorized spending policy replaces step-up entirely. Consumer proves intent once with biometric Passkey. Issuer runs policy checks, not real-time challenges." },
  },
]

export default function SecurityLayers() {
  const [mode, setMode]     = useState("human")
  const [open, setOpen]     = useState(null)
  const [animStep, setAnimStep] = useState(-1)
  const [playing, setPlaying]   = useState(false)
  const playRef = useRef(false)

  const toggle = (id) => setOpen(open === id ? null : id)

  useEffect(() => {
    if (!playing) return
    playRef.current = true
    const run = async () => {
      for (let i = 0; i < LAYERS.length; i++) {
        if (!playRef.current) break
        setAnimStep(i)
        setOpen(LAYERS[i].id)
        await new Promise(r => setTimeout(r, 2000))
      }
      playRef.current = false
      setPlaying(false)
    }
    run()
    return () => { playRef.current = false }
  }, [playing])

  const reset = () => { playRef.current = false; setPlaying(false); setAnimStep(-1); setOpen(null) }

  return (
    <div style={{ fontFamily:"'Georgia','Times New Roman',serif", background:T.cream, borderRadius:12, border:`1px solid ${T.border}`, overflow:"hidden" }}>

      {/* Header */}
      <div style={{ padding:"18px 24px 14px", background:T.cream2, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:T.ink4, fontFamily:"'Courier New',monospace", marginBottom:5 }}>
          4-party model · layered fraud defense
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <h2 style={{ fontSize:17, fontWeight:400, letterSpacing:"-.02em", margin:0, color:T.ink }}>
            {mode === "human" ? "How each layer verifies a human transaction" : "How each layer fails for an AI agent"}
          </h2>
          <div style={{ display:"flex", gap:2, background:T.cream3, borderRadius:5, padding:2 }}>
            {[["human","human"],["agent","AI agent"]].map(([v,label]) => (
              <button key={v} onClick={() => { setMode(v); reset() }} style={{
                padding:"4px 12px", borderRadius:3, fontSize:10, fontFamily:"'Courier New',monospace",
                cursor:"pointer", border:"none", letterSpacing:"0.04em",
                background:mode===v?T.cream:"transparent", color:mode===v?T.ink:T.ink4,
                fontWeight:mode===v?600:400, transition:"all .15s",
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display:"grid", gridTemplateColumns:"48px 1fr auto", background:T.cream3, borderBottom:`1px solid ${T.border}` }}>
        <div/>
        <div style={{ padding:"7px 14px", fontSize:9, letterSpacing:"0.08em", textTransform:"uppercase", color:T.ink4, fontFamily:"'Courier New',monospace" }}>Layer · Actor · Security question</div>
        <div style={{ padding:"7px 16px", fontSize:9, letterSpacing:"0.08em", textTransform:"uppercase", color:T.ink4, fontFamily:"'Courier New',monospace" }}>
          {mode === "human" ? "Tools (all pass)" : "Breaks (click to expand)"}
        </div>
      </div>

      {/* Layers */}
      {LAYERS.map((layer, i) => {
        const isOpen    = open === layer.id
        const isActive  = animStep === i
        const isPast    = animStep > i
        const isHuman   = mode === "human"

        const rowBg     = isOpen ? (isHuman ? T.passLight : T.failLight) : i%2===0 ? T.cream : T.cream2
        const accentBorder = isOpen ? layer.color : isActive ? layer.color : T.border

        return (
          <div key={layer.id} style={{ borderBottom:`1px solid ${T.border}`, borderLeft:`3px solid ${accentBorder}`, background:rowBg, transition:"background .2s, border-left-color .2s" }}>

            {/* Collapsed header */}
            <div onClick={() => toggle(layer.id)} style={{ display:"grid", gridTemplateColumns:"48px 1fr 1fr auto", alignItems:"start", cursor:"pointer", padding:"13px 0" }}>

              {/* Number + icon */}
              <div style={{ paddingLeft:12, paddingTop:2 }}>
                <div style={{ fontSize:12, fontWeight:600, color:isOpen?layer.color:T.ink4, fontFamily:"'Courier New',monospace", lineHeight:1 }}>{layer.num}</div>
                {(isActive || isPast) && (
                  <div style={{ marginTop:4, fontSize:10, color:isHuman?T.pass:T.fail }}>{isHuman?"✓":"✕"}</div>
                )}
              </div>

              {/* Actor */}
              <div style={{ paddingRight:12 }}>
                <div style={{ fontSize:12, fontWeight:600, color:layer.color, fontFamily:"'Courier New',monospace", marginBottom:3 }}>{layer.actor}</div>
                <div style={{ fontSize:11, color:T.ink3, fontStyle:"italic", fontFamily:"'Instrument Serif',serif" }}>{layer.question}</div>
              </div>

              {/* Tools strip */}
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", paddingRight:12 }}>
                {isHuman
                  ? layer.humanTools.map(t => (
                      <span key={t.name} style={{ fontSize:8, padding:"2px 6px", background:T.passLight, border:`1px solid ${T.passBorder}`, borderRadius:2, color:T.pass, fontFamily:"'Courier New',monospace" }}>
                        ✓ {t.name}
                      </span>
                    ))
                  : layer.fails.slice(0,2).map((f, fi) => (
                      <span key={fi} style={{ fontSize:8, padding:"2px 6px", background:T.failLight, border:`1px solid ${T.failBorder}`, borderRadius:2, color:T.fail, fontFamily:"'Courier New',monospace" }}>
                        ✕ {f.split("—")[0].trim()}
                      </span>
                    ))
                }
              </div>

              {/* Expand arrow */}
              <div style={{ paddingRight:14, paddingTop:2 }}>
                <span style={{ fontSize:11, color:isOpen?layer.color:T.ink5, display:"inline-block", transform:isOpen?"rotate(90deg)":"rotate(0deg)", transition:"transform .2s", fontFamily:"'Courier New',monospace" }}>→</span>
              </div>
            </div>

            {/* Expanded */}
            {isOpen && (
              <div style={{ padding:"0 16px 16px 48px", borderTop:`1px solid ${isHuman?T.passBorder:T.failBorder}` }}>
                {isHuman ? (
                  <div style={{ paddingTop:12 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                      {layer.humanTools.map(t => (
                        <div key={t.name} style={{ display:"flex", gap:7, alignItems:"flex-start", padding:"7px 10px", background:T.cream, border:`1px solid ${T.passBorder}`, borderRadius:6 }}>
                          <span style={{ color:T.pass, fontSize:11, flexShrink:0 }}>✓</span>
                          <div>
                            <div style={{ fontSize:10, fontWeight:600, color:layer.color, fontFamily:"'Courier New',monospace" }}>{t.name}</div>
                            <div style={{ fontSize:10, color:T.ink4, lineHeight:1.5 }}>{t.check}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:T.pass, fontStyle:"italic", padding:"7px 12px", background:T.passLight, border:`1px solid ${T.passBorder}`, borderRadius:5 }}>
                      All signals confirm human presence. Layer passes.
                    </div>
                  </div>
                ) : (
                  <div style={{ paddingTop:12 }}>
                    {/* Fail points */}
                    <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:10 }}>
                      {layer.fails.map((f, fi) => (
                        <div key={fi} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                          <span style={{ color:T.fail, fontSize:10, fontFamily:"'Courier New',monospace", flexShrink:0, marginTop:1 }}>✕</span>
                          <span style={{ fontSize:11, color:T.ink2, lineHeight:1.6 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:T.fail, padding:"7px 12px", background:T.failLight, border:`1px solid ${T.failBorder}`, borderRadius:5, marginBottom:12, fontStyle:"italic" }}>
                      {layer.failNote}
                    </div>
                    {/* Fix panel */}
                    <div style={{ fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", color:T.ink4, fontFamily:"'Courier New',monospace", marginBottom:8 }}>rebuilt for agents</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      {/* Visa */}
                      <div style={{ background:T.blueLight, border:`1px solid ${T.blueBorder}`, borderRadius:8, padding:"11px 13px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
                          <svg width="14" height="9" viewBox="0 0 36 24">
                            <path d="M3 19Q18 2 33 19" fill="none" stroke={T.visa} strokeWidth="2.5" strokeLinecap="round"/>
                            <circle cx="3" cy="19" r="2" fill={T.visa}/>
                            <circle cx="33" cy="19" r="2" fill={T.visa}/>
                          </svg>
                          <span style={{ fontSize:9, letterSpacing:"0.08em", textTransform:"uppercase", color:T.visa, fontFamily:"'Courier New',monospace" }}>Visa</span>
                        </div>
                        <div style={{ fontSize:10, fontWeight:600, color:T.visa, fontFamily:"'Courier New',monospace", marginBottom:4 }}>{layer.visaFix.tool}</div>
                        <div style={{ fontSize:10, color:"var(--diagram-1)", lineHeight:1.6 }}>{layer.visaFix.detail}</div>
                      </div>
                      {/* Mastercard */}
                      <div style={{ background:T.mcLight, border:`1px solid ${T.mcBorder}`, borderRadius:8, padding:"11px 13px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
                          <div style={{ position:"relative", width:22, height:14 }}>
                            <div style={{ position:"absolute", left:0, top:0, width:14, height:14, background:"var(--danger)", borderRadius:"50%", opacity:0.9 }}/>
                            <div style={{ position:"absolute", left:8, top:0, width:14, height:14, background:"var(--warning)", borderRadius:"50%", opacity:0.9 }}/>
                          </div>
                          <span style={{ fontSize:9, letterSpacing:"0.08em", textTransform:"uppercase", color:T.mc, fontFamily:"'Courier New',monospace" }}>Mastercard</span>
                        </div>
                        <div style={{ fontSize:10, fontWeight:600, color:T.mc, fontFamily:"'Courier New',monospace", marginBottom:4 }}>{layer.mcFix.tool}</div>
                        <div style={{ fontSize:10, color:"var(--diagram-3)", lineHeight:1.6 }}>{layer.mcFix.detail}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Footer */}
      <div style={{ padding:"12px 24px 14px", borderTop:`1px solid ${T.border}`, background:T.cream2, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div style={{ fontSize:11, color:T.ink3, fontStyle:"italic", fontFamily:"'Instrument Serif',serif", flex:1 }}>
          {mode === "human"
            ? "Every tool assumes human presence. Remove the human — and the entire stack fails simultaneously."
            : "The layered defense is preserved. Each party still has its role. Every tool has been replaced."}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={() => { reset(); setTimeout(() => setPlaying(true), 50) }}
            style={{ padding:"5px 12px", borderRadius:5, fontSize:9, fontFamily:"'Courier New',monospace", cursor:"pointer", border:`1px solid ${T.ink5}`, background:T.cream, color:T.ink }}>▶ walk through</button>
          <button onClick={reset}
            style={{ padding:"5px 9px", borderRadius:5, fontSize:9, fontFamily:"'Courier New',monospace", cursor:"pointer", border:`1px solid ${T.border}`, background:"transparent", color:T.ink4 }}>reset</button>
        </div>
      </div>

    </div>
  )
}
