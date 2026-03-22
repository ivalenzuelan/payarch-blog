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
    id: 'consumer-intent',
    title: 'Consumer delegates to agent',
    subtitle: 'T+0 · pre-checkout',
    activeNodes: ['agent', 'wallet'],
    activeEdges: [],
    business: 'The consumer tells their AI assistant "buy me the Bose QC45 headphones." The agent checks the pre-authorized AgentWallet — a constrained credential with a $500 retail limit. The consumer\'s real card number never leaves Visa\'s systems.',
    technical: 'AgentRuntime receives NL intent. Invokes browse_tool() to resolve SKU. Checks AgentWallet policy: category=retail ✓, limit=$500 ✓, token_status=active ✓. Reads consumer_did from session. Prepares TAP handshake.',
    iso8583: '// No ISO 8583 message yet — intent is internal\n{\n  "intent": "purchase",\n  "sku": "BOSE-QC45",\n  "amount": 89.99,\n  "currency": "USD",\n  "wallet_ref": "VCN-session-001",\n  "consumer_did": "did:web:skyfire.xyz:user-123"\n}'
  },
  {
    id: 'tap-validation',
    title: 'Agent signals intent to TAP',
    subtitle: 'HTTP Message Signatures · Ed25519',
    activeNodes: ['agent', 'wallet', 'tap'],
    activeEdges: ['e-agent-tap', 'e-wallet-tap'],
    business: 'Before touching any checkout, the agent authenticates itself through the Trusted Agent Protocol — the system Visa and Cloudflare built so merchants can tell legitimate AI agents from malicious bots. This is the core identity moment of the entire flow.',
    technical: 'Agent signs HTTP request using Ed25519 private key. Signature-Input header specifies signed fields: @method, @target-uri, x-tap-agent-id, x-tap-intent, nonce, created. TAP fetches agent public key from Visa key directory (https://tap.visa.com/.well-known/agents/). Cloudflare behavioral analysis runs in parallel.',
    iso8583: '// HTTP Message Signature sent to TAP\nSignature-Input: tap-sig=(\n  "@method" "@target-uri" "@authority"\n  "x-tap-agent-id" "x-tap-consumer-token"\n  "x-tap-intent" "content-digest"\n);\n  keyid="skyfire-agent-001";\n  tag="tap-purchase";\n  created=1742518234;\n  nonce="a3f8c2e1d9b7"\n\nSignature: tap-sig=:MEQCIBx7zK...==:\nX-Tap-Agent-Id: skyfire-agent-001\nX-Tap-Intent: purchase'
  },
  {
    id: 'tap-issued',
    title: 'TAP issues signed credential',
    subtitle: 'JWT · TTL 90s · replay-protected',
    activeNodes: ['tap'],
    activeEdges: [],
    business: 'TAP verifies the cryptographic signature, checks the agent is registered, confirms the consumer\'s wallet covers this purchase, and issues a short-lived signed credential. The merchant will trust this credential without requiring any consumer interaction.',
    technical: 'TAP pipeline: DID signature verification → agent registry check → wallet policy enforcement → merchant allowlist → Visa risk score. Issues JWT signed with Visa Ed25519 private key. TTL=90s. Nonce stored to prevent replay. Payload includes consumer_recognized flag and payment_instruction_ref.',
    iso8583: '// TAP JWT payload (decoded)\n{\n  "iss": "tap.visa.com",\n  "sub": "skyfire-agent-001",\n  "aud": "jomashop",\n  "exp": 1742518324,     // 90s TTL\n  "iat": 1742518234,\n  "nonce": "a3f8c2e1d9b7",\n  "consumer_recognized": true,\n  "instruction_ref": "pi-abc123",\n  "amount": 89.99,\n  "currency": "USD",\n  "tap_version": "1.0"\n}'
  },
  {
    id: 'merchant-accepts',
    title: 'Merchant accepts — no CAPTCHA',
    subtitle: 'MerchantSDK · JWT validation · <80ms',
    activeNodes: ['tap', 'merchant'],
    activeEdges: ['e-tap-merchant'],
    business: 'The agent arrives at the merchant checkout with the TAP credential. The merchant\'s SDK validates the Visa-signed JWT, recognizes this as a returning customer\'s authorized agent, and skips all bot detection and checkout friction — accepting the order immediately.',
    technical: 'Agent sends HTTP POST to /checkout with Authorization: TAP-1.0 {jwt}. MerchantSDK: (1) extract JWT from header (2) fetch Visa public key from cache (5min TTL) (3) verify Ed25519 signature (4) check exp, nonce, aud claims (5) consumer_recognized=true → skip onboarding (6) create order in OMS (7) call acquirer PaymentIntent API.',
    iso8583: '// MerchantSDK verification\nPOST /checkout/complete\nAuthorization: TAP-1.0 eyJhbGci...\n\nconst payload = jwt.verify(token, visaPublicKey)\nassert(payload.exp > Date.now() / 1000)  // ✓\nassert(!nonceStore.has(payload.nonce))    // ✓\nassert(payload.aud === "jomashop")        // ✓\nassert(payload.amount === 89.99)         // ✓\n\n// → Order ID: JOM-2026-78234\n// → Proceed to payment'
  },
  {
    id: 'acquirer-iso8583',
    title: 'Acquirer sends modified ISO 8583',
    subtitle: 'F022=81 · F048=agent-id · F126=TAP-ref',
    activeNodes: ['merchant', 'acquirer'],
    activeEdges: ['e-merchant-acquirer'],
    business: 'Stripe packages the transaction and sends it to the Visa network. The critical difference from a human checkout: field F022 is set to 81 — a new value that signals to every downstream system "this was initiated by a verified AI agent, apply agent-specific risk rules."',
    technical: 'Acquirer calls VIC retrieve_payment_credentials({ instruction_ref: "pi-abc123" }) → receives tokenized VCN. Builds ISO 8583 MTI 0100. Key modifications: F002=agent-bound VCN (not real PAN), F022=81 (new agent-initiated POS entry mode), F048 appends agent-id, F126 carries TAP instruction_ref hash for VisaNet validation.',
    iso8583: 'ISO 8583 MTI: 0100\n─────────────────────────────────────\nF002: 4111xxxxxxxxAGNT  ← agent VCN  ★\nF003: 000000\nF004: 000000008999      ← $89.99\nF007: 0321143422\nF011: 000123            ← STAN\nF022: 81               ← agent-initiated ★\nF025: 59               ← agent present\nF041: AGNT-JOMASHOP-01\nF042: JOMASHOP-001\nF048: AGNT:skyfire-001  ← agent ID  ★\nF049: 840              ← USD\nF126: pi-abc123:sha256  ← TAP ref   ★'
  },
  {
    id: 'visanet-routes',
    title: 'VisaNet validates and routes',
    subtitle: 'VIC registry check · VTS de-tokenize · agent risk model',
    activeNodes: ['acquirer', 'visa'],
    activeEdges: ['e-acquirer-visa'],
    business: 'The Visa network receives the request, validates the TAP context against its payment instruction registry, de-tokenizes the VCN to find the issuing bank, and routes the authorization — this time using agent-aware fraud scoring instead of human behavioral models.',
    technical: 'VisaNet: (1) parse F022=81 → apply agent_risk_ruleset (2) validate F126 instruction_ref against VIC payment instruction registry — amount, merchant, currency must match stored instruction (3) VTS de-tokenize: VCN "4111xxxxAGNT" → real PAN → route to BIN (4) agent fraud score using behavioral baseline, not human patterns (5) forward 0100 to issuer.',
    iso8583: '// VisaNet internal validation\n1. F022=81 → apply_agent_rules()\n\n2. F126 validation:\n   stored = vic.get("pi-abc123")\n   assert(stored.hash == F126.hash)  ★\n   assert(stored.amount == F004)     ✓\n   assert(stored.merchant == F042)   ✓\n\n3. VTS lookup:\n   "4111xxxxAGNT" → "4111000000001111"\n   BIN 411100 → Chase Bank NA\n\n4. Forward 0100 to issuer\n   (F022=81 preserved in routing)'
  },
  {
    id: 'issuer-auth',
    title: 'Issuer applies agent spending policy',
    subtitle: 'F039 decision · passkey-validated controls · ~80ms',
    activeNodes: ['visa', 'issuer'],
    activeEdges: ['e-visa-issuer'],
    business: 'The consumer\'s bank receives the authorization. Because F022=81 is set, it applies the agent spending policy the consumer configured — not the standard human fraud model. Amount within limit. Category matches. Passkey assertion was validated when the consumer issued the payment instruction. Approved.',
    technical: 'Issuer receives 0100 with F022=81. Loads agent policy for token "4111xxxxAGNT": { limit: $500, categories: [5045, 5065, 5734], passkey_required: true, velocity_24h: $1000 }. Checks: (1) available_balance ≥ $89.99 ✓ (2) $89.99 ≤ $500 limit ✓ (3) MCC 5065 in allowed categories ✓ (4) velocity $89.99 ≤ $1000 ✓ (5) token_status active ✓. Returns F039=00.',
    iso8583: '// Issuer authorization log\ntoken_ref: "4111xxxxAGNT"\npolicy: { limit: $500, cat: [5065] }\n\nchecks:\n  balance:    $2847.33 >= $89.99  ✓\n  txn_limit:  $89.99 <= $500.00   ✓\n  velocity:   $89.99 <= $1000.00  ✓\n  category:   5065 in [5045,5065] ✓\n  token:      active              ✓\n  passkey:    verified at t-120s  ✓\n\ndecision: APPROVE\n\n// Response MTI 0110:\nF039: 00\nF038: 123456'
  },
  {
    id: 'settlement-complete',
    title: 'Authorized — funds reserved',
    subtitle: 'T+0 auth · T+1 clearing · commerce signal logged',
    activeNodes: ['issuer', 'visa', 'acquirer', 'agent'],
    activeEdges: ['e-issuer-return'],
    business: 'Consumer receives a push notification: "Skyfire bought Bose QC45 · $89.99 · authorized." No checkout page was visited. No card number was entered. No CAPTCHA was solved. Total elapsed time: 1,100ms.',
    technical: 'Issuer returns MTI 0110, F039=00, F038=auth_code. VisaNet echoes F126 with "agent-confirmed". Acquirer receives 0110, returns HTTP 200 to Stripe PaymentIntent. Merchant OMS triggers fulfillment. Agent receives tool_call result. VIC commerce signal submitted for dispute audit trail. T+1: clearing file sent, funds permanently deducted.',
    iso8583: '// Full response chain\nISO 8583 MTI: 0110\nF039: 00        ← approved  ★\nF038: 123456    ← auth code ★\nF126: agent-confirmed  ★\n\n// Agent tool response\n{\n  "payment_status": "approved",\n  "amount": 89.99,\n  "currency": "USD",\n  "auth_code": "123456",\n  "instruction_ref": "pi-abc123",\n  "settlement": "T+1",\n  "total_latency_ms": 1094\n}'
  }
]

const NODE_DEFS = {
  agent:    { x: 20,  y: 30,  w: 148, h: 74, label: 'AI Agent',    sub: 'Skyfire · Claude · GPT',     layer: 'Agent layer',   color: '#7c6fcd', colorLight: '#534AB7', fill: '#1e1a3a', fillLight: '#EEEDFE' },
  wallet:   { x: 20,  y: 158, w: 148, h: 74, label: 'AgentWallet', sub: 'VCN · spend policy',         layer: 'Agent layer',   color: '#7c6fcd', colorLight: '#534AB7', fill: '#1e1a3a', fillLight: '#EEEDFE' },
  tap:      { x: 228, y: 84,  w: 178, h: 74, label: 'Trusted Agent Protocol', sub: 'Visa + Cloudflare WBA', layer: 'Trust & identity', color: '#4a7fff', colorLight: '#185FA5', fill: '#1a2a4a', fillLight: '#E6F1FB' },
  merchant: { x: 468, y: 30,  w: 148, h: 74, label: 'Merchant',    sub: 'Shopify · Jomashop',        layer: 'Merchant',      color: '#4a7fff', colorLight: '#185FA5', fill: '#1a2a4a', fillLight: '#E6F1FB' },
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
