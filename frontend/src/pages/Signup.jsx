import { useEffect, useRef, useState } from 'react'
import { initializeGoogle } from '../auth'

export function Signup() {
  const [ready, setReady] = useState(false)
  const gBtnRef = useRef(null)
  useEffect(() => {
    initializeGoogle().then(setReady)
  }, [])
  useEffect(() => {
    if (!ready) return
    if (window.google?.accounts?.id && gBtnRef.current) {
      try {
        window.google.accounts.id.renderButton(gBtnRef.current, {
          type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'left'
        })
      } catch {}
    }
  }, [ready])

  return (
    <section className="page signup-page">
      <h2>Begin your journey with Touristique!</h2>
      <p>Get started with Google to save preferences and itineraries.</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <div ref={gBtnRef} />
      </div>
    </section>
  )
}


