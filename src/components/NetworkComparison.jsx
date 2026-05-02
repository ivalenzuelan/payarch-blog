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
    visa: { val: "Trusted Agent Protocol (TAP)", note: "HTTP Message Signatures (RFC 9421) · Ed25519 · JWT issued to agent · short-lived TTL · developer.visa.com" },
    mc:   { val: "Agent Pay Acceptance Framework", note: "Web Bot Auth (RFC 9421) at CDN layer · Cloudflare verification · Dynamic Token Verification Code" },
    diff: true,
  },
  {
    category: "Merchant integration",
    visa: { val: "TAP SDK — explicit", note: "Merchant validates JWT locally local verification · receives consumer context (consumer_recognized) · sees full instruction_ref" },
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
    visa: { val: "agent-context flag, F048, private instruction reference", note: "agent-context flag = agent-initiated POS entry mode · F048 = agent identifier · private instruction reference = TAP instruction reference hash" },
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
    visa: { val: "agent platforms and AI assistants", note: "Public examples show Visa AI tooling, tokenization demos, and partner-controlled access paths." },
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
    visa: { val: "Visa AI examples", note: "Public repositories show documentation and demo tooling; production payment access remains partner-controlled." },
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
    <div style={{ fontFamily: "'Georgia','Times New Roman',serif", color: "var(--ink-900)", background: "var(--paper)", borderRadius: 12, border: "1px solid var(--ink-200)", overflow: "hidden", maxWidth: 820 }}>

      {/* Header */}
      <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid var(--ink-200)", background: "var(--ink-100)" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-500)", fontFamily: "'Courier New',monospace", marginBottom: 5 }}>
          Visa VIC vs Mastercard Agent Pay · Architecture comparison
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.02em", margin: 0 }}>
            Same problem — different architecture
          </h2>
          <div style={{ display: "flex", gap: 2, background: "var(--ink-200)", borderRadius: 5, padding: 2 }}>
            {[["all", "all"], ["diff", "differences"], ["same", "shared"]].map(([v, label]) => (
              <button key={v} onClick={() => setFilter(v)} style={{
                padding: "4px 11px", borderRadius: 3, fontSize: 10, fontFamily: "'Courier New',monospace",
                cursor: "pointer", border: "none", letterSpacing: "0.04em",
                background: filter === v ? "var(--paper)" : "transparent",
                color: filter === v ? "var(--ink-900)" : "var(--ink-500)",
                fontWeight: filter === v ? 600 : 400, transition: "all .15s"
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", gap: 0, borderBottom: "1px solid var(--ink-200)", background: "var(--ink-100)" }}>
        <div style={{ padding: "8px 12px", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-500)" }}></div>
        <div style={{ padding: "8px 16px", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--diagram-1)", borderLeft: "1px solid var(--ink-200)", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="10" viewBox="0 0 36 24">
            <path d="M3 19Q18 2 33 19" fill="none" stroke="var(--diagram-1)" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="3" cy="19" r="2" fill="var(--diagram-1)"/>
            <circle cx="33" cy="19" r="2" fill="var(--diagram-1)"/>
          </svg>
          Visa Intelligent Commerce
        </div>
        <div style={{ padding: "8px 16px", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--diagram-3)", borderLeft: "1px solid var(--ink-200)", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 10, background: "var(--danger)", borderRadius: 2 }} />
          Mastercard Agent Pay
        </div>
      </div>

      {/* Rows */}
      {visible.map((row, i) => (
        <div key={row.category} onClick={() => setSelected(selected === row.category ? null : row.category)}
          style={{ cursor: "pointer", borderBottom: "1px solid var(--ink-200)", transition: "background .1s",
            background: selected === row.category ? "var(--ink-100)" : (i % 2 === 0 ? "var(--paper)" : "var(--ink-100)") }}>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr" }}>
            {/* Category */}
            <div style={{ padding: "10px 12px", display: "flex", alignItems: "flex-start" }}>
              <div style={{ fontSize: 10, fontFamily: "'Courier New',monospace", color: "var(--ink-500)", fontWeight: 500 }}>{row.category}</div>
              {!row.diff && (
                <span style={{ marginLeft: 6, fontSize: 8, padding: "1px 4px", borderRadius: 2, background: "color-mix(in srgb, var(--success) 8%, var(--paper-pure))", color: "var(--success)", border: "1px solid color-mix(in srgb, var(--success) 28%, var(--ink-200))", fontFamily: "'Courier New',monospace", flexShrink: 0 }}>shared</span>
              )}
            </div>

            {/* Visa */}
            <div style={{ padding: "10px 16px", borderLeft: "1px solid var(--ink-200)" }}>
              <div style={{ fontSize: 11, fontFamily: "'Courier New',monospace", color: "var(--diagram-1)", lineHeight: 1.4 }}>{row.visa.val}</div>
              {selected === row.category && (
                <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-700)", lineHeight: 1.6, fontFamily: "Georgia,serif" }}>{row.visa.note}</div>
              )}
            </div>

            {/* Mastercard */}
            <div style={{ padding: "10px 16px", borderLeft: "1px solid var(--ink-200)" }}>
              <div style={{ fontSize: 11, fontFamily: "'Courier New',monospace", color: "var(--diagram-3)", lineHeight: 1.4 }}>{row.mc.val}</div>
              {selected === row.category && (
                <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-700)", lineHeight: 1.6, fontFamily: "Georgia,serif" }}>{row.mc.note}</div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Footer */}
      <div style={{ padding: "10px 20px", background: "var(--ink-100)", display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "'Courier New',monospace", color: "var(--ink-500)" }}>
          <div style={{ width: 8, height: 8, borderRadius: 1, background: "color-mix(in srgb, var(--success) 28%, var(--ink-200))" }} />
          shared approach
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "'Courier New',monospace", color: "var(--ink-500)" }}>
          <div style={{ width: 8, height: 8, borderRadius: 1, background: "var(--ink-200)" }} />
          different approach
        </div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-400)", fontFamily: "'Courier New',monospace" }}>click any row to expand</div>
      </div>

    </div>
  )
}
