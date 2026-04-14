import { useState } from 'react'
import useSessionLink from '../hooks/useSessionLink'
import SessionLinker from '../components/generators/SessionLinker'
import GeneratorModal from '../components/generators/GeneratorModal'
import { GENERATORS } from '../utils/nameGenerators'
import ItemSearch from '../components/toolbox/ItemSearch'

let notifId = 0

export default function GeneratorsPage() {
  const session = useSessionLink({ persist: true })
  const [activeGenerator, setActiveGenerator] = useState(null)
  const [notifications, setNotifications] = useState([])

  const addNotification = (name, type, description, npcInfo) => {
    setNotifications((prev) => [...prev, { id: ++notifId, name, type, description, npcInfo }])
  }

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="h-full overflow-y-auto neumorphic" style={{ background: 'var(--neu-bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <h1 className="font-display text-lg font-semibold text-[#e6e6e6] mb-6">
          Toolbox
        </h1>

        {/* Page-level session linker */}
        <div className="mb-8">
          <label className="block text-xs text-[#787774] mb-2 uppercase tracking-[0.1em]">
            Session
          </label>
          <SessionLinker
            linkedSession={session.linkedSession}
            onLink={session.linkSession}
            onUnlink={session.unlinkSession}
            searchQuery={session.searchQuery}
            setSearchQuery={session.setSearchQuery}
            searchResults={session.searchResults}
            searching={session.searching}
          />
        </div>

        {/* Generator grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {GENERATORS.map((gen) => (
            <button
              key={gen.key}
              onClick={() => setActiveGenerator(gen)}
              className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl btn-outline transition-all cursor-pointer"
            >
              <span className="text-sm text-[#e6e6e6] transition-colors">
                {gen.label}
              </span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.06] my-8" />

        {/* Item search */}
        <ItemSearch />
      </div>

      {/* Generator modal */}
      {activeGenerator && (
        <GeneratorModal
          generator={activeGenerator}
          initialSession={session.linkedSession}
          onClose={() => setActiveGenerator(null)}
          onSaved={addNotification}
        />
      )}

      {/* Persistent notifications */}
      {notifications.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[3000] flex flex-col gap-2 max-w-sm">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="glass-panel rounded-xl shadow-lg px-4 py-3 flex gap-3 border-l-2 border-l-emerald-500"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs text-emerald-400 mb-0.5">{n.type}</div>
                <div className="text-sm text-[#e6e6e6] font-medium">{n.name}</div>
                {n.description && (
                  <div className="text-xs text-[#787774] mt-1 line-clamp-3">{n.description}</div>
                )}
                {n.npcInfo && (
                  <div className="text-xs text-[#787774] mt-1.5 border-t border-black/[0.15] pt-1.5">
                    <span className="text-purple-400">{n.npcInfo.role}:</span> {n.npcInfo.name}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeNotification(n.id)}
                className="text-[#787774] hover:text-[#e6e6e6] text-sm leading-none transition-colors shrink-0 self-start"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
