interface ReliabilityRiskItem {
  machineId: string
  machineName: string
  reliabilityScore: number
  riskBand: 'stable' | 'watchlist' | 'fragile'
  dataCompleteness: number
  samplingDiscipline: number
  executionReliability: number
  trendStability: number
  deteriorationSignal: boolean
  recommendation: string
}

interface ReliabilitySectionProps {
  language: 'id' | 'en'
  fleetReliabilityScore: number
  fragileReliabilityCount: number
  watchlistReliabilityCount: number
  deteriorationCount: number
  reliabilityInsightsCount: number
  topReliabilityRisks: ReliabilityRiskItem[]
  onOpenCompare: () => void
}

export function ReliabilitySection({
  language,
  fleetReliabilityScore,
  fragileReliabilityCount,
  watchlistReliabilityCount,
  deteriorationCount,
  reliabilityInsightsCount,
  topReliabilityRisks,
  onOpenCompare,
}: ReliabilitySectionProps) {
  return (
    <section id="section-reliability" style={{ order: 8 }} className="mb-8 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
            {language === 'id' ? 'Reliability Intelligence' : 'Reliability Intelligence'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {language === 'id'
              ? 'Pantau keandalan dari kualitas sampling, kestabilan tren, dan efektivitas eksekusi maintenance.'
              : 'Track reliability from sampling quality, trend stability, and maintenance execution effectiveness.'}
          </p>
          <button
            type="button"
            onClick={onOpenCompare}
            className="mt-3 px-3 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold uppercase tracking-wide hover:bg-gray-100 transition-colors"
          >
            {language === 'id' ? 'Buka Compare Workspace' : 'Open Compare Workspace'}
          </button>
        </div>
        <div className={`px-4 py-3 rounded-2xl border ${fleetReliabilityScore >= 80 ? 'bg-emerald-50 border-emerald-200' : fleetReliabilityScore >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{language === 'id' ? 'Fleet Reliability Pulse' : 'Fleet Reliability Pulse'}</p>
          <p className={`text-3xl font-black ${fleetReliabilityScore >= 80 ? 'text-emerald-700' : fleetReliabilityScore >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
            {fleetReliabilityScore}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5 text-xs font-semibold">
        <div className="rounded-2xl bg-red-50 border border-red-200 px-3 py-2 text-center">
          <div className="text-red-700 uppercase tracking-wide">{language === 'id' ? 'Fragile' : 'Fragile'}</div>
          <div className="text-lg font-black text-red-900">{fragileReliabilityCount}</div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2 text-center">
          <div className="text-amber-700 uppercase tracking-wide">{language === 'id' ? 'Watchlist' : 'Watchlist'}</div>
          <div className="text-lg font-black text-amber-900">{watchlistReliabilityCount}</div>
        </div>
        <div className="rounded-2xl bg-blue-50 border border-blue-200 px-3 py-2 text-center">
          <div className="text-blue-700 uppercase tracking-wide">{language === 'id' ? 'Signal Deteriorating' : 'Deteriorating Signal'}</div>
          <div className="text-lg font-black text-blue-900">{deteriorationCount}</div>
        </div>
        <div className="rounded-2xl bg-gray-50 border border-gray-200 px-3 py-2 text-center">
          <div className="text-gray-700 uppercase tracking-wide">{language === 'id' ? 'Machines Scored' : 'Machines Scored'}</div>
          <div className="text-lg font-black text-gray-900">{reliabilityInsightsCount}</div>
        </div>
      </div>

      {topReliabilityRisks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-gray-600">
          {language === 'id' ? 'Belum ada data cukup untuk reliability intelligence.' : 'Not enough data yet for reliability intelligence.'}
        </div>
      ) : (
        <div className="space-y-3">
          {topReliabilityRisks.map((insight) => (
            <div key={insight.machineId} className={`rounded-2xl border px-4 py-4 ${insight.riskBand === 'fragile' ? 'border-red-200 bg-red-50/70' : insight.riskBand === 'watchlist' ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/70'}`}>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900">{insight.machineName}</p>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${insight.riskBand === 'fragile' ? 'bg-red-100 text-red-700' : insight.riskBand === 'watchlist' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {insight.riskBand}
                    </span>
                    {insight.deteriorationSignal && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700">
                        {language === 'id' ? 'Trend menurun' : 'Trend deteriorating'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{insight.recommendation}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>{language === 'id' ? 'Data completeness' : 'Data completeness'}: {insight.dataCompleteness}</span>
                    <span>{language === 'id' ? 'Sampling discipline' : 'Sampling discipline'}: {insight.samplingDiscipline}</span>
                    <span>{language === 'id' ? 'Execution reliability' : 'Execution reliability'}: {insight.executionReliability}</span>
                    <span>{language === 'id' ? 'Trend stability' : 'Trend stability'}: {insight.trendStability}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{language === 'id' ? 'Reliability Score' : 'Reliability Score'}</p>
                  <p className={`text-3xl font-black ${insight.reliabilityScore >= 80 ? 'text-emerald-700' : insight.reliabilityScore >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                    {insight.reliabilityScore}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
