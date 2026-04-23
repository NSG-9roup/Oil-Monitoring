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
    <nav className="flex gap-2 overflow-x-auto" aria-label={ariaLabel}>
      {items.map((item) => (
        <button

          key={item.id}
          type="button"
          onClick={() => onItemClick(item.id)}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all ${
            item.isActive
              ? 'bg-gray-900 text-white shadow-sm'
              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
