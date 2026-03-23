import { useState } from "react"

const ROWS = [
  {
    category: "Program",
    visa: { val: "Visa Intelligent Commerce (VIC)", note: "Launched April 30, 2025 · Visa Product Drop" },
    mc:   { val: "Mastercard Agent Pay", note: "Launched April 29, 2025 — one day earlier" },
    diff: false,
  },
  {
    category: "Token type",
    visa: { val: "Virtual Card Number (VCN)", note: "Agent-specific network token bound to agent_id · looks like card number · placed in F002" },
    mc:   { val: "Mastercard Agentic Token", note: "Agent binding embedded in token metadata · extends existing Mastercard token infrastructure" },
    diff: true,
  },
  {
    category: "Identity protocol",
    visa: { val: "Trusted Agent Protocol (TAP)", note: "HTTP Message Signatures (RFC 9421) · Ed25519 · JWT issued to agent · 90s TTL · developer.visa.com" },
    mc:   { val: "Agent Pay Acceptance Framework", note: "Web Bot Auth (RFC 9421) at CDN layer · Cloudflare verification · Dynamic Token Verification Code" },
    diff: true,
  },
  {
    category: "Merchant integration",
    visa: { val: "TAP SDK — explicit", note: "Merchant validates JWT locally <5ms · receives consumer context (consumer_recognized) · sees full instruction_ref" },
    mc:   { val: "CDN layer — no-code", note: "Cloudflare verifies agent before request reaches merchant · existing checkout form unchanged · Dynamic Token Verification Code in standard card fields" },
    diff: true,
  },
  {
    category: "Edge / identity partner",
    visa: { val: "Cloudflare (WBA)", note: "Partnership announced October 14, 2025 · behavioral analysis + cryptographic verification" },
    mc:   { val: "Cloudflare (WBA)", note: "Partnership announced October 14, 2025 — same day as Visa · same Web Bot Auth standard" },
    diff: false,
  },
  {
    category: "ISO 8583 field",
    visa: { val: "F022=81, F048, F126", note: "F022=81 = agent-initiated POS entry mode · F048 = agent identifier · F126 = TAP instruction reference hash" },
    mc:   { val: "Equivalent modifications", note: "Agent-initiated POS entry mode · agent identifier · instruction reference · exact values in Agent Pay technical spec (non-public)" },
    diff: true,
  },
  {
    category: "Consumer credential",
    visa: { val: "FIDO2 Passkey", note: "Passkey signs individual payment instructions · stored on consumer device secure enclave · VIC Authentication API" },
    mc:   { val: "Mastercard Payment Passkey", note: "FIDO2 · FIDO Alliance Payments Working Group · verifiable credentials standard in development · biometric authentication" },
    diff: false,
  },
  {
    category: "AI platform partners",
    visa: { val: "Skyfire, Anthropic, OpenAI", note: "Skyfire KYAPay protocol · 30+ VIC sandbox partners · 20+ integrating directly · github.com/visa/mcp (open source MCP server)" },
    mc:   { val: "Microsoft, OpenAI, Google, PayPal", note: "Microsoft Azure OpenAI + Copilot Studio · OpenAI Instant Checkout (September 2025) · Google Gemini checkout · PayPal partnership October 2025" },
    diff: true,
  },
  {
    category: "Acquirer partners",
    visa: { val: "Stripe, Adyen, Worldpay, Nuvei", note: "Stripe PaymentIntents → VIC · Adyen TokenConnect · Worldpay platform integration" },
    mc:   { val: "Braintree, Checkout.com, Fiserv", note: "Fiserv: first major processor to adopt Agent Pay Acceptance Framework · Braintree + Checkout.com announced April 2025" },
    diff: true,
  },
  {
    category: "Open source",
    visa: { val: "github.com/visa/mcp", note: "Full VIC access via MCP tool calls · any Claude/GPT agent can initiate payments without custom integration" },
    mc:   { val: "developer.mastercard.com/agent-pay", note: "Developer documentation · no open source MCP server equivalent published" },
    diff: true,
  },
  {
    category: "Standards body",
    visa: { val: "IETF RFC 9421 (lead contributor)", note: "HTTP Message Signatures standard · Web Bot Auth · Cloudflare co-contributor" },
    mc:   { val: "FIDO Alliance (Payments Working Group)", note: "Verifiable credentials standard for payments · confirms amount, merchant, product · privacy-preserving portable credentials" },
    diff: true,
  },
  {
    category: "Settlement",
    visa: { val: "T+1 · standard Visa clearing", note: "Unchanged from traditional model · same ISO 8583 clearing file · dispute window 120 days + VIC commerce signals as evidence" },
    mc:   { val: "T+1 · standard Mastercard clearing", note: "Unchanged from traditional model · existing chargeback rules apply · enhanced dispute evidence from Agentic Token metadata" },
    diff: false,
  },
]

