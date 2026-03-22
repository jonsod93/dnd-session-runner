import { createContext, useContext, useState, useCallback } from 'react'

const AUTH_KEY = 'mythranos-auth-v1'
const VALID_USER = 'Jonathan'
const VALID_PASS = '93922319'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(() => {
    try {
      return localStorage.getItem(AUTH_KEY) === 'true'
    } catch {
      return false
    }
  })

  const login = useCallback((username, password) => {
    if (username === VALID_USER && password === VALID_PASS) {
      localStorage.setItem(AUTH_KEY, 'true')
      setAuthed(true)
      return true
    }
    return false
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
