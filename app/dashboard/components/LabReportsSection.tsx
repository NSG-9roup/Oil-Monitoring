import { useState } from 'react'
import { SectionHeader } from '@/app/dashboard/components/SectionHeader'
import type {
  LabProduct,
  LabReportItem,
  RecommendationResult,
  StatusResult,
  TrendResult,
  LabRequest,
} from '@/app/dashboard/components/types'

interface LabReportsSectionProps {
  title: string
  description: string
  reports: LabReportItem[]
  requests: LabRequest[]
  language: 'id' | 'en'
  expandedReports: Set<string>
  onQuickRequest?: (machineId: string, notes: string, priority: 'High' | 'Medium' | 'Low') => void
  selectedMachineName: string
  criticalLabel: string
  warningLabel: string
  normalLabel: string
  unknownLabel: string
  viscosityLabel: string
  waterContentLabel: string
  tanValueLabel: string
  notAvailableLabel: string
  emptyLabel: string
  completeAnalysisLabel: string
  evaluationLabel: string
  machineLabel: string
  productLabel: string
  viewReportLabel: string
  onToggleReport: (reportId: string) => void
  onOpenReportPdf: (pdfPath: string) => void
  onDownloadReportPdf: (pdfPath: string, testDate: string) => void
  getStatus: (visc40: number, waterContent: number, tanValue: number, product?: LabProduct) => StatusResult
  getTrend: (current: number, previous: number | null) => TrendResult
  getRecommendations: (
    visc40: number,
    waterContent: number,
    tanValue: number,
    product?: LabProduct,
    previousReport?: LabReportItem | null,
    evaluationMode?: string
  ) => RecommendationResult[]
}

