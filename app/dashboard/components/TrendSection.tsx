import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot, ReferenceArea, ReferenceLine, Label } from 'recharts'
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
  totalAnalysisCount: number
  fleetHealthIndex: number | null
  baselineViscosity40?: number | null
  baselineViscosity100?: number | null
  baselineTan?: number | null
  onOpenLabDetails: () => void
}

export function TrendSection({
  language, // Language parameter reserved for future i18n expansion
  chartData,
  chartHeight,
  selectedMachineTrendAlerts,
  performanceTitle,
  performanceDesc,
  noSampleData,
  checkConsole,
  noDataAvailable,
  totalAnalysisCount,
  fleetHealthIndex,
  baselineViscosity40,
  baselineViscosity100,
  baselineTan,
  onOpenLabDetails,
}: TrendSectionProps) {
  const xAxisKey = chartData.some((point) => point.isoDate) ? 'isoDate' : 'date'
  const formatDateLabel = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return parsed.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')
  }

  const resolveAlertX = (alertDate: string) => {
    const parsed = new Date(alertDate)
    if (Number.isNaN(parsed.getTime())) return alertDate
    return xAxisKey === 'isoDate' ? parsed.toISOString().slice(0, 10) : parsed.toLocaleDateString()
  }

  const maxTan = chartData.length > 0 ? Math.max(...chartData.map((d) => d.tan || 0)) : 0
  const tanDomain: [number, number | 'auto'] = maxTan > 0.5 ? [0, 'auto'] : [0, 0.5]

  return (
    <>
      <div className="w-full bg-white rounded-[32px] shadow-xl border border-gray-100 p-8 sm:p-10">
        <SectionHeader
          title={performanceTitle}
          description={performanceDesc}
          titleClassName="text-3xl lg:text-4xl"
          actions={
            <div className="flex flex-wrap items-center gap-4">
              <div className="px-5 py-3 rounded-2xl bg-gray-50/80 border border-gray-100 flex flex-col justify-center min-w-[140px]">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">
                  {language === 'id' ? 'Total Analisis' : 'Total Analysis'}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-gray-900 leading-none">{totalAnalysisCount}</span>
                  <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">{language === 'id' ? 'Laporan' : 'Reports'}</span>
                </div>
              </div>
              
              <div className={`px-5 py-3 rounded-2xl border flex flex-col justify-center min-w-[160px] ${
                fleetHealthIndex !== null && fleetHealthIndex >= 80 
                  ? 'bg-emerald-50/80 border-emerald-100' 
                  : fleetHealthIndex !== null && fleetHealthIndex >= 60 
                  ? 'bg-amber-50/80 border-amber-100' 
                  : 'bg-gray-50/80 border-gray-100'
              }`}>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">
                  {language === 'id' ? 'Fleet Health Index' : 'Fleet Health Index'}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-black leading-none ${
                    fleetHealthIndex !== null && fleetHealthIndex >= 80 
                      ? 'text-emerald-700' 
                      : fleetHealthIndex !== null && fleetHealthIndex >= 60 
                      ? 'text-amber-700' 
                      : 'text-gray-900'
                  }`}>
                    {fleetHealthIndex !== null ? `${fleetHealthIndex}%` : 'N/A'}
                  </span>
                  <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">{language === 'id' ? 'Skor' : 'Score'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenLabDetails}
                className="ml-2 px-8 py-4 rounded-full bg-gray-900 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2"
              >
                {language === 'id' ? 'LIHAT DETAIL' : 'VIEW DETAILS'}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
          {/* Card 1: Viscosity @ 40°C */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-orange-500 rounded-full mr-3 animate-pulse"></span>
              <GlossaryTooltip termKey="viscosity40c" language={language} label={language === 'id' ? 'Viskositas @40°C' : 'Viscosity @40°C'} />
            </h3>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] sm:h-[250px] lg:h-[300px] text-gray-400">
                <svg className="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="font-semibold">{noSampleData}</p>
                <p className="text-sm text-gray-400 mt-1">{checkConsole}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey={xAxisKey} tickFormatter={formatDateLabel} stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    labelFormatter={(value) => formatDateLabel(String(value))}
                    contentStyle={{ backgroundColor: 'white', border: '0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  
                  {/* Healthy Band (±10%) */}
                  {baselineViscosity40 && (
                    <ReferenceArea 
                      y1={baselineViscosity40 * 0.9} 
                      y2={baselineViscosity40 * 1.1} 
                      fill="#10b981" 
                      fillOpacity={0.08} 
                    />
                  )}
                  
                  {/* Warning Limits (±20%) */}
                  {baselineViscosity40 && (
                    <>
                      <ReferenceLine y={baselineViscosity40 * 1.2} stroke="#ef4444" strokeDasharray="3 3">
                        <Label value={language === 'id' ? 'Batas Maks (+20%)' : 'Max (+20%)'} position="right" style={{ fontSize: '10px', fill: '#ef4444', fontWeight: 'bold' }} />
                      </ReferenceLine>
                      <ReferenceLine y={baselineViscosity40 * 0.8} stroke="#ef4444" strokeDasharray="3 3">
                        <Label value={language === 'id' ? 'Batas Min (-20%)' : 'Min (-20%)'} position="right" style={{ fontSize: '10px', fill: '#ef4444', fontWeight: 'bold' }} />
                      </ReferenceLine>
                    </>
                  )}

                  <Line type="monotone" dataKey="viscosity_40c" name={language === 'id' ? 'Viskositas @40°C' : 'Viscosity @40°C'} stroke="#ea580c" strokeWidth={4} dot={{ fill: '#ea580c', r: 6 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                  {selectedMachineTrendAlerts
                    .filter((alert) => alert.parameter === 'Viscosity' && alert.chartValue >= 20)
                    .map((alert) => (
                      <ReferenceDot key={alert.id} x={resolveAlertX(alert.chartDate)} y={alert.chartValue} r={7} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Card 2: Viscosity @ 100°C */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-indigo-500 rounded-full mr-3 animate-pulse"></span>
              <GlossaryTooltip termKey="viscosity100c" language={language} label={language === 'id' ? 'Viskositas @100°C' : 'Viscosity @100°C'} />
            </h3>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] sm:h-[250px] lg:h-[300px] text-gray-400">
                <svg className="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="font-semibold">{noSampleData}</p>
                <p className="text-sm text-gray-400 mt-1">{checkConsole}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey={xAxisKey} tickFormatter={formatDateLabel} stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    labelFormatter={(value) => formatDateLabel(String(value))}
                    contentStyle={{ backgroundColor: 'white', border: '0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  
                  {/* Healthy Band (±10%) */}
                  {baselineViscosity100 && (
                    <ReferenceArea 
                      y1={baselineViscosity100 * 0.9} 
                      y2={baselineViscosity100 * 1.1} 
                      fill="#10b981" 
                      fillOpacity={0.08} 
                    />
                  )}
                  
                  {/* Warning Limits (±20%) */}
                  {baselineViscosity100 && (
                    <>
                      <ReferenceLine y={baselineViscosity100 * 1.2} stroke="#ef4444" strokeDasharray="3 3">
                        <Label value={language === 'id' ? 'Batas Maks (+20%)' : 'Max (+20%)'} position="right" style={{ fontSize: '10px', fill: '#ef4444', fontWeight: 'bold' }} />
                      </ReferenceLine>
                      <ReferenceLine y={baselineViscosity100 * 0.8} stroke="#ef4444" strokeDasharray="3 3">
                        <Label value={language === 'id' ? 'Batas Min (-20%)' : 'Min (-20%)'} position="right" style={{ fontSize: '10px', fill: '#ef4444', fontWeight: 'bold' }} />
                      </ReferenceLine>
                    </>
                  )}

                  <Line type="monotone" dataKey="viscosity_100c" name={language === 'id' ? 'Viskositas @100°C' : 'Viscosity @100°C'} stroke="#6366f1" strokeWidth={4} dot={{ fill: '#6366f1', r: 6 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                  {selectedMachineTrendAlerts
                    .filter((alert) => alert.parameter === 'Viscosity' && alert.chartValue < 20)
                    .map((alert) => (
                      <ReferenceDot key={alert.id} x={resolveAlertX(alert.chartDate)} y={alert.chartValue} r={7} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Card 3: Water Content */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-sky-500 rounded-full mr-3 animate-pulse"></span>
              <GlossaryTooltip termKey="waterContent" language={language} label={language === 'id' ? 'Kandungan Air' : 'Water Content'} />
            </h3>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] sm:h-[250px] lg:h-[300px] text-gray-400">
                <svg className="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="font-semibold">{noSampleData}</p>
                <p className="text-sm text-gray-400 mt-1">{checkConsole}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey={xAxisKey} tickFormatter={formatDateLabel} stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    labelFormatter={(value) => formatDateLabel(String(value))}
                    formatter={(value: any, name: string) => {
                      if (name.includes('Kandungan Air') || name.includes('Water Content')) {
                        const pct = Number(value)
                        const ppm = Math.round(pct * 10000)
                        return [`${pct.toFixed(4)}% (≈ ${ppm} ppm)`, name]
                      }
                      return [value, name]
                    }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  
                  {/* Water Critical Limit (0.2% or 2000 PPM) */}
                  <ReferenceLine y={0.2} stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5">
                    <Label value="CRITICAL (0.2%)" position="insideBottomRight" style={{ fontSize: '10px', fill: '#dc2626', fontWeight: 'bold' }} />
                  </ReferenceLine>
                  <ReferenceLine y={0.05} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3">
                    <Label value="WARNING (0.05%)" position="insideBottomRight" style={{ fontSize: '10px', fill: '#f59e0b', fontWeight: 'bold' }} />
                  </ReferenceLine>

                  <Line type="monotone" dataKey="water" name={language === 'id' ? 'Kandungan Air (%)' : 'Water Content (%)'} stroke="#0284c7" strokeWidth={4} dot={{ fill: '#0284c7', r: 6 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                  {selectedMachineTrendAlerts
                    .filter((alert) => alert.parameter === 'Water content')
                    .map((alert) => (
                      <ReferenceDot key={alert.id} x={resolveAlertX(alert.chartDate)} y={alert.chartValue} r={7} fill="#f59e0b" stroke="#ffffff" strokeWidth={2} />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Card 4: Total Acid Number (TAN) */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-red-700 rounded-full mr-3 animate-pulse"></span>
              <GlossaryTooltip termKey="tan" language={language} label="Total Acid Number (TAN)" />
            </h3>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] sm:h-[250px] lg:h-[300px] text-gray-400">
                <svg className="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="font-semibold">{noSampleData}</p>
                <p className="text-sm text-gray-400 mt-1">{checkConsole}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey={xAxisKey} tickFormatter={formatDateLabel} stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={tanDomain} />
                  <Tooltip
                    labelFormatter={(value) => formatDateLabel(String(value))}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  
                  {/* TAN Critical Limit (2.0) */}
                  <ReferenceLine y={2.0} stroke="#b91c1c" strokeWidth={2} strokeDasharray="5 5">
                    <Label value="LIMIT (2.0)" position="insideBottomRight" style={{ fontSize: '10px', fill: '#b91c1c', fontWeight: 'bold' }} />
                  </ReferenceLine>
                  
                  {/* Baseline Line */}
                  {baselineTan && (
                    <ReferenceLine y={baselineTan} stroke="#9ca3af" strokeDasharray="3 3">
                      <Label value="New Oil Baseline" position="insideTopRight" style={{ fontSize: '10px', fill: '#9ca3af' }} />
                    </ReferenceLine>
                  )}

                  <Line type="monotone" dataKey="tan" name="Acid Number (mg KOH/g)" stroke="#b91c1c" strokeWidth={4} dot={{ fill: '#b91c1c', r: 6 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                  {selectedMachineTrendAlerts
                    .filter((alert) => alert.parameter === 'TAN')
                    .map((alert) => (
                      <ReferenceDot key={alert.id} x={resolveAlertX(alert.chartDate)} y={alert.chartValue} r={7} fill="#8b5cf6" stroke="#ffffff" strokeWidth={2} />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

    </>
  )
}
