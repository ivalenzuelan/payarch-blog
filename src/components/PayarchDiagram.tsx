'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

type Layer = 'business' | 'technical' | 'iso8583'

interface StepData {
  id: string
  title: string
  subtitle: string
  activeNodes: string[]
  activeEdges: string[]
  business: string
  technical: string
  iso8583: string
}

const STEPS: StepData[] = [
  {
    "id": "consumer-intent",
    "title": "Consumer delegates to agent",
    "subtitle": "T+0 · pre-checkout",
    "activeNodes": [
      "agent",
      "wallet"
    ],
    "activeEdges": [
      "e-agent-tap",
      "e-wallet-tap"
    ],
    "business": "Before any shopping, the consumer enrolled their Visa card with the agent platform. Visa issued a Virtual Card Number bound exclusively to this agent. The real 16-digit card number never leaves Visa's Token Service — the agent never sees it, the merchant never sees it, the acquirer never sees it.",
    "technical": "Consumer called VIC enroll_card() API. Visa Token Service performed step-up verification (3DS or biometric) with issuer. Issued agent-specific pass-through token: { token: \"4111xxxxAGNT\", binding: { agent_id: \"skyfire-001\" }, controls: { limit_per_txn: 50000, categories: [\"5045\",\"5065\",\"5734\"], require_passkey: true } }. Consumer created FIDO2 Passkey on device. All future payment instructions require Passkey assertion.",
    "iso8583": "// Token provisioning (one-time setup — not at checkout)\nPOST https://api.visa.com/vic/v1/tokens/enroll\n{\n  \"agent_id\": \"skyfire-001\",\n  \"card_ref\": \"consumer-card-hash\",\n  \"controls\": {\n    \"limit_per_txn\": 50000,  // cents: $500\n    \"categories\": [\"5045\",\"5065\",\"5734\"],\n    \"velocity_daily\": 100000, // cents: $1000\n    \"require_passkey\": true\n  }\n}\n// → { token_ref: \"vts-AGNT-001\", passkey_challenge: \"...\", status: \"active\" }"
  },
  {
    "id": "tap-validation",
    "title": "Agent signals intent to TAP",
    "subtitle": "HTTP Message Signatures · Ed25519",
    "activeNodes": [
      "wallet",
      "tap",
      "visa"
    ],
    "activeEdges": [
      "e-tap-validates"
    ],
    "business": "Visa is running the TAP validation — checking the agent's cryptographic identity, issuing the credential, and registering the payment instruction for later validation.",
    "technical": "VIC TAP service handling validation request. Separate service from VisaNet authorization path. Key directory at https://tap.visa.com/.well-known/agents/ serving agent public keys.",
    "iso8583": "// TAP service (separate from VisaNet auth path):\n// 1. Key directory lookup: GET .well-known/agents/skyfire-agent-001\n//    → { public_key: \"ed25519:MCowBQY...\", status: \"active\" }\n// 2. Signature verification: OK\n// 3. Register instruction in VIC registry\n// 4. Issue JWT to agent"
  },
  {
    "id": "tap-credential-issued",
    "title": "TAP issues signed credential",
    "subtitle": "JWT · TTL 90s · replay-protected",
    "activeNodes": [
      "wallet",
      "tap",
      "visa"
    ],
    "activeEdges": [
      "e-tap-merchant"
    ],
    "business": "Visa has signed and issued the TAP credential. The payment instruction is now registered in VIC's registry. When the ISO 8583 message arrives with F126, VisaNet will validate it against this stored instruction.",
    "technical": "TAP JWT issued and signed with Visa private key. Payment instruction stored in VIC with TTL=300s. Nonce \"a3f8c2e1d9b7\" stored in nonce registry. VIC is now ready to validate F126 when the ISO 8583 message arrives.",
    "iso8583": "// VIC state after TAP credential issuance:\nvic.registry[\"pi-abc123\"] = {\n  hash: sha256(\"pi-abc123\"),   // → will appear in F126\n  amount: 89.99,\n  merchant: \"bose.com\",\n  agent_id: \"skyfire-agent-001\",\n  consumer_hash: \"...\",\n  status: \"pending\",\n  expires_at: now + 300\n}"
  },
  {
    "id": "merchant-accepts",
    "title": "Merchant accepts — no CAPTCHA",
    "subtitle": "MerchantSDK · JWT validation · <80ms",
    "activeNodes": [
      "agent",
      "merchant"
    ],
    "activeEdges": [
      "e-agent-to-merchant",
      "e-merchant-acquirer"
    ],
    "business": "The merchant's checkout system receives the agent's request. The TAP SDK validates the Visa-signed credential in milliseconds, recognizes this is a returning customer's authorized agent, and creates the order — no form, no CAPTCHA, no redirect. This is what \"frictionless agent checkout\" means in practice.",
    "technical": "MerchantSDK validates JWT: (1) extract from Authorization header (2) fetch Visa public key from 5min cache (3) verify Ed25519 signature (4) check exp > now ✓, nonce not in store ✓, aud === \"bose.com\" ✓, amount === 89.99 ✓ (5) consumer_recognized=true → skip new-customer onboarding (6) create order ID in OMS (7) call Stripe PaymentIntent API with tokenized PAN.",
    "iso8583": "// MerchantSDK JWT verification\nconst jwt = req.headers.authorization.replace(\"TAP-1.0 \", \"\")\nconst key = await keyCache.get(\"tap.visa.com\")  // 5min TTL\nconst p = jwt.verify(jwt, key)\n\nassert(p.exp > Date.now() / 1000)    // not expired  ✓\nassert(!nonceStore.has(p.nonce))      // not replayed ✓\nassert(p.aud === \"bose.com\")          // correct site ✓\nassert(p.amount === 89.99)            // amount match ✓\n\n// consumer_recognized: true → skip onboarding\n// → Order created: BOSE-2026-78234\n// → Call Stripe PaymentIntent"
  },
  {
    "id": "acquirer-iso8583",
    "title": "Acquirer sends modified ISO 8583",
    "subtitle": "F022=81 · F048=agent-id · F126=TAP-ref",
    "activeNodes": [
      "wallet",
      "acquirer"
    ],
    "activeEdges": [
      "e-acquirer-visa"
    ],
    "business": "Stripe packages the payment request into an ISO 8583 authorization message and sends it to the Visa network. The single most important change from a standard human transaction: field F022 is set to 81, a new value that tells every downstream system \"this was initiated by a verified AI agent — apply agent-specific rules.\"",
    "technical": "Acquirer retrieves VCN tokenized_pan from VIC retrieve_payment_credentials() call. Builds ISO 8583 MTI 0100: F002=VCN \"4111xxxxAGNT\", F022=81 (new agent-initiated POS entry mode), F025=59 (agent present), F048 appends agent-id \"AGNT:skyfire-001\", F126 carries SHA-256 hash of TAP instruction_ref \"pi-abc123\". Sends via VisaNet leased line.",
    "iso8583": "ISO 8583 MTI: 0100  (Authorization Request)\n──────────────────────────────────────────────\nF002: 4111xxxxxxxxAGNT   ← agent VCN (not real PAN) ★\nF003: 000000             ← purchase\nF004: 000000008999       ← $89.99\nF007: 0321143422         ← datetime\nF011: 000123             ← STAN (sequence)\nF012: 143422             ← local time\nF022: 81                 ← POS entry: agent-initiated ★\nF025: 59                 ← POS condition: agent present\nF037: 000123143422       ← retrieval ref\nF041: AGNT-BOSE-COM-01   ← terminal ID\nF042: BOSE-MERCH-00001   ← merchant ID\nF043: Bose.com US        ← merchant name/location\nF048: AGNT:skyfire-001   ← agent identifier ★\nF049: 840               ← USD\nF054: 010               ← addl amounts\nF126: pi-abc123:sha256:3a7f... ← TAP instruction_ref ★"
  },
  {
    "id": "visanet-routes",
    "title": "VisaNet validates and routes",
    "subtitle": "VIC registry check · VTS de-tokenize · agent risk model",
    "activeNodes": [
      "wallet",
      "tap",
      "visa"
    ],
    "activeEdges": [
      "e-visa-issuer"
    ],
    "business": "VisaNet receives the authorization request, validates the agent context, confirms the payment matches the original consumer authorization, de-tokenizes the VCN, and routes to the issuing bank — all in under 100ms. If the amount or merchant was tampered with in transit, this step rejects it.",
    "technical": "VisaNet processes MTI 0100: (1) Parse F022=81 → apply agent_risk_ruleset instead of human fraud model (2) validate F126: stored_instruction.hash == F126.hash ✓, amount ✓, merchant ✓ — any mismatch → F039=58 decline (3) VTS de-tokenize: \"4111xxxxAGNT\" → real PAN \"4111000000001111\" → BIN 411100 (4) agent fraud score: behavioral baseline for F022=81 transactions (5) forward 0100 to Chase with F022=81 preserved.",
    "iso8583": "// VisaNet processing pipeline:\n1. F022=81 detected:\n   → switch(risk_model) to agent_ruleset\n\n2. F126 integrity check:\n   stored = vic.get(\"pi-abc123\")\n   assert(sha256(stored) == F126.hash)  ★\n   assert(stored.amount == F004)         ✓\n   assert(stored.merchant == F042)       ✓\n   // Any mismatch → F039=58 (decline)\n\n3. VTS de-tokenize:\n   \"4111xxxxAGNT\" → \"4111000000001111\"\n   BIN 411100 → Chase Bank NA\n\n4. Agent fraud score:\n   input_features: [F022=81, velocity, geo, BIN]\n   model: agent_classifier_v3\n   score: 12/100 (low risk ✓)\n\n5. Forward 0100 to Chase\n   F022=81 preserved"
  },
  {
    "id": "issuer-auth",
    "title": "Issuer applies agent spending policy",
    "subtitle": "F039 decision · passkey-validated controls · ~80ms",
    "activeNodes": [
      "wallet",
      "issuer"
    ],
    "activeEdges": [
      "e-issuer-return"
    ],
    "business": "The consumer's bank makes the authorization decision. Because F022=81 is set, the bank applies the agent-specific spending policy the consumer configured — not the normal human fraud model that would flag this machine-speed transaction. Amount is within limit. Category matches. Token is active. Approved in ~80ms.",
    "technical": "Issuer receives MTI 0100 with F022=81. Loads agent policy for token \"4111xxxxAGNT\". Runs checks: available_balance >= amount ✓, amount <= per_txn limit ✓, MCC 5065 in [5045,5065,5734] ✓, velocity_today + amount <= daily_limit ✓, token status active ✓, passkey assertion validated at instruction-creation time ✓. Writes authorization hold. Returns MTI 0110 F039=00 F038=123456.",
    "iso8583": "// Issuer authorization decision log\ntoken: \"4111xxxxAGNT\"\nagent_id: \"skyfire-001\"  (from F048)\nF022: 81  → load agent_spending_policy(token)\n\npolicy_checks:\n  available:  $2,847.33 >= $89.99  ✓\n  per_txn:    $89.99 <= $500.00    ✓\n  velocity:   $89.99 <= $1000/day  ✓\n  category:   5065 in [5045,5065,5734] ✓\n  token:      active               ✓\n  passkey:    verified t-120s ago  ✓\n\nrisk_score: 8/100  (low risk)\ndecision: APPROVE\n\n// Authorization hold written: $89.99\n// Response MTI 0110:\nF039: 00      ← approved ★\nF038: 123456  ← auth code ★"
  },
  {
    "id": "settlement-complete",
    "title": "Authorized — funds reserved",
    "subtitle": "T+0 auth · T+1 clearing · commerce signal logged",
    "activeNodes": [
      "agent",
      "wallet",
      "merchant",
      "acquirer",
      "visa",
      "issuer"
    ],
    "activeEdges": [],
    "business": "Funds are reserved on the consumer's account. T+1 clearing will permanently debit the account the next business day. The consumer has a 120-day dispute window — VIC's commerce signals provide the audit trail: original Passkey-authenticated instruction, TAP credential, authorization record, and agent fulfillment confirmation.",
    "technical": "Issuer holds $89.99 from available balance. T+1: receives Visa clearing file (MTI 0220). Converts hold to permanent debit. Updates statement. VIC commerce signal provides evidence for any future dispute: passkey_assertion_verified, tap_credential_ref, authorization_code, merchant_confirmation.",
    "iso8583": "// T+1 Clearing (MTI 0220):\nF002: 4111xxxxxxxxAGNT  ← VCN echoed\nF004: 000000008999      ← $89.99\nF038: 123456            ← matches auth code\nF039: 00               ← confirmed\nF044: 123456           ← auth code again\n// Hold → permanent debit\n// Dispute evidence in VIC:\n//   passkey_assertion: verified\n//   tap_credential: \"pi-abc123\"\n//   merchant_confirmation: \"bose-order-78234\"\n//   commerce_signal_timestamp: settlement-complete"
  }
]

