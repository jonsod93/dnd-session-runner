import { createContext, useContext, useState, useCallback } from 'react'

const AUTH_KEY = 'mythranos-auth-v1'

const AuthContext = createContext(null)

function decodePayload(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

function getStoredToken() {
  try {
    const token = localStorage.getItem(AUTH_KEY)
    if (!token || token === 'true') return null // ignore legacy boolean
    return decodePayload(token) ? token : null
  } catch {
    return null
  }
}

export function getToken() {
  return getStoredToken()
}

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(() => !!getStoredToken())

  const login = useCallback(async (username, password) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) return false
      const { token } = await res.json()
      localStorage.setItem(AUTH_KEY, token)
      setAuthed(true)
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    setAuthed(false)
  }, [])

  return (
    <AuthContext.Provider value={{ authed, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
