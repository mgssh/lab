export const PHASES = [
  { id: 'tabuada', label: 'Times Tables', operation: 'multiplication' },
  { id: 'addsub', label: 'Fast Add & Subtract', operation: 'addition_subtraction' },
  { id: 'multiply', label: 'Multiplication by Decomposition', operation: 'multiplication' },
  { id: 'divide', label: 'Division as Reverse Multiplication', operation: 'division' },
  { id: 'percent', label: 'Fractions & Percentages', operation: 'percentage' },
]

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Weighted repetition: facts the user got wrong or was slow on show up more often.
// excludeKey prevents the same problem from appearing twice in a row.
export function pickWeighted(weights, fallbackKeys, excludeKey = null) {
  const keys = Object.keys(weights).length ? Object.keys(weights) : fallbackKeys
  const pool = []
  for (const k of keys) {
    if (k === excludeKey && keys.length > 1) continue
    const w = weights[k] ?? 1
    for (let i = 0; i < Math.max(1, Math.round(w)); i++) pool.push(k)
  }
  if (pool.length === 0) return keys[randInt(0, keys.length - 1)]
  return pool[randInt(0, pool.length - 1)]
}

export function generateProblem(phaseId, weights = {}, lastFactKey = null) {
  switch (phaseId) {
    case 'tabuada': {
      const key = pickWeighted(
        weights,
        Array.from({ length: 100 }, (_, i) => `${Math.floor(i / 10) + 1}x${(i % 10) + 1}`),
        lastFactKey,
      )
      const [a, b] = key.split('x').map(Number)
      return {
        text: `${a} × ${b}`,
        answer: a * b,
        factKey: key,
      }
    }
    case 'addsub': {
      const isAdd = Math.random() > 0.5
      const a = randInt(23, 98)
      const b = randInt(15, 87)
      return {
        text: isAdd ? `${a} + ${b}` : `${Math.max(a, b)} - ${Math.min(a, b)}`,
        answer: isAdd ? a + b : Math.max(a, b) - Math.min(a, b),
        trace: isAdd
          ? decomposeAdd(a, b)
          : decomposeSub(Math.max(a, b), Math.min(a, b)),
      }
    }
    case 'multiply': {
      const a = randInt(12, 29)
      const b = randInt(3, 9)
      return {
        text: `${a} × ${b}`,
        answer: a * b,
        trace: decomposeMultiply(a, b),
      }
    }
    case 'divide': {
      const b = randInt(3, 12)
      const answer = randInt(4, 15)
      const a = b * answer
      return {
        text: `${a} ÷ ${b}`,
        answer,
        trace: [`Think: ${b} × ? = ${a}`, `${b} × ${answer} = ${a}`],
      }
    }
    case 'percent': {
      const base = randInt(20, 400)
      const pct = [10, 20, 25, 50, 5, 15].at(randInt(0, 5))
      return {
        text: `${pct}% of ${base}`,
        answer: Math.round((base * pct) / 100),
        trace: decomposePercent(base, pct),
      }
    }
    default:
      throw new Error(`Unknown phase: ${phaseId}`)
  }
}

function decomposeAdd(a, b) {
  const bTens = Math.floor(b / 10) * 10
  const bOnes = b % 10
  return [
    `${a} + ${b} = ${a} + ${bTens} + ${bOnes}`,
    `${a} + ${bTens} = ${a + bTens}`,
    `${a + bTens} + ${bOnes} = ${a + b}`,
  ]
}

function decomposeSub(a, b) {
  const bTens = Math.floor(b / 10) * 10
  const bOnes = b % 10
  return [
    `${a} - ${b} = ${a} - ${bTens} - ${bOnes}`,
    `${a} - ${bTens} = ${a - bTens}`,
    `${a - bTens} - ${bOnes} = ${a - b}`,
  ]
}

function decomposeMultiply(a, b) {
  const tens = Math.floor(a / 10) * 10
  const ones = a % 10
  return [
    `${a} × ${b} = (${tens} + ${ones}) × ${b}`,
    `${tens} × ${b} = ${tens * b}`,
    `${ones} × ${b} = ${ones * b}`,
    `${tens * b} + ${ones * b} = ${a * b}`,
  ]
}

function decomposePercent(base, pct) {
  const onePct = base / 100
  const tenPct = base / 10
  return [
    `10% of ${base} = ${tenPct}`,
    `1% of ${base} = ${onePct}`,
    `${pct}% = build it from 10% and 1% blocks`,
  ]
}
