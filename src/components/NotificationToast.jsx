import { useEffect, useState } from 'react'

const DURATION = 5000

export function useNotifications() {
  const [items, setItems] = useState([])

  const notify = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, message, type }])
  }

  const expire = (id) => {
    setItems((prev) => prev.filter((n) => n.id !== id))
  }

  return { items, notify, expire }
}

export function NotificationToast({ items, onExpire }) {
  if (!items.length) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[3000] flex flex-col gap-2 items-center pointer-events-none">
      {items.map((item) => (
        <ToastItem key={item.id} item={item} onExpire={onExpire} />
      ))}
    </div>
  )
}

function ToastItem({ item, onExpire }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => onExpire(item.id), DURATION)
    return () => clearTimeout(t)
  }, [item.id, onExpire])

  const colors = {
    success: 'border-emerald-500/30 bg-emerald-900/20',
    error:   'border-red-500/30 bg-red-900/20',
    info:    'border-blue-500/30 bg-blue-900/20',
  }

  const textColors = {
    success: 'text-emerald-400',
    error:   'text-red-400',
    info:    'text-blue-400',
  }

  const icons = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
  }

  return (
    <div
      className={[
        'pointer-events-auto border rounded-lg shadow-xl px-4 py-2.5 max-w-sm transition-all duration-300',
        colors[item.type] || colors.info,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold ${textColors[item.type] || textColors.info}`}>
          {icons[item.type] || icons.info}
        </span>
        <span className="text-xs text-[#e6e6e6]">{item.message}</span>
      </div>
    </div>
  )
}