export default function NetworkComparison() {
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState("all")

  const visible = filter === "diff"
    ? ROWS.filter(r => r.diff)
    : filter === "same"
    ? ROWS.filter(r => !r.diff)
    : ROWS

  return (
    <div style={{ fontFamily: "'Georgia','Times New Roman',serif", color: "#1a1814", background: "#faf9f6", borderRadius: 12, border: "1px solid #e0dbd0", overflow: "hidden", maxWidth: 820 }}>

      {/* Header */}
      <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #e0dbd0", background: "#f5f3ee" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9a9288", fontFamily: "'Courier New',monospace", marginBottom: 5 }}>
          Visa VIC vs Mastercard Agent Pay · Architecture comparison
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.02em", margin: 0 }}>
            Same problem — different architecture
          </h2>
          <div style={{ display: "flex", gap: 2, background: "#e8e3da", borderRadius: 5, padding: 2 }}>
            {[["all", "all"], ["diff", "differences"], ["same", "shared"]].map(([v, label]) => (
              <button key={v} onClick={() => setFilter(v)} style={{
                padding: "4px 11px", borderRadius: 3, fontSize: 10, fontFamily: "'Courier New',monospace",
                cursor: "pointer", border: "none", letterSpacing: "0.04em",
                background: filter === v ? "#faf9f6" : "transparent",
                color: filter === v ? "#1a1814" : "#9a9288",
                fontWeight: filter === v ? 600 : 400, transition: "all .15s"
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", gap: 0, borderBottom: "1px solid #e0dbd0", background: "#f0ece4" }}>
        <div style={{ padding: "8px 12px", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a9288" }}></div>
        <div style={{ padding: "8px 16px", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#185FA5", borderLeft: "1px solid #e0dbd0", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="10" viewBox="0 0 36 24">
            <path d="M3 19Q18 2 33 19" fill="none" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="3" cy="19" r="2" fill="#185FA5"/>
            <circle cx="33" cy="19" r="2" fill="#185FA5"/>
          </svg>
          Visa Intelligent Commerce
        </div>
        <div style={{ padding: "8px 16px", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#993C1D", borderLeft: "1px solid #e0dbd0", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 10, background: "#e8372a", borderRadius: 2 }} />
          Mastercard Agent Pay
        </div>
      </div>

      {/* Rows */}
      {visible.map((row, i) => (
        <div key={row.category} onClick={() => setSelected(selected === row.category ? null : row.category)}
          style={{ cursor: "pointer", borderBottom: "1px solid #e0dbd0", transition: "background .1s",
            background: selected === row.category ? "#f0ece4" : (i % 2 === 0 ? "#faf9f6" : "#f5f3ee") }}>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr" }}>
            {/* Category */}
            <div style={{ padding: "10px 12px", display: "flex", alignItems: "flex-start" }}>
              <div style={{ fontSize: 10, fontFamily: "'Courier New',monospace", color: "#6b6560", fontWeight: 500 }}>{row.category}</div>
              {!row.diff && (
                <span style={{ marginLeft: 6, fontSize: 8, padding: "1px 4px", borderRadius: 2, background: "#f0f8f4", color: "#186040", border: "1px solid #b0d8c0", fontFamily: "'Courier New',monospace", flexShrink: 0 }}>shared</span>
              )}
            </div>

            {/* Visa */}
            <div style={{ padding: "10px 16px", borderLeft: "1px solid #e0dbd0" }}>
              <div style={{ fontSize: 11, fontFamily: "'Courier New',monospace", color: "#185FA5", lineHeight: 1.4 }}>{row.visa.val}</div>
              {selected === row.category && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#4a4440", lineHeight: 1.6, fontFamily: "Georgia,serif" }}>{row.visa.note}</div>
              )}
            </div>

            {/* Mastercard */}
            <div style={{ padding: "10px 16px", borderLeft: "1px solid #e0dbd0" }}>
              <div style={{ fontSize: 11, fontFamily: "'Courier New',monospace", color: "#993C1D", lineHeight: 1.4 }}>{row.mc.val}</div>
              {selected === row.category && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#4a4440", lineHeight: 1.6, fontFamily: "Georgia,serif" }}>{row.mc.note}</div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Footer */}
      <div style={{ padding: "10px 20px", background: "#f5f3ee", display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "'Courier New',monospace", color: "#9a9288" }}>
          <div style={{ width: 8, height: 8, borderRadius: 1, background: "#b0d8c0" }} />
          shared approach
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "'Courier New',monospace", color: "#9a9288" }}>
          <div style={{ width: 8, height: 8, borderRadius: 1, background: "#e0dbd0" }} />
          different approach
        </div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: "#b8b3a8", fontFamily: "'Courier New',monospace" }}>click any row to expand</div>
      </div>

    </div>
  )
}
