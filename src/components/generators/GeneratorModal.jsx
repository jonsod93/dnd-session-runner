import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import useSessionLink from '../../hooks/useSessionLink'
import SessionLinker from './SessionLinker'
import { generateNPCName } from '../../utils/nameGenerators'
import {
  createNotionPage,
  appendSessionBlock,
  buildPersonProperties,
  buildLocationProperties,
  buildOrgProperties,
  fetchIngredients,
  fetchTradeItems,
  PEOPLE_DB_ID,
  LOCATIONS_DB_ID,
  ORGANIZATIONS_DB_ID,
} from '../../utils/notionUtils'

export default function GeneratorModal({ generator, initialSession, onClose, onSaved }) {
  const isContentGenerator = !!generator.options

  // ── Content generator state ──
  const [selectedOptions, setSelectedOptions] = useState(() => {
    if (!generator.options) return {}
    const defaults = {}
    generator.options.forEach(opt => { defaults[opt.key] = opt.default || opt.choices[0] })
    return defaults
  })
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)
  const [notionIngredients, setNotionIngredients] = useState(null)
  const [ingredientsLoading, setIngredientsLoading] = useState(false)
  const ingredientsFetched = useRef(false)
  const [notionTradeItems, setNotionTradeItems] = useState(null)
  const [tradeItemsLoading, setTradeItemsLoading] = useState(false)
  const tradeItemsFetched = useRef(false)

  // ── Name generator state ──
  const subtypes = generator.subtypes ?? null
  const [activeSubtype, setActiveSubtype] = useState(subtypes?.[0] ?? null)
  const currentGenerate = activeSubtype?.generate ?? generator.generate
  const [name, setName] = useState(() => isContentGenerator ? '' : currentGenerate())
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // NPC generation state (only for generators that support it)
  const hasNpc = !!generator.npcRole
  const [npcEnabled, setNpcEnabled] = useState(false)
  const [npcName, setNpcName] = useState('')
  const [npcDescription, setNpcDescription] = useState('')

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

  // Fetch Notion data once when shop generator opens
  useEffect(() => {
    if (generator.key !== 'shop') return
    if (!ingredientsFetched.current) {
      ingredientsFetched.current = true
      setIngredientsLoading(true)
      fetchIngredients()
        .then(items => setNotionIngredients(items))
        .catch(() => setNotionIngredients(null))
        .finally(() => setIngredientsLoading(false))
    }
    if (!tradeItemsFetched.current) {
      tradeItemsFetched.current = true
      setTradeItemsLoading(true)
      fetchTradeItems()
        .then(items => setNotionTradeItems(items))
        .catch(() => setNotionTradeItems(null))
        .finally(() => setTradeItemsLoading(false))
    }
  }, [generator.key])

  // Generate content on mount and when options change
  useEffect(() => {
    if (!isContentGenerator) return
    const opts = { ...selectedOptions }
    if (generator.key === 'shop') {
      if (opts.shopType === 'Ingredients' && notionIngredients) opts.notionIngredients = notionIngredients
      if (opts.shopType === 'Magical Items' && notionTradeItems) opts.notionTradeItems = notionTradeItems
    }
    setOutput(generator.generate(opts))
  }, [selectedOptions, notionIngredients, notionTradeItems]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleOptionChange = (key, value) => {
    setSelectedOptions(prev => ({ ...prev, [key]: value }))
  }

  const regenerateContent = () => {
    const opts = { ...selectedOptions }
    if (generator.key === 'shop') {
      if (opts.shopType === 'Ingredients' && notionIngredients) opts.notionIngredients = notionIngredients
      if (opts.shopType === 'Magical Items' && notionTradeItems) opts.notionTradeItems = notionTradeItems
    }
    setOutput(generator.generate(opts))
  }

  // Convert structured output to plain text for clipboard
  const outputText = Array.isArray(output)
    ? output.map(l => l.text).join('\n')
    : output

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard may not be available */ }
  }

  // Color map for structured output lines
  const LINE_COLORS = {
    green: 'text-emerald-400',
    blue: 'text-sky-400',
  }

  // ── Name generator handlers ──
  const regenerate = () => {
    const gen = activeSubtype?.generate ?? generator.generate
    setName(gen())
  }

  const handleSubtypeChange = (subtype) => {
    setActiveSubtype(subtype)
    setName(subtype.generate())
  }

  const handleToggleNpc = () => {
    if (!npcEnabled) {
      if (!npcName) setNpcName(generateNPCName())
      setNpcEnabled(true)
    } else {
      setNpcEnabled(false)
    }
  }

  const handleSave = async () => {
    if (!modal.linkedSession || !name.trim()) return
    setSaving(true)
    setError(null)

    try {
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

      const created = await createNotionPage(dbId, properties)
      await appendSessionBlock(modal.linkedSession.id, created.id)

      let npcCreated = null
      if (hasNpc && npcEnabled && npcName.trim()) {
        const npcBlurb = npcDescription.trim() || undefined
        const relations = {}
        if (generator.npcRelation === 'location') {
          relations.locationId = created.id
        } else if (generator.npcRelation === 'organization') {
          relations.orgId = created.id
        }

        const npcProps = buildPersonProperties(npcName.trim(), npcBlurb, relations)
        npcCreated = await createNotionPage(PEOPLE_DB_ID, npcProps)
        await appendSessionBlock(modal.linkedSession.id, npcCreated.id)
      }

      const label = activeSubtype ? activeSubtype.label : generator.label
      onSaved?.(trimmedName, label, desc || '', npcCreated ? { name: npcName.trim(), role: generator.npcRole } : null)
      onClose()
    } catch (err) {
      console.error('Save failed:', err)
      setError(err.message || 'Failed to save to Notion')
      setSaving(false)
    }
  }

  // ── Content generator modal ──
  if (isContentGenerator) {
    const isIngredients = generator.key === 'shop' && selectedOptions.shopType === 'Ingredients'
    const isMagical = generator.key === 'shop' && selectedOptions.shopType === 'Magical Items'
    const usingNotionIngredients = isIngredients && notionIngredients && notionIngredients.length > 0
    const usingNotionTradeItems = isMagical && notionTradeItems && notionTradeItems.length > 0

    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 neumorphic"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      >
        <div
          className="glass-modal rounded-2xl w-full max-w-md flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.15]">
            <h2 className="text-sm font-medium text-[#e6e6e6]">
              Generate {generator.label}
            </h2>
            <button
              className="text-[#787774] hover:text-[#e6e6e6] text-base leading-none transition-colors"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Option selectors */}
            {generator.options
              .filter(opt => {
                if (!opt.showWhen) return true
                return Object.entries(opt.showWhen).every(([k, v]) => selectedOptions[k] === v)
              })
              .map(opt => (
              <div key={opt.key}>
                <label className="block text-xs text-[#787774] mb-1.5">{opt.label}</label>
                <div className="flex flex-wrap gap-1.5">
                  {opt.choices.map(choice => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => handleOptionChange(opt.key, choice)}
                      className={[
                        'text-xs rounded-lg px-2.5 py-1 transition-colors',
                        selectedOptions[opt.key] === choice
                          ? 'btn-action !border-gold-400/60 !bg-gold-400/10 text-gold-400'
                          : 'btn-action',
                      ].join(' ')}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Notion status indicator */}
            {isIngredients && (
              <div className="text-[10px] text-[#787774]">
                {ingredientsLoading ? 'Loading ingredients from Notion...' :
                 usingNotionIngredients ? `Using ${notionIngredients.length} ingredients from Notion` :
                 'Using random ingredients (Notion unavailable)'}
              </div>
            )}
            {isMagical && (
              <div className="text-[10px] text-[#787774]">
                {tradeItemsLoading ? 'Loading items from Notion...' :
                 usingNotionTradeItems ? `Using ${notionTradeItems.length} items from Notion` :
                 'Using random items (Notion unavailable)'}
              </div>
            )}

            {/* Output block */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[#787774]">Result</label>
                <button
                  type="button"
                  onClick={regenerateContent}
                  className="btn-action text-xs"
                >
                  Re-generate
                </button>
              </div>
              {Array.isArray(output) ? (
                <div className="w-full input-field !rounded-xl font-mono leading-relaxed min-h-[120px] max-h-[300px] overflow-y-auto">
                  {output.map((line, i) => (
                    <div key={i} className={line.color ? LINE_COLORS[line.color] : 'text-[#e6e6e6]'}>
                      {line.text || '\u00A0'}
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="w-full input-field !rounded-xl font-mono whitespace-pre-wrap leading-relaxed min-h-[120px] max-h-[300px] overflow-y-auto">
                  {output}
                </pre>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-black/[0.15]">
            <button
              onClick={handleCopy}
              className="w-full btn-action !text-sm !py-2.5 font-semibold"
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // ── Name generator modal (existing behavior) ──
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 neumorphic"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={() => !saving && onClose()}
    >
      <div
        className="glass-modal rounded-2xl w-full max-w-md flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.15]">
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
                      'text-xs rounded-lg px-2.5 py-1 transition-colors',
                      activeSubtype?.key === st.key
                        ? 'btn-action !border-gold-400/60 !bg-gold-400/10 text-gold-400'
                        : 'btn-action',
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
                className="input-field flex-1"
              />
              <button
                type="button"
                onClick={regenerate}
                className="btn-action text-xs shrink-0"
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
              className="input-field w-full resize-none"
            />
          </div>

          {/* NPC generation section */}
          {hasNpc && (
            <div className="glass-panel rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={handleToggleNpc}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-[#383b43] transition-colors"
              >
                <span className={npcEnabled ? 'text-[#e6e6e6]' : 'text-[#787774]'}>
                  {generator.npcRole}
                  <span className="text-[#787774] ml-1">(NPC)</span>
                </span>
                <span className={[
                  'text-[10px] rounded px-1.5 py-0.5 border transition-colors',
                  npcEnabled
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-white/[0.1] text-[#787774]',
                ].join(' ')}>
                  {npcEnabled ? 'On' : 'Off'}
                </span>
              </button>

              {npcEnabled && (
                <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-black/[0.15]">
                  {/* NPC name */}
                  <div>
                    <label className="block text-xs text-[#787774] mb-1.5">{generator.npcRole} name</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={npcName}
                        onChange={(e) => setNpcName(e.target.value)}
                        className="input-field flex-1"
                        placeholder="NPC name..."
                      />
                      <button
                        type="button"
                        onClick={() => setNpcName(generateNPCName())}
                        className="btn-action text-xs shrink-0"
                      >
                        Re-generate
                      </button>
                    </div>
                  </div>

                  {/* NPC description */}
                  <div>
                    <label className="block text-xs text-[#787774] mb-1.5">{generator.npcRole} description</label>
                    <textarea
                      value={npcDescription}
                      onChange={(e) => setNpcDescription(e.target.value)}
                      placeholder="Optional description..."
                      rows={2}
                      className="input-field w-full resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-black/[0.15]">
          <button
            onClick={handleSave}
            disabled={!modal.linkedSession || !name.trim() || saving}
            className="w-full btn-action !text-sm !py-2.5 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : `Save and create ${generator.label}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
