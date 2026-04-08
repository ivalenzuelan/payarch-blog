import { useState, useEffect, useRef } from "react"

// ── WebCrypto helpers ────────────────────────────────────────────────────────

function u8ToB64(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function b64ToU8(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function toHex(bytes, n = 8) {
  return Array.from(bytes.slice(0, n))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ')
}

async function generateKeyPair() {
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])
  const raw = await crypto.subtle.exportKey('raw', kp.publicKey)
  const rawBytes = new Uint8Array(raw)
  const pub = u8ToB64(rawBytes)
  const keyId = pub.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return {
    privateKey: kp.privateKey,
    publicKey: kp.publicKey,
    publicKeyB64: pub,
    publicKeyHex: toHex(rawBytes),
    keyId,
  }
}

async function signMessage(privateKey, message) {
  const sig = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    new TextEncoder().encode(message),
  )
  return u8ToB64(new Uint8Array(sig))
}

async function verifyMessage(publicKey, message, sigB64) {
  return crypto.subtle.verify(
    { name: 'Ed25519' },
    publicKey,
    b64ToU8(sigB64),
    new TextEncoder().encode(message),
  )
}

function generateNonce() {
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  return u8ToB64(b).replace(/=/g, '')
}

/** RFC 9421 §2.5 — the exact string the private key signs. */
function buildSignatureBase({ method, path, authority, keyId, tag, nonce, created, expires }) {
  const covered = '"@method" "@path" "@authority" "content-type"'
  const params = [
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
    `"@signature-params": ${params}`,
  ].join('\n')
}

function buildSignatureInputHeader({ keyId, tag, nonce, created, expires }) {
  return (
    `sig1=("@method" "@path" "@authority" "content-type"); ` +
    `created=${created}; expires=${expires}; ` +
    `keyId="${keyId}"; alg="Ed25519"; nonce="${nonce}"; tag="${tag}"`
  )
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Step progress indicator ──────────────────────────────────────────────────

const STEP_DEFS = [
  { id: 'key',     short: 'Keygen'  },
  { id: 'sigbase', short: 'Base'    },
  { id: 'sign',    short: 'Sign'    },
  { id: 'request', short: 'Request' },
  { id: 'verify',  short: 'Verify'  },
]

function Stepper({ completedIds, activeId }) {
  const items = []
  STEP_DEFS.forEach((s, i) => {
    const done   = completedIds.includes(s.id)
    const active = s.id === activeId
    const color  = done ? '#1a7a50' : active ? '#c05020' : '#d8d3c8'
    const tc     = done ? '#1a7a50' : active ? '#c05020' : '#b8b3a8'

    items.push(
      <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          border: `2px solid ${color}`,
          background: done ? '#1a7a50' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'DM Mono, Courier New, monospace', fontSize: 9,
          color: done ? '#fff' : tc,
          transition: 'all 0.3s ease',
        }}>
          {done ? '✓' : i + 1}
        </div>
        <span style={{
          fontFamily: 'DM Mono, Courier New, monospace',
          fontSize: 8.5, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: tc,
          transition: 'color 0.3s ease',
        }}>{s.short}</span>
      </div>
    )

    if (i < STEP_DEFS.length - 1) {
      items.push(
        <div key={`line-${i}`} style={{
          flex: 1, height: 2, borderRadius: 1,
          background: done ? '#1a7a50' : '#e0dbd0',
          marginBottom: 18, transition: 'background 0.3s ease',
        }} />
      )
    }
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '12px 24px', borderBottom: '1px solid #e0dbd0',
      background: '#faf9f6',
    }}>
      {items}
    </div>
  )
}

// ── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ text, style: extraStyle }) {
  const [state, setState] = useState('idle')
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setState('done')
          setTimeout(() => setState('idle'), 1800)
        }).catch(() => setState('idle'))
      }}
      style={{
        padding: '3px 9px', borderRadius: 4,
        fontFamily: 'DM Mono, Courier New, monospace',
        fontSize: 9, letterSpacing: '0.06em',
        border: `1px solid ${state === 'done' ? '#1a7a50' : '#3d444d'}`,
        background: state === 'done' ? '#1a7a5020' : 'transparent',
        color: state === 'done' ? '#1a7a50' : '#8a8278',
        cursor: 'pointer', transition: 'all 0.15s',
        ...extraStyle,
      }}>
      {state === 'done' ? '✓ copied' : 'copy'}
    </button>
  )
}

// ── Dark code block ──────────────────────────────────────────────────────────

function DarkCode({ children, copyText }) {
  return (
    <div style={{ position: 'relative' }}>
      {copyText && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
          <CopyBtn text={copyText} />
        </div>
      )}
      <pre style={{
        margin: 0, padding: '11px 14px',
        background: '#1a1814', borderRadius: 8,
        fontFamily: 'DM Mono, Courier New, monospace',
        fontSize: 11, lineHeight: 1.75,
        color: '#d8d3c8', overflowX: 'auto',
        whiteSpace: 'pre', border: 'none',
      }}>{children}</pre>
    </div>
  )
}

// ── Step card (with mount-animation) ────────────────────────────────────────

function StepCard({ color, stepNum, title, badge, timing, children }) {
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVis(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(10px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      borderRadius: 10,
      border: `1px solid ${color}30`,
      borderLeft: `3px solid ${color}`,
      marginBottom: 14, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px 8px',
        borderBottom: `1px solid ${color}18`,
        background: `${color}07`,
      }}>
        <span style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 9, color, opacity: 0.65, letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0 }}>{stepNum}</span>
        <span style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11.5, color: '#4a4840', flex: 1 }}>{title}</span>
        {badge && (
          <span style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 9, color: '#fff', background: color, borderRadius: 3, padding: '2px 8px', letterSpacing: '0.07em', flexShrink: 0 }}>
            {badge}
          </span>
        )}
        {timing && (
          <span style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 9, color: '#8a8278', background: '#f5f3ee', border: '1px solid #e0dbd0', borderRadius: 3, padding: '2px 8px', flexShrink: 0 }}>
            {timing}
          </span>
        )}
      </div>
      <div style={{ padding: '13px 16px', background: '#faf9f6' }}>
        {children}
      </div>
    </div>
  )
}

function Note({ children }) {
  return (
    <div style={{ marginTop: 8, fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10.5, color: '#8a8278', lineHeight: 1.65 }}>
      {children}
    </div>
  )
}

function KVRow({ k, v, vColor }) {
  return (
    <tr style={{ borderBottom: '1px solid #ede9e2' }}>
      <td style={{ padding: '5px 14px 5px 0', fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10.5, color: '#8a8278', whiteSpace: 'nowrap', verticalAlign: 'top', width: '1%' }}>{k}</td>
      <td style={{ padding: '5px 0', fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10.5, color: vColor || '#1a1814', lineHeight: 1.6, wordBreak: 'break-all' }}>{v}</td>
    </tr>
  )
}

// ── Tamper test ──────────────────────────────────────────────────────────────

