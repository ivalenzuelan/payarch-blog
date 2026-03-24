import { useState, useEffect, useRef } from "react"

const T = {
  cream:"#faf9f6", cream2:"#f5f3ee", cream3:"#ede9e2",
  ink:"#1a1814", ink2:"#4a4440", ink3:"#5e5750", ink4:"#8a8278", ink5:"#b8b3a8",
  pass:"#186040", passLight:"#f0f8f4", passBorder:"#a8d8b8",
  fail:"#c02010", failLight:"#fff4f2", failBorder:"#f0b0a0",
  visa:"#185FA5", blueLight:"#eef3ff", blueBorder:"#b8d0f0",
  mc:"#8B3012", mcLight:"#fff3ee", mcBorder:"#f0b898",
  border:"#e0dbd0",
}

const REBUILD = [
  {
    id:"merchant", num:"01", actor:"Merchant + Gateway", color:"#1a1814",
    question:"Is this a human?",
    before:[
      { tool:"CAPTCHA",            broken:"Requires visual perception — agent has none" },
      { tool:"Device fingerprint", broken:"Headless Chrome — perfect bot signature" },
      { tool:"Velocity / IP check",broken:"AWS IP · machine speed — flags as attack" },
    ],
    visa:{ tool:"TAP JWT", standard:"RFC 9421", detail:"Ed25519-signed JWT from tap.visa.com · validated locally in <5ms · consumer_recognized flag · instruction_ref links to pre-authorized intent" },
    mc:  { tool:"CDN agent verification", standard:"Web Bot Auth", detail:"Cloudflare verifies cryptographic agent identity at edge · unregistered agents never reach merchant · no code change required" },
  },
  {
    id:"acquirer", num:"02", actor:"Acquirer + Processor", color:"#7a4a10",
    question:"Does the transaction signal match?",
    before:[
      { tool:"AVS / CVV match",   broken:"Agent submits programmatically — no address to verify" },
      { tool:"F022 = 01",         broken:"POS Entry Mode 'manual key entry' since 1990s — triggers human rules downstream" },
      { tool:"IP reputation",     broken:"Data center IP triggers every heuristic" },
    ],
    visa:{ tool:"F022=81 + F048 + F126", standard:"ISO 8583 · VIC", detail:"F022=81 = agent-initiated (new value) · F048 = agent identifier · F126 = TAP instruction hash. All three propagate agent context through the entire downstream chain." },
    mc:  { tool:"Agentic Token + F022 equiv.", standard:"ISO 8583 · MC", detail:"Agent identity embedded in Agentic Token metadata — not in message fields. New POS Entry Mode value tells issuer: load agent policy, not human rules." },
  },
  {
    id:"network", num:"03", actor:"Card Network", color:"#186040",
    question:"Is this a distributed attack?",
    before:[
      { tool:"ML behavioral model",  broken:"Trained to catch exactly this: machine-speed + data center IP" },
      { tool:"Distributed detection",broken:"Agent shopping = bot testing cards across merchants" },
      { tool:"No pre-auth registry", broken:"No way to verify consumer already approved this intent" },
    ],
    visa:{ tool:"VIC instruction registry", standard:"Visa Intelligent Commerce", detail:"VisaNet validates F126 hash against pre-authorized payment instruction. Amount + merchant tamper = immediate decline (code 58). F022=81 triggers agent-aware ML model." },
    mc:  { tool:"Agentic Token binding", standard:"Mastercard Token Service", detail:"Network validates token was issued for this exact agent + consumer + context. Token carries cryptographic proof through entire authorization chain." },
  },
  {
    id:"issuer", num:"04", actor:"Issuer Bank", color:"#185FA5",
    question:"Is the cardholder present?",
    before:[
      { tool:"Probabilistic risk score",broken:"High network risk score → step-up triggered" },
      { tool:"3DS step-up auth",        broken:"SMS challenge sent — agent cannot respond in real time" },
      { tool:"Human-in-loop fallback",  broken:"Transaction fails permanently. No recovery path." },
    ],
    visa:{ tool:"Agent policy + FIDO2 Passkey", standard:"FIDO2 · VIC Auth API", detail:"Passkey assertion at instruction time, not transaction time. F022=81 → issuer loads: balance ✓ · limit ✓ · category ✓ · velocity ✓. No step-up authentication." },
    mc:  { tool:"Payment Passkey + spending policy", standard:"FIDO2 · MC Agent Pay", detail:"Consumer proves intent once with biometric Passkey. Pre-authorized spending policy loaded at F022 signal. Deterministic rules replace probabilistic scoring and 3DS entirely." },
  },
]


