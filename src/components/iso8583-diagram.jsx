import { useState, useMemo } from "react"

const COLORS = {
  new: { bg: "color-mix(in srgb, var(--diagram-3) 10%, var(--paper-pure))", border: "color-mix(in srgb, var(--diagram-3) 45%, var(--ink-200))", text: "var(--diagram-3)", dot: "var(--diagram-3)", label: "New field" },
  mod: { bg: "color-mix(in srgb, var(--diagram-1) 10%, var(--paper-pure))", border: "color-mix(in srgb, var(--diagram-1) 45%, var(--ink-200))", text: "var(--diagram-1)", dot: "var(--diagram-1)", label: "Modified" },
  std: { bg: "var(--paper)", border: "var(--ink-300)", text: "var(--ink-500)", dot: "var(--ink-400)", label: "Unchanged" },
}

// ─── TRANSACTION VIEW DATA (existing 12 agent-relevant fields) ────────────────

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
  { id: "F002", name: "Primary Account Number", val: "4111xxxxAGNT", bytes: 19, type: "std", note: "VCN echoed back — confirms token was accepted." },
  { id: "F003", name: "Processing Code", val: "000000", bytes: 6, type: "std", note: "Echoed from request." },
  { id: "F004", name: "Amount", val: "000000008999", bytes: 12, type: "std", note: "$89.99 — echoed and confirmed." },
  { id: "F007", name: "Date/Time", val: "0321143422", bytes: 10, type: "std", note: "Echoed from request." },
  { id: "F011", name: "STAN", val: "000123", bytes: 6, type: "std", note: "Echoed — used to match request to response." },
  { id: "F038", name: "Authorization Code", val: "123456", bytes: 6, type: "new", note: "★ 6-digit auth code issued by the issuer. Required for settlement. Must match at T+1 clearing." },
  { id: "F039", name: "Response Code", val: "00", bytes: 2, type: "new", note: "★ 00 = approved. Other codes: 05 = do not honor, 51 = insufficient funds, 58 = invalid terminal (F126 mismatch)." },
  { id: "F048", name: "Additional Data", val: "AGNT:skyfire-001", bytes: 16, type: "std", note: "Agent identifier echoed — preserved through the chain for audit." },
  { id: "F126", name: "Private Use", val: "agent-confirmed", bytes: 16, type: "new", note: "★ TAP confirmation echo. Proves the issuer processed this as an agent-initiated transaction. Acquirer uses this as audit proof." },
]

// ─── REFERENCE VIEW DATA (all 128 fields) ────────────────────────────────────

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "identification", label: "Identification" },
  { id: "processing", label: "Processing" },
  { id: "amounts", label: "Amounts" },
  { id: "datetime", label: "Dates & Times" },
  { id: "tracing", label: "Tracing" },
  { id: "terminal", label: "Terminal / POS" },
  { id: "merchant", label: "Merchant" },
  { id: "card", label: "Card Data" },
  { id: "institution", label: "Institutions" },
  { id: "currency", label: "Currency" },
  { id: "security", label: "Security" },
  { id: "private", label: "Private / National" },
]

