import { useState } from 'react'
import useSessionLink from '../hooks/useSessionLink'
import SessionLinker from '../components/generators/SessionLinker'
import GeneratorModal from '../components/generators/GeneratorModal'
import { GENERATORS } from '../utils/nameGenerators'

export default function GeneratorsPage() {
  const session = useSessionLink({ persist: true })
  const [activeGenerator, setActiveGenerator] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (name, type) => {
    setToast(`Created ${type}: ${name}`)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="h-full overflow-y-auto bg-[#1a1a1a]">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <h1 className="font-display text-lg font-semibold text-[#e6e6e6] mb-6">
          Name Generators
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
              className="flex flex-col items-center gap-2 px-4 py-5 rounded-lg border border-white/[0.08] bg-[#252525] hover:border-gold-400/40 hover:bg-white/[0.04] transition-colors group"
            >
              <span className="text-sm text-[#e6e6e6] group-hover:text-gold-300 transition-colors">
                {gen.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Generator modal */}
      {activeGenerator && (
        <GeneratorModal
          generator={activeGenerator}
          initialSession={session.linkedSession}
          onClose={() => setActiveGenerator(null)}
          onSaved={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3000] bg-emerald-600/90 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
