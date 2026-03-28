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
        className="glass-modal rounded-2xl w-80 p-5 !border-red-400/30"
        style={{ boxShadow: '0 0 24px rgba(248, 113, 113, 0.15), 0 24px 80px rgba(0,0,0,0.7)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-[#e6e6e6] mb-1">
          Concentration Check
        </h3>
        <p className="text-xs text-[#7a7874] mb-3">
          {combatantName}{spellName ? ` - ${spellName}` : ''}
        </p>

        {/* DC and roll result */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-center stat-card px-4 py-2">
            <div className="text-[10px] text-[#7a7874] uppercase tracking-wider">DC</div>
            <div className="text-lg font-bold font-mono text-[#e6e6e6]">{dc}</div>
          </div>
          <div className="text-[#5a5854]">vs</div>
          <div className="text-center stat-card px-4 py-2">
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
            className="flex-1 bg-red-400/80 hover:bg-red-400 text-white font-semibold text-sm rounded-xl px-4 py-2 transition-all hover:shadow-neon-red"
          >
            Drop
          </button>
        </div>
      </div>
    </div>
  )
}
