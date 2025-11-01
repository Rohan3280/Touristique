import './App.css'
import homeImg from './pics/home.jpg'
import { useEffect, useState } from 'react'
import { ProfileSetup } from './pages/ProfileSetup'
import { MapPage } from './pages/MapPage'
import { CulturalInsights } from './pages/CulturalInsights'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { UserProfile } from './pages/UserProfile'
import { useMemo } from 'react'
import { buildPlanRequestFromProfile, planTrip, askQuestion } from './api'
import { PersonalizedCards } from './components/PersonalizedCards'
import { signOut } from './auth'
import t1 from './pics/t1.jpg'
import t2 from './pics/t2.jpg'
import t3 from './pics/t3.jpg'
import t4 from './pics/t4.jpg'
import t5 from './pics/t5.jpg'

function App() {
  const heading = 'Your one stop destination, at your fingertips'
  const subheading = 'Discover destinations, plan trips, and make memories with Touristique.'
  const primaryCta = 'Sign up'
  const secondaryCta = 'Find out more'
  const contentTop = '5%'
  const contentLeft = '12%'
  const imageOffsetY = '-64px'
  const chatLetters = ['अ', 'অ', 'A', 'அ']
  const [chatIndex, setChatIndex] = useState(0)
  const carouselRightOffsetPx = 170
  useEffect(() => {
    const intervalId = setInterval(() => {
      setChatIndex((i) => (i + 1) % chatLetters.length)
    }, 2400)
    return () => clearInterval(intervalId)
  }, [chatLetters.length])
  const [route, setRoute] = useState(window.location.hash || '#/')
  const [authUser, setAuthUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('authUser') || 'null') } catch { return null }
  })
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    const onLogin = (e) => setAuthUser(e.detail)
    const onLogout = () => setAuthUser(null)
    window.addEventListener('auth:login', onLogin)
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Default page when logged in should always be home
  useEffect(() => {
    if (!authUser) return
    window.location.hash = '#/'
  }, [authUser])

  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'नमस्ते! मैं कैसे मदद कर सकता/सकती हूँ?' }
  ])
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [cards, setCards] = useState([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [totalCost, setTotalCost] = useState(0)
  const [plans, setPlans] = useState([])
  const [selectedPlanIdx, setSelectedPlanIdx] = useState(0)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const q = chatInput.trim()
    setChatMessages((prev)=>[...prev, { role: 'user', text: q }])
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await askQuestion(q, userId)
      const answer = String(res?.answer || '').trim() || 'No answer'
      setChatMessages((prev)=>[...prev, { role: 'ai', text: answer }])
    } catch {
      setChatMessages((prev)=>[...prev, { role: 'ai', text: 'Sorry, something went wrong.' }])
    } finally {
      setChatLoading(false)
    }
  }

  

  const userId = useMemo(() => authUser?.id || null, [authUser])
  useEffect(() => {
    if (!userId) { setCards([]); return }
    const fetchItinerary = async () => {
      setCardsLoading(true)
      try {
        const payload = buildPlanRequestFromProfile(userId)
        const data = await planTrip(payload)
        const toDayItems = (arr) => (Array.isArray(arr) ? arr.map((d) => ({
          day: d.day,
          place: (Array.isArray(d.destinations) && d.destinations.length ? d.destinations[0] : (d.city || '')),
          cost: Number(d.cost) || 0,
        })) : [])
        const expectedDays = Number(payload?.duration) || 0
        const multi = data?.itineraries || data?.options || data?.plans
        if (Array.isArray(multi) && multi.length) {
          const built = multi.map((it) => {
            let days = toDayItems(it.itinerary || it.days || [])
            if (expectedDays > 0 && days.length > expectedDays) {
              days = days.slice(0, expectedDays)
            }
            const start = days.length ? (days[0].place || '') : ''
            const end = days.length ? (days[days.length - 1].place || '') : ''
            const total = days.reduce((s, d) => s + (Number(d.cost) || 0), 0)
            return { days, start, end, total }
          }).filter(p => expectedDays ? p.days.length === expectedDays : true)
          setPlans(built)
          setSelectedPlanIdx(0)
          const first = built[0] || { days: [], total: 0 }
          setCards(first.days)
          setTotalCost(first.total || 0)
        } else {
          const items = toDayItems(data?.itinerary)
          const normalized = expectedDays > 0 ? items.slice(0, expectedDays) : items
          const total = normalized.reduce((s, d) => s + (Number(d.cost) || 0), 0)
          setPlans([{ days: normalized, start: normalized[0]?.place || '', end: normalized[normalized.length-1]?.place || '', total }])
          setSelectedPlanIdx(0)
          setCards(normalized)
          setTotalCost(total)
        }
      } catch {
        setCards([])
      } finally {
        setCardsLoading(false)
      }
    }
    fetchItinerary()
  }, [userId])

  useEffect(() => {
    const onProfileUpdated = () => {
      if (!userId) return
      const payload = buildPlanRequestFromProfile(userId)
      setCardsLoading(true)
      planTrip(payload)
        .then((data) => {
          const toDayItems = (arr) => (Array.isArray(arr) ? arr.map((d) => ({
            day: d.day,
            place: (Array.isArray(d.destinations) && d.destinations.length ? d.destinations[0] : (d.city || '')),
            cost: Number(d.cost) || 0,
          })) : [])
          const expectedDays = Number(payload?.duration) || 0
          const multi = data?.itineraries || data?.options || data?.plans
          if (Array.isArray(multi) && multi.length) {
            const built = multi.map((it) => {
              let days = toDayItems(it.itinerary || it.days || [])
              if (expectedDays > 0 && days.length > expectedDays) {
                days = days.slice(0, expectedDays)
              }
              const start = days.length ? (days[0].place || '') : ''
              const end = days.length ? (days[days.length - 1].place || '') : ''
              const total = days.reduce((s, d) => s + (Number(d.cost) || 0), 0)
              return { days, start, end, total }
            }).filter(p => expectedDays ? p.days.length === expectedDays : true)
            setPlans(built)
            setSelectedPlanIdx(0)
            const first = built[0] || { days: [], total: 0 }
            setCards(first.days)
            setTotalCost(first.total || 0)
          } else {
            const items = toDayItems(data?.itinerary)
            const normalized = expectedDays > 0 ? items.slice(0, expectedDays) : items
            const total = normalized.reduce((s, d) => s + (Number(d.cost) || 0), 0)
            setPlans([{ days: normalized, start: normalized[0]?.place || '', end: normalized[normalized.length-1]?.place || '', total }])
            setSelectedPlanIdx(0)
            setCards(normalized)
            setTotalCost(total)
          }
        })
        .catch(() => setCards([]))
        .finally(() => setCardsLoading(false))
    }
    window.addEventListener('profile:updated', onProfileUpdated)
    return () => window.removeEventListener('profile:updated', onProfileUpdated)
  }, [userId])

  const renderRoute = () => {
    switch (route) {
      case '#/profile-setup':
        return <ProfileSetup />
      case '#/map':
        return <MapPage />
      case '#/chat':
        return null
      case '#/insights':
        return <CulturalInsights />
      case '#/profile':
        return <UserProfile />
      case '#/login':
        return <Login />
      case '#/signup':
        return <Signup />
      default:
        return null
    }
  }

  return (
    <div className="app">
      <nav className="navbar">
        <a href="#/" className="brand">T<span className="brand-accent">our</span>istique</a>
        <div className="nav-actions" style={{ position: 'relative' }}>
          {!authUser && <a className="btn btn-ghost" href="#/login">Login</a>}
          {!authUser && <a className="btn btn-primary" href="#/signup">Sign Up</a>}
          {authUser && (
            <>
              <button className="btn btn-primary" onClick={() => setIsUserMenuOpen((v) => !v)}>
                Hi, {authUser.name?.split(' ')[0] || 'You'}
              </button>
              {isUserMenuOpen && (
                <div className="user-menu" style={{ position: 'absolute', right: 0, top: '48px', background: '#ffffff', borderRadius: '10px', boxShadow: '0 10px 24px rgba(0,0,0,0.08)', padding: '0.5rem', minWidth: '20px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <a href="#/profile" className="btn btn-ghost" style={{ width: '100%', boxSizing: 'border-box', border: 'none', textAlign: 'left' }} onClick={() => setIsUserMenuOpen(false)}>Profile</a>
                  <button className="btn btn-ghost" style={{ width: '100%', boxSizing: 'border-box', border: 'none', textAlign: 'left' }} onClick={() => { setIsUserMenuOpen(false); signOut(); }}>Logout</button>
                </div>
              )}
            </>
          )}
        </div>
      </nav>

      <main className="home">
        {route === '#/' && (
          <>
            <img src={homeImg} alt="Touristique home" className="home-bg" style={{ transform: `translateY(${imageOffsetY})` }} />
            <div className="home-content" style={{ top: contentTop, left: contentLeft }}>
              <div className="home-copy">
                <h1>{heading}</h1>
                <p>{subheading}</p>
                <div className="cta-group">
                  {authUser ? (
                    <a className="btn btn-primary" href="#/profile-setup">Find your next ship!</a>
                  ) : (
                    <>
                      <a className="btn btn-primary" href="#/signup">{primaryCta}</a>
                      <a className="btn btn-ghost" href="#/profile-setup">Find your next ship!</a>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="home-carousel" aria-hidden="true" style={{ position: 'absolute', top: contentTop, right: `${carouselRightOffsetPx}px` }}>
              <div className="carousel-viewport">
                <div className="carousel-track">
                  <img className="carousel-img" src={t1} alt="" />
                  <img className="carousel-img" src={t2} alt="" />
                  <img className="carousel-img" src={t3} alt="" />
                  <img className="carousel-img" src={t4} alt="" />
                  <img className="carousel-img" src={t5} alt="" />
                  <img className="carousel-img" src={t1} alt="" />
                  <img className="carousel-img" src={t2} alt="" />
                  <img className="carousel-img" src={t3} alt="" />
                  <img className="carousel-img" src={t4} alt="" />
                  <img className="carousel-img" src={t5} alt="" />
                </div>
              </div>
            </div>
            {authUser && plans.length > 0 && (
              <div className="plans-bar" id="itinerary-slab">
                <div className="plans-row">
                  {plans.map((p, i) => (
                    <button key={i} className={`plan-card${i===selectedPlanIdx ? ' selected' : ''}`} onClick={() => { setSelectedPlanIdx(i); setCards(p.days); setTotalCost(p.total || 0); setIsPlanModalOpen(true) }}>
                      <div className="plan-top">
                        <div className="plan-title">{p.start || 'Start'} → {p.end || 'End'}</div>
                        <div className="plan-badge">Plan {i+1}</div>
                      </div>
                      <div className="plan-meta">
                        <span>{p.days.length} days</span>
                        <span>₹{Number(p.total || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {route !== '#/' && (
          <div className="page-shell">
            {renderRoute()}
          </div>
        )}
      </main>
      <button className="chat-bubble" aria-label="Open chat" onClick={() => setIsChatOpen(true)}>
        <span className="chat-glyph">{chatLetters[chatIndex]}</span>
      </button>

      {isChatOpen && (
        <>
          <div className="chat-overlay" onClick={() => setIsChatOpen(false)} />
          <aside className="chat-panel" role="dialog" aria-label="Chat panel">
            <button className="chat-close" aria-label="Close chat" onClick={() => setIsChatOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="white" />
                <path d="M8 8L16 16M16 8L8 16" stroke="black" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="chat-panel-body">
              <div className="page chatbot-page">
                <div className="chat-shell">
                  <div className="chat-log">
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`msg ${m.role === 'ai' ? 'ai' : 'user'}`}>{m.text}</div>
                    ))}
                    {chatLoading && <div className="msg ai">Typing…</div>}
                  </div>
                  <div className="chat-input-row">
                    <input
                      className="input"
                      placeholder="Ask in Hindi, Bengali, English, or Tamil"
                      value={chatInput}
                      onChange={(e)=>setChatInput(e.target.value)}
                      onKeyDown={(e)=>{ if (e.key === 'Enter') { e.preventDefault(); sendChat() } }}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={sendChat}
                    >Send</button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
      {isPlanModalOpen && (
        <div className="plan-modal-overlay" onClick={()=>setIsPlanModalOpen(false)}>
          <div className="plan-modal" role="dialog" aria-label="Plan details" onClick={(e)=>e.stopPropagation()}>
            <div className="plan-modal-header">
              <div className="plan-modal-title">{plans[selectedPlanIdx]?.start || 'Start'} → {plans[selectedPlanIdx]?.end || 'End'}</div>
              <div className="plan-modal-meta">Days: {cards.length} • Total: ₹{Number(totalCost).toLocaleString('en-IN')}</div>
              
              <button className="plan-modal-close" aria-label="Close" onClick={()=>setIsPlanModalOpen(false)}>×</button>
            </div>
            <div className="plan-modal-body">
              {cardsLoading ? <p>Loading…</p> : (cards && cards.length ? <PersonalizedCards items={cards} /> : <p>No itinerary found.</p>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
