import { useState } from "react"

const REQUEST_FIELDS = [
  {
    id: "F002", name: "Primary Account Number", humanVal: "4111000000001111", agentVal: "4111xxxxAGNT", bytes: 19, type: "mod",
    humanNote: "Real 16-digit card number transmitted in clear between merchant, acquirer, and network.",
    agentNote: "Agent-bound Virtual Card Number (VCN) issued by Visa Token Service. The real PAN never leaves Visa's systems."
  },
  {
    id: "F003", name: "Processing Code", humanVal: "000000", agentVal: "000000", bytes: 6, type: "std",
    humanNote: "000000 = purchase transaction.",
    agentNote: "Unchanged."
  },
  {
    id: "F004", name: "Amount", humanVal: "000000008999", agentVal: "000000008999", bytes: 12, type: "std",
    humanNote: "$89.99 with implied 2 decimal places. Zero-padded to 12 digits.",
    agentNote: "Unchanged. VisaNet validates this against the stored payment instruction — any tampering in transit = decline."
  },
  {
    id: "F007", name: "Date/Time", humanVal: "0321143422", agentVal: "0321143422", bytes: 10, type: "std",
    humanNote: "MMDDhhmmss — March 21, 14:34:22.", agentNote: "Unchanged."
  },
  {
    id: "F011", name: "STAN", humanVal: "000123", agentVal: "000123", bytes: 6, type: "std",
    humanNote: "System Trace Audit Number — unique sequence per transaction within the acquirer.", agentNote: "Unchanged."
  },
  {
    id: "F022", name: "POS Entry Mode", humanVal: "01", agentVal: "81", bytes: 3, type: "mod",
    humanNote: "01 = manual key entry. Used for ecommerce since the late 1990s.",
    agentNote: "★ 81 = agent-initiated. New value introduced for agentic commerce. Every downstream system that sees F022=81 switches to agent-specific risk rules instead of human behavioral models."
  },
  {
    id: "F025", name: "POS Condition Code", humanVal: "00", agentVal: "59", bytes: 2, type: "mod",
    humanNote: "00 = normal transaction conditions.",
    agentNote: "★ 59 = agent present. New condition code indicating the initiating party is a software agent."
  },
  {
    id: "F041", name: "Terminal ID", humanVal: "TERM-001", agentVal: "AGNT-001", bytes: 8, type: "mod",
    humanNote: "Physical or virtual terminal identifier registered with the acquirer.",
    agentNote: "Agent terminal ID — AGNT prefix distinguishes from human checkout terminals in acquirer reporting."
  },
  {
    id: "F042", name: "Merchant ID", humanVal: "BOSE-001", agentVal: "BOSE-001", bytes: 8, type: "std",
    humanNote: "Merchant identifier registered with the acquirer.", agentNote: "Unchanged — same merchant."
  },
  {
    id: "F048", name: "Additional Data", humanVal: "—", agentVal: "AGNT:skyfire-001", bytes: 16, type: "new",
    humanNote: "Private use field — typically empty in consumer checkout.",
    agentNote: "★ Agent identifier injected. Format: AGNT:{agent_id}. Enables downstream audit trail and agent-specific analytics at issuer and VisaNet level."
  },
  {
    id: "F049", name: "Currency Code", humanVal: "840", agentVal: "840", bytes: 3, type: "std",
    humanNote: "840 = USD (ISO 4217).", agentNote: "Unchanged."
  },
  {
    id: "F126", name: "Private Use", humanVal: "—", agentVal: "pi-abc123:sha256:3a7f", bytes: 24, type: "new",
    humanNote: "Private use field — empty in standard consumer transactions.",
    agentNote: "★ TAP payment instruction reference. SHA-256 hash of the VIC instruction. VisaNet validates this — if amount or merchant was tampered in transit, transaction is declined."
  },
]

