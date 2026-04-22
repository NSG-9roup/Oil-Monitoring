import React from 'react'

interface MachineSelectorCardProps {
  machine: any
  isSelected: boolean
  onClick: () => void
  status: { level: 'critical' | 'warning' | 'normal'; text: string } | null
  samplingState: 'overdue' | 'upcoming' | 'on-schedule'
  samplingLabel: string
  healthScore: number | null
  daysSinceTest: number | null
  copy: any
}

export function MachineSelectorCard({
  machine,
  isSelected,
  onClick,
  status,
  samplingState,
  samplingLabel,
  healthScore,
  daysSinceTest,
  copy,
}: MachineSelectorCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 overflow-hidden flex-shrink-0 w-80 snap-start ${
        samplingState === 'overdue'
          ? 'border-red-200 hover:border-red-300'
          : isSelected 
          ? 'border-primary-500 ring-4 ring-primary-100' 
          : 'border-gray-100 hover:border-primary-300'
      }`}
    >
      {/* Status Indicator Bar */}
      <div className={`h-1.5 w-full ${
        !status ? 'bg-gray-300' :
        status.level === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-600' :
        status.level === 'warning' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
        'bg-gradient-to-r from-green-400 to-green-500'
      }`}></div>

      <div className="p-6">
        {/* Machine Name & Status */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
              {machine.machine_name}
            </h3>
            {status && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                status.level === 'critical' ? 'bg-red-100 text-red-700 border border-red-300' :
                status.level === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                'bg-green-100 text-green-700 border border-green-300'
              }`}>
                {status.level === 'critical' && '🔴'}
                {status.level === 'warning' && '🟡'}
                {status.level === 'normal' && '🟢'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 font-medium">{machine.location || copy.noLocation || 'No data'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              samplingState === 'overdue'
                ? 'bg-red-100 text-red-700 border-red-200'
                : samplingState === 'upcoming'
                ? 'bg-amber-100 text-amber-700 border-amber-200'
                : 'bg-emerald-100 text-emerald-700 border-emerald-200'
            }`}>
              {samplingLabel}
            </span>
          </div>
        </div>

        {/* Health Score */}
        {healthScore !== null ? (
          <div className="mb-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{copy.healthScore}</span>
              <span className={`text-2xl font-black ${
                healthScore >= 80 ? 'text-green-600' :
                healthScore >= 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>{healthScore}<span className="text-sm text-gray-400">/100</span></span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  healthScore >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                  healthScore >= 60 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                  'bg-gradient-to-r from-red-400 to-red-600'
                }`}
                style={{ width: `${healthScore}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="mb-4 text-center py-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 font-medium">{copy.noTestData}</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-gray-600 font-semibold mb-0.5">{copy.lastTest}</p>
            <p className="font-bold text-gray-900">
              {daysSinceTest !== null ? (
                daysSinceTest === 0 ? copy.today :
                daysSinceTest === 1 ? copy.yesterday :
                `${daysSinceTest} ${copy.daysAgo}`
              ) : copy.never}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-gray-600 font-semibold mb-0.5">{copy.statusLabel}</p>
            <p className="font-bold text-gray-900">
              {status?.text || copy.unknownStatus}
            </p>
          </div>
        </div>

        {/* Hover Indicator */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center text-primary-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          {copy.viewDetails} →
        </div>
      </div>
    </div>
  )
}
