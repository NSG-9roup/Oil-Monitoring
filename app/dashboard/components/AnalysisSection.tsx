'use client'

import type { Machine, MachineInsight, TrendAlertItem, LabRequest, DashboardLanguage } from '@/app/dashboard/components/types'

export interface DashboardCopyAnalysis {
  smartAlertTitle: string
  trendAlertsDesc: string
  noTrendAlerts: string
  trend: {
    recommendedAction: string
    [key: string]: unknown
  }
  exportFleetPdf: string
  exportFleetDesc: string
  [key: string]: unknown
}

interface AnalysisSectionProps {
  language: DashboardLanguage
  selectedMachine: Machine | null
  machineInsights: MachineInsight[]
  selectedMachineTrendAlerts: TrendAlertItem[]
  labRequests: LabRequest[]
  handleQuickLabRequest: (machineId: string, notes?: string, priority?: string) => void
  handleExportFleetReport: () => void
  exporting: boolean
  setActiveTab: (tab: 'trend' | 'analysis' | 'lab' | 'requests' | 'orders') => void
  avgHealthScore: number | null
  healthyCount: number
  warningCount: number
  criticalCount: number
  copy: DashboardCopyAnalysis
}

export function AnalysisSection({
  language,
  selectedMachine,
  machineInsights,
  selectedMachineTrendAlerts,
  labRequests,
  handleQuickLabRequest,
  handleExportFleetReport,
  exporting,
  setActiveTab,
  avgHealthScore,
  healthyCount,
  warningCount,
  criticalCount,
  copy,
}: AnalysisSectionProps) {
  const selectedMachineInsight = selectedMachine
    ? machineInsights.find((item) => item.machine.id === selectedMachine.id)
    : null
  const selectedMachineHealth = selectedMachineInsight?.healthScore ?? null
  const selectedMachineStatus = selectedMachineInsight?.status
  const selectedMachineStatusLevel = selectedMachineInsight?.status?.level

  const snapshotTitles = {
    executiveSummary: language === 'id' ? 'Ringkasan Eksekutif' : 'Executive Summary',
    executiveDesc: language === 'id' ? 'Status kesehatan real-time armada.' : 'Real-time fleet health metrics.',
    activeMachine: language === 'id' ? 'Mesin Terpilih' : 'Active Machine',
    model: language === 'id' ? 'Model' : 'Model',
    serialNumber: language === 'id' ? 'S/N' : 'S/N',
    location: language === 'id' ? 'Lokasi' : 'Location',
    healthStatus: language === 'id' ? 'Status Kesehatan' : 'Health Status',
    fleetOverview: language === 'id' ? 'Kesehatan Armada' : 'Fleet Overview',
    fleetDesc: language === 'id' ? 'Analisis kondisi pelumas seluruh mesin.' : 'Lubricant conditions across all assets.',
    avgHealth: language === 'id' ? 'Skor Rata-Rata Kesehatan' : 'Average Health Score',
    statusBreakdown: language === 'id' ? 'Distribusi Kondisi' : 'Status Distribution',
    normal: language === 'id' ? 'Normal' : 'Normal',
    warning: language === 'id' ? 'Warning' : 'Warning',
    critical: language === 'id' ? 'Critical' : 'Critical',
    quickUtilities: language === 'id' ? 'Aksi & Utilitas' : 'Quick Actions Hub',
    goToLabHub: language === 'id' ? 'Buka Hub & Tracker Lab' : 'Open Lab Hub & Tracker',
    goToLabHubDesc: language === 'id' ? 'Lihat dokumen PDF & progres sampel.' : 'View PDF reports & sample tracking.',
  }

  const getParameterIcon = (parameter: 'Viscosity' | 'Water content' | 'TAN' | string) => {
    switch (parameter) {
      case 'Water content':
        return (
          <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-100 text-blue-500 shadow-sm flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 00-.7.3L4.6 7.5A6.5 6.5 0 1010 19a6.5 6.5 0 005.4-11.5L10.7 2.3A1 1 0 0010 2zm0 2.4l4.2 4.4a4.5 4.5 0 11-8.4 0L10 4.4z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'TAN':
        return (
          <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 shadow-sm flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 3h6m-3 0v11.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 14.172V3z" />
            </svg>
          </div>
        )
      case 'Viscosity':
      default:
        return (
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-500 shadow-sm flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeWidth={2.5} />
              <path d="M12 12l3-3" strokeWidth="3" strokeLinecap="round" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
        )
    }
  }

  const getSeverityBadge = (severity: 'High' | 'Medium' | 'Low' | string) => {
    switch (severity) {
      case 'High':
        return (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
            </span>
            CRITICAL
          </div>
        )
      case 'Medium':
        return (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
            WARNING
          </div>
        )
      case 'Low':
      default:
        return (
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
            </span>
            MONITOR
          </div>
        )
    }
  }

  return (
    <div key="analysis" className="w-full animate-pop-micro">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        
        {/* Left Column: Smart Trend Alerts (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="w-full bg-white rounded-[2.5rem] shadow-[0_15px_50px_-20px_rgba(0,0,0,0.05)] border border-slate-100 p-6 sm:p-8 relative overflow-hidden">
            {/* Decorative top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-rose-500 to-red-600 rounded-t-[2.5rem]"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2.5">
                  {selectedMachineTrendAlerts.length > 0 || selectedMachineStatusLevel === 'critical' || selectedMachineStatusLevel === 'warning' ? (
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        selectedMachineTrendAlerts.some(a => a.severity === 'High') || selectedMachineStatusLevel === 'critical'
                          ? 'bg-red-400' 
                          : 'bg-amber-400'
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${
                        selectedMachineTrendAlerts.some(a => a.severity === 'High') || selectedMachineStatusLevel === 'critical'
                          ? 'bg-red-500 animate-pulse' 
                          : 'bg-amber-500 animate-pulse'
                      }`}></span>
                    </span>
                  ) : (
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                  )}
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{copy.smartAlertTitle}</h2>
                </div>
                <p className="text-slate-400 font-medium text-sm mt-1">{copy.trendAlertsDesc}</p>
              </div>
              <span className="self-start sm:self-center bg-slate-50 border border-slate-100 text-slate-600 px-4.5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shrink-0">
                {selectedMachineTrendAlerts.length} {language === 'id' ? 'peringatan riwayat aktif' : 'active history alerts'}
              </span>
            </div>

            {selectedMachineTrendAlerts.length === 0 ? (
              selectedMachineStatusLevel === 'critical' ? (
                <div className="rounded-[2rem] border border-red-200 bg-red-50/40 p-8 text-red-950 flex items-center gap-4 shadow-sm">
                  <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-red-950 mb-0.5">{language === 'id' ? 'Perhatian: Status Pelumas Kritis' : 'Attention: Critical Lubricant Status'}</h4>
                    <p className="text-sm font-medium text-red-800/90 leading-relaxed">
                      {language === 'id'
                        ? 'Meskipun tren riwayat stabil tanpa lonjakan mendadak, hasil uji lab terakhir menunjukkan parameter pelumas berada pada level kritis. Segera lakukan inspeksi fisik atau penggantian oli.'
                        : 'Although trend history is stable without sudden spikes, latest lab test indicates parameters are at a critical level. Immediate inspection or oil change is required.'}
                    </p>
                  </div>
                </div>
              ) : selectedMachineStatusLevel === 'warning' ? (
                <div className="rounded-[2rem] border border-amber-200 bg-amber-50/40 p-8 text-amber-950 flex items-center gap-4 shadow-sm">
                  <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-amber-950 mb-0.5">{language === 'id' ? 'Kondisi Memerlukan Pemantauan' : 'Condition Requires Monitoring'}</h4>
                    <p className="text-sm font-medium text-amber-800/90 leading-relaxed">
                      {language === 'id'
                        ? 'Tidak ditemukan anomali lonjakan tren mendadak, namun parameter uji laboratorium terakhir berada pada batas toleransi peringatan (warning). Tetap lakukan pengawasan berkala.'
                        : 'No sudden trend spikes detected, but latest lab test parameters are at warning threshold. Continue regular monitoring.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/20 p-8 text-emerald-850 flex items-center gap-4 shadow-sm">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-100/50 flex items-center justify-center text-emerald-600 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-emerald-950 mb-0.5">{language === 'id' ? 'Kondisi Pelumas Optimal' : 'Lubricant Condition Optimal'}</h4>
                    <p className="text-sm font-medium text-emerald-700/90 leading-relaxed">{copy.noTrendAlerts}</p>
                  </div>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                {selectedMachineTrendAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`group rounded-[2rem] border border-slate-100 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.08)] flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-white to-slate-50/10 ${
                      alert.severity === 'High'
                        ? 'border-l-4 border-l-red-500'
                        : alert.severity === 'Medium'
                        ? 'border-l-4 border-l-amber-500'
                        : 'border-l-4 border-l-blue-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        {getSeverityBadge(alert.severity)}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {alert.parameter === 'Water content' ? (language === 'id' ? 'Kandungan air' : 'Water Content') : alert.parameter}
                          </span>
                          {getParameterIcon(alert.parameter)}
                        </div>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 leading-snug mb-3 tracking-tight group-hover:text-indigo-950 transition-colors">
                        {alert.title}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                        {alert.message}
                      </p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="bg-slate-50 border border-slate-100/75 rounded-2xl p-4">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">
                          {copy.trend.recommendedAction}
                        </p>
                        <p className="text-xs font-bold text-slate-800 leading-relaxed flex items-start gap-1.5">
                          <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {alert.recommendedAction}
                        </p>
                      </div>

                      {(() => {
                        const hasActiveRequest = labRequests.some(
                          (req) => req.machine_id === selectedMachine?.id && ['pending', 'assigned', 'sampling'].includes(req.status)
                        )

                        if (hasActiveRequest) {
                          return (
                            <div className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-1.5 inline-flex items-center gap-1.5 mt-4 w-fit select-none">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              {language === 'id' ? 'Sampel Sedang Diproses di Lab' : 'Sample Currently in Lab'}
                            </div>
                          )
                        }

                        return (
                          <button
                            onClick={() => {
                              handleQuickLabRequest(
                                selectedMachine?.id || '',
                                language === 'id'
                                  ? `Memicu permintaan uji sampel secara otomatis akibat alarm tren: ${alert.title}.\nTindakan: ${alert.recommendedAction}`
                                  : `Automatically triggered lab request due to trend alert: ${alert.title}.\nAction: ${alert.recommendedAction}`,
                                alert.severity === 'High' ? 'High' : 'Medium'
                              )
                            }}
                            className="text-[10px] font-black text-indigo-600 hover:text-indigo-850 transition-colors flex items-center gap-0.5 mt-4 w-fit transform active:scale-95"
                          >
                            {language === 'id' ? 'Butuh verifikasi? Minta Uji Ulang →' : 'Need verification? Request Re-Test →'}
                          </button>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Executive Snapshot & Actions (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card 1: Snapshot Kesehatan */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
            {/* High-end glow design lines */}
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl"></div>

            <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
              <div>
                <h3 className="text-xl font-black tracking-tight">{snapshotTitles.executiveSummary}</h3>
                <p className="text-white/50 text-xs font-semibold mt-0.5">{snapshotTitles.executiveDesc}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/80 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>

            {selectedMachine ? (
              /* Selected Machine View */
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">
                    {snapshotTitles.activeMachine}
                  </span>
                  <h4 className="text-2xl font-black tracking-tight mt-1 truncate">
                    {selectedMachine.machine_name}
                  </h4>
                </div>

                {/* Selected Machine Metadata */}
                {(selectedMachine.model || selectedMachine.serial_number || selectedMachine.location) && (
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3.5 text-sm">
                    {selectedMachine.model && (
                      <div className="flex justify-between">
                        <span className="text-white/60 font-semibold">{snapshotTitles.model}</span>
                        <span className="font-bold text-white/95">{selectedMachine.model}</span>
                      </div>
                    )}
                    {selectedMachine.serial_number && (
                      <div className={`flex justify-between ${selectedMachine.model ? 'border-t border-white/5 pt-3' : ''}`}>
                        <span className="text-white/60 font-semibold">{snapshotTitles.serialNumber}</span>
                        <span className="font-mono font-bold text-white/95">{selectedMachine.serial_number}</span>
                      </div>
                    )}
                    {selectedMachine.location && (
                      <div className={`flex justify-between ${(selectedMachine.model || selectedMachine.serial_number) ? 'border-t border-white/5 pt-3' : ''}`}>
                        <span className="text-white/60 font-semibold">{snapshotTitles.location}</span>
                        <span className="font-bold text-white/95 truncate max-w-[15ch]">{selectedMachine.location}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Machine Health Gauge */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs text-white/60 font-black uppercase tracking-wider">{snapshotTitles.healthStatus}</span>
                    <span className={`text-base font-black ${selectedMachineHealth !== null && selectedMachineHealth >= 80 ? 'text-emerald-400' : selectedMachineHealth !== null && selectedMachineHealth >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                      {selectedMachineHealth !== null ? `${selectedMachineHealth}%` : '-'}
                    </span>
                  </div>
                  {selectedMachineHealth !== null ? (
                    <div>
                      <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            selectedMachineHealth >= 80 ? 'bg-emerald-500' : selectedMachineHealth >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${selectedMachineHealth}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-white/40 font-semibold leading-relaxed mt-2.5 flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${selectedMachineHealth >= 80 ? 'bg-emerald-400' : selectedMachineHealth >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}></span>
                        {language === 'id' ? selectedMachineStatus?.text || 'Kondisi Normal' : selectedMachineStatus?.text || 'Stable Condition'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 font-bold">{language === 'id' ? 'Data pengujian belum tersedia.' : 'No sample metrics available.'}</p>
                  )}
                </div>
              </div>
            ) : (
              /* Fleet Overview View */
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
                    {snapshotTitles.fleetOverview}
                  </span>
                  <p className="text-white/60 text-xs font-semibold mt-1 leading-relaxed">{snapshotTitles.fleetDesc}</p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-3xl p-4.5">
                  <div className={`relative flex items-center justify-center h-16 w-16 rounded-full border-4 shrink-0 font-black text-xl shadow-md shadow-orange-500/10 ${avgHealthScore !== null && avgHealthScore >= 80 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : avgHealthScore !== null && avgHealthScore >= 60 ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-red-500 bg-red-500/10 text-red-400'}`}>
                    {avgHealthScore ?? '-'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-white/95 uppercase tracking-wide truncate">{snapshotTitles.avgHealth}</h4>
                    <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">{language === 'id' ? 'Rata-rata kesehatan oli armada.' : 'Average health across all fleet.'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <span className="text-[10px] text-white/60 font-black uppercase tracking-wider block mb-3.5">{snapshotTitles.statusBreakdown}</span>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5">
                      <span className="text-[9px] text-white/40 block font-bold uppercase tracking-widest">{snapshotTitles.normal}</span>
                      <span className="text-base font-black text-emerald-400 block mt-0.5">{healthyCount}</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5">
                      <span className="text-[9px] text-white/40 block font-bold uppercase tracking-widest">{snapshotTitles.warning}</span>
                      <span className="text-base font-black text-amber-400 block mt-0.5">{warningCount}</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5">
                      <span className="text-[9px] text-white/40 block font-bold uppercase tracking-widest">{snapshotTitles.critical}</span>
                      <span className="text-base font-black text-red-400 block mt-0.5">{criticalCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Aksi & Utilitas Laporan */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 sm:p-8 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.04)] space-y-5">
            <div className="flex items-center gap-2 pb-4.5 border-b border-slate-100">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h4 className="text-base font-black text-slate-900 tracking-tight">{snapshotTitles.quickUtilities}</h4>
            </div>

            {/* PDF Export Button */}
            <button
              onClick={handleExportFleetReport}
              disabled={exporting}
              className={`group w-full rounded-2xl px-5 py-4 text-left text-white shadow-md transition-all duration-300 flex items-center gap-4 ${
                exporting 
                  ? 'bg-slate-700 cursor-not-allowed opacity-80' 
                  : 'bg-slate-900 hover:bg-slate-800 hover:-translate-y-0.5 shadow-slate-900/10'
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                {exporting ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-black leading-tight uppercase tracking-wider text-white truncate">
                    {exporting ? 'Generating PDF...' : copy.exportFleetPdf}
                  </h3>
                  <span className="text-white/60 text-sm leading-none transition-transform duration-300 group-hover:translate-x-0.5 shrink-0">→</span>
                </div>
                <p className="text-[10px] text-white/50 font-medium truncate mt-0.5">
                  {copy.exportFleetDesc}
                </p>
              </div>
            </button>

            {/* Quick Navigation Button to Lab Tab */}
            <button
              onClick={() => setActiveTab('lab')}
              className="group w-full rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 px-5 py-4 text-left text-slate-800 transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-200/50 text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-black leading-tight uppercase tracking-wider text-slate-800 truncate">
                    {snapshotTitles.goToLabHub}
                  </h3>
                  <span className="text-slate-500 text-sm leading-none transition-transform duration-300 group-hover:translate-x-0.5 shrink-0">→</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                  {snapshotTitles.goToLabHubDesc}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
