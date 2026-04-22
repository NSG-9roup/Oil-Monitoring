import type { DashboardLanguage } from '@/app/dashboard/components/types'

interface PurchasesSectionProps {
  language: DashboardLanguage
  exportPdfTitle: string
  exportPdfDesc: string
  purchaseHistoryTitle: string
  purchaseHistoryDesc: string
  onExportFleetReport: () => void
  onExportTrustRoiSnapshot: () => void
  onOpenPurchases: () => void
}

export function PurchasesSection({
  language,
  exportPdfTitle,
  exportPdfDesc,
  purchaseHistoryTitle,
  purchaseHistoryDesc,
  onExportFleetReport,
  onExportTrustRoiSnapshot,
  onOpenPurchases,
}: PurchasesSectionProps) {
  return (
    <div id="section-purchases" style={{ order: 2 }} className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
      <button
        onClick={onExportFleetReport}
        className="w-full bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800 rounded-2xl shadow-xl p-6 text-white transition-all transform hover:scale-[1.02] flex items-center justify-between group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2h-5.586a1 1 0 01-.707-.293l-1.414-1.414A1 1 0 0010.586 2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-xl font-black">{exportPdfTitle}</h3>
            <p className="text-white/90 text-sm font-medium mt-1">{exportPdfDesc}</p>
          </div>
        </div>
        <svg className="w-6 h-6 text-white transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      <button
        onClick={onExportTrustRoiSnapshot}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-2xl shadow-xl p-6 text-white transition-all transform hover:scale-[1.02] flex items-center justify-between group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-xl font-black">{language === 'id' ? 'Export Trust & ROI Snapshot' : 'Export Trust & ROI Snapshot'}</h3>
            <p className="text-white/90 text-sm font-medium mt-1">
              {language === 'id'
                ? 'Unduh ringkasan trust enterprise, audit event, dan estimasi ROI.'
                : 'Download the enterprise trust, audit event, and ROI snapshot.'}
            </p>
          </div>
        </div>
        <svg className="w-6 h-6 text-white transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      <button
        onClick={onOpenPurchases}
        className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 rounded-2xl shadow-xl p-6 text-white transition-all transform hover:scale-[1.02] flex items-center justify-between group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-xl font-black">{purchaseHistoryTitle}</h3>
            <p className="text-white/90 text-sm font-medium mt-1">{purchaseHistoryDesc}</p>
          </div>
        </div>
        <svg className="w-6 h-6 text-white transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
