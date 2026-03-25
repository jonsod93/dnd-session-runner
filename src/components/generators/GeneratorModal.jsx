import { useState, useEffect } from 'react'
import useSessionLink from '../../hooks/useSessionLink'
import SessionLinker from './SessionLinker'
import {
  createNotionPage,
  appendSessionBlock,
  buildPersonProperties,
  buildLocationProperties,
  buildOrgProperties,
  PEOPLE_DB_ID,
  LOCATIONS_DB_ID,
  ORGANIZATIONS_DB_ID,
} from '../../utils/notionUtils'

export default function GeneratorModal({ generator, initialSession, onClose, onSaved }) {
  const subtypes = generator.subtypes ?? null
  const [activeSubtype, setActiveSubtype] = useState(subtypes?.[0] ?? null)

  const currentGenerate = activeSubtype?.generate ?? generator.generate
  const [name, setName] = useState(() => currentGenerate())
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Modal-level session (independent from page)
  const modal = useSessionLink()

  // Initialize modal session from page-level session
  useEffect(() => {
    if (initialSession) modal.setLinkedSession(initialSession)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, saving])

  const regenerate = () => {
    const gen = activeSubtype?.generate ?? generator.generate
    setName(gen())
  }

  const handleSubtypeChange = (subtype) => {
    setActiveSubtype(subtype)
    setName(subtype.generate())
  }

  const handleSave = async () => {
    if (!modal.linkedSession || !name.trim()) return
    setSaving(true)
    setError(null)

    try {
      // Build properties and determine target DB
      let dbId, properties
      const trimmedName = name.trim()
      const desc = description.trim() || undefined

      switch (generator.notionTarget) {
        case 'npc':
          dbId = PEOPLE_DB_ID
          properties = buildPersonProperties(trimmedName, desc)
          break
        case 'location':
          dbId = LOCATIONS_DB_ID
          properties = buildLocationProperties(trimmedName, generator.locationType, desc)
          break
        case 'organization':
          dbId = ORGANIZATIONS_DB_ID
          properties = buildOrgProperties(trimmedName, desc)
          break
        default:
          throw new Error(`Unknown target: ${generator.notionTarget}`)
      }

      // Create the entity in Notion
      const created = await createNotionPage(dbId, properties)

      // Append mention to the linked session
      await appendSessionBlock(modal.linkedSession.id, created.id)

      const label = activeSubtype ? activeSubtype.label : generator.label
      onSaved?.(trimmedName, label, desc || '')
      onClose()
    } catch (err) {
      console.error('Save failed:', err)
      setError(err.message || 'Failed to save to Notion')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-[#252525] border border-white/[0.1] rounded-lg w-full max-w-md flex flex-col max-h-[85vh]"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-[#e6e6e6]">
            Generate {generator.label}
          </h2>
          <button
            className="text-[#787774] hover:text-[#e6e6e6] text-base leading-none transition-colors"
            onClick={onClose}
            disabled={saving}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Subtype badges */}
          {subtypes && (
            <div>
              <label className="block text-xs text-[#787774] mb-1.5">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {subtypes.map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => handleSubtypeChange(st)}
                    className={[
                      'text-xs rounded px-2.5 py-1 border transition-colors',
                      activeSubtype?.key === st.key
                        ? 'border-gold-400/60 bg-gold-400/10 text-gold-400'
                        : 'border-white/[0.1] text-[#787774] hover:text-[#e6e6e6] hover:border-white/[0.2]',
                    ].join(' ')}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generated name */}
          <div>
            <label className="block text-xs text-[#787774] mb-1.5">Name</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent border-b border-white/[0.12] py-1.5 text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#787774] transition-colors"
              />
              <button
                type="button"
                onClick={regenerate}
                className="text-xs text-[#787774] hover:text-gold-400 border border-white/[0.1] hover:border-gold-400/40 rounded px-2 py-1 transition-colors shrink-0"
              >
                Re-generate
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-[#787774] mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full bg-[#1e1e1e] border border-white/[0.1] rounded px-3 py-2 text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400/40 placeholder:text-[#787774] transition-colors resize-none"
            />
          </div>

          {/* Session linker */}
          <div>
            <label className="block text-xs text-[#787774] mb-1.5">Linked Session</label>
            <SessionLinker
              linkedSession={modal.linkedSession}
              onLink={modal.linkSession}
              onUnlink={modal.unlinkSession}
              searchQuery={modal.searchQuery}
              setSearchQuery={modal.setSearchQuery}
              searchResults={modal.searchResults}
              searching={modal.searching}
              compact
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={handleSave}
            disabled={!modal.linkedSession || !name.trim() || saving}
            className="w-full bg-gold-400 hover:bg-gold-300 disabled:opacity-30 disabled:cursor-not-allowed text-[#1a1a1a] font-semibold text-sm rounded px-4 py-2.5 transition-colors"
          >
            {saving ? 'Saving...' : `Save and create ${generator.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}
