const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function recordAttempt({ phase, operation, correct, timeMs }) {
  const res = await fetch(`${API_URL}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phase,
      operation,
      correct,
      time_ms: timeMs,
    }),
  })
  if (!res.ok) throw new Error('Failed to record attempt')
  return res.json()
}

export async function fetchStats() {
  const res = await fetch(`${API_URL}/stats`)
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}
