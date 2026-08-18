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
    <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-0.5 select-none" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onItemClick(item.id)}
          className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 border ${
            item.isActive
              ? 'bg-slate-900 border-slate-950 text-white shadow-md shadow-slate-900/10 scale-[1.02]'
              : 'bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          {item.id === 'trend' && (
            <svg className={`w-3.5 h-3.5 shrink-0 ${item.isActive ? 'text-orange-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          )}
          {item.id === 'analysis' && (
            <svg className={`w-3.5 h-3.5 shrink-0 ${item.isActive ? 'text-orange-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )}
          {item.id === 'lab' && (
            <svg className={`w-3.5 h-3.5 shrink-0 ${item.isActive ? 'text-orange-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          {item.id === 'requests' && (
            <svg className={`w-3.5 h-3.5 shrink-0 ${item.isActive ? 'text-orange-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          )}
          {item.id === 'orders' && (
            <svg className={`w-3.5 h-3.5 shrink-0 ${item.isActive ? 'text-orange-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
