import { useEffect, useMemo, useRef, useState } from 'react'
import { PHASES, generateProblem } from './problems'
import { recordAttempt, fetchStats } from './api'

const XP_PER_CORRECT = 10
const STREAK_BONUS_EVERY = 5
const STREAK_BONUS_XP = 20
const SPEED_MODE_SECONDS = 5

function levelFromXp(xp) {
  return Math.floor(xp / 100) + 1
}

function xpIntoLevel(xp) {
  return xp % 100
}

export default function App() {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [problem, setProblem] = useState(null)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // { correct, trace, correctAnswer }
  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [levelUpFlash, setLevelUpFlash] = useState(false)
  const [speedMode, setSpeedMode] = useState(false)
  const [timeLeft, setTimeLeft] = useState(SPEED_MODE_SECONDS)
  const [weights, setWeights] = useState({})
  const lastFactKeyRef = useRef(null)
  const [stats, setStats] = useState([])
  const [showDashboard, setShowDashboard] = useState(false)
  const startTimeRef = useRef(null)
  const inputRef = useRef(null)

  const phase = PHASES[phaseIndex]
  const level = levelFromXp(xp)
  const progressInLevel = xpIntoLevel(xp)

  useEffect(() => {
    nextProblem()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseIndex])

  useEffect(() => {
    inputRef.current?.focus()
  }, [problem])

  useEffect(() => {
    if (!speedMode || !problem || feedback) return
    setTimeLeft(SPEED_MODE_SECONDS)
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          handleTimeout()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speedMode, problem, feedback])

  function handleTimeout() {
    setStreak(0)
    setTotalAnswered((n) => n + 1)
    setFeedback({ correct: false, trace: problem.trace, correctAnswer: problem.answer, timedOut: true })
    recordAttempt({
      phase: phase.id,
      operation: phase.operation,
      correct: false,
      timeMs: SPEED_MODE_SECONDS * 1000,
    }).catch(() => {})
  }

  function nextProblem() {
    setFeedback(null)
    setInput('')
    const p = generateProblem(phase.id, weights, lastFactKeyRef.current)
    lastFactKeyRef.current = p.factKey ?? null
    setProblem(p)
    startTimeRef.current = performance.now()
  }

  async function submitAnswer(e) {
    e.preventDefault()
    if (!problem || input.trim() === '') return

    const timeMs = Math.round(performance.now() - startTimeRef.current)
    const userAnswer = Number(input)
    const correct = userAnswer === problem.answer

    setTotalAnswered((n) => n + 1)

    if (correct) {
      const newStreak = streak + 1
      setStreak(newStreak)
      setBestStreak((b) => Math.max(b, newStreak))
      let gained = XP_PER_CORRECT
      if (newStreak > 0 && newStreak % STREAK_BONUS_EVERY === 0) {
        gained += STREAK_BONUS_XP
      }
      setXp((prevXp) => {
        const newXp = prevXp + gained
        if (levelFromXp(newXp) > levelFromXp(prevXp)) {
          setLevelUpFlash(true)
          setTimeout(() => setLevelUpFlash(false), 1400)
        }
        return newXp
      })
    } else {
      setStreak(0)
    }

    if (problem.factKey) {
      setWeights((w) => ({
        ...w,
        [problem.factKey]: correct
          ? Math.max(1, (w[problem.factKey] ?? 3) - 1)
          : (w[problem.factKey] ?? 3) + 3,
      }))
    }

    setFeedback({ correct, trace: problem.trace, correctAnswer: problem.answer })

    if (correct) {
      setTimeout(() => {
        nextProblem()
      }, 700)
    }

    try {
      await recordAttempt({
        phase: phase.id,
        operation: phase.operation,
        correct,
        timeMs,
      })
    } catch {
      // Best-effort: keep training locally even if the API call fails.
    }
  }

  async function openDashboard() {
    try {
      const data = await fetchStats()
      setStats(data)
    } catch {
      setStats([])
    }
    setShowDashboard(true)
  }

  const masteryByOperation = useMemo(() => {
    const map = {}
    for (const s of stats) {
      const accuracy = Math.max(0, 1 - s.error_rate)
      map[s.operation] = Math.round(accuracy * 100)
    }
    return map
  }, [stats])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Math Trainer</div>
        <div className="hud">
          <div className="hud-item">
            <span className="hud-label">Level</span>
            <span className="hud-value">{level}</span>
          </div>
          <div className="xp-bar">
            <div className="xp-fill" style={{ width: `${progressInLevel}%` }} />
          </div>
          <div className="hud-item">
            <span className="hud-label">Streak</span>
            <span className="hud-value">🔥 {streak}</span>
          </div>
          <button className="ghost-btn" onClick={openDashboard}>
            Dashboard
          </button>
        </div>
      </header>

      {levelUpFlash && <div className="level-up-toast">Level Up! 🎉</div>}

      <nav className="phase-tabs">
        {PHASES.map((p, i) => (
          <button
            key={p.id}
            className={`phase-tab ${i === phaseIndex ? 'active' : ''}`}
            onClick={() => setPhaseIndex(i)}
          >
            {p.label}
          </button>
        ))}
      </nav>

      <main className="board">
        <div className="mode-row">
          <label className="toggle">
            <input
              type="checkbox"
              checked={speedMode}
              onChange={(e) => setSpeedMode(e.target.checked)}
            />
            Speed mode
          </label>
          <span className="counter">Answered: {totalAnswered}</span>
          <span className="counter">Best streak: {bestStreak}</span>
        </div>

        {problem && (
          <div className="problem-card">
            {speedMode && !feedback && (
              <div className={`timer ${timeLeft <= 2 ? 'timer-urgent' : ''}`}>{timeLeft}s</div>
            )}
            <div className="problem-text">{problem.text}</div>
            <form onSubmit={submitAnswer} className="answer-form">
              <input
                ref={inputRef}
                type="number"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Your answer"
                autoFocus
              />
              <button type="submit">Check</button>
            </form>
          </div>
        )}

        {feedback && (
          <div className={`feedback-card ${feedback.correct ? 'correct' : 'incorrect'}`}>
            <div className="feedback-title">
              {feedback.correct
                ? `Correct! +${XP_PER_CORRECT} XP`
                : feedback.timedOut
                  ? `Time's up! Answer: ${feedback.correctAnswer}`
                  : `Not quite — answer: ${feedback.correctAnswer}`}
            </div>
            {feedback.trace && (
              <ol className="trace">
                {feedback.trace.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            )}
            <button className="next-btn" onClick={nextProblem}>
              Next problem →
            </button>
          </div>
        )}
      </main>

      {showDashboard && (
        <div className="modal-backdrop" onClick={() => setShowDashboard(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Weakness Dashboard</h2>
            {stats.length === 0 && <p>No data yet — answer a few problems first.</p>}
            {stats.map((s) => (
              <div key={s.operation} className="mastery-row">
                <div className="mastery-label">
                  <span>{s.operation}</span>
                  <span>{masteryByOperation[s.operation]}% mastery</span>
                </div>
                <div className="mastery-bar">
                  <div
                    className="mastery-fill"
                    style={{ width: `${masteryByOperation[s.operation]}%` }}
                  />
                </div>
                <div className="mastery-meta">
                  {s.total} attempts · avg {Math.round(s.avg_time_ms)}ms · {Math.round(s.error_rate * 100)}% error rate
                </div>
              </div>
            ))}
            <button className="ghost-btn" onClick={() => setShowDashboard(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
