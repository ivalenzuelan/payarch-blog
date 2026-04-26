import { useState } from "react"

const T = {
  cream: "var(--paper)", cream2: "var(--ink-100)", cream3: "var(--ink-200)",
  ink: "var(--ink-900)", ink2: "var(--ink-700)", ink3: "var(--ink-700)", ink4: "var(--ink-500)", ink5: "var(--ink-400)",
  border: "var(--ink-200)",
  orange: "var(--signal-600)", orangeLight: "color-mix(in srgb, var(--diagram-3) 10%, var(--paper-pure))", orangeBorder: "color-mix(in srgb, var(--diagram-3) 45%, var(--ink-200))",
  agent: "var(--diagram-4)", agentLight: "color-mix(in srgb, var(--diagram-4) 10%, var(--paper-pure))", agentBorder: "color-mix(in srgb, var(--diagram-4) 28%, var(--ink-200))",
  pass: "var(--success)",
}

// All 128 field names indexed by bit position (1-indexed)
const FIELD_NAMES = [
  null,
  "Bitmap, Secondary",              // 1
  "Primary Account Number",          // 2
  "Processing Code",                 // 3
  "Transaction Amount",              // 4
  "Settlement Amount",               // 5
  "Cardholder Billing Amount",       // 6
  "Transmission Date/Time",          // 7
  "Cardholder Billing Fee Amount",   // 8
  "Settlement Conversion Rate",      // 9
  "Cardholder Billing Conv. Rate",   // 10
  "STAN",                            // 11
  "Time, Local Transaction",         // 12
  "Date, Local Transaction",         // 13
  "Date, Expiration",                // 14
  "Date, Settlement",                // 15
  "Date, Conversion",                // 16
  "Date, Capture",                   // 17
  "Merchant Category Code",          // 18
  "Acquiring Institution Country",   // 19
  "PAN Extended",                    // 20
  "Forwarding Institution Country",  // 21
  "POS Entry Mode",                  // 22  ← agent-modified
  "Application PAN Seq. No.",        // 23
  "Network International ID (NII)",  // 24
  "POS Condition Code",              // 25  ← agent-modified
  "POS PIN Capture Code",            // 26
  "Auth ID Response Length",         // 27
  "Amount, Transaction Fee",         // 28
  "Amount, Settlement Fee",          // 29
  "Amount, Txn Processing Fee",      // 30
  "Amount, Sett. Processing Fee",    // 31
  "Acquiring Institution ID",        // 32
  "Forwarding Institution ID",       // 33
  "PAN Extended",                    // 34
  "Track 2 Data",                    // 35
  "Track 3 Data",                    // 36
  "Retrieval Reference Number",      // 37
  "Authorization ID Response",       // 38
  "Response Code",                   // 39
  "Service Restriction Code",        // 40
  "Terminal ID",                     // 41  ← agent-modified
  "Merchant ID",                     // 42
  "Card Acceptor Name/Location",     // 43
  "Additional Response Data",        // 44
  "Track 1 Data",                    // 45
  "Amounts, Fees",                   // 46
  "Additional Data — National",      // 47
  "Additional Data — Private",       // 48  ← agent-new
  "Currency Code, Transaction",      // 49
  "Currency Code, Settlement",       // 50
  "Currency Code, Cardholder",       // 51
  "PIN Data",                        // 52
  "Security Related Control Info",   // 53
  "Additional Amounts",              // 54
  "ICC Data (EMV)",                  // 55
  "Reserved ISO",                    // 56
  "Reserved National",               // 57
  "Reserved National",               // 58
  "Reserved National",               // 59
  "Reserved National",               // 60
  "Reserved Private",                // 61
  "Reserved Private",                // 62
  "Reserved Private",                // 63
  "MAC (Primary)",                   // 64
  "Bitmap, Extended",                // 65
  "Settlement Code",                 // 66
  "Extended Payment Code",           // 67
  "Receiving Institution Country",   // 68
  "Settlement Institution Country",  // 69
  "Network Mgmt. Information Code",  // 70
  "Message Number",                  // 71
  "Message Number Last",             // 72
  "Date, Action",                    // 73
  "Credits, Number",                 // 74
  "Credits Reversal, Number",        // 75
  "Debits, Number",                  // 76
  "Debits Reversal, Number",         // 77
  "Transfer Number",                 // 78
  "Transfer Reversal Number",        // 79
  "Inquiries Number",                // 80
  "Authorizations Number",           // 81
  "Credits, Processing Fee",         // 82
  "Credits Reversal, Proc. Fee",     // 83
  "Debits, Processing Fee",          // 84
  "Debits Reversal, Proc. Fee",      // 85
  "Credits, Transaction Fee",        // 86
  "Credits Reversal, Txn Fee",       // 87
  "Debits, Transaction Fee",         // 88
  "Debits Reversal, Txn Fee",        // 89
  "Original Data Elements",          // 90
  "File Update Code",                // 91
  "File Security Code",              // 92
  "Response Indicator",              // 93
  "Service Indicator",               // 94
  "Replacement Amounts",             // 95
  "Message Security Code",           // 96
  "Net Settlement Amount",           // 97
  "Payee",                           // 98
  "Settlement Institution ID",       // 99
  "Receiving Institution ID",        // 100
  "File Name",                       // 101
  "Account Identification 1",        // 102
  "Account Identification 2",        // 103
  "Transaction Description",         // 104
  "Reserved ISO",                    // 105
  "Reserved ISO",                    // 106
  "Reserved ISO",                    // 107
  "Reserved ISO",                    // 108
  "Reserved ISO",                    // 109
  "Reserved ISO",                    // 110
  "Reserved ISO",                    // 111
  "Reserved National",               // 112
  "Reserved National",               // 113
  "Reserved National",               // 114
  "Reserved National",               // 115
  "Reserved National",               // 116
  "Reserved National",               // 117
  "Reserved National",               // 118
  "Reserved National",               // 119
  "Reserved Private",                // 120
  "Reserved Private",                // 121
  "Reserved Private",                // 122
  "Reserved Private",                // 123
  "Reserved Private",                // 124
  "Reserved Private",                // 125
  "TAP Payment Instruction Ref",     // 126  ← agent-new
  "Reserved Private",                // 127
  "MAC (Secondary)",                 // 128
]

