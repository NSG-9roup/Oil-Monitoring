'use client'

import { useState } from 'react'
import { glossary, type GlossaryKey } from '@/lib/constants/glossary'

interface GlossaryTooltipProps {
  termKey: GlossaryKey
  language?: 'id' | 'en'
  /** Teks yang ditampilkan (default: term dari glossary) */
  label?: string
  className?: string
}

/**
 * GlossaryTooltip — tampilkan tooltip definisi istilah teknis saat hover/tap.
 * Mobile-friendly: tap untuk toggle, hover untuk desktop.
 */
export function GlossaryTooltip({
  termKey,
  language = 'id',
  label,
  className = '',
}: GlossaryTooltipProps) {
  const [open, setOpen] = useState(false)
  const entry = glossary[termKey][language]

  return (
    <span className={`relative inline-flex items-center gap-1 ${className}`}>
      <span>{label ?? entry.term}</span>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Penjelasan: ${entry.term}`}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-300 hover:bg-primary-500 hover:text-white text-gray-600 text-[10px] font-bold cursor-help transition-colors flex-shrink-0"
      >
        ?
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute z-50 bottom-7 left-0 w-72 bg-gray-900 text-white rounded-2xl shadow-2xl p-4 text-left pointer-events-none"
        >
          {/* Arrow */}
          <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-gray-900 rotate-45" />

          <p className="font-black text-sm mb-2 text-primary-300">{entry.term}</p>
          <p className="text-xs text-gray-300 leading-relaxed mb-3">{entry.definition}</p>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              <span className="text-gray-400">Normal:</span>
              <span className="font-semibold text-green-300">{entry.normalRange}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
              <span className="text-gray-400">Warning:</span>
              <span className="font-semibold text-yellow-300">{entry.warningRange}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
              <span className="text-gray-400">Kritis:</span>
              <span className="font-semibold text-red-300">{entry.criticalRange}</span>
            </div>
          </div>

          {entry.tip && (
            <p className="mt-3 text-[11px] text-blue-300 italic border-t border-gray-700 pt-2">
              💡 {entry.tip}
            </p>
          )}

          <p className="mt-2 text-[10px] text-gray-500">Satuan: {entry.unit}</p>
        </div>
      )}
    </span>
  )
}