const NODE_DEFS = {
  agent:    { x: 20,  y: 30,  w: 148, h: 74, label: 'AI Agent',    sub: 'Skyfire · Claude · GPT-4o',     layer: 'Agent layer',   color: '#7c6fcd', colorLight: '#534AB7', fill: '#1e1a3a', fillLight: '#EEEDFE' },
  wallet:   { x: 20,  y: 158, w: 148, h: 74, label: 'AgentWallet', sub: 'VCN · passkey · policy',         layer: 'Agent layer',   color: '#7c6fcd', colorLight: '#534AB7', fill: '#1e1a3a', fillLight: '#EEEDFE' },
  tap:      { x: 228, y: 84,  w: 178, h: 74, label: 'Trusted Agent Protocol', sub: 'Visa + Cloudflare + Akamai', layer: 'Trust & identity', color: '#4a7fff', colorLight: '#185FA5', fill: '#1a2a4a', fillLight: '#E6F1FB' },
  merchant: { x: 468, y: 30,  w: 148, h: 74, label: 'Merchant',    sub: 'Bose · Shopify · Jomashop',        layer: 'Merchant',      color: '#4a7fff', colorLight: '#185FA5', fill: '#1a2a4a', fillLight: '#E6F1FB' },
  acquirer: { x: 468, y: 186, w: 148, h: 74, label: 'Acquirer',    sub: 'Stripe · Adyen',            layer: 'Payment rails', color: '#e8a030', colorLight: '#854F0B', fill: '#1f1800', fillLight: '#FAEEDA' },
  visa:     { x: 672, y: 128, w: 148, h: 74, label: 'Visa Network', sub: 'VIC · VisaNet · VTS',      layer: 'Payment rails', color: '#2db88a', colorLight: '#0F6E56', fill: '#0d2a20', fillLight: '#E1F5EE' },
  issuer:   { x: 800, y: 218, w: 150, h: 74, label: 'Issuer Bank', sub: 'Chase · Amex · Barclays',   layer: 'Payment rails', color: '#e06848', colorLight: '#993C1D', fill: '#200d08', fillLight: '#FAECE7' },
}

