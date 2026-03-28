import { useEffect } from 'react'

export function ConcentrationPrompt({ check, combatantName, onKeep, onDrop, onClose }) {
  const { dc, roll, conMod, total, success, spellName } = check

  // Auto-dismiss on success after 3s
  useEffect(() => {
    if (success) {
      const t = setTimeout(onClose, 3000)
      return () => clearTimeout(t)
    }
  }, [success, onClose])

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const modStr = conMod >= 0 ? `+${conMod}` : String(conMod)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={success ? onClose : undefined}
    >
      <div
        className={`bg-[#252525] border rounded-lg w-80 p-5 ${success ? 'border-emerald-500/30' : 'border-red-500/30'}`}
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-[#e6e6e6] mb-1">
          Concentration Check
        </h3>
        <p className="text-xs text-[#9a9894] mb-3">
          {combatantName}{spellName ? ` - ${spellName}` : ''}
        </p>

        {/* DC and roll result */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-center">
            <div className="text-[10px] text-[#9a9894] uppercase tracking-wider">DC</div>
            <div className="text-lg font-bold font-mono text-[#e6e6e6]">{dc}</div>
          </div>
          <div className="text-[#9a9894]">vs</div>
          <div className="text-center">
            <div className="text-[10px] text-[#9a9894] uppercase tracking-wider">Roll</div>
            <div className={`text-lg font-bold font-mono ${success ? 'text-emerald-400' : 'text-red-400'}`}>
              {total}
            </div>
            <div className="text-[10px] text-[#787774] font-mono">
              d20({roll}){modStr}
            </div>
          </div>
        </div>

        {success ? (
          <div className="text-center">
            <p className="text-sm font-medium text-emerald-400 mb-2">Concentration maintained</p>
            <button
              onClick={onClose}
              className="text-xs text-[#9a9894] hover:text-[#e6e6e6] transition-colors"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-red-400 mb-3 text-center">Concentration check failed</p>
            <div className="flex gap-2">
              <button
                onClick={onKeep}
                className="flex-1 text-sm text-[#9a9894] hover:text-[#e6e6e6] hover:bg-white/[0.06] rounded px-4 py-2 transition-colors border border-white/[0.1]"
              >
                Keep
              </button>
              <button
                onClick={onDrop}
                className="flex-1 bg-red-500/80 hover:bg-red-500 text-white font-semibold text-sm rounded px-4 py-2 transition-colors"
              >
                Drop
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
