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
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="glass-toast rounded-2xl w-80 p-5"
        style={{ background: 'rgba(62, 62, 62, 0.65)', boxShadow: 'inset 0 0 12px rgba(248,113,113,0.25), inset 1px 1px 4px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-[#e6e6e6] mb-1">
          Concentration Check
        </h3>
        <p className="text-xs text-[#7a7874] mb-3">
          {combatantName}{spellName ? ` - ${spellName}` : ''}
        </p>

        {/* DC and roll result */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="flex-1 text-center px-4 py-2 rounded-xl" style={{ background: '#282828', boxShadow: 'inset 2px 2px 3px #0e0e0e, inset -2px -2px 3px rgba(95, 94, 94, 0.4)' }}>
            <div className="text-[10px] text-[#7a7874] uppercase tracking-wider">DC</div>
            <div className="text-lg font-bold font-mono text-[#e6e6e6]">{dc}</div>
          </div>
          <div className="text-[#5a5854] shrink-0">vs</div>
          <div className="flex-1 text-center px-4 py-2 rounded-xl" style={{ background: '#282828', boxShadow: 'inset 2px 2px 3px #0e0e0e, inset -2px -2px 3px rgba(95, 94, 94, 0.4)' }}>
            <div className="text-[10px] text-[#7a7874] uppercase tracking-wider">Roll</div>
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
            className="btn-outline flex-1"
          >
            Keep
          </button>
          <button
            onClick={onDrop}
            className="flex-1 bg-red-400/80 hover:bg-red-400 text-white font-semibold text-sm rounded-xl px-4 py-2 transition-all shadow-neu-raised-sm hover:shadow-neu-glow-red active:shadow-neu-pressed"
          >
            Drop
          </button>
        </div>
      </div>
    </div>
  )
}