// Fields that are new or modified for agent transactions
const AGENT_FIELDS = new Set([22, 25, 41, 48, 126])

// Preset bitmaps
const PRESETS = {
  human: {
    label: "Human checkout",
    sub: "MTI 0100",
    bits: new Set([2, 3, 4, 7, 11, 12, 13, 14, 18, 22, 25, 37, 38, 39, 41, 42, 43, 49, 64]),
    note: "F022=01 (manual entry). No F048 agent ID, no F126 TAP hash. Standard ecommerce authorization request.",
  },
  agent: {
    label: "Agent checkout",
    sub: "MTI 0100 · F022=81",
    bits: new Set([2, 3, 4, 7, 11, 12, 13, 14, 18, 22, 25, 37, 38, 39, 41, 42, 43, 48, 49, 64, 126]),
    note: "F022=81 (agent-initiated). Adds F048 (agent ID: AGNT:skyfire-001) and F126 (TAP instruction hash). Secondary bitmap required for F126.",
  },
  settlement: {
    label: "Batch settlement",
    sub: "MTI 0220",
    bits: new Set([1, 2, 3, 4, 7, 11, 15, 18, 32, 37, 49, 50, 66, 97]),
    note: "T+1 clearing. Adds settlement date (F015), institution IDs (F032), settlement currency (F050), net amount (F097). F066 in secondary bitmap.",
  },
  reversal: {
    label: "Reversal",
    sub: "MTI 0400",
    bits: new Set([2, 3, 4, 7, 11, 12, 13, 14, 22, 37, 38, 39, 41, 42, 49, 90]),
    note: "F039=00 reversal. Adds F090 (original data elements) to reference the transaction being reversed.",
  },
}