const EDGE_PATHS = {
  'e-agent-tap':        { d: 'M168,67 C200,67 215,121 228,121',   color: '#7c6fcd' },
  'e-wallet-tap':       { d: 'M168,195 C200,195 215,121 228,121',  color: '#7c6fcd' },
  'e-tap-merchant':     { d: 'M406,121 C436,121 452,67 468,67',    color: '#4a7fff' },
  'e-merchant-acquirer':{ d: 'M542,104 L542,186',                  color: '#4a7fff' },
  'e-acquirer-visa':    { d: 'M616,223 C644,223 658,165 672,165',  color: '#e8a030' },
  'e-visa-issuer':      { d: 'M820,165 L824,165 L824,218',         color: '#2db88a' },
  'e-issuer-return':    { d: 'M875,218 C875,196 746,196 746,202',  color: '#e06848' },
}

const STEP_EDGE_LABELS: Record<string, string> = {
  'e-agent-tap':         'DID + intent',
  'e-wallet-tap':        'token ref',
  'e-tap-merchant':      'TAP JWT · 90s',
  'e-merchant-acquirer': 'PaymentIntent',
  'e-acquirer-visa':     'MTI 0100 · F022=81',
  'e-visa-issuer':       '0100 → issuer',
  'e-issuer-return':     'MTI 0110 · F039=00',
}

