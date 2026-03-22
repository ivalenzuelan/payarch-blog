import { useState } from "react"

const FIELDS = [
  { id:"F002", name:"PAN", humanVal:"4111000000001111", agentVal:"4111xxxxAGNT", bytes:19, type:"mod",
    humanNote:"Real 16-digit card number transmitted in clear.",
    agentNote:"Agent-bound Virtual Card Number (VCN). Real PAN never leaves Visa Token Service." },
  { id:"F003", name:"Processing Code", humanVal:"000000", agentVal:"000000", bytes:6, type:"std",
    humanNote:"000000 = purchase transaction.",
    agentNote:"Unchanged." },
  { id:"F004", name:"Amount", humanVal:"000000008999", agentVal:"000000008999", bytes:12, type:"std",
    humanNote:"$89.99 — implied 2 decimal places.",
    agentNote:"Unchanged. VisaNet validates this against the stored payment instruction — any tamper = decline." },
  { id:"F007", name:"Date/Time", humanVal:"0321143422", agentVal:"0321143422", bytes:10, type:"std",
    humanNote:"MMDDhhmmss transmission timestamp.", agentNote:"Unchanged." },
  { id:"F011", name:"STAN", humanVal:"000123", agentVal:"000123", bytes:6, type:"std",
    humanNote:"System Trace Audit Number — unique sequence per transaction.", agentNote:"Unchanged." },
  { id:"F022", name:"POS Entry Mode", humanVal:"01", agentVal:"81", bytes:3, type:"mod",
    humanNote:"01 = manual key entry. Used for ecommerce since the 1990s.",
    agentNote:"★ 81 = agent-initiated. New value. Every downstream system that sees F022=81 switches to agent-specific risk rules. This single field change propagates through the entire authorization chain." },
  { id:"F025", name:"POS Condition", humanVal:"00", agentVal:"59", bytes:2, type:"mod",
    humanNote:"00 = normal transaction conditions.",
    agentNote:"★ 59 = agent present. New condition code for software-initiated transactions." },
  { id:"F041", name:"Terminal ID", humanVal:"TERM-001", agentVal:"AGNT-001", bytes:8, type:"mod",
    humanNote:"Physical or virtual terminal identifier.", agentNote:"Agent terminal ID — AGNT prefix." },
  { id:"F042", name:"Merchant ID", humanVal:"BOSE-001", agentVal:"BOSE-001", bytes:8, type:"std",
    humanNote:"Merchant registered with acquirer.", agentNote:"Unchanged." },
  { id:"F048", name:"Additional Data", humanVal:"—", agentVal:"AGNT:skyfire-001", bytes:16, type:"new",
    humanNote:"Private use — empty in consumer checkout.",
    agentNote:"★ Agent identifier injected. Format: AGNT:{agent_id}. Enables downstream audit trail and analytics." },
  { id:"F049", name:"Currency", humanVal:"840", agentVal:"840", bytes:3, type:"std",
    humanNote:"840 = USD (ISO 4217).", agentNote:"Unchanged." },
  { id:"F126", name:"Private Use", humanVal:"—", agentVal:"pi-abc123:sha256:3a7f", bytes:24, type:"new",
    humanNote:"Private use — empty in standard transactions.",
    agentNote:"★ TAP payment instruction reference. SHA-256 hash of the VIC instruction. VisaNet validates this — if amount or merchant was tampered in transit, this check fails and transaction is declined." },
]

const COLORS = {
  new:  { bg:"#fff4ee", border:"#e8855a", text:"#c04a10", dot:"#e06030", label:"New field" },
  mod:  { bg:"#eef3ff", border:"#6b8fd4", text:"#1a3a80", dot:"#2a5ab8", label:"Modified" },
  std:  { bg:"#f8f7f4", border:"#d8d3c8", text:"#6b6560", dot:"#b8b3a8", label:"Unchanged" },
}

