'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { PayarchDiagram as DiagramDef } from '@payarch/core'

type Layer = 'business' | 'technical' | 'iso8583'

// ── Internal layout config (independent of core node positions) ──
const LAYOUT: Record<string, { x: number; y: number; w: number; h: number; color: string; colorLight: string; fill: string; fillLight: string }> = {
  'n-agent-runtime': { x: 20,  y: 30,  w: 148, h: 72, color: '#9f97dd', colorLight: '#534AB7', fill: '#1e1a3a', fillLight: '#EEEDFE' },
  'n-agent-wallet':  { x: 20,  y: 156, w: 148, h: 72, color: '#9f97dd', colorLight: '#534AB7', fill: '#1e1a3a', fillLight: '#EEEDFE' },
  'n-tap':           { x: 228, y: 82,  w: 178, h: 72, color: '#4a7fff', colorLight: '#185FA5', fill: '#1a2a4a', fillLight: '#E6F1FB' },
  'n-merchant':      { x: 468, y: 30,  w: 148, h: 72, color: '#4a7fff', colorLight: '#185FA5', fill: '#1a2a4a', fillLight: '#E6F1FB' },
  'n-acquirer':      { x: 468, y: 183, w: 148, h: 72, color: '#d4902a', colorLight: '#854F0B', fill: '#1f1800', fillLight: '#FAEEDA' },
  'n-visa':          { x: 660, y: 106, w: 148, h: 72, color: '#2db88a', colorLight: '#0F6E56', fill: '#0d2a20', fillLight: '#E1F5EE' },
  'n-issuer':        { x: 660, y: 226, w: 148, h: 72, color: '#e06848', colorLight: '#993C1D', fill: '#200d08', fillLight: '#FAECE7' },
}

const EDGE_PATHS: Record<string, { d: string; color: string }> = {
  'e-agent-to-tap':        { d: 'M168,66 C196,66 210,118 228,118',    color: '#9f97dd' },
  'e-wallet-to-tap':       { d: 'M168,192 C196,192 210,126 228,126',   color: '#9f97dd' },
  'e-tap-validates':       { d: 'M406,118 C440,118 448,142 468,142',   color: '#4a7fff' }, // tap→visa (internal)
  'e-tap-to-merchant':     { d: 'M406,106 C436,106 452,66 468,66',     color: '#4a7fff' },
  'e-agent-to-merchant':   { d: 'M168,50 C318,50 368,50 468,50',       color: '#9f97dd' },
  'e-merchant-to-acquirer':{ d: 'M542,102 L542,183',                   color: '#4a7fff' },
  'e-acquirer-to-visa':    { d: 'M616,219 C636,219 648,178 660,178',   color: '#d4902a' },
  'e-visa-to-issuer':      { d: 'M808,178 L812,178 L812,226',          color: '#2db88a' },
  'e-issuer-to-visa':      { d: 'M808,262 C830,262 830,208 808,208',   color: '#e06848' },
}

const EDGE_LABELS: Record<string, string> = {
  'e-agent-to-tap':         'DID + intent',
  'e-wallet-to-tap':        'token ref',
  'e-tap-validates':        'VIC registry',
  'e-tap-to-merchant':      'TAP JWT · 90s',
  'e-agent-to-merchant':    'checkout + TAP',
  'e-merchant-to-acquirer': 'PaymentIntent',
  'e-acquirer-to-visa':     'MTI 0100 · F022=81',
  'e-visa-to-issuer':       '0100 → issuer',
  'e-issuer-to-visa':       'MTI 0110 · F039=00',
}

function useDarkMode() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDark(mq.matches)
    const fn = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return dark
}

interface Props {
  diagram: DiagramDef
  defaultLayer?: Layer
  autoPlay?: boolean
}

