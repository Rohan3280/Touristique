import { useEffect, useRef, useState } from 'react'
import { initializeGoogle } from '../auth'

export function Login() {
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
    <section className="page login-page">
      <h2>Welcome back!</h2>
      <p>Login to continue planning your trip</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <div ref={gBtnRef} />
      </div>
    </section>
  )
}