export default function RebuildMap() {
  const [open, setOpen]         = useState(null)
  const [revealed, setRevealed] = useState(new Set())
  const [playing, setPlaying]   = useState(false)
  const playRef = useRef(false)

  const toggle = (id) => {
    const next = open === id ? null : id
    setOpen(next)
    if (next) setRevealed(s => new Set([...s, next]))
  }

  useEffect(() => {
    if (!playing) return
    playRef.current = true
    const run = async () => {
      for (const layer of REBUILD) {
        if (!playRef.current) break
        setOpen(layer.id)
        setRevealed(s => new Set([...s, layer.id]))
        await new Promise(r => setTimeout(r, 2400))
      }
      playRef.current = false
      setPlaying(false)
    }
    run()
    return () => { playRef.current = false }
  }, [playing])

  const reset = () => { playRef.current = false; setPlaying(false); setOpen(null); setRevealed(new Set()) }

  return (
    <div style={{ fontFamily:"'Georgia','Times New Roman',serif", background:T.cream, borderRadius:12, border:`1px solid ${T.border}`, overflow:"hidden" }}>

      {/* Header */}
      <div style={{ padding:"20px 24px 16px", background:T.cream2, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:T.ink4, fontFamily:"'Courier New',monospace", marginBottom:6 }}>
          4-party model · the complete rebuild
        </div>
        <h2 style={{ fontSize:19, fontWeight:400, letterSpacing:"-.02em", margin:"0 0 4px", color:T.ink }}>
          Every security tool replaced — layer by layer
        </h2>
        <div style={{ fontSize:11, color:T.ink4, fontFamily:"'Courier New',monospace" }}>
          human-era tools → broken for agents → Visa and Mastercard replacements
        </div>
      </div>

      {/* Visual key */}
      <div style={{ padding:"9px 24px", borderBottom:`1px solid ${T.border}`, background:T.cream3, display:"flex", gap:20, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:9, padding:"1px 7px", background:T.cream3, border:`1px solid ${T.border}`, borderRadius:2, color:T.ink4, fontFamily:"'Courier New',monospace" }}>tool</span>
          <span style={{ fontSize:9, color:T.ink4 }}>human-era</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:9, padding:"1px 7px", background:T.failLight, border:`1px solid ${T.failBorder}`, borderRadius:2, color:T.fail, fontFamily:"'Courier New',monospace", textDecoration:"line-through" }}>tool</span>
          <span style={{ fontSize:9, color:T.ink4 }}>broken for agents</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:9, padding:"1px 7px", background:T.passLight, border:`1px solid ${T.passBorder}`, borderRadius:2, color:T.pass, fontFamily:"'Courier New',monospace" }}>→ replacement</span>
          <span style={{ fontSize:9, color:T.ink4 }}>rebuilt for agents</span>
        </div>
        <span style={{ marginLeft:"auto", fontSize:9, color:T.ink4, fontFamily:"'Courier New',monospace" }}>click any layer</span>
      </div>

      {/* Layers */}
      {REBUILD.map((layer, i) => {
        const isOpen     = open === layer.id
        const isRevealed = revealed.has(layer.id)

        return (
          <div key={layer.id} style={{
            borderBottom: i < REBUILD.length-1 ? `1px solid ${T.border}` : "none",
            borderLeft:`3px solid ${isOpen ? layer.color : T.border}`,
            background: isOpen ? T.cream2 : i%2===0 ? T.cream : T.cream2,
            transition:"background .2s, border-left-color .2s",
          }}>

            {/* Header row */}
            <div onClick={() => toggle(layer.id)} style={{ cursor:"pointer", display:"grid", gridTemplateColumns:"50px 1fr", padding:"13px 0" }}>

              <div style={{ paddingLeft:12, paddingTop:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:isOpen?layer.color:T.ink4, fontFamily:"'Courier New',monospace", lineHeight:1 }}>{layer.num}</div>
              </div>

              <div style={{ paddingRight:14 }}>
                <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:7, flexWrap:"wrap" }}>
                  <span style={{ fontSize:12, fontWeight:600, color:layer.color, fontFamily:"'Courier New',monospace" }}>{layer.actor}</span>
                  <span style={{ fontSize:11, color:T.ink3, fontStyle:"italic", fontFamily:"'Instrument Serif',serif" }}>{layer.question}</span>
                  <span style={{ marginLeft:"auto", fontSize:10, color:isOpen?layer.color:T.ink5, fontFamily:"'Courier New',monospace", transform:isOpen?"rotate(90deg)":"rotate(0deg)", display:"inline-block", transition:"transform .2s" }}>→</span>
                </div>

                {/* Tools strip */}
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {layer.before.map(b => (
                    <span key={b.tool} style={{
                      fontSize:8.5, padding:"2px 7px", borderRadius:2, fontFamily:"'Courier New',monospace",
                      border:`1px solid ${isRevealed ? T.failBorder : T.border}`,
                      background: isRevealed ? T.failLight : T.cream3,
                      color: isRevealed ? T.fail : T.ink4,
                      textDecoration: isRevealed ? "line-through" : "none",
                      opacity: isRevealed ? 0.65 : 1,
                      transition:"all .3s",
                    }}>{b.tool}</span>
                  ))}
                  {isRevealed && (
                    <span style={{ fontSize:8.5, padding:"2px 7px", borderRadius:2, fontFamily:"'Courier New',monospace",
                      border:`1px solid ${T.passBorder}`, background:T.passLight, color:T.pass }}>
                      → rebuilt
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded */}
            {isOpen && (
              <div style={{ padding:"0 16px 18px 50px", borderTop:`1px solid ${T.border}` }}>

                {/* Before — broken tools */}
                <div style={{ paddingTop:12, marginBottom:12 }}>
                  <div style={{ fontSize:9, letterSpacing:"0.08em", textTransform:"uppercase", color:T.fail, fontFamily:"'Courier New',monospace", marginBottom:8 }}>
                    before — why these tools break for agents
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    {layer.before.map((b, bi) => (
                      <div key={bi} style={{ display:"flex", gap:0, alignItems:"stretch",
                        background:T.failLight, border:`1px solid ${T.failBorder}`, borderRadius:6, overflow:"hidden" }}>
                        <div style={{ width:3, background:T.fail, flexShrink:0 }}/>
                        <div style={{ padding:"7px 12px", flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                            <span style={{ fontSize:9, color:T.fail, fontFamily:"'Courier New',monospace" }}>✕</span>
                            <span style={{ fontSize:10, fontWeight:600, color:T.fail, fontFamily:"'Courier New',monospace",
                              textDecoration:"line-through", opacity:0.7 }}>{b.tool}</span>
                          </div>
                          <div style={{ fontSize:11, color:T.ink2, lineHeight:1.55 }}>{b.broken}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* After — Visa + Mastercard */}
                <div>
                  <div style={{ fontSize:9, letterSpacing:"0.08em", textTransform:"uppercase", color:T.pass, fontFamily:"'Courier New',monospace", marginBottom:8 }}>
                    after — rebuilt for non-human principals
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>

                    {/* Visa */}
                    <div style={{ background:T.blueLight, border:`1px solid ${T.blueBorder}`, borderRadius:8, padding:"12px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
                        <svg width="16" height="10" viewBox="0 0 36 24">
                          <path d="M3 19Q18 2 33 19" fill="none" stroke={T.visa} strokeWidth="2.5" strokeLinecap="round"/>
                          <circle cx="3" cy="19" r="2" fill={T.visa}/>
                          <circle cx="33" cy="19" r="2" fill={T.visa}/>
                        </svg>
                        <span style={{ fontSize:9, letterSpacing:"0.08em", textTransform:"uppercase", color:T.visa, fontFamily:"'Courier New',monospace" }}>Visa</span>
                      </div>
                      <div style={{ fontSize:11, fontWeight:600, color:T.visa, fontFamily:"'Courier New',monospace", marginBottom:5 }}>{layer.visa.tool}</div>
                      <div style={{ fontSize:10, color:"#1a4a90", lineHeight:1.65, marginBottom:8 }}>{layer.visa.detail}</div>
                      <span style={{ fontSize:8, padding:"2px 6px", background:"#dce8ff", color:T.visa, border:`1px solid ${T.blueBorder}`, borderRadius:2, fontFamily:"'Courier New',monospace" }}>
                        {layer.visa.standard}
                      </span>
                    </div>

                    {/* Mastercard */}
                    <div style={{ background:T.mcLight, border:`1px solid ${T.mcBorder}`, borderRadius:8, padding:"12px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
                        <div style={{ position:"relative", width:24, height:14, flexShrink:0 }}>
                          <div style={{ position:"absolute", left:0, top:0, width:14, height:14, background:"#e8372a", borderRadius:"50%", opacity:0.92 }}/>
                          <div style={{ position:"absolute", left:10, top:0, width:14, height:14, background:"#f5a800", borderRadius:"50%", opacity:0.92 }}/>
                        </div>
                        <span style={{ fontSize:9, letterSpacing:"0.08em", textTransform:"uppercase", color:T.mc, fontFamily:"'Courier New',monospace" }}>Mastercard</span>
                      </div>
                      <div style={{ fontSize:11, fontWeight:600, color:T.mc, fontFamily:"'Courier New',monospace", marginBottom:5 }}>{layer.mc.tool}</div>
                      <div style={{ fontSize:10, color:"#5a1a08", lineHeight:1.65, marginBottom:8 }}>{layer.mc.detail}</div>
                      <span style={{ fontSize:8, padding:"2px 6px", background:"#ffe0d0", color:T.mc, border:`1px solid ${T.mcBorder}`, borderRadius:2, fontFamily:"'Courier New',monospace" }}>
                        {layer.mc.standard}
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Footer */}
      <div style={{ padding:"14px 24px 16px", borderTop:`1px solid ${T.border}`, background:T.cream2, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ fontSize:12, color:T.ink3, fontStyle:"italic", fontFamily:"'Instrument Serif',serif", flex:1, lineHeight:1.7 }}>
          The 4-party settlement architecture is unchanged. ISO 8583 still flows from acquirer to network to issuer.
          T+1 clearing. Chargebacks. What changed is every security tool — replaced with one that works for non-human principals.
        </div>
        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
          <button onClick={() => { reset(); setTimeout(() => setPlaying(true), 50) }}
            style={{ padding:"6px 14px", borderRadius:5, fontSize:10, fontFamily:"'Courier New',monospace", cursor:"pointer", border:`1px solid ${T.ink5}`, background:T.cream, color:T.ink }}>▶ play</button>
          <button onClick={reset}
            style={{ padding:"6px 10px", borderRadius:5, fontSize:10, fontFamily:"'Courier New',monospace", cursor:"pointer", border:`1px solid ${T.border}`, background:"transparent", color:T.ink4 }}>reset</button>
        </div>
      </div>

    </div>
  )
}