const RESPONSE_FIELDS = [
  {
    id: "F002", name: "Primary Account Number", val: "4111xxxxAGNT", bytes: 19, type: "std",
    note: "VCN echoed back — confirms token was accepted."
  },
  {
    id: "F003", name: "Processing Code", val: "000000", bytes: 6, type: "std",
    note: "Echoed from request."
  },
  {
    id: "F004", name: "Amount", val: "000000008999", bytes: 12, type: "std",
    note: "$89.99 — echoed and confirmed."
  },
  {
    id: "F007", name: "Date/Time", val: "0321143422", bytes: 10, type: "std",
    note: "Echoed from request."
  },
  {
    id: "F011", name: "STAN", val: "000123", bytes: 6, type: "std",
    note: "Echoed — used to match request to response."
  },
  {
    id: "F038", name: "Authorization Code", val: "123456", bytes: 6, type: "new",
    note: "★ 6-digit auth code issued by the issuer. Required for settlement. Must match at T+1 clearing."
  },
  {
    id: "F039", name: "Response Code", val: "00", bytes: 2, type: "new",
    note: "★ 00 = approved. Other codes: 05 = do not honor, 51 = insufficient funds, 58 = invalid terminal (F126 mismatch)."
  },
  {
    id: "F048", name: "Additional Data", val: "AGNT:skyfire-001", bytes: 16, type: "std",
    note: "Agent identifier echoed — preserved through the chain for audit."
  },
  {
    id: "F126", name: "Private Use", val: "agent-confirmed", bytes: 16, type: "new",
    note: "★ TAP confirmation echo. Proves the issuer processed this as an agent-initiated transaction. Acquirer uses this as audit proof."
  },
]

const COLORS = {
  new: { bg: "#fff4ee", border: "#e8855a", text: "#c04a10", dot: "#e06030", label: "New field" },
  mod: { bg: "#eef3ff", border: "#6b8fd4", text: "#1a3a80", dot: "#2a5ab8", label: "Modified" },
  std: { bg: "#f8f7f4", border: "#d8d3c8", text: "#6b6560", dot: "#b8b3a8", label: "Unchanged" },
}