// presence: "M"=mandatory, "C"=conditional, "O"=optional, "-"=not used
// dtype: n=numeric, an=alphanumeric, ans=alphanumeric+special, b=binary, z=track, x+n=sign+amount
const ALL_FIELDS = [
  { id:"F001", name:"Bitmap, Secondary",                  cat:"security",       dtype:"b",   maxLen:8,    human:"C", agent:"C", type:"std", desc:"Set when the message contains fields F065–F128. First bit of the message." },
  { id:"F002", name:"Primary Account Number (PAN)",       cat:"identification", dtype:"n",   maxLen:19,   human:"C", agent:"C", type:"mod", desc:"The card number. In agent transactions replaced by a VCN (Virtual Card Number) — the real PAN never leaves Visa Token Service." },
  { id:"F003", name:"Processing Code",                    cat:"processing",     dtype:"n",   maxLen:6,    human:"M", agent:"M", type:"std", desc:"6-digit code describing the transaction type. 000000 = purchase. First 2 digits: transaction type. Digits 3–4: from-account type. Digits 5–6: to-account type." },
  { id:"F004", name:"Transaction Amount",                 cat:"amounts",        dtype:"n",   maxLen:12,   human:"M", agent:"M", type:"std", desc:"Amount in the smallest currency unit. $89.99 USD = 000000008999. VisaNet validates this against F126 for agent transactions." },
  { id:"F005", name:"Settlement Amount",                  cat:"amounts",        dtype:"n",   maxLen:12,   human:"O", agent:"O", type:"std", desc:"Amount in settlement currency. Populated by the network if different from transaction currency." },
  { id:"F006", name:"Cardholder Billing Amount",          cat:"amounts",        dtype:"n",   maxLen:12,   human:"O", agent:"O", type:"std", desc:"Amount billed to the cardholder in their billing currency after conversion." },
  { id:"F007", name:"Transmission Date/Time",             cat:"datetime",       dtype:"n",   maxLen:10,   human:"M", agent:"M", type:"std", desc:"MMDDhhmmss format. Set by the originator. Used to match messages and detect replays." },
  { id:"F008", name:"Cardholder Billing Fee Amount",      cat:"amounts",        dtype:"n",   maxLen:8,    human:"O", agent:"O", type:"std", desc:"Fee charged to the cardholder for currency conversion." },
  { id:"F009", name:"Settlement Conversion Rate",         cat:"amounts",        dtype:"n",   maxLen:8,    human:"O", agent:"O", type:"std", desc:"Conversion rate used to derive the settlement amount." },
  { id:"F010", name:"Cardholder Billing Conv. Rate",      cat:"amounts",        dtype:"n",   maxLen:8,    human:"O", agent:"O", type:"std", desc:"Conversion rate used to derive the cardholder billing amount." },
  { id:"F011", name:"System Trace Audit Number (STAN)",   cat:"tracing",        dtype:"n",   maxLen:6,    human:"M", agent:"M", type:"std", desc:"Unique sequence number assigned by the initiating system. Used to match request to response within a session." },
  { id:"F012", name:"Time, Local Transaction",            cat:"datetime",       dtype:"n",   maxLen:6,    human:"C", agent:"C", type:"std", desc:"hhmmss format. Local time at the point of transaction initiation." },
  { id:"F013", name:"Date, Local Transaction",            cat:"datetime",       dtype:"n",   maxLen:4,    human:"C", agent:"C", type:"std", desc:"MMDD format. Local date at the point of transaction initiation." },
  { id:"F014", name:"Date, Expiration",                   cat:"card",           dtype:"n",   maxLen:4,    human:"C", agent:"C", type:"std", desc:"YYMM format. Card expiration date. For VCN in agent transactions, this is the token expiry, not the physical card expiry." },
  { id:"F015", name:"Date, Settlement",                   cat:"datetime",       dtype:"n",   maxLen:4,    human:"O", agent:"O", type:"std", desc:"MMDD format. The date on which the transaction will be included in settlement. Usually T+1 or T+2." },
  { id:"F016", name:"Date, Conversion",                   cat:"datetime",       dtype:"n",   maxLen:4,    human:"O", agent:"O", type:"std", desc:"MMDD format. Date the currency conversion rate was applied." },
  { id:"F017", name:"Date, Capture",                      cat:"datetime",       dtype:"n",   maxLen:4,    human:"O", agent:"O", type:"std", desc:"MMDD format. Date the transaction was captured at the acquiring system." },
  { id:"F018", name:"Merchant Category Code (MCC)",       cat:"merchant",       dtype:"n",   maxLen:4,    human:"C", agent:"C", type:"std", desc:"4-digit ISO 18245 code describing the merchant's business type. Issuers use this for spending policy enforcement. Agents use it to restrict purchases to allowed categories." },
  { id:"F019", name:"Acquiring Institution Country Code", cat:"institution",    dtype:"n",   maxLen:3,    human:"O", agent:"O", type:"std", desc:"ISO 3166 numeric country code of the acquiring institution." },
  { id:"F020", name:"PAN Extended, Country Code",         cat:"identification", dtype:"n",   maxLen:3,    human:"O", agent:"O", type:"std", desc:"Country code associated with the PAN. Used in some cross-border routing decisions." },
  { id:"F021", name:"Forwarding Institution Country Code",cat:"institution",    dtype:"n",   maxLen:3,    human:"O", agent:"O", type:"std", desc:"Country code of the forwarding institution." },
  { id:"F022", name:"POS Entry Mode",                     cat:"terminal",       dtype:"n",   maxLen:3,    human:"M", agent:"M", type:"mod", desc:"★ How the card data was captured. 01 = manual key entry (ecommerce). 81 = agent-initiated (new). Every downstream system reads this to select the correct risk model. F022=81 is the primary signal for agentic commerce." },
  { id:"F023", name:"Application PAN Sequence Number",    cat:"identification", dtype:"n",   maxLen:3,    human:"O", agent:"O", type:"std", desc:"Distinguishes between multiple cards with the same PAN (e.g., supplementary cards)." },
  { id:"F024", name:"Network International ID (NII)",     cat:"processing",     dtype:"n",   maxLen:3,    human:"C", agent:"C", type:"std", desc:"Identifies the network used to route the transaction. Set by the acquirer." },
  { id:"F025", name:"POS Condition Code",                 cat:"terminal",       dtype:"n",   maxLen:2,    human:"C", agent:"C", type:"mod", desc:"★ Describes the conditions at the point of service. 00 = normal. 59 = agent present (new). Used alongside F022=81 to provide full agent context to risk models." },
  { id:"F026", name:"POS PIN Capture Code",               cat:"terminal",       dtype:"n",   maxLen:2,    human:"O", agent:"-",  type:"std", desc:"Maximum number of PIN capture attempts allowed. Not applicable for agent transactions (no PIN entered)." },
  { id:"F027", name:"Auth. ID Response Length",           cat:"processing",     dtype:"n",   maxLen:1,    human:"O", agent:"O", type:"std", desc:"Length of the authorization identification response expected in F038." },
  { id:"F028", name:"Amount, Transaction Fee",            cat:"amounts",        dtype:"x+n", maxLen:9,    human:"O", agent:"O", type:"std", desc:"Fee amount charged for the transaction. Signed (C=credit, D=debit)." },
  { id:"F029", name:"Amount, Settlement Fee",             cat:"amounts",        dtype:"x+n", maxLen:9,    human:"O", agent:"O", type:"std", desc:"Fee amount in settlement currency." },
  { id:"F030", name:"Amount, Transaction Processing Fee", cat:"amounts",        dtype:"x+n", maxLen:9,    human:"O", agent:"O", type:"std", desc:"Processing fee charged by the acquirer or network." },
  { id:"F031", name:"Amount, Settlement Processing Fee",  cat:"amounts",        dtype:"x+n", maxLen:9,    human:"O", agent:"O", type:"std", desc:"Processing fee expressed in settlement currency." },
  { id:"F032", name:"Acquiring Institution ID",           cat:"institution",    dtype:"n",   maxLen:11,   human:"O", agent:"O", type:"std", desc:"Identifier for the acquiring bank. Assigned by the card network. Appears in settlement records." },
  { id:"F033", name:"Forwarding Institution ID",          cat:"institution",    dtype:"n",   maxLen:11,   human:"O", agent:"O", type:"std", desc:"Identifier for the institution that forwarded the message to the network." },
  { id:"F034", name:"Primary Account Number Extended",    cat:"identification", dtype:"ns",  maxLen:28,   human:"-",  agent:"-",  type:"std", desc:"Extended PAN format — rarely used in modern implementations." },
  { id:"F035", name:"Track 2 Data",                       cat:"card",           dtype:"z",   maxLen:37,   human:"O", agent:"-",  type:"std", desc:"Magnetic stripe track 2 data. Contains PAN, expiry, and service code. Not present in ecommerce or agent transactions (card not present)." },
  { id:"F036", name:"Track 3 Data",                       cat:"card",           dtype:"z",   maxLen:104,  human:"-",  agent:"-",  type:"std", desc:"Magnetic stripe track 3. Rarely implemented. Not used in modern payment flows." },
  { id:"F037", name:"Retrieval Reference Number (RRN)",   cat:"tracing",        dtype:"an",  maxLen:12,   human:"C", agent:"C", type:"std", desc:"12-character alphanumeric identifier assigned by the acquirer. Used for dispute resolution and reconciliation. Unique per acquirer per day." },
  { id:"F038", name:"Authorization ID Response",          cat:"tracing",        dtype:"an",  maxLen:6,    human:"C", agent:"C", type:"std", desc:"★ 6-character auth code returned by the issuer in the 0110 response. Required for settlement. Must match exactly at clearing (MTI 0220)." },
  { id:"F039", name:"Response Code",                      cat:"processing",     dtype:"an",  maxLen:2,    human:"M", agent:"M", type:"std", desc:"★ Issuer's response. 00 = approved. 05 = do not honor. 51 = insufficient funds. 54 = expired card. 58 = transaction not permitted (also used when F126 hash mismatch detected)." },
  { id:"F040", name:"Service Restriction Code",           cat:"card",           dtype:"n",   maxLen:3,    human:"O", agent:"O", type:"std", desc:"3-digit code from the card's magnetic stripe indicating geographic and service restrictions." },
  { id:"F041", name:"Card Acceptor Terminal ID",          cat:"terminal",       dtype:"ans", maxLen:8,    human:"M", agent:"M", type:"mod", desc:"★ Identifies the terminal where the transaction occurred. In agent transactions, prefixed AGNT- to distinguish from human checkout terminals in acquirer reporting and analytics." },
  { id:"F042", name:"Card Acceptor ID (Merchant ID)",     cat:"merchant",       dtype:"ans", maxLen:15,   human:"M", agent:"M", type:"std", desc:"Merchant identifier assigned by the acquirer. Also called MID. Appears in all settlement records." },
  { id:"F043", name:"Card Acceptor Name/Location",        cat:"merchant",       dtype:"ans", maxLen:40,   human:"C", agent:"C", type:"std", desc:"Merchant name and location in format: Name//City//Country. Appears on cardholder statements." },
  { id:"F044", name:"Additional Response Data",           cat:"processing",     dtype:"ans", maxLen:25,   human:"O", agent:"O", type:"std", desc:"Additional information from the issuer in the response. May include account balance or loyalty points." },
  { id:"F045", name:"Track 1 Data",                       cat:"card",           dtype:"ans", maxLen:76,   human:"O", agent:"-",  type:"std", desc:"Magnetic stripe track 1 data. Contains PAN, name, and expiry. Not used in CNP or agent transactions." },
  { id:"F046", name:"Amounts, Fees",                      cat:"amounts",        dtype:"ans", maxLen:204,  human:"O", agent:"O", type:"std", desc:"Detailed breakdown of fees associated with the transaction." },
  { id:"F047", name:"Additional Data — National",         cat:"private",        dtype:"ans", maxLen:999,  human:"O", agent:"O", type:"std", desc:"Reserved for national use. Contents defined by individual payment networks for their markets." },
  { id:"F048", name:"Additional Data — Private",          cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"M", type:"new", desc:"★ Used for agent identifier injection. Format: AGNT:{agent_id} (e.g., AGNT:skyfire-001). Enables downstream audit trail and agent-specific analytics at issuer and VisaNet level. Empty in human transactions." },
  { id:"F049", name:"Currency Code, Transaction",         cat:"currency",       dtype:"n",   maxLen:3,    human:"M", agent:"M", type:"std", desc:"ISO 4217 numeric currency code. 840 = USD, 978 = EUR, 826 = GBP." },
  { id:"F050", name:"Currency Code, Settlement",          cat:"currency",       dtype:"n",   maxLen:3,    human:"O", agent:"O", type:"std", desc:"Currency used for settlement between the acquiring and issuing banks." },
  { id:"F051", name:"Currency Code, Cardholder Billing",  cat:"currency",       dtype:"n",   maxLen:3,    human:"O", agent:"O", type:"std", desc:"Currency used for billing the cardholder. May differ from transaction currency in cross-border cases." },
  { id:"F052", name:"PIN Data",                           cat:"security",       dtype:"b",   maxLen:8,    human:"O", agent:"-",  type:"std", desc:"Encrypted PIN block. Not used in agent transactions — authentication is handled via FIDO2 Passkey at enrollment time." },
  { id:"F053", name:"Security Related Control Info",      cat:"security",       dtype:"n",   maxLen:16,   human:"O", agent:"O", type:"std", desc:"Carries security-related information such as key management data." },
  { id:"F054", name:"Additional Amounts",                 cat:"amounts",        dtype:"ans", maxLen:120,  human:"O", agent:"O", type:"std", desc:"Additional account balances or amounts, such as available credit or cash-back amounts." },
  { id:"F055", name:"ICC Data (EMV)",                     cat:"card",           dtype:"b",   maxLen:255,  human:"O", agent:"-",  type:"std", desc:"EMV chip data exchanged between the terminal and the issuer. Not used in agent transactions (no physical card or chip)." },
  { id:"F056", name:"Reserved ISO",                       cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for future ISO use." },
  { id:"F057", name:"Reserved National",                  cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for national network use." },
  { id:"F058", name:"Reserved National",                  cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for national network use." },
  { id:"F059", name:"Reserved National",                  cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for national network use." },
  { id:"F060", name:"Reserved National",                  cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for national network use." },
  { id:"F061", name:"Reserved Private",                   cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for private use by card networks." },
  { id:"F062", name:"Reserved Private",                   cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for private use by card networks." },
  { id:"F063", name:"Reserved Private",                   cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for private use by card networks." },
  { id:"F064", name:"Message Authentication Code (MAC)", cat:"security",        dtype:"b",   maxLen:8,    human:"C", agent:"C", type:"std", desc:"8-byte MAC computed over the message content to verify integrity between the acquirer and the network. Prevents tampering in transit." },
  { id:"F065", name:"Bitmap, Extended",                   cat:"security",       dtype:"b",   maxLen:8,    human:"-",  agent:"-",  type:"std", desc:"Tertiary bitmap indicating presence of fields F129–F192. Rarely used in practice." },
  { id:"F066", name:"Settlement Code",                    cat:"processing",     dtype:"n",   maxLen:1,    human:"-",  agent:"-",  type:"std", desc:"Indicates the settlement cycle. Used in batch settlement messages (MTI 0220)." },
  { id:"F067", name:"Extended Payment Code",              cat:"processing",     dtype:"n",   maxLen:2,    human:"O", agent:"O", type:"std", desc:"Identifies instalment payment plans or deferred billing arrangements." },
  { id:"F068", name:"Receiving Institution Country Code", cat:"institution",    dtype:"n",   maxLen:3,    human:"O", agent:"O", type:"std", desc:"ISO 3166 country code of the receiving institution." },
  { id:"F069", name:"Settlement Institution Country Code",cat:"institution",    dtype:"n",   maxLen:3,    human:"O", agent:"O", type:"std", desc:"ISO 3166 country code of the institution responsible for settlement." },
  { id:"F070", name:"Network Management Information Code",cat:"processing",     dtype:"n",   maxLen:3,    human:"O", agent:"O", type:"std", desc:"Used in network management messages (MTI 0800/0810) to identify the type of management action." },
  { id:"F071", name:"Message Number",                     cat:"tracing",        dtype:"n",   maxLen:8,    human:"O", agent:"O", type:"std", desc:"Sequential message number within a session." },
  { id:"F072", name:"Last Message Number",                cat:"tracing",        dtype:"n",   maxLen:8,    human:"O", agent:"O", type:"std", desc:"The message number of the last message in a sequence." },
  { id:"F073", name:"Date, Action",                       cat:"datetime",       dtype:"n",   maxLen:6,    human:"O", agent:"O", type:"std", desc:"YYMMDD format. Date on which the action described in the message should take effect." },
  { id:"F074", name:"Credits, Number",                    cat:"amounts",        dtype:"n",   maxLen:10,   human:"-",  agent:"-",  type:"std", desc:"Count of credit transactions in a batch. Used in settlement summary messages." },
  { id:"F075", name:"Credits Reversal, Number",           cat:"amounts",        dtype:"n",   maxLen:10,   human:"-",  agent:"-",  type:"std", desc:"Count of credit reversal transactions in a batch." },
  { id:"F076", name:"Debits, Number",                     cat:"amounts",        dtype:"n",   maxLen:10,   human:"-",  agent:"-",  type:"std", desc:"Count of debit transactions in a batch." },
  { id:"F077", name:"Debits Reversal, Number",            cat:"amounts",        dtype:"n",   maxLen:10,   human:"-",  agent:"-",  type:"std", desc:"Count of debit reversal transactions in a batch." },
  { id:"F078", name:"Transfer Number",                    cat:"amounts",        dtype:"n",   maxLen:10,   human:"-",  agent:"-",  type:"std", desc:"Count of transfer transactions in a batch." },
  { id:"F079", name:"Transfer Reversal Number",           cat:"amounts",        dtype:"n",   maxLen:10,   human:"-",  agent:"-",  type:"std", desc:"Count of transfer reversal transactions in a batch." },
  { id:"F080", name:"Inquiries Number",                   cat:"amounts",        dtype:"n",   maxLen:10,   human:"-",  agent:"-",  type:"std", desc:"Count of inquiry messages in a batch." },
  { id:"F081", name:"Authorizations Number",              cat:"amounts",        dtype:"n",   maxLen:10,   human:"-",  agent:"-",  type:"std", desc:"Count of authorization messages in a batch." },
  { id:"F082", name:"Credits, Processing Fee Amount",     cat:"amounts",        dtype:"n",   maxLen:12,   human:"-",  agent:"-",  type:"std", desc:"Total processing fees for credit transactions in a settlement batch." },
  { id:"F083", name:"Credits Reversal, Proc. Fee",        cat:"amounts",        dtype:"n",   maxLen:12,   human:"-",  agent:"-",  type:"std", desc:"Total processing fees for credit reversals in a settlement batch." },
  { id:"F084", name:"Debits, Processing Fee Amount",      cat:"amounts",        dtype:"n",   maxLen:12,   human:"-",  agent:"-",  type:"std", desc:"Total processing fees for debit transactions in a settlement batch." },
  { id:"F085", name:"Debits Reversal, Processing Fee",    cat:"amounts",        dtype:"n",   maxLen:12,   human:"-",  agent:"-",  type:"std", desc:"Total processing fees for debit reversals in a settlement batch." },
  { id:"F086", name:"Credits, Transaction Fee Amount",    cat:"amounts",        dtype:"n",   maxLen:16,   human:"-",  agent:"-",  type:"std", desc:"Transaction fees associated with credit operations in a batch." },
  { id:"F087", name:"Credits Reversal, Txn Fee",          cat:"amounts",        dtype:"n",   maxLen:16,   human:"-",  agent:"-",  type:"std", desc:"Transaction fees for credit reversal operations." },
  { id:"F088", name:"Debits, Transaction Fee Amount",     cat:"amounts",        dtype:"n",   maxLen:16,   human:"-",  agent:"-",  type:"std", desc:"Transaction fees associated with debit operations in a batch." },
  { id:"F089", name:"Debits Reversal, Txn Fee",           cat:"amounts",        dtype:"n",   maxLen:16,   human:"-",  agent:"-",  type:"std", desc:"Transaction fees for debit reversal operations." },
  { id:"F090", name:"Original Data Elements",             cat:"tracing",        dtype:"n",   maxLen:42,   human:"C", agent:"C", type:"std", desc:"Contains the key fields from the original transaction being reversed or corrected. Includes MTI, STAN, date, acquiring and forwarding institution IDs." },
  { id:"F091", name:"File Update Code",                   cat:"processing",     dtype:"an",  maxLen:1,    human:"-",  agent:"-",  type:"std", desc:"Identifies the type of file update operation in administrative messages." },
  { id:"F092", name:"File Security Code",                 cat:"security",       dtype:"n",   maxLen:2,    human:"-",  agent:"-",  type:"std", desc:"Security code for file transfer operations." },
  { id:"F093", name:"Response Indicator",                 cat:"processing",     dtype:"n",   maxLen:5,    human:"-",  agent:"-",  type:"std", desc:"Additional response information for balance inquiry and file operations." },
  { id:"F094", name:"Service Indicator",                  cat:"processing",     dtype:"an",  maxLen:7,    human:"-",  agent:"-",  type:"std", desc:"Indicates the type of service being requested or confirmed." },
  { id:"F095", name:"Replacement Amounts",                cat:"amounts",        dtype:"an",  maxLen:42,   human:"O", agent:"O", type:"std", desc:"Contains replacement amounts for the original transaction, used in partial approval or amount modification scenarios." },
  { id:"F096", name:"Message Security Code",              cat:"security",       dtype:"b",   maxLen:8,    human:"O", agent:"O", type:"std", desc:"64-bit security code protecting the integrity of the message. Separate from the MAC in F064." },
  { id:"F097", name:"Net Settlement Amount",              cat:"amounts",        dtype:"x+n", maxLen:17,   human:"-",  agent:"-",  type:"std", desc:"Net amount for settlement at end of a settlement cycle. Positive = credit, negative = debit." },
  { id:"F098", name:"Payee",                              cat:"merchant",       dtype:"ans", maxLen:25,   human:"O", agent:"O", type:"std", desc:"Name of the payee for non-card payment types." },
  { id:"F099", name:"Settlement Institution ID",          cat:"institution",    dtype:"n",   maxLen:11,   human:"O", agent:"O", type:"std", desc:"Identifier of the institution responsible for settlement processing." },
  { id:"F100", name:"Receiving Institution ID",           cat:"institution",    dtype:"n",   maxLen:11,   human:"O", agent:"O", type:"std", desc:"Identifier of the institution that will receive the transaction funds." },
  { id:"F101", name:"File Name",                          cat:"private",        dtype:"ans", maxLen:17,   human:"-",  agent:"-",  type:"std", desc:"Name of the file being transferred in file action messages." },
  { id:"F102", name:"Account Identification 1",           cat:"identification", dtype:"ans", maxLen:28,   human:"O", agent:"O", type:"std", desc:"Account identifier for account-based (non-card) transactions such as ACH or open banking." },
  { id:"F103", name:"Account Identification 2",           cat:"identification", dtype:"ans", maxLen:28,   human:"O", agent:"O", type:"std", desc:"Secondary account identifier, used in transfer or account-to-account payment scenarios." },
  { id:"F104", name:"Transaction Description",            cat:"merchant",       dtype:"ans", maxLen:100,  human:"O", agent:"O", type:"std", desc:"Free-text description of the transaction. May appear on statements." },
  { id:"F105", name:"Reserved ISO",                       cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for future ISO 8583 specification use." },
  { id:"F106", name:"Reserved ISO",                       cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for future ISO 8583 specification use." },
  { id:"F107", name:"Reserved ISO",                       cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for future ISO 8583 specification use." },
  { id:"F108", name:"Reserved ISO",                       cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for future ISO 8583 specification use." },
  { id:"F109", name:"Reserved ISO",                       cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for future ISO 8583 specification use." },
  { id:"F110", name:"Reserved ISO",                       cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for future ISO 8583 specification use." },
  { id:"F111", name:"Reserved ISO",                       cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for future ISO 8583 specification use." },
  { id:"F112", name:"Reserved National",                  cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for national network use." },
  { id:"F113", name:"Reserved National",                  cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for national network use." },
  { id:"F114", name:"Reserved National",                  cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for national network use." },
  { id:"F115", name:"Reserved National",                  cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for national network use." },
  { id:"F116", name:"Reserved National",                  cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for national network use." },
  { id:"F117", name:"Reserved National",                  cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for national network use." },
  { id:"F118", name:"Reserved National",                  cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for national network use." },
  { id:"F119", name:"Reserved National",                  cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for national network use." },
  { id:"F120", name:"Reserved Private",                   cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for private network use." },
  { id:"F121", name:"Reserved Private",                   cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for private network use." },
  { id:"F122", name:"Reserved Private",                   cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for private network use." },
  { id:"F123", name:"Reserved Private",                   cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for private network use." },
  { id:"F124", name:"Reserved Private",                   cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for private network use." },
  { id:"F125", name:"Reserved Private",                   cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for private network use." },
  { id:"F126", name:"Private Use — TAP Instruction Ref", cat:"private",         dtype:"ans", maxLen:999,  human:"-",  agent:"M", type:"new", desc:"★ Used by Visa TAP to carry the SHA-256 hash of the payment instruction registered in VIC. VisaNet validates this hash against the stored instruction — if the amount, merchant, or currency was modified in transit, the response code is 58 and the transaction is declined." },
  { id:"F127", name:"Reserved Private",                   cat:"private",        dtype:"ans", maxLen:999,  human:"-",  agent:"-",  type:"std", desc:"Reserved for private network use." },
  { id:"F128", name:"MAC (Secondary)",                    cat:"security",       dtype:"b",   maxLen:8,    human:"-",  agent:"-",  type:"std", desc:"Secondary Message Authentication Code for the extended bitmap. Used when fields beyond F064 are present." },
]

// ─── PACKET BAR ──────────────────────────────────────────────────────────────

function PacketBar({ fields, mode, hovered, setHovered, isResponse }) {
  const totalBytes = fields.reduce((s, f) => s + f.bytes, 0)
  return (
    <div style={{ display: "flex", width: "100%", borderRadius: 6, overflow: "hidden", border: "1px solid var(--ink-300)" }}>
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
              width: w + "%", minWidth: 14,
              background: isHov ? (type === "new" ? "color-mix(in srgb, var(--diagram-3) 18%, var(--paper-pure))" : type === "mod" ? "color-mix(in srgb, var(--diagram-1) 18%, var(--paper-pure))" : "var(--ink-200)") : c.bg,
              borderRight: i < fields.length - 1 ? `1px solid ${c.border}` : "none",
              padding: "7px 2px 6px",
              textAlign: "center",
              transition: "background .1s",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              cursor: "default", position: "relative",
            }}>
            <div style={{ width: 6, height: 6, borderRadius: 1, background: isHov ? c.text : c.dot, flexShrink: 0, transition: "background .1s" }} />
            <div style={{
              fontSize: 7.5, fontFamily: "'Courier New',monospace",
              color: isHov ? c.text : c.dot, letterSpacing: "0.03em",
              whiteSpace: "nowrap", overflow: "hidden",
              maxWidth: "calc(100% - 2px)", textOverflow: "clip",
              lineHeight: 1, fontWeight: isHov ? 700 : 400,
            }}>{f.id}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Iso8583Diagram() {
  // Transaction view state
  const [mode, setMode] = useState("agent")
  const [mti, setMti] = useState("request")
  const [hovered, setHovered] = useState(null)

  // View toggle
  const [view, setView] = useState("transaction")

  // Reference view state
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [agentOnly, setAgentOnly] = useState(false)

  const isResponse = mti === "response"
  const txFields = isResponse ? RESPONSE_FIELDS : REQUEST_FIELDS
  const totalBytes = txFields.reduce((s, f) => s + f.bytes, 0)
  const activeField = txFields.find(f => f.id === hovered)

  // Filtered reference fields
  const refFields = useMemo(() => {
    let fs = ALL_FIELDS
    if (agentOnly) fs = fs.filter(f => f.type === "new" || f.type === "mod")
    if (category !== "all") fs = fs.filter(f => f.cat === category)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      fs = fs.filter(f =>
        f.id.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.desc.toLowerCase().includes(q)
      )
    }
    return fs
  }, [search, category, agentOnly])

  const presenceDot = (v) => {
    if (v === "M") return { color: "var(--success)", label: "M" }
    if (v === "C") return { color: "var(--diagram-1)", label: "C" }
    if (v === "O") return { color: "var(--ink-500)", label: "O" }
    return { color: "var(--ink-300)", label: "—" }
  }

  return (
    <div style={{
      fontFamily: "'Georgia','Times New Roman',serif", color: "var(--ink-900)",
      background: "var(--paper)", borderRadius: 12, border: "1px solid var(--ink-200)", overflow: "hidden",
      width: "100vw", maxWidth: 1040, position: "relative", left: "50%", transform: "translateX(-50%)",
      margin: "20px 0"
    }}>

      {/* ── Header ── */}
      <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid var(--ink-200)", background: "var(--ink-100)" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-500)", fontFamily: "'Courier New',monospace", marginBottom: 6 }}>
          ISO 8583 · {view === "transaction" ? "Authorization · Human vs. Agent" : "Complete Field Reference · All 128 Fields"}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.02em", margin: 0 }}>
            {view === "transaction"
              ? `Message anatomy: ${isResponse ? "MTI 0110 — response" : "MTI 0100 — request"}`
              : "ISO 8583 field reference"}
          </h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {/* View toggle */}
            <div style={{ display: "flex", gap: 2, background: "var(--ink-200)", borderRadius: 5, padding: 2 }}>
              {[["transaction","Transaction"], ["reference","Field Reference"]].map(([v, label]) => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: "4px 11px", borderRadius: 3, fontSize: 10, fontFamily: "'Courier New',monospace",
                  cursor: "pointer", border: "none", letterSpacing: "0.04em",
                  background: view === v ? "var(--paper)" : "transparent",
                  color: view === v ? "var(--ink-900)" : "var(--ink-500)",
                  boxShadow: view === v ? "0 1px 2px color-mix(in srgb, var(--ink-900) 7%, transparent)" : "none",
                  fontWeight: view === v ? 600 : 400, transition: "all .15s"
                }}>{label}</button>
              ))}
            </div>

            {/* Transaction-view controls */}
            {view === "transaction" && (
              <>
                <div style={{ display: "flex", gap: 2, background: "var(--ink-200)", borderRadius: 5, padding: 2 }}>
                  {[["request","0100"],["response","0110"]].map(([v, label]) => (
                    <button key={v} onClick={() => { setMti(v); setHovered(null) }} style={{
                      padding: "4px 11px", borderRadius: 3, fontSize: 10, fontFamily: "'Courier New',monospace",
                      cursor: "pointer", border: "none", letterSpacing: "0.04em",
                      background: mti === v ? "var(--paper)" : "transparent",
                      color: mti === v ? "var(--ink-900)" : "var(--ink-500)",
                      boxShadow: mti === v ? "0 1px 2px color-mix(in srgb, var(--ink-900) 7%, transparent)" : "none",
                      fontWeight: mti === v ? 600 : 400, transition: "all .15s"
                    }}>MTI {label}</button>
                  ))}
                </div>
                {!isResponse && (
                  <div style={{ display: "flex", gap: 2, background: "var(--ink-200)", borderRadius: 5, padding: 2 }}>
                    {["human","agent","diff"].map(m => (
                      <button key={m} onClick={() => setMode(m)} style={{
                        padding: "4px 11px", borderRadius: 3, fontSize: 10, fontFamily: "'Courier New',monospace",
                        cursor: "pointer", border: "none", letterSpacing: "0.04em",
                        background: mode === m ? "var(--paper)" : "transparent",
                        color: mode === m ? "var(--ink-900)" : "var(--ink-500)",
                        boxShadow: mode === m ? "0 1px 2px color-mix(in srgb, var(--ink-900) 7%, transparent)" : "none",
                        fontWeight: mode === m ? 600 : 400, transition: "all .15s"
                      }}>{m}</button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════ TRANSACTION VIEW ══════════════ */}
      {view === "transaction" && (
        <>
          {/* Legend */}
          <div style={{ padding: "9px 24px", borderBottom: "1px solid var(--ink-200)", display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            {Object.entries(COLORS).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--ink-500)", fontFamily: "'Courier New',monospace" }}>
                <div style={{ width: 8, height: 8, borderRadius: 1, background: v.dot }} />
                {v.label}
              </div>
            ))}
            <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-400)", fontFamily: "'Courier New',monospace" }}>
              {totalBytes} bytes total · width ∝ field length
            </div>
          </div>

          {/* Packet bar */}
          <div style={{ padding: "14px 24px 4px" }}>
            <PacketBar fields={txFields} mode={mode} hovered={hovered} setHovered={setHovered} isResponse={isResponse} />
            <div style={{ height: 30, marginTop: 5, display: "flex", alignItems: "center" }}>
              {activeField ? (() => {
                const type = isResponse ? activeField.type : (mode === "human" ? "std" : activeField.type)
                const c = COLORS[type]
                const val = isResponse ? activeField.val : (mode === "human" ? activeField.humanVal : activeField.agentVal)
                return (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11, fontFamily: "'Courier New',monospace" }}>
                    <span style={{ color: c.text, fontWeight: 700 }}>{activeField.id}</span>
                    <span style={{ color: "var(--ink-500)" }}>{activeField.name}</span>
                    <span style={{ background: c.bg, color: c.text, padding: "2px 7px", borderRadius: 3, border: `1px solid ${c.border}` }}>{val}</span>
                  </div>
                )
              })() : (
                <div style={{ fontSize: 11, color: "var(--ink-300)", fontFamily: "'Courier New',monospace" }}>hover a field to inspect ↑</div>
              )}
            </div>
          </div>

          {/* Table */}
          <div style={{ borderTop: "1px solid var(--ink-200)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--ink-100)" }}>
                  {["Field","Name", isResponse ? "Value" : mode === "diff" ? "Human → Agent" : "Value", "Note"].map(h => (
                    <th key={h} style={{ padding: "7px 16px", textAlign: "left", fontFamily: "'Courier New',monospace", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-500)", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txFields.map((f, i) => {
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
                        <span style={{ color: "var(--ink-500)", textDecoration: "line-through", marginRight: 6 }}>{f.humanVal}</span>
                        <span style={{ color: c.text, fontWeight: 600 }}>{f.agentVal}</span>
                      </span>
                    )
                  } else {
                    valCell = <span style={{ color: c.text }}>{mode === "human" ? f.humanVal : f.agentVal}</span>
                  }
                  return (
                    <tr key={f.id}
                      onMouseEnter={() => setHovered(f.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ background: isHov ? c.bg : (i % 2 === 0 ? "var(--paper)" : "var(--ink-100)"), borderBottom: "1px solid var(--ink-200)", transition: "background .1s", cursor: "default" }}>
                      <td style={{ padding: "6px 16px", fontFamily: "'Courier New',monospace", fontSize: 11 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 7, height: 7, borderRadius: 1, background: c.dot, flexShrink: 0 }} />
                          <span style={{ color: c.text, fontWeight: 600 }}>{f.id}</span>
                        </div>
                      </td>
                      <td style={{ padding: "6px 16px", fontFamily: "'Courier New',monospace", fontSize: 11, color: "var(--ink-900)" }}>
                        {f.name}
                        {type !== "std" && (
                          <span style={{ marginLeft: 6, fontSize: 8.5, padding: "1px 5px", borderRadius: 2, background: c.bg, color: c.text, border: `1px solid ${c.border}`, letterSpacing: "0.04em" }}>
                            {type === "new" ? "NEW" : "MOD"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "6px 16px", fontFamily: "'Courier New',monospace", fontSize: 11 }}>{valCell}</td>
                      <td style={{ padding: "6px 16px", fontSize: 11, color: "var(--ink-500)", lineHeight: 1.5, fontFamily: "Georgia,serif" }}>
                        {note && note.startsWith("★")
                          ? <span><span style={{ color: c.text, fontWeight: 600 }}>★ </span>{note.slice(2)}</span>
                          : note}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div style={{ padding: "11px 24px", borderTop: "1px solid var(--ink-200)", background: "var(--ink-100)", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            {isResponse ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 1, background: COLORS.new.dot }} />
                  <span style={{ fontFamily: "'Courier New',monospace", color: COLORS.new.text, fontWeight: 600 }}>3 new fields in response</span>
                  <span style={{ color: "var(--ink-500)" }}>F038 auth code · F039 result · F126 TAP confirmation</span>
                </div>
                <div style={{ marginLeft: "auto", fontFamily: "'Courier New',monospace", fontSize: 10, color: "var(--ink-500)" }}>~180ms round-trip</div>
              </>
            ) : mode !== "human" ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 1, background: COLORS.new.dot }} />
                  <span style={{ fontFamily: "'Courier New',monospace", color: COLORS.new.text, fontWeight: 600 }}>2 new fields</span>
                  <span style={{ color: "var(--ink-500)" }}>F048 agent-id · F126 TAP hash</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 1, background: COLORS.mod.dot }} />
                  <span style={{ fontFamily: "'Courier New',monospace", color: COLORS.mod.text, fontWeight: 600 }}>3 modified fields</span>
                  <span style={{ color: "var(--ink-500)" }}>F002 PAN→VCN · F022 01→81 · F025 00→59</span>
                </div>
              </>
            ) : (
              <div style={{ fontFamily: "'Courier New',monospace", fontSize: 10, color: "var(--ink-400)" }}>switch to agent or diff to see what changes</div>
            )}
          </div>
        </>
      )}

      {/* ══════════════ REFERENCE VIEW ══════════════ */}
      {view === "reference" && (
        <>
          {/* Search + filters */}
          <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--ink-200)", background: "var(--paper)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search fields by ID, name, or description…"
                style={{
                  flex: 1, minWidth: 200, padding: "7px 12px",
                  border: "1px solid var(--ink-300)", borderRadius: 6,
                  fontSize: 12, fontFamily: "'Courier New',monospace",
                  background: "var(--ink-100)", color: "var(--ink-900)",
                  outline: "none",
                }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "'Courier New',monospace", color: "var(--ink-500)", cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={agentOnly}
                  onChange={e => setAgentOnly(e.target.checked)}
                  style={{ accentColor: "var(--diagram-3)" }}
                />
                Agent fields only
              </label>
              <div style={{ fontSize: 11, color: "var(--ink-500)", fontFamily: "'Courier New',monospace" }}>
                {refFields.length} of 128 fields
              </div>
            </div>
            {/* Category tabs */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
                  padding: "4px 11px", borderRadius: 4, fontSize: 10,
                  fontFamily: "'Courier New',monospace", cursor: "pointer",
                  border: `1px solid ${category === cat.id ? "var(--ink-700)" : "var(--ink-300)"}`,
                  background: category === cat.id ? "var(--ink-900)" : "transparent",
                  color: category === cat.id ? "var(--paper)" : "var(--ink-500)",
                  fontWeight: category === cat.id ? 600 : 400,
                  transition: "all .15s", letterSpacing: "0.03em",
                }}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ padding: "8px 24px", borderBottom: "1px solid var(--ink-200)", display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            {Object.entries(COLORS).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--ink-500)", fontFamily: "'Courier New',monospace" }}>
                <div style={{ width: 8, height: 8, borderRadius: 1, background: v.dot }} />
                {v.label}
              </div>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
              {[["M","Mandatory","var(--success)"],["C","Conditional","var(--diagram-1)"],["O","Optional","var(--ink-500)"],["—","Not used","var(--ink-300)"]].map(([code, label, color]) => (
                <div key={code} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: "var(--ink-500)", fontFamily: "'Courier New',monospace" }}>
                  <span style={{ color, fontWeight: 600 }}>{code}</span> {label}
                </div>
              ))}
            </div>
          </div>

          {/* Reference table */}
          <div style={{ overflowY: "auto", maxHeight: 640 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                <tr style={{ background: "var(--ink-100)" }}>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-500)", fontWeight: 400, width: 62 }}>Field</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-500)", fontWeight: 400 }}>Name</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-500)", fontWeight: 400, width: 50 }}>Type</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-500)", fontWeight: 400, width: 44 }}>Max</th>
                  <th style={{ padding: "8px 14px", textAlign: "center", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-500)", fontWeight: 400, width: 44 }}>Human</th>
                  <th style={{ padding: "8px 14px", textAlign: "center", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-500)", fontWeight: 400, width: 44 }}>Agent</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-500)", fontWeight: 400 }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {refFields.map((f, i) => {
                  const c = COLORS[f.type]
                  const hDot = presenceDot(f.human)
                  const aDot = presenceDot(f.agent)
                  return (
                    <tr key={f.id} style={{ background: i % 2 === 0 ? "var(--paper)" : "var(--ink-100)", borderBottom: "1px solid var(--ink-200)" }}>
                      <td style={{ padding: "6px 14px", fontFamily: "'Courier New',monospace", fontSize: 11, whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 6, height: 6, borderRadius: 1, background: c.dot, flexShrink: 0 }} />
                          <span style={{ color: c.text, fontWeight: 600 }}>{f.id}</span>
                        </div>
                      </td>
                      <td style={{ padding: "6px 14px", fontSize: 11, color: "var(--ink-900)" }}>
                        <span style={{ fontFamily: "'Courier New',monospace" }}>{f.name}</span>
                        {f.type !== "std" && (
                          <span style={{ marginLeft: 6, fontSize: 8, padding: "1px 4px", borderRadius: 2, background: c.bg, color: c.text, border: `1px solid ${c.border}`, letterSpacing: "0.04em", fontFamily: "'Courier New',monospace" }}>
                            {f.type === "new" ? "NEW" : "MOD"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "6px 14px", fontFamily: "'Courier New',monospace", fontSize: 10, color: "var(--ink-500)" }}>{f.dtype}</td>
                      <td style={{ padding: "6px 14px", fontFamily: "'Courier New',monospace", fontSize: 10, color: "var(--ink-500)" }}>{f.maxLen === 999 ? "var" : f.maxLen}</td>
                      <td style={{ padding: "6px 14px", textAlign: "center", fontFamily: "'Courier New',monospace", fontSize: 11, fontWeight: 600, color: hDot.color }}>{hDot.label}</td>
                      <td style={{ padding: "6px 14px", textAlign: "center", fontFamily: "'Courier New',monospace", fontSize: 11, fontWeight: 600, color: aDot.color }}>{aDot.label}</td>
                      <td style={{ padding: "6px 14px", fontSize: 11, color: "var(--ink-700)", lineHeight: 1.55, fontFamily: "Georgia,serif" }}>
                        {f.desc.startsWith("★")
                          ? <span><span style={{ color: c.text, fontWeight: 600 }}>★ </span>{f.desc.slice(2)}</span>
                          : f.desc}
                      </td>
                    </tr>
                  )
                })}
                {refFields.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "32px 24px", textAlign: "center", fontSize: 12, color: "var(--ink-400)", fontFamily: "'Courier New',monospace" }}>
                      no fields match — try a different search or category
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  )
}
