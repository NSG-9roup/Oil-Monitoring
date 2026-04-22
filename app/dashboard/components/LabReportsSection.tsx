import { SectionHeader } from '@/app/dashboard/components/SectionHeader'
import type {
  DashboardLanguage,
  LabProduct,
  LabReportItem,
  RecommendationResult,
  StatusResult,
  TrendResult,
} from '@/app/dashboard/components/types'

interface LabReportsSectionProps {
  language: DashboardLanguage
  title: string
  description: string
  reports: LabReportItem[]
  expandedReports: Set<string>
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
  onOpenPurchaseAnalytics: () => void
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
  language,
  title,
  description,
  reports,
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
  onOpenPurchaseAnalytics,
  onToggleReport,
  onOpenReportPdf,
  onDownloadReportPdf,
  getStatus,
  getTrend,
  getRecommendations,
}: LabReportsSectionProps) {
  return (
    <div id="section-lab-reports" className="bg-gray-50 rounded-3xl p-8 -mx-4 sm:mx-0">
      <SectionHeader
        title={title}
        description={description}
        titleClassName="text-3xl"
        actions={
          <button
            type="button"
            onClick={onOpenPurchaseAnalytics}
            className="px-4 py-2 rounded-xl border border-primary-200 text-primary-700 font-semibold hover:bg-primary-50 transition-colors"
          >
            {language === 'id' ? 'Buka Purchase Analytics' : 'Open Purchase Analytics'}
          </button>
        }
      />

      {reports.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>{emptyLabel}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report, index) => {
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
              <div key={report.id} className="bg-white rounded-2xl shadow-lg border-2 border-primary-100 overflow-hidden hover:shadow-xl transition-all">
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
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {viewReportLabel}
                        </button>
                      )}
                      <svg className={`w-6 h-6 text-primary-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                  <div
                    className={`px-6 py-4 bg-gradient-to-r border-t-2 border-gray-200 ${
                      status.level === 'critical' ? 'from-red-500 to-red-600' : status.level === 'warning' ? 'from-yellow-500 to-orange-500' : 'from-green-500 to-green-600'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-xl font-black text-white">{completeAnalysisLabel}</h4>
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">{status.text.toUpperCase()}</span>
                        </div>
                        <p className="text-white/80 text-xs mt-2 font-medium">{evaluationLabel}</p>
                      </div>
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

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border-2 border-blue-200">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">{viscosityLabel} 40°C</p>
                          <span className={`text-lg font-black ${viscosity40Trend.direction === 'up' ? 'text-red-600' : viscosity40Trend.direction === 'down' ? 'text-green-600' : 'text-gray-600'}`}>
                            {viscosity40Trend.icon}
                          </span>
                        </div>
                        <p className="text-3xl font-black text-blue-900">{report.viscosity_40c?.toFixed(1) || notAvailableLabel}</p>
                        <p className="text-xs text-blue-700 mt-1 font-semibold">cSt</p>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-4 border-2 border-indigo-200">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">{viscosityLabel} 100°C</p>
                          <span className={`text-lg font-black ${viscosity100Trend.direction === 'up' ? 'text-red-600' : viscosity100Trend.direction === 'down' ? 'text-green-600' : 'text-gray-600'}`}>
                            {viscosity100Trend.icon}
                          </span>
                        </div>
                        <p className="text-3xl font-black text-indigo-900">{report.viscosity_100c?.toFixed(1) || notAvailableLabel}</p>
                        <p className="text-xs text-indigo-700 mt-1 font-semibold">cSt</p>
                      </div>

                      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-xl p-4 border-2 border-cyan-200">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-cyan-800 uppercase tracking-wide">{waterContentLabel}</p>
                          <span className={`text-lg font-black ${waterTrend.direction === 'up' ? 'text-red-600' : waterTrend.direction === 'down' ? 'text-green-600' : 'text-gray-600'}`}>
                            {waterTrend.icon}
                          </span>
                        </div>
                        <p className="text-3xl font-black text-cyan-900">{report.water_content ? (report.water_content * 100).toFixed(2) : '0.00'}%</p>
                        <p className="text-xs text-cyan-700 mt-1 font-semibold">by volume</p>
                        <p className="text-xs text-cyan-600 mt-2 font-medium">≈ {report.water_content ? (report.water_content * 10000).toFixed(0) : '0'} ppm</p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border-2 border-purple-200">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-purple-800 uppercase tracking-wide">{tanValueLabel}</p>
                          <span className={`text-lg font-black ${tanTrend.direction === 'up' ? 'text-red-600' : tanTrend.direction === 'down' ? 'text-green-600' : 'text-gray-600'}`}>
                            {tanTrend.icon}
                          </span>
                        </div>
                        <p className="text-3xl font-black text-purple-900">{report.tan_value?.toFixed(2) || notAvailableLabel}</p>
                        <p className="text-xs text-purple-700 mt-1 font-semibold">mg KOH/g</p>
                      </div>
                    </div>

                    <div
                      className={`rounded-xl p-4 border-2 mb-4 ${
                        status.level === 'critical' ? 'bg-red-50 border-red-200' : status.level === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <h5
                        className={`text-sm font-black uppercase tracking-wide mb-3 flex items-center ${
                          status.level === 'critical' ? 'text-red-800' : status.level === 'warning' ? 'text-yellow-800' : 'text-green-800'
                        }`}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              className={`p-4 rounded-lg border-l-4 ${
                                rec.severity === 'critical' ? 'bg-red-50 border-red-500' : rec.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' : 'bg-green-50 border-green-500'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-xl flex-shrink-0">{rec.icon}</span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className={`text-sm font-bold ${rec.severity === 'critical' ? 'text-red-800' : rec.severity === 'warning' ? 'text-yellow-800' : 'text-green-800'}`}>
                                      {rec.text}
                                    </p>
                                    <span
                                      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${
                                        rec.severity === 'critical' ? 'bg-red-200 text-red-800' : rec.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'
                                      }`}
                                    >
                                      {actionPriority}
                                    </span>
                                  </div>
                                  <p className={`text-xs mt-2 ${rec.severity === 'critical' ? 'text-red-600' : rec.severity === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                                    → {rec.action}
                                  </p>
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
                          className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 font-bold shadow-lg hover:shadow-xl hover:scale-105 transform"
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
                          className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-4 py-3 rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 flex items-center justify-center gap-2 font-bold shadow-lg hover:shadow-xl hover:scale-105 transform"
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
    </div>
  )
}
