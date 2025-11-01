import { useEffect, useMemo, useState } from 'react'

export function ProfileSetup() {
  const allInterests = useMemo(() => ([
    { id: 'historical', label: 'Historical' },
    { id: 'adventure', label: 'Adventure' },
    { id: 'food', label: 'Food' },
    { id: 'nature', label: 'Nature' },
    { id: 'artistic', label: 'Artistic' },
    { id: 'shopping', label: 'Shopping' },
    { id: 'spiritual', label: 'Spiritual' },
    { id: 'scenic', label: 'Scenic' },
    { id: 'wildlife', label: 'Wildlife' },
    { id: 'cultural', label: 'Cultural' },
  ]), [])
  const legacyMap = useMemo(() => ({
    'Heritage': 'Historical',
    'Art': 'Artistic',
    'Beaches': 'Scenic',
    'Nightlife': 'Cultural'
  }), [])
  const interestImages = useMemo(() => {
    const images = {}
    const modules = import.meta.glob('../pics/*.{jpg,jpeg,png,webp}', { eager: true })
    for (const path in modules) {
      const url = modules[path]?.default || ''
      const file = path.split('/').pop() || ''
      const base = file.replace(/\.(jpg|jpeg|png|webp)$/i, '').toLowerCase()
      images[base] = url
    }
    return images
  }, [])
  const currentUserId = (() => {
    try { return JSON.parse(localStorage.getItem('authUser') || 'null')?.id || null } catch { return null }
  })()
  const key = (name) => currentUserId ? `profile:${currentUserId}:${name}` : `profile.${name}`
  const [selectedInterests, setSelectedInterests] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key('interests')) || '[]')
      if (Array.isArray(raw) && raw.length) {
        const migrated = raw.map(v => legacyMap[v] || v)
        return migrated
      }
      return []
    } catch { return [] }
  })
  const [durationDays, setDurationDays] = useState(() => {
    const n = Number(localStorage.getItem(key('durationDays')) || 5)
    return Number.isFinite(n) && n > 0 ? n : 5
  })
  const [budget, setBudget] = useState(() => {
    const n = Number(localStorage.getItem(key('budget')) || 30000)
    return Number.isFinite(n) && n >= 0 ? n : 30000
  })
  const [travelers, setTravelers] = useState(() => {
    const n = Number(localStorage.getItem(key('travelers')) || 1)
    return Number.isFinite(n) && n > 0 ? n : 1
  })

  useEffect(() => {
    localStorage.setItem(key('interests'), JSON.stringify(selectedInterests))
  }, [selectedInterests])
  useEffect(() => {
    localStorage.setItem(key('durationDays'), String(durationDays))
  }, [durationDays])
  useEffect(() => {
    localStorage.setItem(key('budget'), String(budget))
  }, [budget])
  useEffect(() => {
    localStorage.setItem(key('travelers'), String(travelers))
  }, [travelers])

  const toggleInterest = (label) => {
    setSelectedInterests((prev) => prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label])
  }

  const minSelections = 3
  const canGenerate = selectedInterests.length >= minSelections && durationDays > 0
  const filtered = allInterests

  return (
    <section className="page profile-setup">
      <h2>Choose what you love</h2>
      <div className="interest-header" style={{ marginBottom: '0.5rem' }}>
        <div className="interest-count">Select at least {minSelections} interests • Chosen: {selectedInterests.length}</div>
        <div className="interest-actions">
          <button type="button" className="btn btn-ghost" onClick={()=>setSelectedInterests([])}>Clear</button>
          <button type="button" className="btn btn-ghost" onClick={()=>setSelectedInterests(allInterests.map(i=>i.label))}>Select all</button>
        </div>
      </div>

      <div className="interest-grid" aria-label="Interest options">
        {filtered.map((i) => {
          const selected = selectedInterests.includes(i.label)
          const imgUrl = (interestImages[i.id] || interestImages[i.label?.toLowerCase()]) || i.image || ''
          return (
            <button key={i.id} type="button" className={`interest-tile${selected ? ' selected' : ''}`} onClick={() => toggleInterest(i.label)} aria-pressed={selected}>
              {imgUrl && <span className="bg" style={{ backgroundImage: `url(${imgUrl})` }} aria-hidden />}
              <span className="label">{i.label}</span>
            </button>
          )
        })}
      </div>

      <form className="form-grid" style={{ marginTop: '0.75rem' }} onSubmit={(e) => e.preventDefault()}>

        <div className="two-col">
          <div className="field">
            <label>How many days are you planning to stay?</label>
            <input className="input" style={{ width: '140px' }} type="number" min="1" placeholder="5" value={durationDays} onChange={(e)=>setDurationDays(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>How much are you planning to spend?</label>
            <input className="input" style={{ width: '160px' }} type="number" min="0" step="100" placeholder="30000" value={budget} onChange={(e)=>setBudget(Number(e.target.value))} />
          </div>
        </div>

        <label>
          Travelers
          <div className="row">
            <button className="chip stepper-btn" type="button" onClick={() => setTravelers(Math.max(1, travelers - 1))}>-</button>
            <span style={{ minWidth: 24, textAlign: 'center' }}>{travelers}</span>
            <button className="chip stepper-btn" type="button" onClick={() => setTravelers(travelers + 1)}>+</button>
          </div>
        </label>

        <div className="row">
          <a
            href={canGenerate ? '#/' : '#/profile-setup'}
            className="btn btn-primary"
            aria-disabled={!canGenerate}
            onClick={(e) => { if (!canGenerate) e.preventDefault() }}
          >
            Generate plan
          </a>
          <a href="#/" className="btn btn-ghost">Cancel</a>
        </div>
      </form>
    </section>
  )
}


