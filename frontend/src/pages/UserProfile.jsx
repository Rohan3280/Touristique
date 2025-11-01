import { useEffect, useMemo, useState } from 'react'

function getAuthUser() {
  try { return JSON.parse(localStorage.getItem('authUser') || 'null') } catch { return null }
}

export function UserProfile() {
  const authUser = useMemo(() => getAuthUser(), [])
  const userId = authUser?.id

  const key = (name) => userId ? `profile:${userId}:${name}` : `profile.${name}`
  const [interests] = useState(() => { try { return JSON.parse(localStorage.getItem(key('interests')) || '[]') } catch { return [] } })
  const [durationDays] = useState(() => Number(localStorage.getItem(key('durationDays')) || 0))
  const [budget] = useState(() => Number(localStorage.getItem(key('budget')) || 0))
  const [travelers] = useState(() => Number(localStorage.getItem(key('travelers')) || 0))

  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(false)
  const [bgUrl, setBgUrl] = useState('')
  useEffect(() => { setTrips([]); setLoading(false) }, [userId])

  // Resolve background image with graceful fallback
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const mod = await import('../pics/p1.jpg')
        if (mounted) setBgUrl(mod.default)
      } catch {
        try {
          const fb = await import('../pics/t1.jpg')
          if (mounted) setBgUrl(fb.default)
        } catch { console.warn('Fallback profile background not found') }
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <section className="page profile-view" style={bgUrl ? { backgroundImage: `url(${bgUrl})` } : undefined}>
      <div className="profile-slab">
        <h2>Your profile</h2>
        <div className="row" style={{ alignItems: 'center', gap: '1rem' }}>
          {authUser?.picture && <img src={authUser.picture} alt="" style={{ width: 72, height: 72, borderRadius: '50%' }} />}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{authUser?.name || 'Guest'}</div>
            <div style={{ color: '#555' }}>{authUser?.email || ''}</div>
          </div>
        </div>

        <div className="profile-columns">
          <div className="rec-card">
            <div className="rec-body">
              <h3>Preferences</h3>
              <p><strong>Interests:</strong> {interests.length ? interests.join(', ') : 'Not set'}</p>
              <p><strong>Duration:</strong> {durationDays || '—'} day(s)</p>
              <p><strong>Budget:</strong> {budget ? `₹ ${budget.toLocaleString('en-IN')}` : '—'}</p>
              <p><strong>Travelers:</strong> {travelers || '—'}</p>
              <div className="row"><a className="btn btn-ghost edit-pref-btn" href="#/profile-setup">Edit preferences</a></div>
            </div>
          </div>
          <div className="rec-card">
            <div className="rec-body">
              <h3>Past trips</h3>
              {loading ? (
                <p>Loading trips…</p>
              ) : trips.length ? (
                <div className="card-grid" style={{ marginTop: '0.5rem' }}>
                  {trips.map((t, i) => (
                    <div key={t.id || i} className="rec-card">
                      <div className="rec-img" style={{ background: t.image ? undefined : 'linear-gradient(135deg, #fff3ea, #eaf6ff)' }}>
                        {t.image && (<img src={t.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)}
                      </div>
                      <div className="rec-body">
                        <h3>{t.title || t.name || 'Trip'}</h3>
                        <p>{t.subtitle || t.description || ''}</p>
                        <div className="row">
                          {t.mapUrl && <a href={t.mapUrl} className="btn btn-ghost">View on map</a>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No trips recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


