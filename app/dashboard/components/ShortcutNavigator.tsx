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
    <nav
      className="mb-8 sticky top-24 z-40 rounded-2xl border-2 border-gray-200 bg-white/95 backdrop-blur px-3 py-3 shadow-lg"
      aria-label={ariaLabel}
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
              item.isActive
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
