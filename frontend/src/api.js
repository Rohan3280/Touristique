const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function profileKey(userId, name) {
  return userId ? `profile:${userId}:${name}` : `profile.${name}`
}

function normalizePreferences(prefs) {
  const map = { historical: 'heritage' }
  return (prefs || [])
    .map(p => String(p || '').toLowerCase())
    .map(p => map[p] || p)
}

export function buildPlanRequestFromProfile(userId) {
  try {
    const k = (n) => profileKey(userId, n)
    const interests = JSON.parse(localStorage.getItem(k('interests')) || '[]')
    const duration = Number(localStorage.getItem(k('durationDays')) || 2)
    const budget = Number(localStorage.getItem(k('budget')) || 15000)
    const start_city = localStorage.getItem(k('start_city')) || 'Delhi'
    return {
      preferences: normalizePreferences(interests),
      duration: Number.isFinite(duration) && duration > 0 ? duration : 2,
      budget: Number.isFinite(budget) && budget >= 0 ? budget : 15000,
      start_city,
    }
  } catch {
    return { preferences: [], duration: 2, budget: 15000, start_city: 'Delhi' }
  }
}

export async function planTrip(payload) {
  if (!API_BASE_URL) return null
  const url = new URL('/plan', API_BASE_URL)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function askQuestion(question, userId) {
  if (!API_BASE_URL) return { answer: '' }
  const k = (n) => profileKey(userId, n)
  let preferences = []
  let start_city = 'Delhi'
  try {
    preferences = normalizePreferences(JSON.parse(localStorage.getItem(k('interests')) || '[]'))
    start_city = localStorage.getItem(k('start_city')) || 'Delhi'
  } catch {}
  const url = new URL('/ask', API_BASE_URL)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, preferences, start_city }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

// trips APIs removed

