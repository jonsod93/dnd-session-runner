import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { VERIFIER_KEY, REDIRECT_URI, CLIENT_ID } from '../hooks/useSpotify'

/**
 * Handles the OAuth redirect from Spotify.
 * Exchanges the authorization code for tokens, stores them, then navigates home.
 * This page is only visited once per auth cycle.
 */
export default function SpotifyCallback() {
  const navigate = useNavigate()
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    const params   = new URLSearchParams(window.location.search)
    const code     = params.get('code')
    const error    = params.get('error')
    const verifier = sessionStorage.getItem(VERIFIER_KEY)

    if (error || !code || !verifier || !CLIENT_ID) {
      console.error('[Spotify] callback error:', error || 'missing code/verifier')
      navigate('/', { replace: true })
      return
    }

    sessionStorage.removeItem(VERIFIER_KEY)

    fetch('https://accounts.spotify.com/api/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:   REDIRECT_URI,
        client_id:      CLIENT_ID,
        code_verifier:  verifier,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`token exchange ${res.status}`)
        return res.json()
      })
      .then((data) => {
        // Save tokens — import saveTokens logic inline to avoid circular deps
        const STORAGE_KEY = 'mythranos-spotify'
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          access_token:  data.access_token,
          refresh_token: data.refresh_token,
          expires_at:    Date.now() + (data.expires_in - 60) * 1000,
        }))
        navigate('/', { replace: true })
      })
      .catch((err) => {
        console.error('[Spotify] token exchange failed:', err)
        navigate('/', { replace: true })
      })
  }, [navigate])

  return (
    <div className="flex items-center justify-center h-screen bg-[#1a1a1a]">
      <p className="text-[#9a9894] text-sm">Connecting Spotify…</p>
    </div>
  )
}
