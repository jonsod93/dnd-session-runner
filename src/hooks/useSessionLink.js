import { useState, useEffect, useRef } from 'react'
import { searchSessions } from '../utils/notionUtils'

const LS_KEY = 'mythranos-generators-session'

export default function useSessionLink({ persist = false } = {}) {
  const [linkedSession, setLinkedSession] = useState(() => {
    if (!persist) return null
    try {
      const stored = localStorage.getItem(LS_KEY)
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef(null)

  // Persist page-level session to localStorage
  useEffect(() => {
    if (!persist) return
    if (linkedSession) {
      localStorage.setItem(LS_KEY, JSON.stringify(linkedSession))
    } else {
      localStorage.removeItem(LS_KEY)
    }
  }, [linkedSession, persist])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearching(true)
      searchSessions(searchQuery)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, 400)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery])

  const linkSession = (session) => {
    setLinkedSession(session)
    setSearchQuery('')
    setSearchResults([])
  }

  const unlinkSession = () => setLinkedSession(null)

  return {
    linkedSession,
    setLinkedSession,
    linkSession,
    unlinkSession,
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
  }
}
