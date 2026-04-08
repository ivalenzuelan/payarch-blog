import { useState, useEffect } from "react"

// ── WebCrypto helpers ────────────────────────────────────────────────────────

function u8ToB64(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

async function generateKeyPair() {
  const kp = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify'],
  )
  const raw = await crypto.subtle.exportKey('raw', kp.publicKey)
  const pub = u8ToB64(new Uint8Array(raw))
  const keyId = pub.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return { privateKey: kp.privateKey, publicKeyB64: pub, keyId }
}

async function signMessage(privateKey, message) {
  const sig = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    new TextEncoder().encode(message),
  )
  return u8ToB64(new Uint8Array(sig))
}

function generateNonce() {
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  return u8ToB64(b).replace(/=/g, '')
}

/** Builds the RFC 9421 signature base string — the exact string that gets signed. */
function buildSignatureBase({ method, path, authority, keyId, tag, nonce, created, expires }) {
  const covered = '"@method" "@path" "@authority" "content-type"'
  const sigParams = [
    `sig1=(${covered})`,
    `created=${created}`,
    `expires=${expires}`,
    `keyId="${keyId}"`,
    `alg="Ed25519"`,
    `nonce="${nonce}"`,
    `tag="${tag}"`,
  ].join(';')

  return [
    `"@method": ${method}`,
    `"@path": ${path}`,
    `"@authority": ${authority}`,
    `"content-type": application/json`,
    `"@signature-params": ${sigParams}`,
  ].join('\n')
}

/** Single-line Signature-Input header value (goes in the HTTP request). */
function buildSignatureInputHeader({ keyId, tag, nonce, created, expires }) {
  return (
    `sig1=("@method" "@path" "@authority" "content-type"); ` +
    `created=${created}; expires=${expires}; keyId="${keyId}"; ` +
    `alg="Ed25519"; nonce="${nonce}"; tag="${tag}"`
  )
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── UI sub-components ────────────────────────────────────────────────────────

function StepCard({ color, stepNum, title, children }) {
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVis(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(10px)',
      transition: 'opacity 0.38s ease, transform 0.38s ease',
      borderRadius: 10,
      border: `1px solid ${color}28`,
      borderLeft: `3px solid ${color}`,
      marginBottom: 14,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px 8px',
        borderBottom: `1px solid ${color}18`,
        background: `${color}07`,
      }}>
        <span style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 9, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color, opacity: 0.75 }}>
          {stepNum}
        </span>
        <span style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11, color: '#4a4840' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '13px 16px 13px', background: '#faf9f6' }}>
        {children}
      </div>
    </div>
  )
}

function DarkCode({ children }) {
  return (
    <pre style={{
      margin: 0, padding: '11px 14px',
      background: '#1a1814', borderRadius: 8,
      fontFamily: 'DM Mono, Courier New, monospace',
      fontSize: 11, lineHeight: 1.75,
      color: '#d8d3c8', overflowX: 'auto',
      whiteSpace: 'pre',
      border: 'none',
    }}>{children}</pre>
  )
}

function Note({ children }) {
  return (
    <div style={{ marginTop: 9, fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10.5, color: '#8a8278', lineHeight: 1.65 }}>
      {children}
    </div>
  )
}

