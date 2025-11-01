const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export async function fetchPersonalizedCards(userId) {
  if (!API_BASE_URL) return []
  const url = new URL('/recommendations', API_BASE_URL)
  if (userId) url.searchParams.set('userId', userId)
  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function fetchUserTrips(userId) {
  if (!API_BASE_URL) return []
  const url = new URL('/trips', API_BASE_URL)
  if (userId) url.searchParams.set('userId', userId)
  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

