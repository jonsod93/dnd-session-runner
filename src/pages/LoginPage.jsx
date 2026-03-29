import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const ok = await login(username, password)
    setLoading(false)
    if (!ok) setError(true)
  }

  return (
    <div className="min-h-screen neumorphic flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-xl font-bold text-gold-400 text-center mb-1 tracking-widest uppercase">Mythranos</h1>
        <p className="text-sm text-[#9a9894] text-center mb-8">D&D Session Runner</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#9a9894] mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(false) }}
              autoFocus
              className="input-field w-full rounded-xl px-3 py-2 text-sm text-[#e6e6e6] placeholder:text-[#7a7874] transition-all"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-sm text-[#9a9894] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false) }}
              className="input-field w-full rounded-xl px-3 py-2 text-sm text-[#e6e6e6] placeholder:text-[#7a7874] transition-all"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">Invalid username or password.</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-neon-gold w-full py-2.5 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