export default function PayarchDiagram({ diagram, defaultLayer = 'technical', autoPlay = false }: Props) {
  const [stepIdx, setStepIdx] = useState(0)
  const [layer, setLayer] = useState<Layer>(defaultLayer)
  const [playing, setPlaying] = useState(autoPlay)
  const [visited, setVisited] = useState<Set<number>>(new Set([0]))
  const dark = useDarkMode()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const steps = diagram.stepsOrder
  const stepId = steps[stepIdx]

  // Collect active nodes and edges for current step
  const activeNodeIds = diagram.nodes
    .filter(n => n.data.steps?.[stepId]?.active)
    .map(n => n.id)

  const activeEdgeIds = diagram.edges
    .filter(e => e.activeInSteps?.includes(stepId))
    .map(e => e.id)

  const advance = useCallback(() => {
    setStepIdx(s => {
      const next = (s + 1) % steps.length
      setVisited(v => new Set([...v, next]))
      return next
    })
  }, [steps.length])

  useEffect(() => {
    if (!playing) return
    timerRef.current = setTimeout(advance, 2400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, stepIdx, advance])

  const goTo = (i: number) => {
    setStepIdx(i)
    setVisited(v => new Set([...v, i]))
  }

  const C = dark ? {
    bg: 'transparent', surface: '#0e0f11', border: '#252830',
    text: '#e8e6e0', textSec: '#7a7870', textTer: '#3a3c42',
    edgeInactive: '#1e2228', controlBorder: '#252830',
  } : {
    bg: 'transparent', surface: '#ffffff', border: '#e8e5de',
    text: '#1a1918', textSec: '#8a8780', textTer: '#c0bdb5',
    edgeInactive: '#e2e0d8', controlBorder: '#e2e0d8',
  }

  const layerColors: Record<Layer, { bg: string; text: string; border: string }> = dark ? {
    business:  { bg: '#1e1a3a', text: '#9f97dd', border: '#2e2850' },
    technical: { bg: '#1a2a4a', text: '#6a9fff', border: '#253a60' },
    iso8583:   { bg: '#1f1800', text: '#d4902a', border: '#2e2000' },
  } : {
    business:  { bg: '#EEEDFE', text: '#3C3489', border: '#d0ccf8' },
    technical: { bg: '#E6F1FB', text: '#0C447C', border: '#b8d4f0' },
    iso8583:   { bg: '#FAEEDA', text: '#633806', border: '#f0d4a0' },
  }

  // Get the best available layer text for current step/node
  const getStepLabel = () => {
    const node = diagram.nodes.find(n => activeNodeIds.includes(n.id))
    return node?.data.steps?.[stepId]?.layerText?.[layer === 'iso8583' ? 'iso8583' : layer] ?? ''
  }

  // Find richest text across all active nodes
  const getRichText = () => {
    const texts = activeNodeIds
      .map(id => diagram.nodes.find(n => n.id === id))
      .map(n => n?.data.steps?.[stepId]?.layerText?.[layer === 'iso8583' ? 'iso8583' : layer] ?? '')
      .filter(t => t && t !== '—' && t.length > 10)
    return texts[0] ?? ''
  }

  const richText = getRichText()
  const isCode = layer === 'iso8583' || richText.includes('\n')

  // Step title from diagram metadata or fallback
  const getStepTitle = () => {
    // Try to get it from edge labels or step data
    const edgeLabel = Object.entries(EDGE_LABELS).find(([id]) => activeEdgeIds.includes(id))
    return edgeLabel?.[1] ?? stepId.replace(/-/g, ' ')
  }

  return (
    <div style={{ width: '100%', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {(['business', 'technical', 'iso8583'] as Layer[]).map(l => (
            <button key={l} onClick={() => setLayer(l)} style={{
              padding: '4px 11px', borderRadius: 4, fontSize: 11,
              fontFamily: 'monospace', cursor: 'pointer',
              border: `1px solid ${layer === l ? layerColors[l].border : C.controlBorder}`,
              background: layer === l ? layerColors[l].bg : 'transparent',
              color: layer === l ? layerColors[l].text : C.textSec,
              transition: 'all .15s',
            }}>
              {l === 'iso8583' ? 'ISO 8583' : l}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.textTer }}>
            {diagram.metadata?.totalLatency ?? ''} · {diagram.settlementCycle ?? 'T+1'}
          </span>
        </div>
      </div>

      {/* SVG Overview */}
      <svg width="100%" viewBox="0 0 820 305" style={{ display: 'block', overflow: 'visible', marginBottom: 0 }}>
        <defs>
          <marker id="arr-base" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke={C.edgeInactive} strokeWidth="1.5" strokeLinecap="round"/>
          </marker>
          {Object.entries(EDGE_PATHS).map(([id, ep]) => (
            <marker key={id} id={`arr-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke={ep.color} strokeWidth="1.5" strokeLinecap="round"/>
            </marker>
          ))}
        </defs>

        {/* Layer zone lines */}
        <text x="8" y="20" style={{ fontSize: 8, fontFamily: 'monospace', fill: C.textTer, letterSpacing: '0.07em' }}>AGENT</text>
        <text x="8" y="108" style={{ fontSize: 8, fontFamily: 'monospace', fill: C.textTer, letterSpacing: '0.07em' }}>TRUST</text>
        <text x="8" y="204" style={{ fontSize: 8, fontFamily: 'monospace', fill: C.textTer, letterSpacing: '0.07em' }}>RAILS</text>
        <line x1="8" y1="25" x2="812" y2="25" stroke={dark ? '#1a1e24' : '#f0ede6'} strokeWidth="0.5" strokeDasharray="3 8"/>
        <line x1="8" y1="112" x2="812" y2="112" stroke={dark ? '#1a1e24' : '#f0ede6'} strokeWidth="0.5" strokeDasharray="3 8"/>
        <line x1="8" y1="208" x2="812" y2="208" stroke={dark ? '#1a1e24' : '#f0ede6'} strokeWidth="0.5" strokeDasharray="3 8"/>

        {/* Edges */}
        {Object.entries(EDGE_PATHS).map(([id, ep]) => {
          const active = activeEdgeIds.includes(id)
          const vis = Array.from(visited).slice(0, stepIdx).some(i => {
            const sid = steps[i]
            return diagram.edges.find(e => e.id === id)?.activeInSteps?.includes(sid)
          })
          return (
            <g key={id}>
              <path
                id={`epath-${id}`}
                d={ep.d}
                fill="none"
                stroke={active ? ep.color : vis ? ep.color : C.edgeInactive}
                strokeWidth={active ? 1.5 : vis ? 1 : 0.7}
                strokeOpacity={active ? 1 : vis ? 0.35 : 1}
                markerEnd={active ? `url(#arr-${id})` : `url(#arr-base)`}
                style={{ transition: 'all .3s' }}
              />
              {active && (
                <circle r="4.5" fill={ep.color} opacity="0.9">
                  <animateMotion dur="0.9s" repeatCount="indefinite">
                    <mpath href={`#epath-${id}`}/>
                  </animateMotion>
                </circle>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {diagram.nodes.map(node => {
          const L = LAYOUT[node.id]
          if (!L) return null
          const active = activeNodeIds.includes(node.id)
          const vis = Array.from(visited).slice(0, stepIdx).some(i => {
            const sid = steps[i]
            return diagram.nodes.find(n => n.id === node.id)?.data.steps?.[sid]?.active
          })
          const dimmed = !active && !vis && stepIdx > 0
          const bg = active ? (dark ? L.fill : L.fillLight) : vis ? (dark ? `${L.fill}99` : `${L.fillLight}88`) : (dark ? '#141618' : '#ffffff')
          const stroke = active ? L.color : vis ? L.color : C.border
          const sw = active ? 1.5 : vis ? 0.8 : 0.5

          return (
            <g key={node.id} style={{ opacity: dimmed ? 0.45 : 1, transition: 'opacity .3s' }}>
              {active && (
                <rect x={L.x - 4} y={L.y - 4} width={L.w + 8} height={L.h + 8} rx={12}
                  fill="none" stroke={L.color} strokeWidth={0.8} strokeOpacity={0.25}>
                  <animate attributeName="stroke-opacity" values="0.35;0.05;0.35" dur="2s" repeatCount="indefinite"/>
                </rect>
              )}
              <rect x={L.x} y={L.y} width={L.w} height={L.h} rx={8}
                fill={bg} stroke={stroke} strokeWidth={sw}
                style={{ transition: 'all .3s' }}
              />
              {/* Type badge */}
              <rect x={L.x + 8} y={L.y + L.h - 14} width={L.w - 16} height={9} rx={2}
                fill={active ? L.color : (dark ? '#1e2228' : '#f0ede6')}
                fillOpacity={active ? 0.2 : 1}
              />
              <text x={L.x + L.w / 2} y={L.y + 24} textAnchor="middle" dominantBaseline="central"
                style={{ fontSize: node.id === 'n-tap' ? 10.5 : 12, fontWeight: 500,
                  fill: active ? L.color : (dark ? '#e8e6e0' : '#1a1918'),
                  fontFamily: 'system-ui,-apple-system,sans-serif', transition: 'fill .3s' }}>
                {node.data.label}
              </text>
              <text x={L.x + L.w / 2} y={L.y + 42} textAnchor="middle" dominantBaseline="central"
                style={{ fontSize: 9, fill: dark ? '#4a4845' : '#a0a098', fontFamily: 'monospace' }}>
                {node.data.sublabel}
              </text>
              <text x={L.x + L.w / 2} y={L.y + L.h - 9} textAnchor="middle" dominantBaseline="central"
                style={{ fontSize: 7.5, fill: active ? L.color : (dark ? '#303438' : '#c0bdb5'),
                  fontFamily: 'monospace', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
                {node.data.layer}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 0 8px', justifyContent: 'center' }}>
        {steps.map((sid, i) => (
          <button key={sid} onClick={() => goTo(i)} title={sid.replace(/-/g, ' ')} style={{
            width: i === stepIdx ? 18 : 5, height: 5, borderRadius: 3, border: 'none', padding: 0, cursor: 'pointer',
            background: i === stepIdx ? '#4a7fff' : visited.has(i) ? (dark ? '#2e3240' : '#d0cdc4') : (dark ? '#1e2228' : '#e8e5de'),
            transition: 'all .2s',
          }} />
        ))}
      </div>

      {/* Step detail */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        {/* Step header */}
        <div style={{ padding: '12px 16px 10px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, padding: '2px 7px', borderRadius: 3,
                background: layerColors[layer].bg, color: layerColors[layer].text, border: `1px solid ${layerColors[layer].border}` }}>
                {stepIdx + 1} / {steps.length}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.textTer }}>
                {diagram.metadata?.totalLatency ?? '~1100ms'}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.text, lineHeight: 1.3, textTransform: 'capitalize' as const }}>
              {stepId.replace(/-/g, ' ')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0, maxWidth: 240, justifyContent: 'flex-end' }}>
            {activeNodeIds.map(id => {
              const L = LAYOUT[id]
              const node = diagram.nodes.find(n => n.id === id)
              if (!L || !node) return null
              return (
                <span key={id} style={{ fontSize: 9, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 3,
                  background: dark ? L.fill : L.fillLight, color: L.color, border: `1px solid ${L.color}44` }}>
                  {node.data.label}
                </span>
              )
            })}
          </div>
        </div>

        {/* Layer text */}
        <div style={{ padding: '14px 16px', background: dark ? '#0a0b0d' : '#faf9f5', minHeight: 96 }}>
          {richText ? (
            isCode ? (
              <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.75, fontFamily: 'monospace',
                color: dark ? '#b8b5ae' : '#4a4840', whiteSpace: 'pre-wrap', wordBreak: 'break-word' as const }}>
                {richText}
              </pre>
            ) : (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: C.textSec }}>
                {richText}
              </p>
            )
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: C.textTer, fontFamily: 'monospace', textAlign: 'center' as const, padding: '20px 0' }}>
              select a layer above to see details for this step
            </p>
          )}
        </div>

        {/* Controls */}
        <div style={{ padding: '8px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 7,
          background: dark ? '#0e0f11' : '#ffffff' }}>
          <button onClick={() => goTo(Math.max(0, stepIdx - 1))} disabled={stepIdx === 0} style={{
            padding: '4px 12px', borderRadius: 5, fontSize: 11, fontFamily: 'monospace', cursor: stepIdx === 0 ? 'default' : 'pointer',
            border: `1px solid ${C.controlBorder}`, background: 'transparent',
            color: stepIdx === 0 ? C.textTer : C.textSec }}>← prev</button>
          <button onClick={() => setPlaying(p => !p)} style={{
            padding: '4px 16px', borderRadius: 5, fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
            border: `1px solid ${playing ? '#4a7fff' : C.controlBorder}`,
            background: playing ? (dark ? '#1a2a4a' : '#E6F1FB') : 'transparent',
            color: playing ? '#4a7fff' : C.textSec }}>
            {playing ? '⏸ pause' : '▶ play'}
          </button>
          <button onClick={() => goTo(Math.min(steps.length - 1, stepIdx + 1))} disabled={stepIdx === steps.length - 1} style={{
            padding: '4px 12px', borderRadius: 5, fontSize: 11, fontFamily: 'monospace',
            cursor: stepIdx === steps.length - 1 ? 'default' : 'pointer',
            border: `1px solid ${C.controlBorder}`, background: 'transparent',
            color: stepIdx === steps.length - 1 ? C.textTer : C.textSec }}>next →</button>
          <div style={{ flex: 1, height: 2, background: C.border, borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 1, background: '#4a7fff',
              width: `${((stepIdx + 1) / steps.length) * 100}%`, transition: 'width .4s ease' }}/>
          </div>
          <button onClick={() => { setStepIdx(0); setVisited(new Set([0])); setPlaying(false) }} style={{
            padding: '4px 9px', borderRadius: 5, fontSize: 10, fontFamily: 'monospace', cursor: 'pointer',
            border: `1px solid ${C.controlBorder}`, background: 'transparent', color: C.textTer }}>reset</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, padding: '8px 2px 2px', flexWrap: 'wrap' }}>
        {[
          { color: '#9f97dd', label: 'agent layer' },
          { color: '#4a7fff', label: 'trust & identity' },
          { color: '#d4902a', label: 'ISO 8583' },
          { color: '#2db88a', label: 'VisaNet routing' },
          { color: '#e06848', label: 'auth response' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 14, height: 2, background: l.color, borderRadius: 1 }}/>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.textTer }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
