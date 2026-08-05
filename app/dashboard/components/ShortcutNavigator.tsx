'use client'

interface ShortcutItem {
  id: string
  label: string
  isActive?: boolean
}

interface ShortcutNavigatorProps {
  items: ShortcutItem[]
  onItemClick: (itemId: string) => void
  ariaLabel: string
}

export function ShortcutNavigator({ items, onItemClick, ariaLabel }: ShortcutNavigatorProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto p-1 select-none scrollbar-hide" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onItemClick(item.id)}
          className={`whitespace-nowrap rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
            item.isActive
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.02]'
              : 'bg-white/80 text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
          }`}
        >
          {item.id === 'trend' && <span>📈</span>}
          {item.id === 'analysis' && <span>🧠</span>}
          {item.id === 'lab' && <span>📄</span>}
          {item.id === 'requests' && <span>⏳</span>}
          {item.id === 'orders' && <span>📦</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
