import './App.css'
import homeImg from './pics/home.jpg'
import { useEffect, useState } from 'react'
import { ProfileSetup } from './pages/ProfileSetup'
import { Recommendations } from './pages/Recommendations'
import { MapPage } from './pages/MapPage'
import { CulturalInsights } from './pages/CulturalInsights'
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
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const [isChatOpen, setIsChatOpen] = useState(false)

  const renderRoute = () => {
    switch (route) {
      case '#/profile':
        return <ProfileSetup />
      case '#/recommendations':
        return <Recommendations />
      case '#/map':
        return <MapPage />
      case '#/chat':
        return null
      case '#/insights':
        return <CulturalInsights />
      default:
        return null
    }
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="brand">T<span className="brand-accent">our</span>istique</div>
        <div className="nav-actions">
          <button className="btn btn-ghost">Login</button>
          <button className="btn btn-primary">Sign Up</button>
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
                  <a className="btn btn-primary" href="#/profile">{primaryCta}</a>
                  <a className="btn btn-ghost" href="#/recommendations">{secondaryCta}</a>
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