function PacketBar({ fields, mode, hovered, setHovered, isResponse }) {
  const totalBytes = fields.reduce((s, f) => s + f.bytes, 0)
  return (
    <div style={{ display: "flex", width: "100%", borderRadius: 6, overflow: "hidden", border: "1px solid #d8d3c8" }}>
      {fields.map((f, i) => {
        const type = isResponse ? f.type : (mode === "human" ? "std" : f.type)
        const c = COLORS[type]
        const w = (f.bytes / totalBytes * 100).toFixed(1)
        const isHov = hovered === f.id
        return (
          <div
            key={f.id}
            onMouseEnter={() => setHovered(f.id)}
            onMouseLeave={() => setHovered(null)}
            title={f.id}
            style={{
              width: w + "%",
              minWidth: 14,
              background: isHov ? (type === "new" ? "#ffe8da" : type === "mod" ? "#dde8ff" : "#ede9e2") : c.bg,
              borderRight: i < fields.length - 1 ? `1px solid ${c.border}` : "none",
              padding: "7px 2px 6px",
              textAlign: "center",
              transition: "background .1s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "default",
              position: "relative",
            }}>
            <div style={{ width: 6, height: 6, borderRadius: 1, background: isHov ? c.text : c.dot, flexShrink: 0, transition: "background .1s" }} />
            <div style={{
              fontSize: 7.5,
              fontFamily: "'Courier New',monospace",
              color: isHov ? c.text : c.dot,
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              maxWidth: "calc(100% - 2px)",
              textOverflow: "clip",
              lineHeight: 1,
              fontWeight: isHov ? 700 : 400,
            }}>
              {f.id}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Iso8583Diagram() {
  const [mode, setMode] = useState("agent")
  const [mti, setMti] = useState("request")
  const [hovered, setHovered] = useState(null)

  const isResponse = mti === "response"
  const fields = isResponse ? RESPONSE_FIELDS : REQUEST_FIELDS
  const totalBytes = fields.reduce((s, f) => s + f.bytes, 0)
  const activeField = fields.find(f => f.id === hovered)

  return (
    <div style={{ 
      fontFamily: "'Georgia','Times New Roman',serif", color: "#1a1814", background: "#faf9f6", borderRadius: 12, border: "1px solid #e0dbd0", overflow: "hidden", 
      width: "100%", maxWidth: 1040, margin: "20px auto", boxSizing: "border-box"
    }}>

      {/* Header */}
      <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #e0dbd0", background: "#f5f3ee" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9a9288", fontFamily: "'Courier New',monospace", marginBottom: 6 }}>
          ISO 8583 · Authorization · Human vs. Agent
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.02em", margin: 0 }}>
            Message anatomy: {isResponse ? "MTI 0110 — response" : "MTI 0100 — request"}
          </h2>
          <div style={{ display: "flex", gap: 6 }}>
            {/* MTI toggle */}
            <div style={{ display: "flex", gap: 2, background: "#e8e3da", borderRadius: 5, padding: 2 }}>
              {[["request", "0100"], ["response", "0110"]].map(([v, label]) => (
                <button key={v} onClick={() => { setMti(v); setHovered(null) }} style={{
                  padding: "4px 11px", borderRadius: 3, fontSize: 10, fontFamily: "'Courier New',monospace",
                  cursor: "pointer", border: "none", letterSpacing: "0.04em",
                  background: mti === v ? "#faf9f6" : "transparent",
                  color: mti === v ? "#1a1814" : "#9a9288",
                  boxShadow: mti === v ? "0 1px 2px rgba(0,0,0,0.07)" : "none",
                  fontWeight: mti === v ? 600 : 400, transition: "all .15s"
                }}>MTI {label}</button>
              ))}
            </div>
            {/* Mode toggle — only for request */}
            {!isResponse && (
              <div style={{ display: "flex", gap: 2, background: "#e8e3da", borderRadius: 5, padding: 2 }}>
                {["human", "agent", "diff"].map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    padding: "4px 11px", borderRadius: 3, fontSize: 10, fontFamily: "'Courier New',monospace",
                    cursor: "pointer", border: "none", letterSpacing: "0.04em",
                    background: mode === m ? "#faf9f6" : "transparent",
                    color: mode === m ? "#1a1814" : "#9a9288",
                    boxShadow: mode === m ? "0 1px 2px rgba(0,0,0,0.07)" : "none",
                    fontWeight: mode === m ? 600 : 400, transition: "all .15s"
                  }}>{m === "diff" ? "diff" : m}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: "9px 24px", borderBottom: "1px solid #e0dbd0", display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        {Object.entries(COLORS).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#6b6560", fontFamily: "'Courier New',monospace" }}>
            <div style={{ width: 8, height: 8, borderRadius: 1, background: v.dot }} />
            {v.label}
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 10, color: "#b8b3a8", fontFamily: "'Courier New',monospace" }}>
          {totalBytes} bytes total · width ∝ field length
        </div>
      </div>

      {/* Packet bar */}
      <div style={{ padding: "14px 24px 4px" }}>
        <PacketBar
          fields={fields}
          mode={mode}
          hovered={hovered}
          setHovered={setHovered}
          isResponse={isResponse}
        />

        {/* Hover strip */}
        <div style={{ height: 30, marginTop: 5, display: "flex", alignItems: "center" }}>
          {activeField ? (() => {
            const type = isResponse ? activeField.type : (mode === "human" ? "std" : activeField.type)
            const c = COLORS[type]
            const val = isResponse ? activeField.val : (mode === "human" ? activeField.humanVal : activeField.agentVal)
            return (
              <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11, fontFamily: "'Courier New',monospace" }}>
                <span style={{ color: c.text, fontWeight: 700 }}>{activeField.id}</span>
                <span style={{ color: "#9a9288" }}>{activeField.name}</span>
                <span style={{ background: c.bg, color: c.text, padding: "2px 7px", borderRadius: 3, border: `1px solid ${c.border}` }}>{val}</span>
              </div>
            )
          })() : (
            <div style={{ fontSize: 11, color: "#c8c3b8", fontFamily: "'Courier New',monospace" }}>hover a field to inspect ↑</div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ borderTop: "1px solid #e0dbd0", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f0ece4" }}>
              <th style={{ padding: "7px 16px", textAlign: "left", fontFamily: "'Courier New',monospace", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a9288", fontWeight: 400, width: 60 }}>Field</th>
              <th style={{ padding: "7px 16px", textAlign: "left", fontFamily: "'Courier New',monospace", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a9288", fontWeight: 400 }}>Name</th>
              <th style={{ padding: "7px 16px", textAlign: "left", fontFamily: "'Courier New',monospace", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a9288", fontWeight: 400, width: 200 }}>
                {isResponse ? "Value" : mode === "human" ? "Value" : mode === "diff" ? "Human → Agent" : "Value (agent)"}
              </th>
              <th style={{ padding: "7px 16px", textAlign: "left", fontFamily: "'Courier New',monospace", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a9288", fontWeight: 400 }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => {
              const type = isResponse ? f.type : (mode === "human" ? "std" : f.type)
              const c = COLORS[type]
              const isHov = hovered === f.id
              const note = isResponse ? f.note : (mode === "human" ? f.humanNote : f.agentNote)

              let valCell
              if (isResponse) {
                valCell = <span style={{ color: c.text }}>{f.val}</span>
              } else if (mode === "diff" && f.type !== "std") {
                valCell = (
                  <span style={{ fontFamily: "'Courier New',monospace" }}>
                    <span style={{ color: "#9a9288", textDecoration: "line-through", marginRight: 6 }}>{f.humanVal}</span>
                    <span style={{ color: c.text, fontWeight: 600 }}>{f.agentVal}</span>
                  </span>
                )
              } else {
                const val = mode === "human" ? f.humanVal : f.agentVal
                valCell = <span style={{ color: c.text }}>{val}</span>
              }

              return (
                <tr key={f.id}
                  onMouseEnter={() => setHovered(f.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: isHov ? c.bg : (i % 2 === 0 ? "#faf9f6" : "#f5f3ee"),
                    borderBottom: "1px solid #e8e3da",
                    transition: "background .1s",
                    cursor: "default"
                  }}>
                  <td style={{ padding: "6px 16px", fontFamily: "'Courier New',monospace", fontSize: 11 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 1, background: c.dot, flexShrink: 0 }} />
                      <span style={{ color: c.text, fontWeight: 600 }}>{f.id}</span>
                    </div>
                  </td>
                  <td style={{ padding: "6px 16px", fontFamily: "'Courier New',monospace", fontSize: 11, color: "#1a1814" }}>
                    {f.name}
                    {type !== "std" && (
                      <span style={{ marginLeft: 6, fontSize: 8.5, padding: "1px 5px", borderRadius: 2, background: c.bg, color: c.text, border: `1px solid ${c.border}`, letterSpacing: "0.04em" }}>
                        {type === "new" ? "NEW" : "MOD"}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "6px 16px", fontFamily: "'Courier New',monospace", fontSize: 11 }}>
                    {valCell}
                  </td>
                  <td style={{ padding: "6px 16px", fontSize: 11, color: "#6b6560", lineHeight: 1.5, fontFamily: "Georgia,serif" }}>
                    {note && note.startsWith("★") ? (
                      <span><span style={{ color: c.text, fontWeight: 600 }}>★ </span>{note.slice(2)}</span>
                    ) : note}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div style={{ padding: "11px 24px", borderTop: "1px solid #e0dbd0", background: "#f5f3ee", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        {isResponse ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11 }}>
              <div style={{ width: 8, height: 8, borderRadius: 1, background: COLORS.new.dot }} />
              <span style={{ fontFamily: "'Courier New',monospace", color: COLORS.new.text, fontWeight: 600 }}>3 new fields in response</span>
              <span style={{ color: "#9a9288" }}>F038 auth code · F039 result · F126 TAP confirmation</span>
            </div>
            <div style={{ marginLeft: "auto", fontFamily: "'Courier New',monospace", fontSize: 10, color: "#9a9288" }}>
              ~180ms round-trip
            </div>
          </>
        ) : mode !== "human" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11 }}>
              <div style={{ width: 8, height: 8, borderRadius: 1, background: COLORS.new.dot }} />
              <span style={{ fontFamily: "'Courier New',monospace", color: COLORS.new.text, fontWeight: 600 }}>2 new fields</span>
              <span style={{ color: "#9a9288" }}>F048 agent-id · F126 TAP hash</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11 }}>
              <div style={{ width: 8, height: 8, borderRadius: 1, background: COLORS.mod.dot }} />
              <span style={{ fontFamily: "'Courier New',monospace", color: COLORS.mod.text, fontWeight: 600 }}>3 modified fields</span>
              <span style={{ color: "#9a9288" }}>F002 PAN→VCN · F022 01→81 · F025 00→59</span>
            </div>
          </>
        ) : (
          <div style={{ fontFamily: "'Courier New',monospace", fontSize: 10, color: "#b8b3a8" }}>
            switch to agent or diff to see what changes
          </div>
        )}
      </div>

    </div>
  )
}