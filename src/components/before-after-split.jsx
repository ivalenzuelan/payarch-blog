import { useState, useEffect, useRef } from "react"

const T = {
  cream: "#faf9f6", cream2: "#f5f3ee", cream3: "#ede9e2",
  ink: "#1a1814", ink2: "#4a4440", ink3: "#5e5750", ink4: "#8a8278", ink5: "#b8b3a8",
  border: "#e0dbd0",
  pass: "#186040", passLight: "#f0f8f4", passBorder: "#a8d8b8",
  fail: "#c02010", failLight: "#fff4f2", failBorder: "#f0b0a0",
  warn: "#905010", warnLight: "#fff8ee", warnBorder: "#f0c880",
  agent: "#6030b0", agentLight: "#f5f0ff", agentBorder: "#c8a8f0",
}

const TYPE_STYLE = {
  pain:       { bg: T.failLight,  border: T.failBorder,  text: T.fail,  icon: "✕", label: "Manual" },
  approval:   { bg: T.warnLight,  border: T.warnBorder,  text: T.warn,  icon: "△", label: "Human approval" },
  agent:      { bg: T.agentLight, border: T.agentBorder, text: T.agent, icon: "◈", label: "Agent" },
  instant:    { bg: T.passLight,  border: T.passBorder,  text: T.pass,  icon: "✓", label: "Instant" },
  eliminated: { bg: T.cream3,     border: T.border,      text: T.ink5,  icon: "—", label: "Eliminated" },
}