function bitsToHex(bitSet, start) {
  let hex = ""
  for (let byteIdx = 0; byteIdx < 8; byteIdx++) {
    let byte = 0
    for (let bitInByte = 0; bitInByte < 8; bitInByte++) {
      const fieldNum = start + byteIdx * 8 + bitInByte
      if (bitSet.has(fieldNum)) byte |= (1 << (7 - bitInByte))
    }
    hex += byte.toString(16).padStart(2, "0").toUpperCase()
  }
  return hex
}

function BitGrid({ start, bits, toggleBit, hovered, setHovered, dimmed }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(8, 1fr)",
      gap: 3,
      opacity: dimmed ? 0.3 : 1,
      transition: "opacity .25s",
      pointerEvents: dimmed ? "none" : "auto",
    }}>
      {Array.from({ length: 64 }, (_, i) => {
        const bit = start + i
        const isSet = bits.has(bit)
        const isAgent = AGENT_FIELDS.has(bit)
        const isHov = hovered === bit
        const byteNum = Math.floor(i / 8) + 1
        const bitInByte = (i % 8) + 1

        return (
          <div
            key={bit}
            onMouseEnter={() => setHovered(bit)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => toggleBit(bit)}
            style={{
              aspectRatio: "1",
              borderRadius: 3,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              transition: "all .1s",
              background: isHov
                ? isAgent ? "color-mix(in srgb, var(--diagram-4) 25%, var(--ink-200))" : isSet ? "var(--signal-700)" : T.cream3
                : isSet
                  ? isAgent ? T.agent : T.orange
                  : T.cream3,
              border: `1px solid ${
                isHov
                  ? isAgent ? T.agent : isSet ? "var(--diagram-3)" : "var(--ink-400)"
                  : isSet
                    ? isAgent ? "var(--diagram-4)" : "var(--diagram-3)"
                    : T.border
              }`,
              boxShadow: isHov ? `0 1px 4px ${isAgent ? T.agent : T.orange}30` : "none",
            }}
          >
            <div style={{
              fontSize: 6,
              fontFamily: "'Courier New',monospace",
              color: isSet ? (isAgent ? "color-mix(in srgb, var(--diagram-4) 10%, var(--paper-pure))" : "color-mix(in srgb, var(--diagram-3) 18%, var(--paper-pure))") : T.ink5,
              fontWeight: isSet ? 600 : 400,
              lineHeight: 1,
              userSelect: "none",
            }}>
              {bit}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Iso8583Bitmap() {
  const [preset, setPreset] = useState("agent")
  const [bits, setBits] = useState(new Set(PRESETS.agent.bits))
  const [hovered, setHovered] = useState(null)

  const toggleBit = (bit) => {
    setBits(prev => {
      const next = new Set(prev)
      if (next.has(bit)) {
        next.delete(bit)
      } else {
        next.add(bit)
      }
      // Bit 1 (secondary bitmap present) must be set if any bit 65-128 is set
      const hasSecondary = [...next].some(b => b >= 65)
      if (hasSecondary) next.add(1)
      else next.delete(1)
      return next
    })
    setPreset("custom")
  }

  const applyPreset = (key) => {
    setPreset(key)
    setBits(new Set(PRESETS[key].bits))
  }

  const primaryHex = bitsToHex(bits, 1)
  const hasSecondary = bits.has(1)
  const secondaryHex = hasSecondary ? bitsToHex(bits, 65) : null

  const hoveredName = hovered ? (FIELD_NAMES[hovered] || "Reserved") : null
  const isHoveredSet = hovered ? bits.has(hovered) : false
  const isHoveredAgent = hovered ? AGENT_FIELDS.has(hovered) : false

  return (
    <div style={{
      fontFamily: "'Georgia','Times New Roman',serif",
      background: T.cream, borderRadius: 12, border: `1px solid ${T.border}`,
      overflow: "hidden",
      width: "100vw", maxWidth: 1040,
      position: "relative", left: "50%", transform: "translateX(-50%)",
      margin: "20px 0",
    }}>

      {/* Header */}
      <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${T.border}`, background: T.cream2 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.ink4, fontFamily: "'Courier New',monospace", marginBottom: 5 }}>
          ISO 8583 · Bitmap Visualizer · 128 fields
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.02em", margin: "0 0 4px", color: T.ink }}>
              Which fields are present in this message?
            </h2>
            <div style={{ fontSize: 11, color: T.ink3, fontFamily: "'Courier New',monospace" }}>
              {PRESETS[preset]?.note || `${bits.size} fields selected — custom bitmap`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 2, background: T.cream3, borderRadius: 6, padding: 2, flexShrink: 0 }}>
            {Object.entries(PRESETS).map(([key, p]) => (
              <button key={key} onClick={() => applyPreset(key)} style={{
                padding: "4px 10px", borderRadius: 4, fontSize: 9.5,
                fontFamily: "'Courier New',monospace", cursor: "pointer", border: "none",
                letterSpacing: "0.04em",
                background: preset === key ? T.cream : "transparent",
                color: preset === key ? T.ink : T.ink4,
                fontWeight: preset === key ? 600 : 400,
                boxShadow: preset === key ? "0 1px 2px color-mix(in srgb, var(--ink-900) 7%, transparent)" : "none",
                transition: "all .15s",
                whiteSpace: "nowrap",
              }}>
                {p.label}
                <span style={{ marginLeft: 4, fontSize: 8, opacity: 0.7 }}>{p.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hex bytes display */}
      <div style={{ padding: "12px 24px", borderBottom: `1px solid ${T.border}`, background: T.cream, display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 9, color: T.ink4, fontFamily: "'Courier New',monospace", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            Primary Bitmap (8 bytes)
          </div>
          <div style={{ fontSize: 14, fontFamily: "'Courier New',monospace", color: T.ink, letterSpacing: "0.18em", fontWeight: 500 }}>
            {primaryHex.match(/.{2}/g)?.join(" ")}
          </div>
        </div>
        {secondaryHex ? (
          <div>
            <div style={{ fontSize: 9, color: T.ink4, fontFamily: "'Courier New',monospace", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
              Secondary Bitmap (8 bytes)
            </div>
            <div style={{ fontSize: 14, fontFamily: "'Courier New',monospace", color: T.ink, letterSpacing: "0.18em", fontWeight: 500 }}>
              {secondaryHex.match(/.{2}/g)?.join(" ")}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: T.ink5, fontFamily: "'Courier New',monospace", fontStyle: "italic" }}>
              Secondary bitmap absent — bit 1 not set, all fields ≤ F064
            </div>
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <div style={{ fontSize: 12, fontFamily: "'Courier New',monospace", color: T.ink2, fontWeight: 600 }}>{bits.size} fields</div>
          <div style={{ fontSize: 10, color: T.ink4, fontFamily: "'Courier New',monospace" }}>{bits.size * 100 / 128 | 0}% of 128</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: "8px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { bg: T.orange, border: "var(--diagram-3)", label: "Present" },
          { bg: T.agent, border: "var(--diagram-4)", label: "Present · agent-specific" },
          { bg: T.cream3, border: T.border, label: "Absent" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: "'Courier New',monospace", color: T.ink3 }}>
            <div style={{ width: 11, height: 11, borderRadius: 2, background: item.bg, border: `1px solid ${item.border}` }} />
            {item.label}
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 10, color: T.ink5, fontFamily: "'Courier New',monospace" }}>
          click any bit to toggle · hover to inspect
        </div>
      </div>

      {/* Grids */}
      <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>

        {/* Primary bitmap */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: T.ink4, fontFamily: "'Courier New',monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Primary Bitmap · Fields 001–064
            </div>
            <div style={{ fontSize: 9, color: T.ink5, fontFamily: "'Courier New',monospace" }}>
              {[...bits].filter(b => b >= 1 && b <= 64).length} set
            </div>
          </div>
          <BitGrid
            start={1}
            bits={bits}
            toggleBit={toggleBit}
            hovered={hovered}
            setHovered={setHovered}
            dimmed={false}
          />
          {/* Byte labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 3, marginTop: 4 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 7.5, color: T.ink5, fontFamily: "'Courier New',monospace" }}>
                B{i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Secondary bitmap */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: T.ink4, fontFamily: "'Courier New',monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Secondary Bitmap · Fields 065–128
              {!hasSecondary && (
                <span style={{ color: T.ink5, marginLeft: 6, textTransform: "none", letterSpacing: 0 }}>(bit 1 unset)</span>
              )}
            </div>
            <div style={{ fontSize: 9, color: T.ink5, fontFamily: "'Courier New',monospace" }}>
              {[...bits].filter(b => b >= 65).length} set
            </div>
          </div>
          <BitGrid
            start={65}
            bits={bits}
            toggleBit={toggleBit}
            hovered={hovered}
            setHovered={setHovered}
            dimmed={!hasSecondary}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 3, marginTop: 4 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 7.5, color: T.ink5, fontFamily: "'Courier New',monospace" }}>
                B{i + 9}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover detail panel */}
      <div style={{
        margin: "0 24px 20px",
        minHeight: 60,
        background: hovered
          ? isHoveredAgent ? T.agentLight
          : isHoveredSet ? T.orangeLight
          : T.cream2
          : T.cream2,
        border: `1px solid ${
          hovered
            ? isHoveredAgent ? T.agentBorder
            : isHoveredSet ? T.orangeBorder
            : T.border
            : T.border
        }`,
        borderRadius: 8, padding: "10px 16px", transition: "all .2s",
      }}>
        {hovered ? (
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{
                fontSize: 18, fontWeight: 600, fontFamily: "'Courier New',monospace",
                color: isHoveredAgent ? T.agent : isHoveredSet ? T.orange : T.ink4,
                lineHeight: 1,
              }}>
                F{String(hovered).padStart(3, "0")}
              </div>
              <div style={{ fontSize: 9, fontFamily: "'Courier New',monospace", color: T.ink5, marginTop: 2 }}>
                bit {hovered} · byte {Math.ceil(hovered / 8)}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: T.ink, fontWeight: 500, marginBottom: 3 }}>
                {hoveredName}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 10, fontFamily: "'Courier New',monospace",
                  padding: "2px 7px", borderRadius: 3,
                  background: isHoveredSet
                    ? isHoveredAgent ? T.agent : T.orange
                    : T.cream3,
                  color: isHoveredSet ? T.cream : T.ink4,
                  border: `1px solid ${isHoveredSet ? "transparent" : T.border}`,
                }}>
                  {isHoveredSet ? "● present" : "○ absent"}
                </span>
                {isHoveredAgent && (
                  <span style={{ fontSize: 10, fontFamily: "'Courier New',monospace", padding: "2px 7px", borderRadius: 3, background: T.agentLight, color: T.agent, border: `1px solid ${T.agentBorder}` }}>
                    agent-specific
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => toggleBit(hovered)}
              style={{
                padding: "5px 14px", borderRadius: 5, fontSize: 10, flexShrink: 0,
                fontFamily: "'Courier New',monospace", cursor: "pointer",
                border: `1px solid ${T.border}`, background: T.cream, color: T.ink3,
                transition: "all .15s",
              }}>
              {isHoveredSet ? "unset" : "set"}
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: T.ink5, fontFamily: "'Courier New',monospace", paddingTop: 4 }}>
            hover any bit to inspect the field · click to toggle presence
          </div>
        )}
      </div>

    </div>
  )
}
