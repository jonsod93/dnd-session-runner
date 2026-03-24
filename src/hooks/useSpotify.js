import { useState, useCallback } from 'react'

const CLIENT_ID    = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const STORAGE_KEY  = 'mythranos-spotify'
const VERIFIER_KEY = 'mythranos-spotify-verifier'
const SCOPE        = 'user-modify-playback-state'
const REDIRECT_URI = `${window.location.origin}/spotify-callback`

// ── PKCE helpers ─────────────────────────────────────────────────────────────

function randomBytes(length) {
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return arr
}

function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function generatePKCE() {
  const verifier  = base64url(randomBytes(48))
  const challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  return { verifier, challenge }
}

// ── Token storage ─────────────────────────────────────────────────────────────

function loadTokens() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null } catch { return null }
}

function saveTokens(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    Date.now() + (data.expires_in - 60) * 1000, // 60s buffer
  }))
}

function clearTokens() {
  localStorage.removeItem(STORAGE_KEY)
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     CLIENT_ID,
    }),
  })
  if (!res.ok) throw new Error('refresh failed')
  const data = await res.json()
  // Spotify may or may not return a new refresh_token on refresh
  saveTokens({ ...data, refresh_token: data.refresh_token || refreshToken })
  return data.access_token
}

async function getValidToken() {
  const tokens = loadTokens()
  if (!tokens) return null
  if (Date.now() < tokens.expires_at) return tokens.access_token
  try {
    return await refreshAccessToken(tokens.refresh_token)
  } catch {
    clearTokens()
    return null
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSpotify() {
  const [isConnected, setIsConnected] = useState(() => {
    const t = loadTokens()
    return !!(t?.refresh_token)
  })

  // Initiate PKCE auth — redirects to Spotify
  const connect = useCallback(async () => {
    if (!CLIENT_ID) return
    try {
      const { verifier, challenge } = await generatePKCE()
      sessionStorage.setItem(VERIFIER_KEY, verifier)
      const params = new URLSearchParams({
        response_type:         'code',
        client_id:             CLIENT_ID,
        scope:                 SCOPE,
        redirect_uri:          REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge:        challenge,
      })
      window.location.href = `https://accounts.spotify.com/authorize?${params}`
    } catch (err) {
      console.error('[Spotify] connect error:', err)
    }
  }, [])

  // Start playback of a context URI (playlist, album, etc.)
  const play = useCallback(async (contextUri) => {
    if (!CLIENT_ID || !contextUri) return
    try {
      let token = await getValidToken()
      if (!token) return // not connected — silent no-op

      const attempt = async (t) =>
        fetch('https://api.spotify.com/v1/me/player/play', {
          method:  'PUT',
          headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ context_uri: contextUri }),
        })

      let res = await attempt(token)

      // Retry once after token refresh on 401
      if (res.status === 401) {
        const tokens = loadTokens()
        if (!tokens?.refresh_token) { clearTokens(); setIsConnected(false); return }
        try {
          token = await refreshAccessToken(tokens.refresh_token)
          res = await attempt(token)
        } catch {
          clearTokens(); setIsConnected(false); return
        }
      }

      // 404 = no active device, 403 = not Premium — both are silent
      if (!res.ok && res.status !== 404 && res.status !== 403) {
        console.warn('[Spotify] play returned', res.status)
      }
    } catch (err) {
      console.warn('[Spotify] play error:', err)
    }
  }, [])

  const disconnect = useCallback(() => {
    clearTokens()
    setIsConnected(false)
  }, [])

  // Called by SpotifyCallback after successful token exchange
  const handleCallback = useCallback((tokenData) => {
    saveTokens(tokenData)
    setIsConnected(true)
  }, [])

  return { isConnected, connect, play, disconnect, handleCallback, enabled: !!CLIENT_ID }
}

// Exported for use in SpotifyCallback (token exchange)
export { getValidToken, VERIFIER_KEY, REDIRECT_URI, CLIENT_ID }
