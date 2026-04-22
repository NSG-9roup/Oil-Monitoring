import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts'
import { GlossaryTooltip } from '@/app/components/GlossaryTooltip'
import { SectionHeader } from '@/app/dashboard/components/SectionHeader'
import type { ChartPoint, DashboardLanguage, TrendAlertItem } from '@/app/dashboard/components/types'

interface TrendSectionProps {
  language: DashboardLanguage
  chartData: ChartPoint[]
  chartHeight: number
  selectedMachineTrendAlerts: TrendAlertItem[]
  performanceTitle: string
  performanceDesc: string
  noSampleData: string
  checkConsole: string
  noDataAvailable: string
  trendAlertsTitle: string
  trendAlertsDesc: string
  activeTrendAlertsLabel: string
  noTrendAlerts: string
  severityLowLabel: string
  severityMediumLabel: string
  severityHighLabel: string
  recommendedActionLabel: string
  onOpenLabDetails: () => void
  onOpenActionCenter: () => void
}

export function TrendSection({
  language,
  chartData,
  chartHeight,
  selectedMachineTrendAlerts,
  performanceTitle,
  performanceDesc,
  noSampleData,
  checkConsole,
  noDataAvailable,
  trendAlertsTitle,
  trendAlertsDesc,
  activeTrendAlertsLabel,
  noTrendAlerts,
  severityLowLabel,
  severityMediumLabel,
  severityHighLabel,
  recommendedActionLabel,
  onOpenLabDetails,
  onOpenActionCenter,
}: TrendSectionProps) {
  return (
    <>
      <div className="bg-gray-50 rounded-3xl p-8 -mx-4 sm:mx-0">
        <SectionHeader
          title={performanceTitle}
          description={performanceDesc}
          titleClassName="text-3xl"
          actions={
            <button
              type="button"
              onClick={onOpenLabDetails}
              className="px-4 py-2 rounded-xl border border-primary-200 text-primary-700 font-semibold hover:bg-primary-50 transition-colors"
            >
              {language === 'id' ? 'Lihat Detail Laporan' : 'View Report Details'}
            </button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-primary-500 rounded-full mr-3"></span>
              <GlossaryTooltip termKey="viscosity40c" language={language} label="Viscosity Trend" />
            </h3>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] sm:h-[250px] lg:h-[300px] text-gray-400">
                <svg className="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="font-semibold">{noSampleData}</p>
                <p className="text-sm text-gray-400 mt-1">{checkConsole}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '0', borderRadius: '12px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="viscosity_40c" name="Viscosity @40°C" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', r: 5 }} />
                  <Line type="monotone" dataKey="viscosity_100c" name="Viscosity @100°C" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 5 }} />
                  {selectedMachineTrendAlerts
                    .filter((alert) => alert.parameter === 'Viscosity')
                    .map((alert) => (
                      <ReferenceDot key={alert.id} x={new Date(alert.chartDate).toLocaleDateString()} y={alert.chartValue} r={7} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-secondary-500 rounded-full mr-3"></span>
              <GlossaryTooltip termKey="waterContent" language={language} label={language === 'id' ? 'Kandungan Air' : 'Water Content'} />
            </h3>
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <p>{noDataAvailable}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="water" stroke="#dc2626" strokeWidth={3} dot={{ fill: '#dc2626', r: 5 }} />
                  {selectedMachineTrendAlerts
                    .filter((alert) => alert.parameter === 'Water content')
                    .map((alert) => (
                      <ReferenceDot key={alert.id} x={new Date(alert.chartDate).toLocaleDateString()} y={alert.chartValue} r={7} fill="#f59e0b" stroke="#ffffff" strokeWidth={2} />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-industrial-500 rounded-full mr-3"></span>
              <GlossaryTooltip termKey="tan" language={language} label="Total Acid Number (TAN)" />
            </h3>
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <p>{noDataAvailable}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="tan" stroke="#b91c1c" strokeWidth={3} dot={{ fill: '#b91c1c', r: 5 }} />
                  {selectedMachineTrendAlerts
                    .filter((alert) => alert.parameter === 'TAN')
                    .map((alert) => (
                      <ReferenceDot key={alert.id} x={new Date(alert.chartDate).toLocaleDateString()} y={alert.chartValue} r={7} fill="#8b5cf6" stroke="#ffffff" strokeWidth={2} />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
        <SectionHeader
          title={trendAlertsTitle}
          description={trendAlertsDesc}
          titleClassName="text-3xl"
          actions={
            <>
              <button
                type="button"
                onClick={onOpenActionCenter}
                className="px-4 py-2 rounded-xl border border-primary-200 text-primary-700 font-semibold hover:bg-primary-50 transition-colors"
              >
                {language === 'id' ? 'Tindak Lanjuti di Action Center' : 'Follow Up in Action Center'}
              </button>
              <div className="px-3 py-2 rounded-xl bg-gray-100 text-sm text-gray-700 font-semibold">{activeTrendAlertsLabel}</div>
            </>
          }
        />

        {selectedMachineTrendAlerts.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 font-medium">{noTrendAlerts}</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {selectedMachineTrendAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-2xl border p-5 ${
                  alert.severity === 'High'
                    ? 'border-red-200 bg-red-50/70'
                    : alert.severity === 'Medium'
                    ? 'border-amber-200 bg-amber-50/70'
                    : 'border-sky-200 bg-sky-50/70'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide ${
                      alert.severity === 'High'
                        ? 'bg-red-100 text-red-700'
                        : alert.severity === 'Medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {alert.severity === 'High' ? severityHighLabel : alert.severity === 'Medium' ? severityMediumLabel : severityLowLabel}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">{alert.parameter}</span>
                </div>
                <h3 className="text-lg font-black text-gray-900">{alert.title}</h3>
                <p className="text-sm text-gray-700 mt-2">{alert.message}</p>
                <p className="text-sm text-gray-800 mt-3">
                  <span className="font-semibold">{recommendedActionLabel}:</span> {alert.recommendedAction}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