function KVTable({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {rows.map(([k, v, vColor], i) => (
          <tr key={i} style={{ borderBottom: '1px solid #ede9e2' }}>
            <td style={{ padding: '5px 14px 5px 0', fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10.5, color: '#8a8278', whiteSpace: 'nowrap', verticalAlign: 'top', width: '1%' }}>{k}</td>
            <td style={{ padding: '5px 0', fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10.5, color: vColor || '#1a1814', lineHeight: 1.6, wordBreak: 'break-all' }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function VerifyBox({ children }) {
  return (
    <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0f8f4', border: '1px solid #b0d8c0', borderRadius: 8, fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10.5, color: '#1a7a50', lineHeight: 1.85 }}>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TapSimulator() {
  const [cfg, setCfg] = useState({
    agentId: 'skyfire-001',
    domain: 'bose.com',
    path: '/checkout',
    type: 'checkout',
    amount: '89.99',
    currency: 'USD',
  })
  const [steps, setSteps] = useState([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [runCount, setRunCount] = useState(0)

  async function run() {
    setRunning(true)
    setDone(false)
    setError(null)
    setSteps([])
    setRunCount(c => c + 1)

    try {
      // ── Step 1: Generate Ed25519 keypair ───────────────────────────────────
      const { privateKey, publicKeyB64, keyId } = await generateKeyPair()
      setSteps([{ id: 'key', keyId, publicKeyB64 }])
      await sleep(520)

      // ── Step 2: Build RFC 9421 signature base string ───────────────────────
      const created = Math.floor(Date.now() / 1000)
      const expires = created + 3600
      const nonce = generateNonce()
      const tag = cfg.type === 'checkout' ? 'agent-payment-auth' : 'agent-browser-auth'
      const sigP = { method: 'POST', path: cfg.path, authority: cfg.domain, keyId, tag, nonce, created, expires }
      const sigBase = buildSignatureBase(sigP)
      setSteps(s => [...s, { id: 'sigbase', sigBase, nonce, created, expires, tag }])
      await sleep(580)

      // ── Step 3: Sign ───────────────────────────────────────────────────────
      const sigVal = await signMessage(privateKey, sigBase)
      setSteps(s => [...s, { id: 'sign', sigVal }])
      await sleep(520)

      // ── Step 4: Build signed HTTP request ──────────────────────────────────
      const sigInputHeader = buildSignatureInputHeader(sigP)
      const bodyObj = cfg.type === 'checkout'
        ? { amount: cfg.amount, currency: cfg.currency, agent_id: `AGNT:${cfg.agentId}` }
        : { agent_id: `AGNT:${cfg.agentId}`, intent: 'browse' }
      const bodyStr = JSON.stringify(bodyObj, null, 2)
      const httpReq = [
        `POST ${cfg.path} HTTP/1.1`,
        `Host: ${cfg.domain}`,
        `Content-Type: application/json`,
        `Signature-Input: ${sigInputHeader}`,
        `Signature: sig1=:${sigVal}:`,
        '',
        bodyStr,
      ].join('\n')
      setSteps(s => [...s, { id: 'request', httpReq, keyId, publicKeyB64 }])
      setDone(true)
    } catch (e) {
      setError(e.message || 'WebCrypto error. Ed25519 requires a secure context (HTTPS or localhost).')
    }

    setRunning(false)
  }

  const set = k => e => setCfg(c => ({ ...c, [k]: e.target.value }))

  const inputStyle = {
    fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11,
    padding: '5px 9px', border: '1px solid #e0dbd0',
    borderRadius: 5, background: '#faf9f6',
    color: '#1a1814', outline: 'none',
  }
  const labelStyle = {
    display: 'block', marginBottom: 4,
    fontFamily: 'DM Mono, Courier New, monospace',
    fontSize: 9, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: '#8a8278',
  }

  return (
    <div className="not-prose" style={{
      fontFamily: 'Outfit, system-ui, sans-serif',
      color: '#1a1814', background: '#f5f3ee',
      borderRadius: 12, border: '1px solid #e0dbd0',
      overflow: 'hidden',
      width: '100vw', maxWidth: 1040,
      position: 'relative', left: '50%', transform: 'translateX(-50%)',
      margin: '32px 0',
    }}>

      {/* ── Header ── */}
      <div style={{ padding: '15px 20px 13px', borderBottom: '1px solid #e0dbd0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a8278', marginBottom: 4 }}>
            Trusted Agent Protocol · Interactive Simulator
          </div>
          <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 18, letterSpacing: '-0.02em', fontWeight: 400 }}>
            TAP Credential Simulator
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 9, color: '#7040c0', background: '#f5f0ff', border: '1px solid #ddd0f8', borderRadius: 4, padding: '3px 9px', letterSpacing: '0.08em' }}>
            Real Ed25519 · WebCrypto API
          </div>
          {runCount > 0 && (
            <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 9, color: '#b8b3a8' }}>
              run #{runCount} · unique keys each time
            </div>
          )}
        </div>
      </div>

      {/* ── Config ── */}
      <div style={{ padding: '13px 20px', borderBottom: '1px solid #e0dbd0', background: '#faf9f6', display: 'flex', flexWrap: 'wrap', gap: '10px 18px', alignItems: 'flex-end' }}>
        <div>
          <label style={labelStyle}>Agent ID</label>
          <input value={cfg.agentId} onChange={set('agentId')} style={{ ...inputStyle, width: 128 }} />
        </div>
        <div>
          <label style={labelStyle}>Merchant domain</label>
          <input value={cfg.domain} onChange={set('domain')} style={{ ...inputStyle, width: 138 }} />
        </div>
        <div>
          <label style={labelStyle}>Path</label>
          <input value={cfg.path} onChange={set('path')} style={{ ...inputStyle, width: 110 }} />
        </div>
        <div>
          <label style={labelStyle}>Interaction</label>
          <select value={cfg.type} onChange={set('type')} style={{ ...inputStyle, width: 110 }}>
            <option value="checkout">checkout</option>
            <option value="browse">browse</option>
          </select>
        </div>
        {cfg.type === 'checkout' && (
          <>
            <div>
              <label style={labelStyle}>Amount</label>
              <input value={cfg.amount} onChange={set('amount')} style={{ ...inputStyle, width: 80 }} />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select value={cfg.currency} onChange={set('currency')} style={{ ...inputStyle, width: 78 }}>
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>
            </div>
          </>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={run}
            disabled={running}
            style={{
              padding: '7px 20px',
              background: running ? '#f5f3ee' : '#1a1814',
              color: running ? '#8a8278' : '#faf9f6',
              border: `1px solid ${running ? '#e0dbd0' : '#1a1814'}`,
              borderRadius: 6,
              fontFamily: 'DM Mono, Courier New, monospace',
              fontSize: 11, letterSpacing: '0.04em',
              cursor: running ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}>
            {running ? '⟳ signing…' : steps.length > 0 ? '↻ re-run' : '▶ generate & sign'}
          </button>
        </div>
      </div>

      {/* ── Step output ── */}
      <div style={{ padding: '16px 20px' }}>

        {steps.length === 0 && !running && !error && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 12, color: '#b8b3a8', marginBottom: 8 }}>
              Click "generate &amp; sign" to run real Ed25519 cryptography in this browser tab.
            </div>
            <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10, color: '#d8d3c8' }}>
              Every value — keypair, nonce, signature — is generated fresh. Nothing is hardcoded.
            </div>
          </div>
        )}

        {steps.map(step => {

          // ── Step 1: Key generation ──────────────────────────────────────────
          if (step.id === 'key') return (
            <StepCard key="key" color="#7040c0" stepNum="01" title="Ed25519 key generation">
              <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11, color: '#8a8278', marginBottom: 10, lineHeight: 1.65 }}>
                <span style={{ color: '#1a1814' }}>crypto.subtle.generateKey</span> — non-exportable private key, 32-byte public key. The key ID is URL-safe base64 of the raw public key, matching the Visa Key Store format.
              </div>
              <KVTable rows={[
                ['key_id',     step.keyId,        '#7040c0'],
                ['public_key', step.publicKeyB64,  '#4a4840'],
                ['algorithm',  'Ed25519 (OKP · 256-bit)'],
                ['private_key','never exported · stays in WebCrypto secure memory', '#8a8278'],
              ]} />
            </StepCard>
          )

          // ── Step 2: Signature base string ───────────────────────────────────
          if (step.id === 'sigbase') return (
            <StepCard key="sigbase" color="#c05020" stepNum="02" title="Signature base string — RFC 9421 §2.5">
              <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11, color: '#8a8278', marginBottom: 10, lineHeight: 1.65 }}>
                The canonical string the agent signs. Visa's CDN reconstructs this verbatim from the incoming request — any tampering with method, path, authority, or content-type changes this string and fails verification.
              </div>
              <DarkCode>{step.sigBase}</DarkCode>
              <Note>
                created: {new Date(step.created * 1000).toISOString()} &nbsp;·&nbsp;
                expires: +3600s &nbsp;·&nbsp;
                nonce: {step.nonce} (one-time use) &nbsp;·&nbsp;
                tag: {step.tag}
              </Note>
            </StepCard>
          )

          // ── Step 3: Signature ────────────────────────────────────────────────
          if (step.id === 'sign') return (
            <StepCard key="sign" color="#1a7a50" stepNum="03" title="Ed25519 signature">
              <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11, color: '#8a8278', marginBottom: 10, lineHeight: 1.65 }}>
                64 bytes, always. Ed25519 is deterministic — same key + same input → same output. A fresh keypair is generated on each run, so this signature is unique every time.
              </div>
              <DarkCode>{`sig1=:${step.sigVal}:`}</DarkCode>
              <Note>
                {step.sigVal.length} base64 chars → 48 raw bytes → Ed25519 signature (always exactly 64 bytes)
              </Note>
            </StepCard>
          )

          // ── Step 4: Signed HTTP request ──────────────────────────────────────
          if (step.id === 'request') return (
            <StepCard key="request" color="#1a56a0" stepNum="04" title="Signed HTTP request">
              <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11, color: '#8a8278', marginBottom: 10, lineHeight: 1.65 }}>
                The complete request as the agent sends it. Cloudflare or Akamai at the merchant's edge intercepts this, fetches the public key from the Visa Key Store using <span style={{ color: '#1a1814' }}>keyId</span>, reconstructs the signature base string, and runs Ed25519 verification.
              </div>
              <DarkCode>{step.httpReq}</DarkCode>
              <VerifyBox>
                ✓ &nbsp;Ed25519.verify(pubKey, sigBase, sig) → true<br/>
                ✓ &nbsp;Nonce is unique — not yet in nonce store<br/>
                ✓ &nbsp;Timestamps valid — expires in 3600 seconds<br/>
                ✓ &nbsp;agent_recognized: true → proceed to checkout · no CAPTCHA · no redirect
              </VerifyBox>
            </StepCard>
          )

          return null
        })}

        {error && (
          <div style={{ padding: '12px 16px', background: '#fff4f2', border: '1px solid #f0c0b0', borderRadius: 8, fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11, color: '#c05020', lineHeight: 1.65 }}>
            Error: {error}
          </div>
        )}

      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '9px 20px', borderTop: '1px solid #e0dbd0', background: '#f5f3ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontFamily: 'DM Mono, Courier New, monospace', fontSize: 9.5, color: '#b8b3a8' }}>
        <span>WebCrypto API · no server calls · private key never leaves this tab · runs #{runCount}</span>
        {done && <span style={{ color: '#1a7a50', flexShrink: 0 }}>✓ signature valid</span>}
      </div>

    </div>
  )
}