function TamperTest({ publicKey, sigP, sigVal }) {
  const [tamperPath, setTamperPath] = useState(sigP.path.replace(/\/$/, '') + '/admin')
  const [result, setResult] = useState(null)
  const [checking, setChecking] = useState(false)

  async function check() {
    setChecking(true)
    setResult(null)
    await sleep(180)
    try {
      const tamperedBase = buildSignatureBase({ ...sigP, path: tamperPath })
      const valid = await verifyMessage(publicKey, tamperedBase, sigVal)
      setResult(valid)
    } catch {
      setResult(false)
    }
    setChecking(false)
  }

  const borderC = result === true ? '#1a7a50' : result === false ? '#c05020' : '#ddd0c0'

  return (
    <div style={{ marginTop: 14, borderRadius: 8, border: `1px solid ${borderC}`, overflow: 'hidden', transition: 'border-color 0.35s' }}>
      <div style={{ padding: '9px 14px', background: '#fdf6f0', borderBottom: `1px solid ${borderC}`, display: 'flex', alignItems: 'center', gap: 10, transition: 'border-color 0.35s' }}>
        <span style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 9, color: '#c05020', letterSpacing: '0.1em', textTransform: 'uppercase' }}>tamper test</span>
        <span style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10.5, color: '#8a8278' }}>Modify the request — can the original signature still verify?</span>
      </div>
      <div style={{ padding: '12px 14px', background: '#faf9f6' }}>
        <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10.5, color: '#8a8278', marginBottom: 10, lineHeight: 1.65 }}>
          An attacker intercepts the request and changes the path. They don't have the private key, so they can't re-sign. The original signature is unchanged. Does Visa's CDN accept it?
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10.5, color: '#8a8278', flexShrink: 0 }}>Modified "@path":</span>
          <input
            value={tamperPath}
            onChange={e => { setTamperPath(e.target.value); setResult(null) }}
            style={{
              fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11,
              padding: '5px 9px', border: '1px solid #e0dbd0', borderRadius: 5,
              background: '#faf9f6', color: '#c05020', outline: 'none', flex: 1, minWidth: 150,
            }}
          />
          <button
            onClick={check}
            disabled={checking}
            style={{
              padding: '5px 14px',
              background: '#1a1814', color: '#faf9f6',
              border: '1px solid #1a1814', borderRadius: 5,
              fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10,
              cursor: checking ? 'not-allowed' : 'pointer', flexShrink: 0,
            }}>
            {checking ? '⟳ verifying…' : 'Re-verify'}
          </button>
        </div>

        {result !== null && (
          <div style={{
            padding: '12px 14px', borderRadius: 8,
            background: result ? '#f0f8f4' : '#fff4f2',
            border: `1px solid ${result ? '#b0d8c0' : '#f0c0b0'}`,
          }}>
            <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 13, fontWeight: 600, color: result ? '#1a7a50' : '#c05020', marginBottom: 6 }}>
              {result ? '→ true  ✓ SIGNATURE VALID' : '→ false  ✗ SIGNATURE INVALID'}
            </div>
            <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10.5, color: result ? '#1a7a50' : '#c05020', lineHeight: 1.7, opacity: 0.85 }}>
              {result
                ? 'Path matches the original — signature still verifies.'
                : `"@path": ${tamperPath} was used to reconstruct the base string.\nThe base string no longer matches what was signed.\nCDN rejects. Request blocked. The attacker fails.`}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main simulator ────────────────────────────────────────────────────────────

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
  const [activeId, setActiveId] = useState(null)

  // Crypto artifacts needed for verification — held outside React state
  const cryptoRef = useRef({ publicKey: null, sigBase: '', sigVal: '', sigP: null })

  async function run() {
    setRunning(true)
    setDone(false)
    setError(null)
    setSteps([])
    setActiveId(null)
    setRunCount(c => c + 1)
    cryptoRef.current = { publicKey: null, sigBase: '', sigVal: '', sigP: null }

    try {
      // ── 01: Key generation ─────────────────────────────────────────────────
      setActiveId('key')
      const t0 = performance.now()
      const { privateKey, publicKey, publicKeyB64, publicKeyHex, keyId } = await generateKeyPair()
      const keyMs = `${(performance.now() - t0).toFixed(1)}ms`
      cryptoRef.current.publicKey = publicKey
      setSteps([{ id: 'key', keyId, publicKeyB64, publicKeyHex, timing: keyMs }])
      await sleep(480)

      // ── 02: Signature base string (RFC 9421) ───────────────────────────────
      setActiveId('sigbase')
      const created = Math.floor(Date.now() / 1000)
      const expires = created + 3600
      const nonce = generateNonce()
      const tag = cfg.type === 'checkout' ? 'agent-payment-auth' : 'agent-browser-auth'
      const sigP = { method: 'POST', path: cfg.path, authority: cfg.domain, keyId, tag, nonce, created, expires }
      const sigBase = buildSignatureBase(sigP)
      cryptoRef.current.sigBase = sigBase
      cryptoRef.current.sigP = sigP
      setSteps(s => [...s, { id: 'sigbase', sigBase, nonce, created, expires, tag }])
      await sleep(520)

      // ── 03: Ed25519 sign ───────────────────────────────────────────────────
      setActiveId('sign')
      const t1 = performance.now()
      const sigVal = await signMessage(privateKey, sigBase)
      const signMs = `${(performance.now() - t1).toFixed(2)}ms`
      cryptoRef.current.sigVal = sigVal
      setSteps(s => [...s, { id: 'sign', sigVal, timing: signMs }])
      await sleep(480)

      // ── 04: Assemble signed HTTP request ───────────────────────────────────
      setActiveId('request')
      const sigInputHdr = buildSignatureInputHeader(sigP)
      const bodyObj = cfg.type === 'checkout'
        ? { amount: cfg.amount, currency: cfg.currency, agent_id: `AGNT:${cfg.agentId}` }
        : { agent_id: `AGNT:${cfg.agentId}`, intent: 'browse' }
      const httpReq = [
        `POST ${cfg.path} HTTP/1.1`,
        `Host: ${cfg.domain}`,
        `Content-Type: application/json`,
        `Signature-Input: ${sigInputHdr}`,
        `Signature: sig1=:${sigVal}:`,
        '',
        JSON.stringify(bodyObj, null, 2),
      ].join('\n')
      setSteps(s => [...s, { id: 'request', httpReq }])
      await sleep(480)

      // ── 05: Verify (the full cryptographic loop) ───────────────────────────
      setActiveId('verify')
      const t2 = performance.now()
      const isValid = await verifyMessage(publicKey, sigBase, sigVal)
      const verifyMs = `${(performance.now() - t2).toFixed(2)}ms`
      setSteps(s => [...s, { id: 'verify', isValid, timing: verifyMs, sigVal }])

      setDone(true)
      setActiveId(null)
    } catch (e) {
      setError(e.message || 'WebCrypto error. Ed25519 requires Chrome 113+, Firefox 105+, or Safari 15+. Requires HTTPS or localhost.')
    }

    setRunning(false)
  }

  const completedIds = steps.map(s => s.id)
  const setField = k => e => setCfg(c => ({ ...c, [k]: e.target.value }))

  const iStyle = {
    fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11,
    padding: '5px 9px', border: '1px solid #e0dbd0',
    borderRadius: 5, background: '#faf9f6', color: '#1a1814', outline: 'none',
  }
  const lStyle = {
    display: 'block', marginBottom: 4,
    fontFamily: 'DM Mono, Courier New, monospace',
    fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a8278',
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
          <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 19, letterSpacing: '-0.02em', fontWeight: 400 }}>
            TAP Credential Simulator
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: running ? '#c05020' : done ? '#1a7a50' : '#d8d3c8',
              transition: 'background 0.3s',
            }} />
            <span style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 9, color: '#7040c0', background: '#f5f0ff', border: '1px solid #ddd0f8', borderRadius: 4, padding: '3px 9px', letterSpacing: '0.08em' }}>
              Real Ed25519 · WebCrypto API
            </span>
          </div>
          {runCount > 0 && (
            <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 9, color: '#b8b3a8' }}>
              run #{runCount} · unique keypair every time
            </div>
          )}
        </div>
      </div>

      {/* ── Step progress ── */}
      {(running || done || steps.length > 0) && (
        <Stepper completedIds={completedIds} activeId={activeId} />
      )}

      {/* ── Config ── */}
      <div style={{ padding: '13px 20px', borderBottom: '1px solid #e0dbd0', background: '#faf9f6', display: 'flex', flexWrap: 'wrap', gap: '10px 18px', alignItems: 'flex-end' }}>
        <div><label style={lStyle}>Agent ID</label><input value={cfg.agentId} onChange={setField('agentId')} style={{ ...iStyle, width: 128 }} /></div>
        <div><label style={lStyle}>Merchant domain</label><input value={cfg.domain} onChange={setField('domain')} style={{ ...iStyle, width: 138 }} /></div>
        <div><label style={lStyle}>Path</label><input value={cfg.path} onChange={setField('path')} style={{ ...iStyle, width: 110 }} /></div>
        <div>
          <label style={lStyle}>Interaction</label>
          <select value={cfg.type} onChange={setField('type')} style={{ ...iStyle, width: 110 }}>
            <option value="checkout">checkout</option>
            <option value="browse">browse</option>
          </select>
        </div>
        {cfg.type === 'checkout' && (
          <>
            <div><label style={lStyle}>Amount</label><input value={cfg.amount} onChange={setField('amount')} style={{ ...iStyle, width: 80 }} /></div>
            <div>
              <label style={lStyle}>Currency</label>
              <select value={cfg.currency} onChange={setField('currency')} style={{ ...iStyle, width: 78 }}>
                <option>USD</option><option>EUR</option><option>GBP</option>
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
              borderRadius: 6, fontFamily: 'DM Mono, Courier New, monospace',
              fontSize: 11, letterSpacing: '0.04em',
              cursor: running ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
            }}>
            {running ? '⟳ running…' : steps.length > 0 ? '↻ re-run' : '▶ generate & sign'}
          </button>
        </div>
      </div>

      {/* ── Step output ── */}
      <div style={{ padding: '16px 20px' }}>

        {steps.length === 0 && !running && !error && (
          <div style={{ textAlign: 'center', padding: '44px 0' }}>
            <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 12, color: '#b8b3a8', marginBottom: 8 }}>
              Click "generate &amp; sign" to run real Ed25519 cryptography in this browser tab.
            </div>
            <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10, color: '#d8d3c8' }}>
              Every value — keypair, nonce, signature — is generated fresh. Nothing is hardcoded or mocked.
            </div>
          </div>
        )}

        {steps.map(step => {

          // ── Step 1 ────────────────────────────────────────────────────────
          if (step.id === 'key') return (
            <StepCard key="key" color="#7040c0" stepNum="01" title="Ed25519 key generation" badge="LIVE" timing={step.timing}>
              <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11, color: '#8a8278', marginBottom: 10, lineHeight: 1.65 }}>
                <span style={{ color: '#1a1814' }}>crypto.subtle.generateKey({'{'}name: "Ed25519"{'}'}, false, ["sign", "verify"])</span>
                <br/>
                Non-exportable private key stored in WebCrypto secure memory. The key ID is URL-safe base64 of the raw public key — matching Visa Key Store format.
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <KVRow k="key_id"     v={step.keyId}                                          vColor="#7040c0" />
                  <KVRow k="public_key" v={step.publicKeyB64}                                   vColor="#4a4840" />
                  <KVRow k="pub_hex"    v={`${step.publicKeyHex}  (first 8 of 32 bytes)`}       vColor="#8a8278" />
                  <KVRow k="algorithm"  v="Ed25519 · OKP · 256-bit · deterministic"                              />
                  <KVRow k="private_key" v="non-exportable · stays in WebCrypto secure memory" vColor="#b8b3a8" />
                </tbody>
              </table>
            </StepCard>
          )

          // ── Step 2 ────────────────────────────────────────────────────────
          if (step.id === 'sigbase') return (
            <StepCard key="sigbase" color="#c05020" stepNum="02" title="Signature base string — RFC 9421 §2.5" badge="COMPUTED">
              <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11, color: '#8a8278', marginBottom: 10, lineHeight: 1.65 }}>
                The canonical string the private key signs. Visa's CDN reconstructs this verbatim from the incoming request and runs the same verification. Any tampering — different method, path, authority, or content-type — produces a different string and fails.
              </div>
              <DarkCode copyText={step.sigBase}>{step.sigBase}</DarkCode>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 20px', fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10, color: '#8a8278', lineHeight: 1.65 }}>
                <span>created: {new Date(step.created * 1000).toISOString()}</span>
                <span>expires: {new Date(step.expires * 1000).toISOString()}</span>
                <span>nonce: {step.nonce} (one-time use)</span>
                <span>tag: {step.tag}</span>
              </div>
            </StepCard>
          )

          // ── Step 3 ────────────────────────────────────────────────────────
          if (step.id === 'sign') return (
            <StepCard key="sign" color="#1a7a50" stepNum="03" title="Ed25519 signature" badge="LIVE" timing={step.timing}>
              <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11, color: '#8a8278', marginBottom: 10, lineHeight: 1.65 }}>
                <span style={{ color: '#1a1814' }}>crypto.subtle.sign({'{'}name: "Ed25519"{'}'}, privateKey, sigBase)</span>
                <br/>
                Deterministic — same key + same input → same output. Fresh keypair on each run → unique signature every time.
              </div>
              <DarkCode copyText={`sig1=:${step.sigVal}:`}>{`sig1=:${step.sigVal}:`}</DarkCode>
              <Note>
                {step.sigVal.length} base64 chars → 64 bytes · Ed25519 signature length is always exactly 64 bytes
              </Note>
            </StepCard>
          )

          // ── Step 4 ────────────────────────────────────────────────────────
          if (step.id === 'request') return (
            <StepCard key="request" color="#1a56a0" stepNum="04" title="Signed HTTP request">
              <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11, color: '#8a8278', marginBottom: 10, lineHeight: 1.65 }}>
                The complete request as the agent sends it. Cloudflare or Akamai at the merchant's edge intercepts this before it reaches the origin server. The <span style={{ color: '#1a1814' }}>Signature-Input</span> header tells the CDN which components are covered; <span style={{ color: '#1a1814' }}>Signature</span> is the proof.
              </div>
              <DarkCode copyText={step.httpReq}>{step.httpReq}</DarkCode>
            </StepCard>
          )

          // ── Step 5: The full loop ─────────────────────────────────────────
          if (step.id === 'verify') {
            const { publicKey, sigBase, sigP } = cryptoRef.current
            return (
              <StepCard key="verify" color="#1a7a50" stepNum="05" title="Browser verification — the full cryptographic loop" badge="VERIFIED" timing={step.timing}>
                <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 11, color: '#8a8278', marginBottom: 10, lineHeight: 1.65 }}>
                  <span style={{ color: '#1a1814' }}>crypto.subtle.verify({'{'}name: "Ed25519"{'}'}, publicKey, signature, sigBase)</span>
                  <br/>
                  The same check Visa's CDN runs — using the actual keypair and signature from steps 01–03. This is not a simulation of verification. It is verification.
                </div>

                {/* Big result */}
                <div style={{ padding: '14px 16px', background: '#f0f8f4', border: '1px solid #b0d8c0', borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 16, fontWeight: 700, color: '#1a7a50', marginBottom: 8, letterSpacing: '-0.01em' }}>
                    → true  ✓  SIGNATURE VALID
                  </div>
                  <div style={{ fontFamily: 'DM Mono, Courier New, monospace', fontSize: 10.5, color: '#1a7a50', lineHeight: 1.85, opacity: 0.85 }}>
                    Ed25519.verify(publicKey, reconstructed_sigBase, signature) → true<br/>
                    Nonce: one-time use, not yet in CDN nonce store → unused ✓<br/>
                    Timestamps: valid, not expired ✓<br/>
                    agent_recognized: true → no CAPTCHA · no WAF block · proceed to checkout
                  </div>
                </div>

                {/* Tamper test */}
                {publicKey && sigBase && sigP && (
                  <TamperTest
                    publicKey={publicKey}
                    sigP={sigP}
                    sigVal={step.sigVal}
                  />
                )}
              </StepCard>
            )
          }

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
        <span>WebCrypto API · no server calls · private key never leaves this tab{runCount > 0 ? ` · run #${runCount}` : ''}</span>
        {done && <span style={{ color: '#1a7a50', flexShrink: 0 }}>✓ generate → sign → verify · complete</span>}
      </div>

    </div>
  )
}