export function LabReportsSection({
  title,
  description,
  reports,
  requests = [],
  language = 'id',
  onQuickRequest,
  expandedReports,
  selectedMachineName,
  criticalLabel,
  warningLabel,
  normalLabel,
  unknownLabel,
  viscosityLabel,
  waterContentLabel,
  tanValueLabel,
  notAvailableLabel,
  emptyLabel,
  completeAnalysisLabel,
  evaluationLabel,
  machineLabel,
  productLabel,
  viewReportLabel,
  onToggleReport,
  onOpenReportPdf,
  onDownloadReportPdf,
  getStatus,
  getTrend,
  getRecommendations,
}: LabReportsSectionProps) {
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'warning' | 'normal'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'viscosity_high' | 'water_high' | 'tan_high'>('newest')

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      (report.product?.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      new Date(report.test_date)
        .toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        .toLowerCase()
        .includes(searchTerm.toLowerCase())

    const status = getStatus(
      report.viscosity_40c || 0,
      report.water_content || 0,
      report.tan_value || 0,
      report.product
    )
    const matchesStatus = statusFilter === 'all' || status.level === statusFilter

    return matchesSearch && matchesStatus
  })

  const sortedReports = [...filteredReports].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
    }
    if (sortBy === 'oldest') {
      return new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
    }
    if (sortBy === 'viscosity_high') {
      return (b.viscosity_40c || 0) - (a.viscosity_40c || 0)
    }
    if (sortBy === 'water_high') {
      return (b.water_content || 0) - (a.water_content || 0)
    }
    if (sortBy === 'tan_high') {
      return (b.tan_value || 0) - (a.tan_value || 0)
    }
    return 0
  })

  return (
    <div className="w-full bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 sm:p-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <SectionHeader
          title={title}
          description={description}
          titleClassName="text-3xl lg:text-4xl"
        />
        <div className="flex items-center gap-2 bg-gray-50/50 border border-gray-100 p-1.5 rounded-2xl w-fit shrink-0">
          <button
            onClick={() => setViewMode('card')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${viewMode === 'card' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/60' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Card
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/60' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            Table
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={language === 'id' ? 'Cari nama oli atau catatan...' : 'Search product or notes...'}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl text-xs font-semibold text-slate-800 transition-all outline-none"
          />
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'critical' | 'warning' | 'normal')}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl text-xs font-semibold text-slate-850 transition-all outline-none cursor-pointer"
          >
            <option value="all">{language === 'id' ? 'Semua Status' : 'All Statuses'}</option>
            <option value="normal">{language === 'id' ? 'Normal' : 'Normal'}</option>
            <option value="warning">{language === 'id' ? 'Warning' : 'Warning'}</option>
            <option value="critical">{language === 'id' ? 'Critical' : 'Critical'}</option>
          </select>
        </div>

        {/* Sorting */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'viscosity_high' | 'water_high' | 'tan_high')}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl text-xs font-semibold text-slate-850 transition-all outline-none cursor-pointer"
          >
            <option value="newest">{language === 'id' ? 'Terbaru' : 'Newest'}</option>
            <option value="oldest">{language === 'id' ? 'Terlama' : 'Oldest'}</option>
            <option value="viscosity_high">{language === 'id' ? 'Viskositas Tertinggi' : 'Highest Viscosity'}</option>
            <option value="water_high">{language === 'id' ? 'Kandungan Air Tertinggi' : 'Highest Water Content'}</option>
            <option value="tan_high">{language === 'id' ? 'TAN Tertinggi' : 'Highest TAN'}</option>
          </select>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>{emptyLabel}</p>
        </div>
      ) : sortedReports.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm font-bold">{language === 'id' ? 'Tidak ada laporan yang cocok dengan filter Anda' : 'No reports match your filters'}</p>
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('all'); setSortBy('newest'); }}
            className="text-xs text-orange-500 font-bold mt-2 hover:underline animate-pulse"
          >
            {language === 'id' ? 'Reset Filter' : 'Reset Filters'}
          </button>
        </div>
      ) : (
        <>
        {viewMode === 'table' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Tanggal Uji</th>
                    <th className="px-6 py-4">Mesin</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Viskositas (40°C / 100°C)</th>
                    <th className="px-6 py-4">Kandungan Air</th>
                    <th className="px-6 py-4">TAN</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedReports.map((report) => {
                    const status = getStatus(
                      report.viscosity_40c || 0,
                      report.water_content || 0,
                      report.tan_value || 0,
                      report.product
                    )
                    return (
                      <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900 text-sm">
                            {new Date(report.test_date).toLocaleDateString('id-ID', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-800">{selectedMachineName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                            status.level === 'critical' ? 'bg-red-100 text-red-800' : status.level === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {report.viscosity_40c?.toFixed(1) || '-'} / {report.viscosity_100c?.toFixed(1) || '-'} cSt
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {report.water_content ? (report.water_content * 100).toFixed(2) : '0'}%
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {report.tan_value?.toFixed(2) || '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (report.pdf_path) onOpenReportPdf(report.pdf_path)
                            }}
                            className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
        <div className="space-y-6">
          {sortedReports.map((report, index) => {
            const previousReport = index > 0 ? reports[index - 1] : null
            const status = getStatus(
              report.viscosity_40c || 0,
              report.water_content || 0,
              report.tan_value || 0,
              report.product
            )
            const viscosity40Trend = getTrend(report.viscosity_40c || 0, previousReport?.viscosity_40c ?? null)
            const viscosity100Trend = getTrend(report.viscosity_100c || 0, previousReport?.viscosity_100c ?? null)
            const waterTrend = getTrend(
              report.water_content ? report.water_content * 100 : 0,
              previousReport?.water_content ? previousReport.water_content * 100 : null
            )
            const tanTrend = getTrend(report.tan_value || 0, previousReport?.tan_value ?? null)
            const recommendations = getRecommendations(
              report.viscosity_40c || 0,
              report.water_content || 0,
              report.tan_value || 0,
              report.product,
              previousReport,
              report.evaluation_mode
            )
            const isExpanded = expandedReports.has(report.id)

            return (
              <div key={report.id} className="bg-white rounded-2xl shadow-md border border-industrial-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                <div onClick={() => onToggleReport(report.id)} className="cursor-pointer hover:bg-primary-50 transition-colors duration-200">
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="font-bold text-gray-900 text-lg">
                          {new Date(report.test_date).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            status.level === 'critical' ? 'bg-red-100 text-red-800' : status.level === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {status.level === 'critical'
                            ? criticalLabel
                            : status.level === 'warning'
                            ? warningLabel
                            : status.level === 'normal'
                            ? normalLabel
                            : unknownLabel}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-gray-600">
                          <span className="font-semibold text-blue-900">{viscosityLabel}:</span> {report.viscosity_40c?.toFixed(1) || notAvailableLabel} / {report.viscosity_100c?.toFixed(1) || notAvailableLabel} cSt
                        </span>
                        <span className="text-gray-600">
                          <span className="font-semibold text-cyan-900">{waterContentLabel}:</span> {report.water_content ? (report.water_content * 100).toFixed(2) : '0.00'}%
                        </span>
                        <span className="text-gray-600">
                          <span className="font-semibold text-purple-900">{tanValueLabel}:</span> {report.tan_value?.toFixed(2) || notAvailableLabel} mg KOH/g
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {report.pdf_path && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!report.pdf_path) return
                            onOpenReportPdf(report.pdf_path)
                          }}
                          className="px-3 py-1.5 bg-industrial-100 text-industrial-800 text-xs font-bold rounded-xl hover:bg-industrial-200 transition-all duration-300 flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {viewReportLabel}
                        </button>
                      )}
                      <svg className={isExpanded ? 'w-6 h-6 text-primary-600 transition-transform duration-300 rotate-180' : 'w-6 h-6 text-primary-600 transition-transform duration-300'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                  <div className="px-6 py-4 bg-industrial-50 border-t border-b border-industrial-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="text-base font-black text-industrial-800">{completeAnalysisLabel}</h4>
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${
                            status.level === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : status.level === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {status.text.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-industrial-500 text-xs mt-1 font-medium">{evaluationLabel}</p>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b-2 border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{machineLabel}</p>
                          <p className="text-sm font-bold text-gray-900 mt-1">{selectedMachineName}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{productLabel}</p>
                          <p className="text-sm font-bold text-gray-900 mt-1">{report.product?.product_name || notAvailableLabel}</p>
                          {report.product?.product_type && <p className="text-xs text-gray-600 mt-0.5">{report.product.product_type}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white rounded-2xl p-5 border border-industrial-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-industrial-500 uppercase tracking-wider">{viscosityLabel} 40°C</p>
                          <span className={`text-base font-bold ${viscosity40Trend.direction === 'up' ? 'text-red-500' : viscosity40Trend.direction === 'down' ? 'text-emerald-500' : 'text-industrial-400'}`}>
                            {viscosity40Trend.icon}
                          </span>
                        </div>
                        <p className="text-3xl font-black text-industrial-800 tracking-tight">{report.viscosity_40c?.toFixed(1) || notAvailableLabel}</p>
                        <p className="text-xs text-industrial-400 mt-1.5 font-semibold">cSt</p>
                      </div>

                      <div className="bg-white rounded-2xl p-5 border border-industrial-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-industrial-500 uppercase tracking-wider">{viscosityLabel} 100°C</p>
                          <span className={`text-base font-bold ${viscosity100Trend.direction === 'up' ? 'text-red-500' : viscosity100Trend.direction === 'down' ? 'text-emerald-500' : 'text-industrial-400'}`}>
                            {viscosity100Trend.icon}
                          </span>
                        </div>
                        <p className="text-3xl font-black text-industrial-800 tracking-tight">{report.viscosity_100c?.toFixed(1) || notAvailableLabel}</p>
                        <p className="text-xs text-industrial-400 mt-1.5 font-semibold">cSt</p>
                      </div>

                      <div className="bg-white rounded-2xl p-5 border border-industrial-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-industrial-500 uppercase tracking-wider">{waterContentLabel}</p>
                          <span className={`text-base font-bold ${waterTrend.direction === 'up' ? 'text-red-500' : waterTrend.direction === 'down' ? 'text-emerald-500' : 'text-industrial-400'}`}>
                            {waterTrend.icon}
                          </span>
                        </div>
                        <p className="text-3xl font-black text-industrial-800 tracking-tight">{report.water_content ? (report.water_content * 100).toFixed(2) : '0.00'}%</p>
                        <p className="text-xs text-industrial-400 mt-1.5 font-semibold">by volume</p>
                        <p className="text-[10px] text-industrial-400 font-medium mt-1">≈ {report.water_content ? (report.water_content * 10000).toFixed(0) : '0'} ppm</p>
                      </div>

                      <div className="bg-white rounded-2xl p-5 border border-industrial-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-industrial-500 uppercase tracking-wider">{tanValueLabel}</p>
                          <span className={`text-base font-bold ${tanTrend.direction === 'up' ? 'text-red-500' : tanTrend.direction === 'down' ? 'text-emerald-500' : 'text-industrial-400'}`}>
                            {tanTrend.icon}
                          </span>
                        </div>
                        <p className="text-3xl font-black text-industrial-800 tracking-tight">{report.tan_value?.toFixed(2) || notAvailableLabel}</p>
                        <p className="text-xs text-industrial-400 mt-1.5 font-semibold">mg KOH/g</p>
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl p-5 border border-industrial-100 border-l-4 mb-6 ${
                        status.level === 'critical'
                          ? 'border-l-red-500'
                          : status.level === 'warning'
                          ? 'border-l-amber-500'
                          : 'border-l-emerald-500'
                      } bg-white shadow-sm`}
                    >
                      <h5 className="text-xs font-black uppercase tracking-wider text-industrial-400 mb-4 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-industrial-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Recommendations
                      </h5>
                      <ul className="space-y-3">
                        {recommendations.map((rec, idx) => {
                          const actionPriority = rec.severity === 'critical' ? 'Immediate Action' : rec.severity === 'warning' ? 'Plan Maintenance' : 'Monitor'
                          return (
                            <li
                              key={`${report.id}-${idx}`}
                              className={`p-4 rounded-xl border ${
                                rec.severity === 'critical'
                                  ? 'bg-red-50/40 border-red-100'
                                  : rec.severity === 'warning'
                                  ? 'bg-amber-50/40 border-amber-100'
                                  : 'bg-emerald-50/40 border-emerald-100'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-lg flex-shrink-0 mt-0.5">{rec.icon}</span>
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <p
                                      className={`text-sm font-bold ${
                                        rec.severity === 'critical' ? 'text-red-900' : rec.severity === 'warning' ? 'text-amber-900' : 'text-emerald-900'
                                      }`}
                                    >
                                      {rec.text}
                                    </p>
                                    <span
                                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                                        rec.severity === 'critical'
                                          ? 'bg-red-100 text-red-800'
                                          : rec.severity === 'warning'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}
                                    >
                                      {actionPriority}
                                    </span>
                                  </div>
                                  <p
                                    className={`text-xs font-medium mt-1.5 ${
                                      rec.severity === 'critical' ? 'text-red-700' : rec.severity === 'warning' ? 'text-amber-700' : 'text-emerald-700'
                                    }`}
                                  >
                                    → {rec.action}
                                  </p>
                                  {onQuickRequest && (() => {
                                    const hasActiveRequest = requests.some(
                                      (req) => req.machine_id === report.machine_id && ['pending', 'assigned', 'sampling'].includes(req.status)
                                    )
                                    
                                    if (hasActiveRequest) {
                                      return (
                                        <div className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5 shrink-0 mt-3 w-fit select-none">
                                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                          {language === 'id' ? 'Progres Lab Aktif' : 'Lab Test Active'}
                                        </div>
                                      )
                                    }

                                    return (
                                      <button
                                        onClick={() => {
                                          onQuickRequest(
                                            report.machine_id || '',
                                            language === 'id'
                                              ? `Memicu permintaan uji sampel secara otomatis akibat rekomendasi lab: ${rec.text}.\nTindakan: ${rec.action}`
                                              : `Automatically triggered lab request due to recommendation: ${rec.text}.\nAction: ${rec.action}`,
                                            rec.severity === 'critical' ? 'High' : 'Medium'
                                          )
                                        }}
                                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-0.5 mt-3 shrink-0 transform active:scale-95"
                                      >
                                        {language === 'id' ? 'Minta Uji Ulang →' : 'Request Re-Test →'}
                                      </button>
                                    )
                                  })()}
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>

                    {report.pdf_path && (
                      <div className="flex gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!report.pdf_path) return
                            onOpenReportPdf(report.pdf_path)
                          }}
                          className="flex-1 bg-industrial-100 text-industrial-800 px-4 py-3 rounded-xl hover:bg-industrial-200 transition-all duration-300 flex items-center justify-center gap-2 font-bold shadow-lg hover:shadow-xl hover:scale-105 transform"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Report
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!report.pdf_path) return
                            onDownloadReportPdf(report.pdf_path, report.test_date)
                          }}
                          className="flex-1 bg-primary-600 text-white px-4 py-3 rounded-xl hover:bg-primary-700 transition-all duration-300 flex items-center justify-center gap-2 font-bold shadow-lg hover:shadow-xl hover:scale-105 transform"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download PDF
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        )}
        </>
      )}
    </div>
  )
}