export default function Iso8583Diagram() {
  const [mode, setMode] = useState("agent")
  const [hovered, setHovered] = useState(null)

  const totalBytes = FIELDS.reduce((s,f) => s + f.bytes, 0)
  const activeField = FIELDS.find(f => f.id === hovered)

  return (
    <div style={{ fontFamily:"'Georgia', 'Times New Roman', serif", color:"#1a1814", background:"#faf9f6", borderRadius:12, border:"1px solid #e0dbd0", overflow:"hidden", maxWidth:800 }}>

      {/* Header */}
      <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #e0dbd0", background:"#f5f3ee" }}>
        <div style={{ fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", color:"#9a9288", fontFamily:"'Courier New', monospace", marginBottom:6 }}>
          ISO 8583 · MTI 0100 · Authorization Request
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <h2 style={{ fontSize:18, fontWeight:400, letterSpacing:"-0.02em", margin:0 }}>
            Message anatomy: human vs. agent checkout
          </h2>
          <div style={{ display:"flex", gap:4, background:"#ede9e2", borderRadius:6, padding:3 }}>
            {["human","agent","diff"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding:"5px 14px", borderRadius:4, fontSize:11, fontFamily:"'Courier New',monospace",
                cursor:"pointer", border:"none", letterSpacing:"0.04em",
                background: mode===m ? "#faf9f6" : "transparent",
                color: mode===m ? "#1a1814" : "#9a9288",
                boxShadow: mode===m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                fontWeight: mode===m ? 600 : 400,
                transition:"all .15s"
              }}>{m === "diff" ? "diff" : m + " checkout"}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding:"10px 24px", borderBottom:"1px solid #e0dbd0", display:"flex", gap:20, flexWrap:"wrap" }}>
        {Object.entries(COLORS).map(([k,v]) => (
          <div key={k} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#6b6560", fontFamily:"'Courier New',monospace" }}>
            <div style={{ width:10, height:10, borderRadius:2, background:v.dot }} />
            {v.label}
          </div>
        ))}
      </div>

      {/* Packet diagram */}
      <div style={{ padding:"16px 24px 12px" }}>
        <div style={{ fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:"#9a9288", fontFamily:"'Courier New',monospace", marginBottom:8 }}>
          Field layout — width proportional to byte length
        </div>
        <div style={{ display:"flex", width:"100%", borderRadius:6, overflow:"hidden", border:"1px solid #d8d3c8", cursor:"default" }}>
          {FIELDS.map((f, i) => {
            const type = mode === "human" ? "std" : f.type
            const c = COLORS[type]
            const w = (f.bytes / totalBytes * 100).toFixed(1)
            const isHov = hovered === f.id
            return (
              <div key={f.id}
                onMouseEnter={() => setHovered(f.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: w + "%", minWidth: w < 3 ? 18 : undefined,
                  background: isHov ? (type==="new"?"#ffe8da":type==="mod"?"#dde8ff":"#ede9e2") : c.bg,
                  borderRight: i < FIELDS.length-1 ? `1px solid ${c.border}` : "none",
                  padding:"6px 3px 5px", textAlign:"center", transition:"background .12s",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:2
                }}>
                <div style={{ width:6, height:6, borderRadius:1, background:c.dot, flexShrink:0 }} />
                {parseFloat(w) > 4 && (
                  <div style={{ fontSize:8, fontFamily:"'Courier New',monospace", color:c.text, letterSpacing:"0.04em", writingMode:"horizontal-tb", whiteSpace:"nowrap", overflow:"hidden", maxWidth:"100%", textOverflow:"ellipsis" }}>
                    {f.id}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Hover value strip */}
        <div style={{ height:32, marginTop:4, display:"flex", alignItems:"center" }}>
          {activeField ? (
            <div style={{ display:"flex", gap:12, alignItems:"center", fontSize:11, fontFamily:"'Courier New',monospace" }}>
              <span style={{ color:COLORS[mode==="human"?"std":activeField.type].text, fontWeight:600 }}>{activeField.id}</span>
              <span style={{ color:"#6b6560" }}>{activeField.name}</span>
              <span style={{ background:COLORS[mode==="human"?"std":activeField.type].bg, color:COLORS[mode==="human"?"std":activeField.type].text, padding:"2px 8px", borderRadius:3, border:`1px solid ${COLORS[mode==="human"?"std":activeField.type].border}` }}>
                {mode==="human" ? activeField.humanVal : activeField.agentVal}
              </span>
            </div>
          ) : (
            <div style={{ fontSize:11, color:"#b8b3a8", fontFamily:"'Courier New',monospace" }}>hover a field to inspect ↑</div>
          )}
        </div>
      </div>

      {/* Field table */}
      <div style={{ borderTop:"1px solid #e0dbd0" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:"#f0ece4" }}>
              <th style={{ padding:"8px 16px", textAlign:"left", fontFamily:"'Courier New',monospace", fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:"#9a9288", fontWeight:400, width:64 }}>Field</th>
              <th style={{ padding:"8px 16px", textAlign:"left", fontFamily:"'Courier New',monospace", fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:"#9a9288", fontWeight:400 }}>Name</th>
              <th style={{ padding:"8px 16px", textAlign:"left", fontFamily:"'Courier New',monospace", fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:"#9a9288", fontWeight:400, width:180 }}>
                {mode === "human" ? "Value (human)" : "Value (agent)"}
              </th>
              <th style={{ padding:"8px 16px", textAlign:"left", fontFamily:"'Courier New',monospace", fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:"#9a9288", fontWeight:400, width:220 }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {FIELDS.map((f, i) => {
              const type = mode === "human" ? "std" : f.type
              const c = COLORS[type]
              const isHov = hovered === f.id
              const note = mode === "human" ? f.humanNote : f.agentNote
              return (
                <tr key={f.id}
                  onMouseEnter={() => setHovered(f.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ background: isHov ? c.bg : (i%2===0?"#faf9f6":"#f5f3ee"), borderBottom:"1px solid #e8e3da", transition:"background .1s", cursor:"default" }}>
                  <td style={{ padding:"7px 16px", fontFamily:"'Courier New',monospace", fontSize:11, color:c.text, fontWeight:600 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:7, height:7, borderRadius:1, background:c.dot, flexShrink:0 }} />
                      {f.id}
                    </div>
                  </td>
                  <td style={{ padding:"7px 16px", color:"#1a1814", fontFamily:"'Courier New',monospace", fontSize:11 }}>
                    {f.name}
                    {type !== "std" && mode !== "human" && (
                      <span style={{ marginLeft:6, fontSize:9, padding:"1px 5px", borderRadius:2, background:c.bg, color:c.text, border:`1px solid ${c.border}`, letterSpacing:"0.04em" }}>
                        {type === "new" ? "NEW" : "MOD"}
                      </span>
                    )}
                  </td>
                  <td style={{ padding:"7px 16px", fontFamily:"'Courier New',monospace", fontSize:11, color:c.text }}>
                    {mode === "human" ? f.humanVal : f.agentVal}
                  </td>
                  <td style={{ padding:"7px 16px 7px 16px", fontSize:11, color:"#6b6560", lineHeight:1.5, fontFamily:"Georgia, serif" }}>
                    {note.startsWith("★") ? (
                      <span><span style={{ color:c.text, fontWeight:600 }}>★ </span>{note.slice(2)}</span>
                    ) : note}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary bar */}
      {mode !== "human" && (
        <div style={{ padding:"12px 24px", borderTop:"1px solid #e0dbd0", background:"#f5f3ee", display:"flex", gap:24, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:11 }}>
            <div style={{ width:8, height:8, borderRadius:1, background:COLORS.new.dot }} />
            <span style={{ fontFamily:"'Courier New',monospace", color:COLORS.new.text, fontWeight:600 }}>2 new fields</span>
            <span style={{ color:"#9a9288" }}>F048 agent-id · F126 TAP hash</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:11 }}>
            <div style={{ width:8, height:8, borderRadius:1, background:COLORS.mod.dot }} />
            <span style={{ fontFamily:"'Courier New',monospace", color:COLORS.mod.text, fontWeight:600 }}>3 modified fields</span>
            <span style={{ color:"#9a9288" }}>F002 PAN→VCN · F022 01→81 · F025 00→59</span>
          </div>
        </div>
      )}

    </div>
  )
}
