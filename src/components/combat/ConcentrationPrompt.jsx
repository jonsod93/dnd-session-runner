import { useEffect } from 'react'

export function ConcentrationPrompt({ check, combatantName, onKeep, onDrop, onClose }) {
  const { dc, roll, conMod, total, spellName } = check

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const modStr = conMod >= 0 ? `+${conMod}` : String(conMod)

  return (
    <div
      className="fixed inset-0 z-[2250] flex items-center justify-center"
    >
      <div
        className="glass-toast rounded-2xl w-80 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-[#e6e6e6] mb-1">
          Concentration Check
        </h3>
        <p className="text-xs text-[#8a8884] mb-3">
          {combatantName}{spellName ? ` - ${spellName}` : ''}
        </p>

        {/* DC and roll result */}
        <div className="flex items-stretch justify-center gap-3 mb-4">
          <div className="flex-1 text-center px-4 py-2 rounded-xl" style={{ background: '#1e1e1e', boxShadow: 'var(--neum-inset)' }}>
            <div className="text-[10px] text-[#8a8884] uppercase tracking-wider">DC</div>
            <div className="text-lg font-bold font-mono text-[#e6e6e6]">{dc}</div>
          </div>
          <div className="text-[#5a5854] shrink-0">vs</div>
          <div className="flex-1 text-center px-4 py-2 rounded-xl" style={{ background: '#1e1e1e', boxShadow: 'var(--neum-inset)' }}>
            <div className="text-[10px] text-[#8a8884] uppercase tracking-wider">Roll</div>
            <div className="text-lg font-bold font-mono text-red-400">
              {total}
            </div>
            <div className="text-[10px] text-[#5a5854] font-mono">
              d20({roll}){modStr}
            </div>
          </div>
        </div>

        <p className="text-sm font-medium text-red-400 mb-3 text-center">Concentration check failed</p>
        <div className="flex gap-2">
          <button
            onClick={onKeep}
            className="flex-1 text-sm font-medium rounded-xl px-4 py-2 neu-btn-raised"
          >
            Keep
          </button>
          <button
            onClick={onDrop}
            className="flex-1 text-white font-semibold text-sm rounded-xl px-4 py-2 transition-all"
            style={{
              background: 'linear-gradient(145deg, #f87171, #c04040)',
              border: 'none',
              boxShadow: 'var(--neum-btn), 0 0 8px rgba(248,113,113,0.2)',
            }}
          >
            Drop
          </button>
        </div>
      </div>
    </div>
  )
}
