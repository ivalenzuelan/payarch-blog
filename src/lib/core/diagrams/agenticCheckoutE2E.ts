import type { PayarchDiagram } from '../index';

export const agenticCheckoutE2E: PayarchDiagram = {
  id: 'agentic-checkout-e2e',
  title: 'Agentic Checkout — End to End',
  description: 'Complete authorization flow for an AI agent-initiated purchase on the Visa network. From consumer intent to settled funds — TAP identity, agent-bound tokenization, ISO 8583 field modifications, issuer spending policy, and T+1 clearing.',
  version: '1.1.0',
  protocol: 'Visa Intelligent Commerce + Trusted Agent Protocol',
  settlementCycle: 'T+1',
  stepsOrder: [
    'consumer-intent',
    'tap-validation',
    'tap-credential-issued',
    'merchant-accepts',
    'acquirer-iso8583',
    'visanet-routes',
    'issuer-auth',
    'settlement-complete',
  ],

  nodes: [

    // ── AGENT LAYER ───────────────────────────────────────────────

    {
      id: 'n-agent-runtime',
      type: 'AgentRuntime',
      position: { x: 40, y: 60 },
      data: {
        label: 'AI Agent',
        sublabel: 'agent platform · Claude · GPT-4o',
        layer: 'agent',
        vendor: ['agent platform Labs (agent payment flow)', 'Anthropic Claude', 'OpenAI GPT-4o', 'Custom LLM'],
        properties: {
          runtime: 'LLM + tool executor',
          identity_protocol: 'agent payment platform over Visa TAP',
          consumer_did: 'did:web:skyfire.xyz:agent-001',
          trigger: 'natural language intent',
          tool_calls: ['browse_tool', 'search_tool', 'retrieve_payment_credentials', 'submit_commerce_signal'],
        },
        steps: {
          'consumer-intent': {
            stepId: 'consumer-intent',
            active: true,
            outgoingEdge: 'e-agent-to-tap',
            layerText: {
              business: 'The consumer tells their AI assistant "buy me the HEAD Delta Pro padel racket." The agent — built on agent platform or a platform like Claude — interprets the intent, resolves the product via a browse tool call, and checks the pre-authorized AgentWallet policy before proceeding. This is the last moment the human is involved until they receive the confirmation notification.',
              technical: 'AgentRuntime receives NL intent string. Invokes browse_tool() to resolve SKU, current price, and merchant URL. Checks AgentWallet policy object: { category: "sporting_goods" ✓, limit: $500 ✓, token_status: "active" ✓, passkey_bound: true }. Reads consumer_did from session context. Initiates TAP handshake by constructing signed DID credential for Visa endpoint.',
              iso8583: '// No ISO 8583 at this stage — intent is internal\n// Structured as a payment instruction object:\n{\n  "intent": "purchase",\n  "sku": "HEAD-DELTA-PRO",\n  "amount": 249.00,\n  "currency": "USD",\n  "merchant": "head.com",\n  "wallet_ref": "VCN-session-001",\n  "consumer_did": "did:web:skyfire.xyz:user-123",\n  "agent_id": "skyfire-agent-001"\n}',
            },
          },
          'tap-validation': {
            stepId: 'tap-validation',
            active: false,
            layerText: {
              business: 'The agent is waiting while Visa validates its cryptographic identity. No payment has been attempted yet — this step is purely about proving the agent is who it claims to be.',
              technical: 'Agent awaiting TAP JWT response from https://agent registry/v1/validate. Signed HTTP request is in flight with Signature-Input header containing Ed25519 signature over canonical request form.',
              iso8583: '// No ISO 8583 — TAP validation is HTTP layer\n// Agent request in flight:\nPOST https://agent registry/v1/validate\nSignature: tap-sig=:MEQCIBx7...:',
            },
          },
          'tap-credential-issued': {
            stepId: 'tap-credential-issued',
            active: false,
            layerText: {
              business: 'The agent now holds a 90-second TAP credential — a Visa-signed certificate that tells the merchant "this is a real, authorized agent, not a bot." The agent is about to use it at checkout.',
              technical: 'JWT stored in agent session context. TTL=short-lived. Agent will present this in the Authorization: TAP-1.0 header on the upcoming checkout POST request.',
              iso8583: '// TAP JWT in agent session memory:\n{ "tap_credential": "eyJhbGci...", "ttl": 90, "instruction_ref": "pi-abc123" }',
            },
          },
          'merchant-accepts': {
            stepId: 'merchant-accepts',
            active: true,
            outgoingEdge: 'e-agent-to-merchant',
            layerText: {
              business: 'The agent navigates to checkout and presents its TAP credential. The merchant sees a verified Visa agent — not a bot — and accepts the order without requiring any form filling, CAPTCHA, or user redirect.',
              technical: 'Agent constructs HTTP POST to merchant checkout endpoint. Sets Authorization: TAP-1.0 {jwt} header. Sends cart contents and instruction_ref. MerchantSDK validates JWT synchronously against cached Visa public key.',
              iso8583: 'POST https://head.com/checkout/complete\nAuthorization: TAP-1.0 eyJhbGci...\nContent-Type: application/json\n\n{\n  "items": [{"sku": "HEAD-DELTA-PRO", "qty": 1}],\n  "amount": 249.00,\n  "currency": "USD",\n  "instruction_ref": "pi-abc123",\n  "consumer_ref": "returning-customer-hash"\n}',
            },
          },
          'acquirer-iso8583': {
            stepId: 'acquirer-iso8583',
            active: false,
            layerText: {
              business: 'The merchant has accepted the order and is now processing payment through Stripe. The agent waits for authorization confirmation.',
              technical: 'Agent is idle. PaymentIntent created by merchant is being processed by Stripe/Adyen acquirer. Agent will receive tool_call result once authorization completes.',
              iso8583: '// Agent idle — acquirer is building ISO 8583 message\n// Agent will call submit_commerce_signal() once auth complete',
            },
          },
          'visanet-routes': {
            stepId: 'visanet-routes',
            active: false,
            layerText: {
              business: 'Authorization request is being validated by Visa and routed to the consumer\'s bank. The agent is waiting for the decision.',
              technical: 'Agent idle. card network is validating private instruction reference instruction_ref against VIC payment instruction registry and de-tokenizing VCN for issuer routing.',
              iso8583: '// Agent idle during card network routing\n// Expected response: { status: "approved", auth_code: "123456" }',
            },
          },
          'issuer-auth': {
            stepId: 'issuer-auth',
            active: false,
            layerText: {
              business: 'The consumer\'s bank is making the authorization decision against the spending policy the consumer configured when they set up the agent.',
              technical: 'Agent idle. Issuer is evaluating agent-context flag agent spending policy: balance, per-txn limit, MCC, velocity, token status.',
              iso8583: '// Agent idle during issuer evaluation\n// Policy check: { limit: $500, category: [5941], token: active }',
            },
          },
          'settlement-complete': {
            stepId: 'settlement-complete',
            active: true,
            layerText: {
              business: 'The consumer receives a push notification: "agent platform bought HEAD Delta Pro · $249.00 · authorized." No checkout page was visited. No card number was entered. No CAPTCHA was solved. Total time from "buy this" to confirmation: approximately 1.1 seconds.',
              technical: 'Agent receives VIC tool_call result: { payment_status: "approved", amount: 249.00, auth_code: "123456", agent_ref: "skyfire-txn-001", settlement: "T+1" }. Agent invokes submit_commerce_signal() to log outcome in VIC for dispute audit trail. Commerce signal is not optional — it enables dispute resolution.',
              iso8583: '// Agent tool_call result from VIC\n{\n  "payment_status": "approved",\n  "amount": 249.00,\n  "currency": "USD",\n  "auth_code": "123456",\n  "instruction_ref": "pi-abc123",\n  "agent_ref": "skyfire-txn-001",\n  "settlement": "T+1",\n  "total_latency_ms": 1094\n}\n\n// Agent submits commerce signal (required for disputes):\nawait vic.tools.submit_commerce_signal({\n  instruction_ref: "pi-abc123",\n  outcome: "success",\n  order_id: "head-order-78234"\n})',
            },
          },
        },
      },
    },

    {
      id: 'n-agent-wallet',
      type: 'AgentWallet',
      position: { x: 40, y: 220 },
      data: {
        label: 'AgentWallet',
        sublabel: 'VCN · spend policy',
        layer: 'agent',
        vendor: ['Visa Token Service', 'Issuer Bank'],
        properties: {
          token_type: 'Agent-specific network token (VCN)',
          spend_limit: '$500 / txn',
          categories: ['sporting goods (5941)'],
          expiry: 'session-scoped · passkey-revocable',
          passkey_bound: true,
          pan_exposure: 'never — tokenized only',
          provisioning: 'VIC enroll_card() + FIDO2 Passkey',
        },
        steps: {
          'consumer-intent': {
            stepId: 'consumer-intent',
            active: true,
            outgoingEdge: 'e-wallet-to-tap',
            layerText: {
              business: 'Before any shopping, the consumer enrolled their Visa card with the agent platform. Visa issued a Virtual Card Number bound exclusively to this agent. The real 16-digit card number never leaves Visa\'s Token Service — the agent never sees it, the merchant never sees it, the acquirer never sees it.',
              technical: 'Consumer called VIC enroll_card() API. Visa Token Service performed step-up verification (3DS or biometric) with issuer. Issued agent-specific pass-through token: { token: "4111xxxxAGNT", binding: { agent_id: "skyfire-001" }, controls: { limit_per_txn: 50000, categories: ["5941"], require_passkey: true } }. Consumer created FIDO2 Passkey on device. All future payment instructions require Passkey assertion.',
              iso8583: '// Token provisioning (one-time setup — not at checkout)\nPOST https://api.visa.com/vic/v1/tokens/enroll\n{\n  "agent_id": "skyfire-001",\n  "card_ref": "consumer-card-hash",\n  "controls": {\n    "limit_per_txn": 50000,  // cents: $500\n    "categories": ["5941"],\n    "velocity_daily": 100000, // cents: $1000\n    "require_passkey": true\n  }\n}\n// → { token_ref: "vts-AGNT-001", passkey_challenge: "...", status: "active" }',
            },
          },
          'tap-validation': {
            stepId: 'tap-validation',
            active: true,
            layerText: {
              business: 'The wallet\'s token reference is included in the TAP validation request, so Visa can confirm the token is active and within policy before issuing the credential.',
              technical: 'AgentWallet token_ref "vts-AGNT-001" included in TAP request payload. TAP service validates token is in active status and spending controls are within range for the requested amount.',
              iso8583: '// token_ref included in TAP validation request body\n{ "wallet_token_ref": "vts-AGNT-001", "amount": 249.00, "currency": "USD" }',
            },
          },
          'tap-credential-issued': {
            stepId: 'tap-credential-issued',
            active: true,
            layerText: {
              business: 'The wallet is confirmed active. The TAP JWT includes a reference to the wallet token so the acquirer knows which credential to retrieve at checkout.',
              technical: 'TAP JWT payload includes wallet_token_ref claim. This reference will be used by the agent to call retrieve_payment_credentials() after merchant accepts the order.',
              iso8583: '// TAP JWT claim referencing wallet:\n{ ..., "wallet_token_ref": "vts-AGNT-001", "instruction_ref": "pi-abc123" }',
            },
          },
          'merchant-accepts': {
            stepId: 'merchant-accepts',
            active: false,
            layerText: {
              business: 'The wallet is ready. The agent will retrieve the tokenized VCN immediately after the merchant accepts the order.',
              technical: 'Wallet token is in active state. retrieve_payment_credentials() will be called with instruction_ref "pi-abc123" once merchant order is created.',
              iso8583: '// Wallet token is pre-authorized — waiting for merchant order creation\n// Token: "4111xxxxAGNT" · Status: active · TTL: session',
            },
          },
          'acquirer-iso8583': {
            stepId: 'acquirer-iso8583',
            active: true,
            layerText: {
              business: 'The VCN token is retrieved from Visa and handed to Stripe as the payment credential. The consumer\'s real card number never leaves Visa\'s systems.',
              technical: 'Agent calls VIC retrieve_payment_credentials({ instruction_ref: "pi-abc123", tap_context: signedContext }). VIC returns: { tokenized_pan: "4111xxxxAGNT", expiry: "12/27", cvv_token: "..." }. This VCN is placed in F002 of the ISO 8583 message by the acquirer.',
              iso8583: '// VIC credential retrieval\nawait vic.tools.retrieve_payment_credentials({\n  instruction_ref: "pi-abc123"\n})\n// Returns:\n{\n  "tokenized_pan": "4111xxxxAGNT",  // ← placed in F002\n  "expiry": "12/27",\n  "cvv_token": "..."\n}\n// Real PAN stored only in Visa VTS — never leaves',
            },
          },
          'visanet-routes': {
            stepId: 'visanet-routes',
            active: true,
            layerText: {
              business: 'card network de-tokenizes the VCN to route to the correct issuing bank. The consumer\'s real account is now being evaluated — but only inside Visa\'s secure network.',
              technical: 'Visa Token Service performs VCN lookup: "4111xxxxAGNT" → real PAN "4111000000001111" → BIN 411100 → route to Chase. Agent binding validated against private instruction reference instruction_ref. De-tokenization is internal — real PAN never appears in any external message.',
              iso8583: '// Internal VTS operation (not visible in wire format):\nVCN "4111xxxxAGNT"\n  → real PAN: "4111000000001111"\n  → BIN: 411100\n  → Issuer: Chase Bank NA\n  → Route: card network leased line to issuer\n// Agent binding: validated via private instruction reference ✓',
            },
          },
          'issuer-auth': {
            stepId: 'issuer-auth',
            active: true,
            layerText: {
              business: 'The issuing bank checks the token against the agent spending policy the consumer configured. Amount within limit. Category matches retail. Token active. Approved.',
              technical: 'Issuer loads agent spending policy for token "4111xxxxAGNT". Validates: balance ≥ amount ✓, amount ≤ $500 limit ✓, MCC 5941 in [5941] ✓, velocity within daily limit ✓, token active ✓, passkey assertion validated at instruction-creation time ✓.',
              iso8583: '// Issuer token policy evaluation\ntoken_ref: "vts-AGNT-001"\nchecks:\n  balance:    $2847.33 >= $249.00  ✓\n  per_txn:    $249.00 <= $500.00   ✓\n  velocity:   $249.00 <= $1000/day ✓\n  category:   5941 in policy list ✓\n  status:     active              ✓\n  passkey:    verified at t-120s  ✓\ndecision: APPROVE → F039: 00',
            },
          },
          'settlement-complete': {
            stepId: 'settlement-complete',
            active: true,
            layerText: {
              business: 'Funds reserved on the consumer\'s account. The token remains active for future purchases within policy. T+1 clearing will permanently debit the account the next business day.',
              technical: 'Issuer posts $249.00 authorization hold. T+1: Visa sends clearing file (MTI 0220). Issuer converts hold to permanent debit. VTS token lifecycle updated — token remains active unless consumer revokes. Commerce signal in VIC creates 120-day dispute audit trail.',
              iso8583: '// T+1 clearing message (MTI 0220):\nF002: 4111xxxxxxxxAGNT  ← VCN\nF004: 000000024900      ← $249.00\nF038: 123456            ← matches auth code\nF039: 00               ← confirmed\n// Hold converted to permanent debit\n// VTS token: remains active for future txns',
            },
          },
        },
      },
    },

    // ── TRUST & IDENTITY LAYER ────────────────────────────────────

    {
      id: 'n-tap',
      type: 'TrustedAgentProtocol',
      position: { x: 260, y: 140 },
      data: {
        label: 'Trusted Agent Protocol',
        sublabel: 'Visa TAP + Cloudflare WBA',
        layer: 'trust',
        vendor: ['Visa (TAP)', 'Cloudflare (Web Bot Auth)', 'edge security (behavioral)', 'agent platform (agent payment flow)'],
        properties: {
          standard: 'HTTP Message Signatures — IETF RFC 9421',
          algorithm: 'Ed25519 (primary) · RSA-PSS (fallback)',
          key_directory: 'https://agent registry/public-key registry/',
          token_ttl: 'short-lived — nonce-protected',
          replay_protection: 'nonce store + 60s timestamp window',
          latency: '40–80ms',
          behavioral_layer: 'Cloudflare edge + edge security bot intelligence',
          open_source: 'developer.visa.com · github.com/visa/trusted-agent-protocol',
          partners: 'Microsoft, Shopify, Stripe, Worldpay, Adyen, Nuvei',
        },
        steps: {
          'consumer-intent': {
            stepId: 'consumer-intent',
            active: false,
            layerText: {
              business: 'TAP is idle — the agent hasn\'t made a request yet. At this point the consumer is just issuing a natural language command to their AI assistant.',
              technical: 'TAP endpoint at https://agent registry/v1/validate is waiting. Agent has not yet sent the signed HTTP request. TAP key directory is pre-populated with the agent\'s Ed25519 public key from initial registration.',
              iso8583: '// TAP not yet involved\n// Agent registration (one-time, at agent onboarding):\nPOST https://agent registry/v1/agents/register\n{\n  "agent_id": "skyfire-agent-001",\n  "public_key": "ed25519:MCowBQYDK2Vd...",\n  "agent_name": "agent platform Shopping Assistant",\n  "operator": "agent platform Labs Inc"\n}',
            },
          },
          'tap-validation': {
            stepId: 'tap-validation',
            active: true,
            incomingEdge: 'e-agent-to-tap',
            outgoingEdge: 'e-tap-validates',
            layerText: {
              business: 'This is the critical trust moment of the entire flow. TAP verifies three things simultaneously: the agent is Visa-registered, the request is cryptographically signed by that specific agent, and the request has not been seen before (replay protection). A malicious bot cannot pass this check — it cannot forge the signature without the private key.',
              technical: 'TAP receives signed HTTP request. Fetches agent public key from key directory (cached, 5min TTL). Reconstructs canonical signature base from Signature-Input header fields. Verifies Ed25519 signature. Validates: nonce not in store ✓, created within 60s ✓, agent_id in registry ✓, tag="tap-purchase" ✓. Cloudflare behavioral analysis runs in parallel: request patterns ✓, TLS fingerprint ✓, velocity ✓.',
              iso8583: '// Signed HTTP request from agent platform agent:\nGET https://head.com/product/head-delta-pro\nHost: head.com\nSignature-Input: tap-sig=(\n  "@method" "@target-uri" "@authority"\n  "content-digest" "x-tap-agent-id"\n  "x-tap-consumer-token" "x-tap-intent"\n);\n  keyid="skyfire-agent-001";\n  tag="tap-purchase";\n  created=1742518234;\n  nonce="a3f8c2e1d9b7"\n\nSignature: tap-sig=:MEQCIBx7zK...==:\nX-Tap-Agent-Id: skyfire-agent-001\nX-Tap-Intent: purchase\nX-Tap-Consumer-Token: eyJhbGciOiJFUzI1NiJ9...',
            },
          },
          'tap-credential-issued': {
            stepId: 'tap-credential-issued',
            active: true,
            outgoingEdge: 'e-tap-to-merchant',
            layerText: {
              business: 'TAP issues a short-lived credential — a Visa-signed JWT valid for exactly short-lived, tied to this specific transaction, merchant, and amount. This is the "VIP pass" the agent will present at checkout. The merchant will trust it without requiring any consumer interaction.',
              technical: 'TAP generates JWT signed with Visa\'s Ed25519 private key. Stores nonce "a3f8c2e1d9b7" in nonce registry to prevent reuse. Registers payment instruction in VIC registry. JWT payload includes: agent_id, consumer_recognized flag, instruction_ref, merchant_id, amount, exp (now+90), nonce. Returns JWT to agent.',
              iso8583: '// TAP JWT issued — decoded payload:\n{\n  "iss": "agent registry",\n  "sub": "skyfire-agent-001",\n  "aud": "head.com",\n  "exp": 1742518324,     // T+short-lived ★\n  "iat": 1742518234,\n  "nonce": "a3f8c2e1d9b7",  // replay-protected ★\n  "consumer_recognized": true,\n  "instruction_ref": "pi-abc123",  // → private instruction reference downstream\n  "amount": 249.00,\n  "currency": "USD",\n  "tap_version": "1.0",\n  "risk_score": 12\n}',
            },
          },
          'merchant-accepts': {
            stepId: 'merchant-accepts',
            active: false,
            layerText: {
              business: 'TAP has done its job — the credential has been issued and delivered to the agent. Now the merchant\'s SDK validates it locally.',
              technical: 'TAP endpoint idle. Merchant SDK performing local JWT verification using cached Visa public key. No further TAP calls needed for this transaction.',
              iso8583: '// TAP credential delivered to agent session\n// Merchant performing local verification:\nconst visaKey = await keyCache.get("agent registry")\nconst payload = jwt.verify(credential, visaKey)\n// If valid → accept order',
            },
          },
          'acquirer-iso8583': {
            stepId: 'acquirer-iso8583',
            active: false,
            layerText: {
              business: 'The TAP instruction reference (pi-abc123) is now embedded in the ISO 8583 message as field private instruction reference, linking the payment to the original consumer authorization.',
              technical: 'TAP instruction_ref "pi-abc123" extracted from JWT payload and placed in ISO 8583 private instruction reference as SHA-256 hash. This enables card network to validate payment integrity.',
              iso8583: '// TAP instruction_ref appears in ISO 8583:\nprivate instruction reference: pi-abc123:sha256:3a7f...  ← TAP context in payment message\n// card network will validate this against its registry',
            },
          },
          'visanet-routes': {
            stepId: 'visanet-routes',
            active: true,
            layerText: {
              business: 'card network validates the TAP context by checking that the instruction reference in the payment message matches what was originally authorized by the consumer. If someone tampered with the amount or merchant in transit, this check fails.',
              technical: 'VIC validates private instruction reference instruction_ref hash against payment instruction registry. Checks: stored_instruction.hash == private instruction reference.hash ✓, stored_instruction.amount == F004 ($249.00) ✓, stored_instruction.merchant == F042 (head.com) ✓. Any mismatch → decline with a decline.',
              iso8583: '// card network private instruction reference integrity check:\nstored = vic.get_instruction("pi-abc123")\nassert(sha256(stored) == private instruction reference.hash)    // ★ critical\nassert(stored.amount == F004_amount)   // $249.00 == $249.00 ✓\nassert(stored.merchant == F042_id)     // head.com ✓\n// If any mismatch: F039=58 (invalid terminal) → decline',
            },
          },
          'issuer-auth': {
            stepId: 'issuer-auth',
            active: false,
            layerText: {
              business: 'TAP\'s role is complete. The issuer is now making its authorization decision based on the agent spending policy.',
              technical: 'TAP validation is complete. Issuer is processing agent-context flag agent spending policy evaluation independently.',
              iso8583: '// TAP context validated — issuer processing agent-context flag\n// TAP reference echoed in response: private instruction reference=agent-confirmed',
            },
          },
          'settlement-complete': {
            stepId: 'settlement-complete',
            active: false,
            layerText: {
              business: 'TAP\'s nonce for this transaction is permanently stored, preventing any replay of this credential.',
              technical: 'Nonce "a3f8c2e1d9b7" permanently stored in TAP nonce registry. JWT has expired (TTL=short-lived). Transaction complete.',
              iso8583: '// TAP nonce permanently stored:\nnonce_store.add("a3f8c2e1d9b7")  // permanent, no expiry\n// JWT expired at T+short-lived — cannot be reused',
            },
          },
        },
      },
    },

    // ── MERCHANT LAYER ────────────────────────────────────────────

    {
      id: 'n-merchant',
      type: 'MerchantSDK',
      position: { x: 480, y: 60 },
      data: {
        label: 'Merchant',
        sublabel: 'HEAD.com · Shopify · Jomashop',
        layer: 'merchant',
        vendor: ['HEAD.com (direct)', 'Shopify (TAP native)', 'WooCommerce', 'Rye Checkout API'],
        properties: {
          tap_integration: 'no-code SDK embed or library',
          bot_protection: 'Cloudflare WBA + edge security edge',
          agent_accept: 'TAP-verified agents only',
          checkout_api: 'Rye · Shopify Storefront API',
          consumer_recognition: 'consumer_recognized flag from TAP JWT',
          human_checkout: 'unchanged — parallel path',
        },
        steps: {
          'consumer-intent': {
            stepId: 'consumer-intent',
            active: false,
            layerText: {
              business: 'The merchant is unaware of this transaction at this point. The agent may be browsing the product catalog, but no checkout has been initiated.',
              technical: 'Agent may have issued GET requests to product catalog API. No order created yet. Merchant WAF has already seen the agent\'s signed HTTP requests and passed them (Cloudflare WBA recognized the agent signature).',
              iso8583: '// No merchant activity at this stage\n// Agent may have called catalog API:\nGET https://head.com/api/products/head-delta-pro\n// Merchant WAF: TAP signature detected → not a bot → allow',
            },
          },
          'tap-validation': {
            stepId: 'tap-validation',
            active: false,
            layerText: {
              business: 'Merchant is waiting. TAP validation is happening at Visa — the merchant is not involved until it receives the checkout request.',
              technical: 'Merchant infrastructure idle for this transaction. TAP validation is a Visa-side operation. Merchant\'s Cloudflare integration provides behavioral analysis independently.',
              iso8583: '// Merchant waiting — TAP validation is Visa-side\n// Merchant Cloudflare config:\n// IF signature_valid(request) → bypass_captcha()\n// IF tag="tap-purchase" → accept_agent_checkout()',
            },
          },
          'tap-credential-issued': {
            stepId: 'tap-credential-issued',
            active: false,
            layerText: {
              business: 'The TAP credential is traveling from Visa to the agent. The merchant is about to receive a checkout request.',
              technical: 'JWT is in agent session memory. Merchant checkout endpoint is about to receive the POST request with Authorization: TAP-1.0 header.',
              iso8583: '// Merchant about to receive checkout request\n// TAP SDK pre-loaded with Visa public key (cached)\n// Ready to validate incoming JWT',
            },
          },
          'merchant-accepts': {
            stepId: 'merchant-accepts',
            active: true,
            incomingEdge: 'e-agent-to-merchant',
            outgoingEdge: 'e-merchant-to-acquirer',
            layerText: {
              business: 'The merchant\'s checkout system receives the agent\'s request. The TAP SDK validates the Visa-signed credential in milliseconds, recognizes this is a returning customer\'s authorized agent, and creates the order — no form, no CAPTCHA, no redirect. This is what "frictionless agent checkout" means in practice.',
              technical: 'MerchantSDK validates JWT: (1) extract from Authorization header (2) fetch Visa public key from 5min cache (3) verify Ed25519 signature (4) check exp > now ✓, nonce not in store ✓, aud === "head.com" ✓, amount === 249.00 ✓ (5) consumer_recognized=true → skip new-customer onboarding (6) create order ID in OMS (7) call Stripe PaymentIntent API with tokenized PAN.',
              iso8583: '// MerchantSDK JWT verification\nconst jwt = req.headers.authorization.replace("TAP-1.0 ", "")\nconst key = await keyCache.get("agent registry")  // 5min TTL\nconst p = jwt.verify(jwt, key)\n\nassert(p.exp > Date.now() / 1000)    // not expired  ✓\nassert(!nonceStore.has(p.nonce))      // not replayed ✓\nassert(p.aud === "head.com")          // correct site ✓\nassert(p.amount === 249.00)            // amount match ✓\n\n// consumer_recognized: true → skip onboarding\n// → Order created: HEAD-2026-78234\n// → Call Stripe PaymentIntent',
            },
          },
          'acquirer-iso8583': {
            stepId: 'acquirer-iso8583',
            active: false,
            layerText: {
              business: 'Order has been created. The merchant is waiting for Stripe to return payment confirmation before fulfilling.',
              technical: 'Stripe PaymentIntent created. Merchant OMS order status: "pending_payment". Waiting for HTTP 200 from Stripe with auth_code.',
              iso8583: '// Merchant OMS state:\n{\n  "order_id": "HEAD-2026-78234",\n  "status": "pending_payment",\n  "payment_intent": "pi_abc...",\n  "amount": 249.00\n}',
            },
          },
          'visanet-routes': {
            stepId: 'visanet-routes',
            active: false,
            layerText: {
              business: 'Authorization request is routing through Visa. Merchant is waiting for payment confirmation.',
              technical: 'PaymentIntent in Stripe: status "requires_capture". Waiting for card network authorization response.',
              iso8583: '// Stripe PaymentIntent: requires_capture\n// Waiting for card network → Issuer → response chain',
            },
          },
          'issuer-auth': {
            stepId: 'issuer-auth',
            active: false,
            layerText: {
              business: 'Issuer is making the authorization decision. Merchant waiting for confirmation.',
              technical: 'Awaiting issuer 0110 response. Stripe webhook will fire once response received.',
              iso8583: '// Awaiting issuer decision\n// Stripe: payment_intent.status = "processing"',
            },
          },
          'settlement-complete': {
            stepId: 'settlement-complete',
            active: true,
            layerText: {
              business: 'Authorization approved. Merchant triggers fulfillment. Product will ship with standard delivery. No checkout abandonment, no failed CAPTCHA, no re-entry of credentials. The checkout experience from the merchant\'s perspective was identical to a normal returning customer — except it happened in 1.1 seconds with no human involved.',
              technical: 'Stripe returns HTTP 200 with PaymentIntent.status="succeeded" and auth_code="123456". Merchant OMS updates order to "payment_captured". Fulfillment webhook fired. Shipment created.',
              iso8583: '// Merchant receives authorization confirmation\n// Stripe PaymentIntent response:\n{\n  "status": "succeeded",\n  "amount": 8999,\n  "auth_code": "123456",\n  "payment_method": "card"\n}\n// Merchant OMS: order_status → "payment_captured"\n// Fulfillment triggered → shipment created',
            },
          },
        },
      },
    },

    // ── PAYMENT RAILS LAYER ───────────────────────────────────────

    {
      id: 'n-acquirer',
      type: 'AcquirerGateway',
      position: { x: 480, y: 240 },
      data: {
        label: 'Acquirer',
        sublabel: 'Stripe · Adyen · Fiserv',
        layer: 'rails',
        vendor: ['Stripe', 'Adyen', 'Fiserv', 'Worldpay', 'Checkout.com'],
        properties: {
          protocol: 'ISO 8583 MTI 0100/0110',
          token_format: 'Agent-specific network token (VCN)',
          key_modifications: 'F002=VCN · agent-context flag · F048=agent-id · private instruction reference=TAP-ref',
          connection: 'card network leased line / dedicated API',
          message_encryption: 'TLS 1.3 + message-level encryption (MLE)',
        },
        steps: {
          'consumer-intent': {
            stepId: 'consumer-intent',
            active: false,
            layerText: {
              business: 'The acquirer is not involved yet. Payment processing hasn\'t started.',
              technical: 'Acquirer is idle. No PaymentIntent created. Acquirer will be invoked by merchant after TAP validation completes.',
              iso8583: '// Acquirer not yet involved\n// Will be called after merchant receives TAP JWT\n// Integration: Stripe PaymentIntents API → ISO 8583',
            },
          },
          'tap-validation': {
            stepId: 'tap-validation',
            active: false,
            layerText: {
              business: 'Acquirer not involved in TAP validation. That happens between the agent and Visa directly.',
              technical: 'Acquirer idle. TAP is a pre-payment identity layer, separate from the acquiring path.',
              iso8583: '// Acquirer not involved in TAP\n// TAP is HTTP-layer identity — separate from ISO 8583 path',
            },
          },
          'tap-credential-issued': {
            stepId: 'tap-credential-issued',
            active: false,
            layerText: {
              business: 'Acquirer not yet involved. Credential is being delivered to the agent.',
              technical: 'Acquirer idle. Will be invoked once merchant creates a PaymentIntent after order acceptance.',
              iso8583: '// Acquirer standing by\n// Will receive tokenized_pan from VIC retrieve_payment_credentials()',
            },
          },
          'merchant-accepts': {
            stepId: 'merchant-accepts',
            active: false,
            layerText: {
              business: 'The merchant has just accepted the order and is about to send a payment request to Stripe.',
              technical: 'Merchant calling Stripe PaymentIntents.create() with tokenized_pan from VIC. Acquirer about to receive the request.',
              iso8583: '// Stripe PaymentIntents.create():\n{\n  "amount": 8999,\n  "currency": "usd",\n  "payment_method_data": {\n    "type": "card",\n    "card": { "number": "4111xxxxAGNT", "exp_month": 12, "exp_year": 27 }\n  },\n  "metadata": { "agent": "true", "tap_ref": "pi-abc123" }\n}',
            },
          },
          'acquirer-iso8583': {
            stepId: 'acquirer-iso8583',
            active: true,
            incomingEdge: 'e-merchant-to-acquirer',
            outgoingEdge: 'e-acquirer-to-visa',
            layerText: {
              business: 'Stripe packages the payment request into an ISO 8583 authorization message and sends it to the Visa network. The single most important change from a standard human transaction: field F022 is set to 81, a new value that tells every downstream system "this was initiated by a verified AI agent — apply agent-specific rules."',
              technical: 'Acquirer retrieves VCN tokenized_pan from VIC retrieve_payment_credentials() call. Builds ISO 8583 MTI 0100: F002=VCN "4111xxxxAGNT", agent-context flag (new agent-initiated POS entry mode), private condition field=59 (agent present), F048 appends agent-id "AGNT:skyfire-001", private instruction reference carries SHA-256 hash of TAP instruction_ref "pi-abc123". Sends via card network leased line.',
              iso8583: 'ISO 8583 MTI: 0100  (Authorization Request)\n──────────────────────────────────────────────\nF002: 4111xxxxxxxxAGNT   ← agent VCN (not real PAN) ★\nF003: 000000             ← purchase\nF004: 000000024900       ← $249.00\nF007: 0321143422         ← datetime\nF011: 000123             ← STAN (sequence)\nF012: 143422             ← local time\nF022: agent-context (illustrative)                 ← POS entry: agent-initiated ★\nprivate condition field: 59                 ← POS condition: agent present\nF037: 000123143422       ← retrieval ref\nF041: AGNT-HEAD-COM-01   ← terminal ID\nF042: HEAD-MERCH-00001   ← merchant ID\nF043: HEAD.com US        ← merchant name/location\nF048: AGNT:skyfire-001   ← agent identifier ★\nF049: 840               ← USD\nF054: 010               ← addl amounts\nprivate instruction reference: pi-abc123:sha256:3a7f... ← TAP instruction_ref ★',
            },
          },
          'visanet-routes': {
            stepId: 'visanet-routes',
            active: false,
            layerText: {
              business: 'Acquirer is waiting for the authorization response from card network.',
              technical: 'Acquirer connection to card network is in a synchronous request-response state. Awaiting MTI 0110.',
              iso8583: '// Acquirer awaiting MTI 0110 response\n// Connection: synchronous · Timeout: 30s\n// Expected: F039=00 (approved) or decline code',
            },
          },
          'issuer-auth': {
            stepId: 'issuer-auth',
            active: false,
            layerText: {
              business: 'Authorization request has reached the issuing bank. Acquirer waiting for the response.',
              technical: 'Acquirer idle. Issuer processing agent-context flag agent policy check. Response will flow back Issuer → card network → Acquirer.',
              iso8583: '// Awaiting issuer response\n// Response chain: Issuer 0110 → card network → Acquirer',
            },
          },
          'settlement-complete': {
            stepId: 'settlement-complete',
            active: true,
            layerText: {
              business: 'Authorization approved. Acquirer returns confirmation to the merchant. T+1 clearing will permanently settle the funds.',
              technical: 'Acquirer receives MTI 0110, F039=00, F038=auth_code "123456". private instruction reference echoed with "agent-confirmed". Passes HTTP 200 to Stripe. Stripe fires webhook to merchant. Clearing file submitted to card network for T+1 settlement.',
              iso8583: 'ISO 8583 MTI: 0110  (Authorization Response)\n──────────────────────────────────────────────\nF002: 4111xxxxxxxxAGNT    ← echoed\nF004: 000000024900        ← echoed\nF011: 000123              ← STAN echoed\nF037: 000123143422        ← retrieval ref\nF038: 123456              ← authorization code ★\nF039: 00                  ← response: approved  ★\nF048: AGNT:skyfire-001    ← echoed\nprivate instruction reference: agent-confirmed     ← TAP echo ★\n// Acquirer → Stripe → merchant webhook\n// Total card network round-trip: ~180ms',
            },
          },
        },
      },
    },

    {
      id: 'n-visa',
      type: 'card networkwork',
      position: { x: 660, y: 128 },
      data: {
        label: 'Visa Network',
        sublabel: 'VIC · card network · VTS',
        layer: 'rails',
        vendor: ['Visa Intelligent Commerce (VIC)', 'card network', 'Visa Token Service (VTS)'],
        properties: {
          platform: 'Visa Intelligent Commerce',
          token_service: 'Visa Token Service (VTS)',
          tap_validation: 'Payment instruction registry',
          fraud_model: 'agent-context flag → agent-specific risk rules',
          throughput: '65,000–83,000 transactions/second',
          uptime: '99.999%',
          fraud_blocked_2023: '$40B+',
          data_points_per_txn: '500+',
          mcp_server: 'Visa AI examples and documentation tooling',
        },
        steps: {
          'consumer-intent': {
            stepId: 'consumer-intent',
            active: false,
            layerText: {
              business: 'card network is idle for this transaction. In the background, VIC has the consumer\'s pre-authorized payment instruction stored, ready to validate when the payment message arrives.',
              technical: 'VIC payment instruction registry has stored: { instruction_ref: "pi-abc123", consumer: hashed, merchant: "head.com", amount: 249.00, status: "authorized", ttl: 300s }. Stored when consumer issued Passkey-authenticated instruction.',
              iso8583: '// Payment instruction pre-stored in VIC:\nvic.store_instruction({\n  ref: "pi-abc123",\n  amount: 249.00,\n  currency: "USD",\n  merchant: "head.com",\n  consumer_hash: sha256(consumer_did),\n  passkey_assertion: verified,\n  ttl: 300\n})',
            },
          },
          'tap-validation': {
            stepId: 'tap-validation',
            active: true,
            layerText: {
              business: 'Visa is running the TAP validation — checking the agent\'s cryptographic identity, issuing the credential, and registering the payment instruction for later validation.',
              technical: 'VIC TAP service handling validation request. Separate service from card network authorization path. Key directory at https://agent registry/public-key registry/ serving agent public keys.',
              iso8583: '// TAP service (separate from card network auth path):\n// 1. Key directory lookup: GET public-key registry/skyfire-agent-001\n//    → { public_key: "ed25519:MCowBQY...", status: "active" }\n// 2. Signature verification: OK\n// 3. Register instruction in VIC registry\n// 4. Issue JWT to agent',
            },
          },
          'tap-credential-issued': {
            stepId: 'tap-credential-issued',
            active: true,
            layerText: {
              business: 'Visa has signed and issued the TAP credential. The payment instruction is now registered in VIC\'s registry. When the ISO 8583 message arrives with private instruction reference, card network will validate it against this stored instruction.',
              technical: 'TAP JWT issued and signed with Visa private key. Payment instruction stored in VIC with TTL=300s. Nonce "a3f8c2e1d9b7" stored in nonce registry. VIC is now ready to validate private instruction reference when the ISO 8583 message arrives.',
              iso8583: '// VIC state after TAP credential issuance:\nvic.registry["pi-abc123"] = {\n  hash: sha256("pi-abc123"),   // → will appear in private instruction reference\n  amount: 249.00,\n  merchant: "head.com",\n  agent_id: "skyfire-agent-001",\n  consumer_hash: "...",\n  status: "pending",\n  expires_at: now + 300\n}',
            },
          },
          'merchant-accepts': {
            stepId: 'merchant-accepts',
            active: false,
            layerText: {
              business: 'card network not yet involved in the payment flow. Merchant is processing the TAP credential locally.',
              technical: 'card network idle. VIC payment instruction registry is waiting for the private instruction reference match.',
              iso8583: '// card network idle — payment not yet submitted\n// VIC registry: instruction "pi-abc123" = pending\n// Waiting for ISO 8583 0100 with private instruction reference',
            },
          },
          'acquirer-iso8583': {
            stepId: 'acquirer-iso8583',
            active: false,
            layerText: {
              business: 'The ISO 8583 authorization message is traveling from Stripe to card network over the dedicated leased line.',
              technical: 'card network is about to receive MTI 0100. VIC registry is ready with instruction "pi-abc123" for private instruction reference validation.',
              iso8583: '// ISO 8583 0100 in transit\n// card network receiving connection from Stripe acquirer\n// VIC registry standing by for private instruction reference validation',
            },
          },
          'visanet-routes': {
            stepId: 'visanet-routes',
            active: true,
            incomingEdge: 'e-acquirer-to-visa',
            outgoingEdge: 'e-visa-to-issuer',
            layerText: {
              business: 'card network receives the authorization request, validates the agent context, confirms the payment matches the original consumer authorization, de-tokenizes the VCN, and routes to the issuing bank — all in under 100ms. If the amount or merchant was tampered with in transit, this step rejects it.',
              technical: 'card network processes MTI 0100: (1) Parse agent-context flag → apply agent_risk_ruleset instead of human fraud model (2) validate private instruction reference: stored_instruction.hash == private instruction reference.hash ✓, amount ✓, merchant ✓ — any mismatch → F039=58 decline (3) VTS de-tokenize: "4111xxxxAGNT" → real PAN "4111000000001111" → BIN 411100 (4) agent fraud score: behavioral baseline for agent-context flag transactions (5) forward 0100 to Chase with agent-context flag preserved.',
              iso8583: '// card network processing pipeline:\n1. agent-context flag detected:\n   → switch(risk_model) to agent_ruleset\n\n2. private instruction reference integrity check:\n   stored = vic.get("pi-abc123")\n   assert(sha256(stored) == private instruction reference.hash)  ★\n   assert(stored.amount == F004)         ✓\n   assert(stored.merchant == F042)       ✓\n   // Any mismatch → F039=58 (decline)\n\n3. VTS de-tokenize:\n   "4111xxxxAGNT" → "4111000000001111"\n   BIN 411100 → Chase Bank NA\n\n4. Agent fraud score:\n   input_features: [agent-context flag, velocity, geo, BIN]\n   model: agent_classifier_v3\n   score: 12/100 (low risk ✓)\n\n5. Forward 0100 to Chase\n   agent-context flag preserved',
            },
          },
          'issuer-auth': {
            stepId: 'issuer-auth',
            active: false,
            layerText: {
              business: 'card network has forwarded the request to the issuing bank and is waiting for the authorization decision.',
              technical: 'card network in request-response state with issuer. Awaiting MTI 0110 with F039 response code.',
              iso8583: '// card network awaiting issuer response\n// Forwarded 0100 to Chase with agent fields intact\n// Expecting: F039=00 (approve) or decline code',
            },
          },
          'settlement-complete': {
            stepId: 'settlement-complete',
            active: true,
            layerText: {
              business: 'Transaction approved. card network returns the authorization code to the acquirer and logs the transaction in VIC for commerce signals. T+1 clearing will settle the funds permanently.',
              technical: 'card network receives 0110 F039=00 F038=123456 from Chase. Adds F038 auth code. Echoes private instruction reference with "agent-confirmed". Forwards 0110 to acquirer. Logs completed transaction in VIC for commerce signal matching. Sends clearing record to clearing system for T+1 settlement. VIC instruction status updated: "completed".',
              iso8583: '// card network processes issuer response:\nReceived from Chase:\n  F039: 00, F038: 123456\n\n// Add private instruction reference echo:\nprivate instruction reference: agent-confirmed  // ← audit proof\n\n// Forward 0110 to acquirer\n// VIC: update instruction "pi-abc123" → completed\n// Clearing: add to T+1 file\n\n// Total card network processing time: ~100ms\n// Total round-trip (acquirer → issuer → back): ~180ms',
            },
          },
        },
      },
    },

    {
      id: 'n-issuer',
      type: 'IssuerAuthEngine',
      position: { x: 660, y: 240 },
      data: {
        label: 'Issuer Bank',
        sublabel: 'Chase · Amex · Barclays',
        layer: 'rails',
        vendor: ['Chase Bank NA', 'Bank of America', 'American Express', 'Barclays', 'BBVA'],
        properties: {
          decision_factors: 'balance · agent policy · velocity · agent-context flag rules',
          agent_spending_policy: 'pre-loaded from VIC at token provisioning',
          passkey_validation: 'FIDO2 assertion verified at instruction-creation time',
          risk_model: 'agent-context flag triggers agent-specific ruleset — not human model',
          response_time: '~80ms average',
          dispute_window: '120 days · VIC commerce signals as evidence',
        },
        steps: {
          'consumer-intent': {
            stepId: 'consumer-intent',
            active: false,
            layerText: {
              business: 'The issuer stored the agent spending policy when the consumer enrolled their card with the agent platform. Everything is pre-loaded.',
              technical: 'Issuer has stored agent policy object for token "4111xxxxAGNT": { limit_per_txn: $500, categories: [5941], velocity_daily: $1000, require_passkey: true, status: "active" }. Policy was loaded when VTC provisioned the agent token.',
              iso8583: '// Issuer agent policy (pre-loaded at token provisioning):\ntoken_policy["4111xxxxAGNT"] = {\n  limit_per_txn: 50000,    // cents\n  categories: [5941],\n  velocity_daily: 100000,  // cents\n  require_passkey: true,\n  status: "active",\n  provisioned: "2026-01-15T10:23:00Z"\n}',
            },
          },
          'tap-validation': {
            stepId: 'tap-validation',
            active: false,
            layerText: {
              business: 'Issuer not involved in TAP validation. That happens between the agent and Visa.',
              technical: 'Issuer idle. Will be involved when card network forwards the ISO 8583 0100 message.',
              iso8583: '// Issuer not involved in TAP layer\n// TAP is pre-payment identity — issuer sees only ISO 8583',
            },
          },
          'tap-credential-issued': {
            stepId: 'tap-credential-issued',
            active: false,
            layerText: {
              business: 'Issuer still not involved. The TAP credential is a Visa-side operation.',
              technical: 'Issuer idle. Awaiting ISO 8583 authorization request from card network.',
              iso8583: '// Issuer waiting for 0100 from card network\n// Will see agent-context flag and load agent spending policy',
            },
          },
          'merchant-accepts': {
            stepId: 'merchant-accepts',
            active: false,
            layerText: {
              business: 'Issuer not yet involved. Order has been created by the merchant, payment processing is starting.',
              technical: 'Issuer idle. ISO 8583 message is being built by the acquirer.',
              iso8583: '// Issuer waiting\n// ISO 8583 message in construction at acquirer',
            },
          },
          'acquirer-iso8583': {
            stepId: 'acquirer-iso8583',
            active: false,
            layerText: {
              business: 'The payment message is traveling toward the issuer through the Visa network.',
              technical: 'ISO 8583 0100 is in transit via card network. Issuer about to receive it after card network routing.',
              iso8583: '// ISO 8583 0100 routing through card network\n// Will arrive at issuer in ~100ms',
            },
          },
          'visanet-routes': {
            stepId: 'visanet-routes',
            active: false,
            layerText: {
              business: 'The authorization request has left card network and is arriving at the issuing bank.',
              technical: 'card network has forwarded 0100 with agent-context flag. Issuer connection receiving the message.',
              iso8583: '// 0100 arriving at issuer from card network\n// Issuer sees: F002=VCN, agent-context flag, F048=agent-id, private instruction reference=hash',
            },
          },
          'issuer-auth': {
            stepId: 'issuer-auth',
            active: true,
            incomingEdge: 'e-visa-to-issuer',
            outgoingEdge: 'e-issuer-to-visa',
            layerText: {
              business: 'The consumer\'s bank makes the authorization decision. Because agent-context flag is set, the bank applies the agent-specific spending policy the consumer configured — not the normal human fraud model that would flag this machine-speed transaction. Amount is within limit. Category matches. Token is active. Approved in ~80ms.',
              technical: 'Issuer receives MTI 0100 with agent-context flag. Loads agent policy for token "4111xxxxAGNT". Runs checks: available_balance >= amount ✓, amount <= per_txn limit ✓, MCC 5941 in [5941] ✓, velocity_today + amount <= daily_limit ✓, token status active ✓, passkey assertion validated at instruction-creation time ✓. Writes authorization hold. Returns MTI 0110 F039=00 F038=123456.',
              iso8583: '// Issuer authorization decision log\ntoken: "4111xxxxAGNT"\nagent_id: "skyfire-001"  (from F048)\nF022: agent-context (illustrative)  → load agent_spending_policy(token)\n\npolicy_checks:\n  available:  $2,847.33 >= $249.00  ✓\n  per_txn:    $249.00 <= $500.00    ✓\n  velocity:   $249.00 <= $1000/day  ✓\n  category:   5941 in [5941] ✓\n  token:      active               ✓\n  passkey:    verified t-120s ago  ✓\n\nrisk_score: 8/100  (low risk)\ndecision: APPROVE\n\n// Authorization hold written: $249.00\n// Response MTI 0110:\nF039: 00      ← approved ★\nF038: 123456  ← auth code ★',
            },
          },
          'settlement-complete': {
            stepId: 'settlement-complete',
            active: true,
            layerText: {
              business: 'Funds are reserved on the consumer\'s account. T+1 clearing will permanently debit the account the next business day. The consumer has a 120-day dispute window — VIC\'s commerce signals provide the audit trail: original Passkey-authenticated instruction, TAP credential, authorization record, and agent fulfillment confirmation.',
              technical: 'Issuer holds $249.00 from available balance. T+1: receives Visa clearing file (MTI 0220). Converts hold to permanent debit. Updates statement. VIC commerce signal provides evidence for any future dispute: passkey_assertion_verified, tap_credential_ref, authorization_code, merchant_confirmation.',
              iso8583: '// T+1 Clearing (MTI 0220):\nF002: 4111xxxxxxxxAGNT  ← VCN echoed\nF004: 000000024900      ← $249.00\nF038: 123456            ← matches auth code\nF039: 00               ← confirmed\nF044: 123456           ← auth code again\n// Hold → permanent debit\n// Dispute evidence in VIC:\n//   passkey_assertion: verified\n//   tap_credential: "pi-abc123"\n//   merchant_confirmation: "head-order-78234"\n//   commerce_signal_timestamp: settlement-complete',
            },
          },
        },
      },
    },
  ],

  edges: [
    {
      id: 'e-agent-to-tap',
      source: 'n-agent-runtime',
      target: 'n-tap',
      type: 'intent',
      animated: true,
      label: 'DID credential + intent',
      activeInSteps: ['consumer-intent', 'tap-validation'],
      data: {
        protocol: 'HTTPS + HTTP Message Signatures (RFC 9421)',
        payload: 'Ed25519 signed request · DID credential · wallet_token_ref · intent_hash',
        direction: 'agent → TAP',
      },
    },
    {
      id: 'e-wallet-to-tap',
      source: 'n-agent-wallet',
      target: 'n-tap',
      type: 'intent',
      animated: true,
      label: 'wallet token ref',
      activeInSteps: ['consumer-intent', 'tap-validation'],
      data: {
        protocol: 'internal session reference',
        payload: 'token_ref "vts-AGNT-001" included in TAP request context',
        direction: 'wallet → TAP',
      },
    },
    {
      id: 'e-tap-validates',
      source: 'n-tap',
      target: 'n-visa',
      type: 'tap-credential',
      animated: true,
      label: 'register instruction',
      activeInSteps: ['tap-validation', 'tap-credential-issued'],
      data: {
        protocol: 'internal VIC API',
        payload: 'payment instruction stored in VIC registry · instruction_ref = pi-abc123',
        direction: 'TAP → VIC registry',
      },
    },
    {
      id: 'e-tap-to-merchant',
      source: 'n-tap',
      target: 'n-merchant',
      type: 'tap-credential',
      animated: true,
      label: 'TAP JWT · short-lived TTL',
      activeInSteps: ['tap-credential-issued', 'merchant-accepts'],
      data: {
        protocol: 'HTTPS',
        payload: 'JWT: { agent_id, consumer_recognized, instruction_ref, exp=now+90, nonce }',
        direction: 'TAP → agent → merchant',
      },
    },
    {
      id: 'e-agent-to-merchant',
      source: 'n-agent-runtime',
      target: 'n-merchant',
      type: 'tap-credential',
      animated: true,
      label: 'checkout + TAP header',
      activeInSteps: ['merchant-accepts'],
      data: {
        protocol: 'HTTPS',
        payload: 'Authorization: TAP-1.0 {jwt} · cart contents · instruction_ref',
        direction: 'agent → merchant',
      },
    },
    {
      id: 'e-merchant-to-acquirer',
      source: 'n-merchant',
      target: 'n-acquirer',
      type: 'iso8583',
      animated: true,
      label: 'PaymentIntent',
      activeInSteps: ['merchant-accepts', 'acquirer-iso8583'],
      data: {
        protocol: 'Stripe/Adyen API → ISO 8583',
        payload: 'tokenized_pan (VCN) · amount · TAP instruction_ref',
        direction: 'merchant → acquirer',
      },
    },
    {
      id: 'e-acquirer-to-visa',
      source: 'n-acquirer',
      target: 'n-visa',
      type: 'iso8583',
      animated: true,
      label: 'MTI 0100 · agent-context flag',
      activeInSteps: ['acquirer-iso8583', 'visanet-routes'],
      data: {
        protocol: 'ISO 8583 over card network leased line',
        payload: 'F002=VCN · agent-context flag · F048=agent-id · private instruction reference=TAP-hash',
        direction: 'acquirer → card network',
      },
    },
    {
      id: 'e-visa-to-issuer',
      source: 'n-visa',
      target: 'n-issuer',
      type: 'iso8583',
      animated: true,
      label: 'MTI 0100 → issuer',
      activeInSteps: ['visanet-routes', 'issuer-auth'],
      data: {
        protocol: 'ISO 8583 + card network routing',
        payload: 'de-tokenized routing · agent spending policy lookup · agent-context flag preserved',
        direction: 'card network → issuer',
      },
    },
    {
      id: 'e-issuer-to-visa',
      source: 'n-issuer',
      target: 'n-visa',
      type: 'funds',
      animated: true,
      label: 'MTI 0110 · F039=00',
      activeInSteps: ['issuer-auth', 'settlement-complete'],
      data: {
        protocol: 'ISO 8583 response',
        payload: 'F039=00 (approved) · F038=123456 (auth code) · private instruction reference=agent-confirmed',
        direction: 'issuer → card network → acquirer',
      },
    },
  ],

  metadata: {
    totalLatency: '~1100ms end-to-end',
    tapLatency: '40–80ms',
    visanetLatency: '~180ms',
    issuerLatency: '~80ms',
    settlementCycle: 'T+1',
    tags: [
      'agentic-commerce',
      'visa',
      'trusted-agent-protocol',
      'iso8583',
      'passkeys',
      'network-tokenization',
    ],
    protocols: [
      'HTTP Message Signatures — IETF RFC 9421',
      'ISO 8583 MTI 0100/0110/0220',
      'FIDO2 / WebAuthn (Passkeys)',
      'Visa Intelligent Commerce API (MCP)',
      'agent payment platform Protocol',
    ],
    standards: [
      'IETF Web Bot Auth (draft)',
      'EMVCo Network Tokenisation',
      'PCI DSS v4.0',
      'EMIR (EU clearing)',
    ],
    keyActors: ['Visa', 'Cloudflare', 'edge security', 'agent platform', 'Stripe', 'Adyen', 'Chase', 'Consumer Reports'],
    sources: [
      {
        label: 'Visa Intelligent Commerce',
        url: 'https://developer.visa.com/capabilities/visa-intelligent-commerce',
      },
      {
        label: 'Visa MCP Server',
        url: 'https://github.com/visa/ai',
      },
      {
        label: 'Cloudflare on Secure Agentic Commerce',
        url: 'https://blog.cloudflare.com/secure-agentic-commerce/',
      },
      {
        label: 'Visa Trusted Agent Protocol announcement',
        url: 'https://investor.visa.com/news/news-details/2025/Visa-Introduces-Trusted-Agent-Protocol',
      },
      {
        label: 'agent platform demo announcement',
        url: 'https://www.businesswire.com/news/home/20251218520399/en/agent platform-Demonstrates-Secure-Agentic-Commerce-Purchase',
      },
      {
        label: 'agent platform on tokenized agentic payments',
        url: 'https://skyfire.xyz/agentic-commerce-the-rise-of-tokenized-payments-and-identity/',
      },
    ],
  },
};
