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
import { buildPlanRequestFromProfile, planTrip } from './api'
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [cards, setCards] = useState([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [totalCost, setTotalCost] = useState(0)
  const [plans, setPlans] = useState([])
  const [selectedPlanIdx, setSelectedPlanIdx] = useState(0)

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
        if (Array.isArray(data?.itineraries) && data.itineraries.length) {
          const built = data.itineraries.map((it) => {
            const days = toDayItems(it.itinerary || it.days || [])
            const start = days.length ? (days[0].place || '') : ''
            const end = days.length ? (days[days.length - 1].place || '') : ''
            const total = Number(it.total_cost || 0)
            return { days, start, end, total }
          })
          setPlans(built)
          setSelectedPlanIdx(0)
          const first = built[0] || { days: [], total: 0 }
          setCards(first.days)
          setTotalCost(first.total || 0)
        } else {
          const items = toDayItems(data?.itinerary)
          const total = Number(data?.total_cost) || 0
          setPlans([{ days: items, start: items[0]?.place || '', end: items[items.length-1]?.place || '', total }])
          setSelectedPlanIdx(0)
          setCards(items)
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
          if (Array.isArray(data?.itineraries) && data.itineraries.length) {
            const built = data.itineraries.map((it) => {
              const days = toDayItems(it.itinerary || it.days || [])
              const start = days.length ? (days[0].place || '') : ''
              const end = days.length ? (days[days.length - 1].place || '') : ''
              const total = Number(it.total_cost || 0)
              return { days, start, end, total }
            })
            setPlans(built)
            setSelectedPlanIdx(0)
            const first = built[0] || { days: [], total: 0 }
            setCards(first.days)
            setTotalCost(first.total || 0)
          } else {
            const items = toDayItems(data?.itinerary)
            const total = Number(data?.total_cost) || 0
            setPlans([{ days: items, start: items[0]?.place || '', end: items[items.length-1]?.place || '', total }])
            setSelectedPlanIdx(0)
            setCards(items)
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
            {authUser && (
              <div className="itinerary-slab" id="itinerary-slab">
                <div className="slab-header">
                  <div className="slab-title">Itinerary</div>
                  <div className="slab-stats">
                    <div className="stat"><span className="label">Days</span><span className="value">{cards.length || 0}</span></div>
                    <div className="stat"><span className="label">Total</span><span className="value">₹{Number(totalCost).toLocaleString('en-IN')}</span></div>
                  </div>
                </div>
                <div className="slab-body">
                  {plans.length > 1 && (
                    <div className="card-grid" style={{ marginBottom: '0.75rem' }}>
                      {plans.map((p, i) => (
                        <div key={i} className="rec-card" style={{ cursor: 'pointer', border: i === selectedPlanIdx ? '2px solid #ff8c42' : undefined }} onClick={() => { setSelectedPlanIdx(i); setCards(p.days); setTotalCost(p.total || 0) }}>
                          <div className="rec-body">
                            <h3 style={{ marginBottom: '0.25rem' }}>{p.start || 'Start'} → {p.end || 'End'}</h3>
                            <div className="row" style={{ justifyContent: 'space-between' }}>
                              <span>Plan {i + 1}</span>
                              <span>₹{Number(p.total || 0).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {cardsLoading ? (
                    <p>Loading…</p>
                  ) : (
                    <PersonalizedCards items={cards} />
                  )}
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
                    <div className="msg ai">नमस्ते! मैं कैसे मदद कर सकता/सकती हूँ?</div>
                    <div className="msg user">Plan a 3-day food trip in Kolkata</div>
                    <div className="msg ai">ঠিক আছে! আমি খাবারের জন্য সেরা স্থানের তালিকা করছি…</div>
                  </div>
                  <div className="chat-input-row">
                    <input className="input" placeholder="Ask in Hindi, Bengali, English, or Tamil" />
                    <button className="btn btn-primary">Send</button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

export default App
