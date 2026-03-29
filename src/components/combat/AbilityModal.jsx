import { useEffect } from 'react'

export function AbilityModal({ title, content, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="glass-toast rounded-xl w-full max-w-lg max-h-[70vh] flex flex-col"
        style={{ background: 'rgba(62, 62, 62, 0.65)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <h3 className="font-display text-sm font-semibold text-gold-400 uppercase tracking-widest">
            {title}
          </h3>
          <button
            className="text-slate-500 hover:text-slate-300 text-lg leading-none"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto text-sm text-slate-300 font-body leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  )
}