function StepRow({ step, index, isActive, isFuture, side }) {
  const ts = TYPE_STYLE[step.type] || TYPE_STYLE.agent
  const opacity = isFuture ? 0.35 : 1

  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      padding: "9px 14px",
      background: isActive ? ts.bg : "transparent",
      borderLeft: isActive ? `3px solid ${ts.text}` : "3px solid transparent",
      transition: "all .25s",
      opacity,
    }}>
      {/* Step number + icon */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: isActive ? ts.text : T.cream3,
          border: `1px solid ${isActive ? ts.text : T.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontFamily: "'Courier New',monospace",
          color: isActive ? "#fff" : T.ink4,
          fontWeight: 600, transition: "all .2s",
          flexShrink: 0,
        }}>
          {isActive ? ts.icon : index + 1}
        </div>
        <div style={{ fontSize: 8, color: T.ink5, fontFamily: "'Courier New',monospace" }}>{step.time}</div>
      </div>

      {/* Label + type badge */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 12, fontFamily: "'Courier New',monospace",
            color: isActive ? ts.text : T.ink2, fontWeight: isActive ? 600 : 400,
            textDecoration: step.type === "eliminated" ? "line-through" : "none",
            transition: "color .2s",
          }}>
            {step.label}
          </span>
          <span style={{
            fontSize: 8.5, padding: "1px 5px", borderRadius: 3, flexShrink: 0,
            background: isActive ? ts.text : T.cream3,
            color: isActive ? "#fff" : T.ink5,
            fontFamily: "'Courier New',monospace", letterSpacing: "0.04em",
            border: `1px solid ${isActive ? ts.text : T.border}`,
            transition: "all .2s",
          }}>
            {ts.label}
          </span>
        </div>
        {isActive && (
          <div style={{
            marginTop: 4, fontSize: 11, color: T.ink3,
            lineHeight: 1.6, fontFamily: "Georgia,serif",
          }}>
            {step.detail}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * BeforeAfter — Generic side-by-side workflow comparison component.
 *
 * Props:
 *   title: string
 *   subtitle: string
 *   before: { label, badge, badgeType, timeSaved, steps: [{ label, type, time, detail }] }
 *   after:  { label, badge, badgeType, timeSaved, steps: [...] }
 *   correspondence: number[]  — maps each "before" step index to an "after" step index (optional)
 */
export default function BeforeAfter({ title, subtitle, before, after, correspondence }) {
  const [step, setStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const playRef = useRef(false)
  const timerRef = useRef(null)

  const maxSteps = Math.max(before.steps.length, after.steps.length)

  // Map before step → after step (default: same index, clamped)
  const getAfterStep = (beforeIdx) => {
    if (correspondence && correspondence[beforeIdx] !== undefined) return correspondence[beforeIdx]
    return Math.min(beforeIdx, after.steps.length - 1)
  }

  const beforeActive = step
  const afterActive = step >= 0 ? getAfterStep(step) : -1

  useEffect(() => {
    if (!playing) return
    playRef.current = true
    const run = async () => {
      const start = step < 0 ? 0 : step + 1
      for (let i = start; i < before.steps.length; i++) {
        if (!playRef.current) break
        setStep(i)
        await new Promise(r => { timerRef.current = setTimeout(r, 2200) })
      }
      playRef.current = false
      setPlaying(false)
    }
    run()
    return () => { clearTimeout(timerRef.current); playRef.current = false }
  }, [playing])

  const reset = () => {
    playRef.current = false
    clearTimeout(timerRef.current)
    setPlaying(false)
    setStep(-1)
  }

  const progress = step < 0 ? 0 : ((step + 1) / before.steps.length) * 100
  const beforeStep = step >= 0 ? before.steps[step] : null
  const afterStep = afterActive >= 0 ? after.steps[afterActive] : null

  const BadgeStyle = (type) => ({
    fail: { bg: T.failLight, color: T.fail, border: T.failBorder },
    pass: { bg: T.passLight, color: T.pass, border: T.passBorder },
    agent: { bg: T.agentLight, color: T.agent, border: T.agentBorder },
  }[type] || { bg: T.cream3, color: T.ink3, border: T.border })

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
          {subtitle}
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.02em", margin: 0, color: T.ink }}>
          {title}
        </h2>
      </div>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${T.border}` }}>
        {[before, after].map((side, i) => {
          const bs = BadgeStyle(side.badgeType)
          return (
            <div key={i} style={{
              padding: "14px 16px",
              borderRight: i === 0 ? `1px solid ${T.border}` : "none",
              background: i === 0 ? T.failLight : T.agentLight,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'Courier New',monospace", color: i === 0 ? T.fail : T.agent }}>
                  {side.label}
                </span>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 4,
                  background: bs.bg, color: bs.color, border: `1px solid ${bs.border}`,
                  fontFamily: "'Courier New',monospace", fontWeight: 600,
                }}>
                  {side.badge}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {side.metrics?.map((m, j) => (
                  <div key={j} style={{ fontSize: 10, fontFamily: "'Courier New',monospace", color: i === 0 ? T.fail + "cc" : T.agent + "cc" }}>
                    <span style={{ fontWeight: 600 }}>{m.value}</span>
                    <span style={{ opacity: 0.7 }}> {m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Steps grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>

        {/* Before column */}
        <div style={{ borderRight: `1px solid ${T.border}` }}>
          {before.steps.map((s, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${T.border}` }} onClick={() => setStep(i)}>
              <StepRow
                step={s} index={i}
                isActive={beforeActive === i}
                isFuture={beforeActive >= 0 && i > beforeActive}
                side="before"
              />
            </div>
          ))}
        </div>

        {/* After column */}
        <div>
          {after.steps.map((s, i) => {
            const isActive = afterActive === i && step >= 0
            const isFuture = afterActive >= 0 && i > afterActive && step >= 0
            return (
              <div key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                <StepRow
                  step={s} index={i}
                  isActive={isActive}
                  isFuture={isFuture}
                  side="after"
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Time saved banner */}
      <div style={{ padding: "10px 24px", borderBottom: `1px solid ${T.border}`, background: T.cream2, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 11, color: T.ink4, fontFamily: "'Courier New',monospace" }}>before</div>
          <div style={{ flex: 1, height: 8, background: T.fail + "25", borderRadius: 2, overflow: "hidden", width: 140 }}>
            <div style={{ height: "100%", background: T.fail, borderRadius: 2, width: "100%" }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.fail, fontFamily: "'Courier New',monospace" }}>{before.badge}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 11, color: T.ink4, fontFamily: "'Courier New',monospace" }}>after</div>
          <div style={{ flex: 1, height: 8, background: T.agent + "20", borderRadius: 2, overflow: "hidden", width: 140 }}>
            <div style={{ height: "100%", background: T.agent, borderRadius: 2, width: after.timeBarWidth || "8%" }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.agent, fontFamily: "'Courier New',monospace" }}>{after.badge}</div>
        </div>
        {after.timeSaved && (
          <div style={{ marginLeft: "auto", fontSize: 12, fontFamily: "'Courier New',monospace", color: T.pass, fontWeight: 600 }}>
            ↓ {after.timeSaved} faster
          </div>
        )}
      </div>

      {/* Info panel */}
      <div style={{
        margin: "0 20px 12px",
        marginTop: 10,
        minHeight: 68,
        background: beforeStep ? TYPE_STYLE[beforeStep.type]?.bg || T.cream2 : T.cream2,
        border: `1px solid ${beforeStep ? TYPE_STYLE[beforeStep.type]?.border || T.border : T.border}`,
        borderRadius: 8, padding: "10px 14px", transition: "all .25s",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
      }}>
        {beforeStep ? (
          <>
            <div>
              <div style={{ fontSize: 9.5, fontFamily: "'Courier New',monospace", color: T.fail, fontWeight: 600, marginBottom: 3, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Before — step {step + 1}
              </div>
              <div style={{ fontSize: 11, color: T.ink2, lineHeight: 1.6, fontFamily: "'Courier New',monospace" }}>
                {beforeStep.detail}
              </div>
            </div>
            {afterStep && (
              <div style={{ borderLeft: `1px solid ${T.border}`, paddingLeft: 12 }}>
                <div style={{ fontSize: 9.5, fontFamily: "'Courier New',monospace", color: T.agent, fontWeight: 600, marginBottom: 3, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  After — step {afterActive + 1}
                </div>
                <div style={{ fontSize: 11, color: T.ink2, lineHeight: 1.6, fontFamily: "'Courier New',monospace" }}>
                  {afterStep.detail}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 11, color: T.ink5, fontFamily: "'Courier New',monospace", paddingTop: 4, gridColumn: "1/-1" }}>
            press play or click any step — see what changes at each stage
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: "10px 22px 13px", borderTop: `1px solid ${T.border}`, background: T.cream2, display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => { reset(); setTimeout(() => setPlaying(true), 50) }}
          style={{ padding: "5px 14px", borderRadius: 5, fontSize: 10, fontFamily: "'Courier New',monospace", cursor: "pointer", border: `1px solid ${T.ink5}`, background: T.cream, color: T.ink }}>
          ▶ play
        </button>
        <button
          onClick={() => setStep(s => Math.max(-1, s - 1))}
          style={{ padding: "5px 10px", borderRadius: 5, fontSize: 10, fontFamily: "'Courier New',monospace", cursor: "pointer", border: `1px solid ${T.border}`, background: "transparent", color: T.ink3 }}>
          ←
        </button>
        <button
          onClick={() => setStep(s => Math.min(before.steps.length - 1, s + 1))}
          style={{ padding: "5px 10px", borderRadius: 5, fontSize: 10, fontFamily: "'Courier New',monospace", cursor: "pointer", border: `1px solid ${T.border}`, background: "transparent", color: T.ink3 }}>
          →
        </button>
        <div style={{ flex: 1, height: 2, background: T.border, borderRadius: 1, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 1, transition: "width .4s ease", background: T.agent, width: `${progress}%` }} />
        </div>
        <span style={{ fontSize: 9, color: T.ink4, fontFamily: "'Courier New',monospace" }}>
          {Math.max(0, step + 1)} / {before.steps.length}
        </span>
        <button
          onClick={reset}
          style={{ padding: "5px 9px", borderRadius: 5, fontSize: 9, fontFamily: "'Courier New',monospace", cursor: "pointer", border: `1px solid ${T.border}`, background: "transparent", color: T.ink5 }}>
          reset
        </button>
      </div>

    </div>
  )
}