function useDarkMode() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return dark
}

export default function PayarchDiagram() {
  const [step, setStep] = useState(0)
  const [layer, setLayer] = useState<Layer>('business')
  const [playing, setPlaying] = useState(false)
  const [visited, setVisited] = useState<Set<number>>(new Set([0]))
  const dark = useDarkMode()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const current = STEPS[step]

  const C = dark ? {
    bg: 'transparent',
    surface: '#141618',
    border: '#252830',
    borderActive: '#353a45',
    text: '#e8e6e0',
    textSecondary: '#7a7870',
    textTertiary: '#4a4845',
    edgeInactive: '#252830',
    gridDot: '#1e2026',
    controlBg: '#141618',
    controlBorder: '#252830',
    codeBg: '#0a0b0d',
    codeBorder: '#1e2026',
  } : {
    bg: 'transparent',
    surface: '#ffffff',
    border: '#e8e5de',
    borderActive: '#d0cdc4',
    text: '#1a1918',
    textSecondary: '#8a8780',
    textTertiary: '#c0bdb5',
    edgeInactive: '#dddbd4',
    gridDot: '#eeece6',
    controlBg: '#ffffff',
    controlBorder: '#e8e5de',
    codeBg: '#f4f2ec',
    codeBorder: '#e2e0d8',
  }

  const advance = useCallback(() => {
    setStep(s => {
      const next = (s + 1) % STEPS.length
      setVisited(v => new Set([...v, next]))
      return next
    })
  }, [])

  useEffect(() => {
    if (!playing) return
    timerRef.current = setTimeout(advance, 2400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, step, advance])

  const goTo = (i: number) => {
    setStep(i)
    setVisited(v => new Set([...v, i]))
  }
  const prev = () => goTo(Math.max(0, step - 1))
  const next = () => goTo(Math.min(STEPS.length - 1, step + 1))

  const isNodeActive = (id: string) => current.activeNodes.includes(id)
  const isNodeVisited = (id: string) => {
    for (let i = 0; i < step; i++) {
      if (STEPS[i].activeNodes.includes(id)) return true
    }
    return false
  }
  const isEdgeActive = (id: string) => current.activeEdges.includes(id)
  const isEdgeVisited = (id: string) => {
    for (let i = 0; i < step; i++) {
      if (STEPS[i].activeEdges.includes(id)) return true
    }
    return false
  }

  const layerText = current[layer as keyof StepData] as string

  const layerColors: Record<Layer, { bg: string, text: string, border: string }> = dark ? {
    business:  { bg: '#1e1a3a', text: '#9f97dd', border: '#2e2850' },
    technical: { bg: '#1a2a4a', text: '#6a9fff', border: '#253a60' },
    iso8583:   { bg: '#1f1800', text: '#d4902a', border: '#2e2000' },
  } : {
    business:  { bg: '#EEEDFE', text: '#3C3489', border: '#d0ccf8' },
    technical: { bg: '#E6F1FB', text: '#0C447C', border: '#b8d4f0' },
    iso8583:   { bg: '#FAEEDA', text: '#633806', border: '#f0d4a0' },
  }

  return (
    <div style={{ 
      width: '100vw', 
      maxWidth: '1040px', 
      position: 'relative', 
      left: '50%', 
      transform: 'translateX(-50%)', 
      padding: '0 24px',
      boxSizing: 'border-box',
      fontFamily: 'system-ui, -apple-system, sans-serif' 
    }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['business', 'technical', 'iso8583'] as Layer[]).map(l => (
            <button key={l} onClick={() => setLayer(l)} style={{
              padding: '4px 12px', borderRadius: 4, fontSize: 11,
              fontFamily: 'monospace', cursor: 'pointer', border: `1px solid`,
              borderColor: layer === l ? layerColors[l].border : C.controlBorder,
              background: layer === l ? layerColors[l].bg : 'transparent',
              color: layer === l ? layerColors[l].text : C.textSecondary,
              transition: 'all 0.15s',
            }}>
              {l === 'iso8583' ? 'ISO 8583' : l}
            </button>
          ))}
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.textTertiary }}>
          Visa Intelligent Commerce · TAP · VisaNet
        </span>
      </div>

      {/* ── OVERVIEW SVG ── */}
      <div style={{ width: '100%', marginBottom: 0, position: 'relative' }}>
        <svg width="100%" viewBox="0 0 960 295" style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <marker id="arr-inactive" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke={C.edgeInactive} strokeWidth="1.5" strokeLinecap="round"/>
            </marker>
            {Object.entries(EDGE_PATHS).map(([id, ep]) => (
              <marker key={id} id={`arr-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M2 1L8 5L2 9" fill="none" stroke={ep.color} strokeWidth="1.5" strokeLinecap="round"/>
              </marker>
            ))}
          </defs>

          {/* Layer labels */}
          <text x="8" y="20" style={{ fontSize: 9, fontFamily: 'monospace', fill: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>agent layer</text>
          <text x="8" y="104" style={{ fontSize: 9, fontFamily: 'monospace', fill: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>trust</text>
          <text x="8" y="200" style={{ fontSize: 9, fontFamily: 'monospace', fill: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>rails</text>
          <line x1="8" y1="26" x2="952" y2="26" stroke={dark ? '#1e2026' : '#eeece6'} strokeWidth="0.5" strokeDasharray="3 7"/>
          <line x1="8" y1="112" x2="952" y2="112" stroke={dark ? '#1e2026' : '#eeece6'} strokeWidth="0.5" strokeDasharray="3 7"/>
          <line x1="8" y1="210" x2="952" y2="210" stroke={dark ? '#1e2026' : '#eeece6'} strokeWidth="0.5" strokeDasharray="3 7"/>

          {/* ── EDGES (inactive layer) ── */}
          {Object.entries(EDGE_PATHS).map(([id, ep]) => {
            const active = isEdgeActive(id)
            const vis = isEdgeVisited(id)
            const isDashed = id === 'e-issuer-return'
            return (
              <g key={id}>
                <path
                  id={`path-${id}`}
                  d={ep.d}
                  fill="none"
                  stroke={active ? ep.color : vis ? ep.color : C.edgeInactive}
                  strokeWidth={active ? 1.5 : vis ? 1 : 0.8}
                  strokeOpacity={active ? 1 : vis ? 0.4 : 1}
                  strokeDasharray={isDashed ? '5 4' : undefined}
                  markerEnd={active ? `url(#arr-${id})` : `url(#arr-inactive)`}
                  style={{ transition: 'stroke 0.3s, stroke-width 0.3s, stroke-opacity 0.3s' }}
                />
                {/* Traveling dot */}
                {active && (
                  <circle r="5" fill={ep.color} opacity="0.95">
                    <animateMotion dur="1s" repeatCount="indefinite">
                      <mpath href={`#path-${id}`} />
                    </animateMotion>
                  </circle>
                )}
                {/* Edge label */}
                {active && (() => {
                  const label = STEP_EDGE_LABELS[id]
                  return label ? null : null
                })()}
              </g>
            )
          })}

          {/* ── NODES ── */}
          {Object.entries(NODE_DEFS).map(([id, nd]) => {
            const active = isNodeActive(id)
            const vis = isNodeVisited(id)
            const borderColor = active ? nd.color : vis ? nd.color : C.border
            const borderWidth = active ? 1.5 : vis ? 0.8 : 0.5
            const bgColor = active
              ? (dark ? nd.fill : nd.fillLight)
              : vis
              ? (dark ? `${nd.fill}88` : `${nd.fillLight}66`)
              : C.surface
            const opacity = (!active && !vis && step > 0) ? 0.55 : 1

            return (
              <g key={id} style={{ opacity, transition: 'opacity 0.3s' }}>
                <rect
                  x={nd.x} y={nd.y} width={nd.w} height={nd.h}
                  rx={8}
                  fill={bgColor}
                  stroke={borderColor}
                  strokeWidth={borderWidth}
                  style={{ transition: 'all 0.3s' }}
                />
                {/* Active pulse ring */}
                {active && (
                  <rect
                    x={nd.x - 3} y={nd.y - 3} width={nd.w + 6} height={nd.h + 6}
                    rx={11} fill="none"
                    stroke={nd.color}
                    strokeWidth={0.8}
                    strokeOpacity={0.3}
                  >
                    <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/>
                  </rect>
                )}
                {/* Layer badge */}
                <rect
                  x={nd.x + 8} y={nd.y + nd.h - 16} width={nd.w - 16} height={10}
                  rx={2}
                  fill={active ? nd.color : (vis ? nd.color : (dark ? '#1e2026' : '#f0ede6'))}
                  fillOpacity={active ? 0.25 : vis ? 0.15 : 1}
                />
                {/* Node label */}
                <text
                  x={nd.x + nd.w / 2}
                  y={nd.y + 26}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{
                    fontSize: id === 'tap' ? 11 : 12,
                    fontWeight: 500,
                    fill: active ? nd.color : (dark ? '#e8e6e0' : '#1a1918'),
                    transition: 'fill 0.3s',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  {nd.label}
                </text>
                {/* Sublabel */}
                <text
                  x={nd.x + nd.w / 2}
                  y={nd.y + 44}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{
                    fontSize: 9.5,
                    fill: dark ? '#5a5856' : '#9a9890',
                    fontFamily: 'monospace',
                  }}
                >
                  {nd.sub}
                </text>
                {/* Layer text in badge */}
                <text
                  x={nd.x + nd.w / 2}
                  y={nd.y + nd.h - 10}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{
                    fontSize: 8,
                    fill: active ? nd.color : (dark ? '#3a3c42' : '#b0ada5'),
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                  }}
                >
                  {nd.layer}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* ── STEP PROGRESS DOTS ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '12px 0 10px', justifyContent: 'center' }}>
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            title={s.title}
            style={{
              width: i === step ? 20 : 6,
              height: 6,
              borderRadius: 3,
              border: 'none',
              background: i === step
                ? '#4a7fff'
                : visited.has(i)
                ? (dark ? '#353a45' : '#d5d3ca')
                : (dark ? '#252830' : '#e8e5de'),
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>

      {/* ── STEP DETAIL PANEL ── */}
      <div style={{
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 4,
      }}>
        {/* Step header */}
        <div style={{
          padding: '14px 18px 12px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontFamily: 'monospace', fontSize: 10,
                padding: '2px 7px', borderRadius: 3,
                background: layerColors[layer].bg,
                color: layerColors[layer].text,
                border: `1px solid ${layerColors[layer].border}`,
              }}>
                step {step + 1} / {STEPS.length}
              </span>
              <span style={{
                fontFamily: 'monospace', fontSize: 10,
                color: C.textTertiary,
              }}>
                {current.subtitle}
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, color: C.text, lineHeight: 1.3 }}>
              {current.title}
            </div>
          </div>
          {/* Active nodes chips */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0, maxWidth: 260, justifyContent: 'flex-end' }}>
            {current.activeNodes.map(id => {
              const nd = NODE_DEFS[id as keyof typeof NODE_DEFS]
              return (
                <span key={id} style={{
                  fontSize: 9, fontFamily: 'monospace',
                  padding: '2px 6px', borderRadius: 3,
                  background: dark ? nd.fill : nd.fillLight,
                  color: nd.color,
                  border: `1px solid ${nd.color}44`,
                }}>
                  {nd.label}
                </span>
              )
            })}
          </div>
        </div>

        {/* Layer text */}
        <div style={{ padding: '16px 18px', background: dark ? '#0e0f11' : '#faf9f5', minHeight: 100 }}>
          {layer === 'iso8583' ? (
            <pre style={{
              margin: 0,
              fontSize: 11.5,
              lineHeight: 1.75,
              fontFamily: 'monospace',
              color: dark ? '#c0bdb5' : '#4a4840',
              background: 'transparent',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {layerText}
            </pre>
          ) : (
            <p style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: C.textSecondary,
            }}>
              {layerText}
            </p>
          )}
        </div>

        {/* Controls */}
        <div style={{
          padding: '10px 18px',
          borderTop: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.controlBg,
        }}>
          <button
            onClick={prev} disabled={step === 0}
            style={{
              padding: '5px 14px', borderRadius: 5, fontSize: 12,
              fontFamily: 'monospace', cursor: step === 0 ? 'default' : 'pointer',
              border: `1px solid ${C.controlBorder}`,
              background: 'transparent', color: step === 0 ? C.textTertiary : C.textSecondary,
            }}
          >
            ← prev
          </button>
          <button
            onClick={() => setPlaying(p => !p)}
            style={{
              padding: '5px 18px', borderRadius: 5, fontSize: 12,
              fontFamily: 'monospace', cursor: 'pointer',
              border: `1px solid ${playing ? '#4a7fff' : C.controlBorder}`,
              background: playing ? '#1a2a4a' : 'transparent',
              color: playing ? '#4a7fff' : C.textSecondary,
            }}
          >
            {playing ? '⏸ pause' : '▶ play'}
          </button>
          <button
            onClick={next} disabled={step === STEPS.length - 1}
            style={{
              padding: '5px 14px', borderRadius: 5, fontSize: 12,
              fontFamily: 'monospace', cursor: step === STEPS.length - 1 ? 'default' : 'pointer',
              border: `1px solid ${C.controlBorder}`,
              background: 'transparent',
              color: step === STEPS.length - 1 ? C.textTertiary : C.textSecondary,
            }}
          >
            next →
          </button>
          <div style={{ flex: 1, height: 2, background: C.border, borderRadius: 1, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 1,
              background: '#4a7fff',
              width: `${((step + 1) / STEPS.length) * 100}%`,
              transition: 'width 0.4s ease',
            }}/>
          </div>
          <button
            onClick={() => { setStep(0); setVisited(new Set([0])); setPlaying(false) }}
            style={{
              padding: '5px 10px', borderRadius: 5, fontSize: 11,
              fontFamily: 'monospace', cursor: 'pointer',
              border: `1px solid ${C.controlBorder}`,
              background: 'transparent', color: C.textTertiary,
            }}
          >
            reset
          </button>
        </div>
      </div>

      {/* ── EDGE LEGEND ── */}
      <div style={{ display: 'flex', gap: 16, padding: '8px 4px', flexWrap: 'wrap' }}>
        {[
          { color: '#7c6fcd', label: 'agent · intent' },
          { color: '#4a7fff', label: 'TAP credential' },
          { color: '#e8a030', label: 'ISO 8583' },
          { color: '#2db88a', label: 'VisaNet auth' },
          { color: '#e06848', label: 'response · funds' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 16, height: 2, background: l.color, borderRadius: 1 }}/>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.textTertiary }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
