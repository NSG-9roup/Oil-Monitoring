import React from 'react'
import { useRouter } from 'next/navigation'

interface EnterpriseTrustSectionProps {
  language: 'id' | 'en'
  enterpriseTrustScore: number
  assignmentCoverageRate: number
  dueDateCoverageRate: number
  verificationPassRate: number
  evidenceCoverageRate: number
  traceabilityRate: number
  overdueRate: number
  totalSpend: number
  estimatedSavings: number
  netImpact: number
  roiPercent: number
  logEventBreakdown: {
    created?: number
    updated?: number
    status_changed?: number
    assigned?: number
    completed?: number
    verified?: number
    reopened?: number
  }
}

export function EnterpriseTrustSection({
  language,
  enterpriseTrustScore,
  assignmentCoverageRate,
  dueDateCoverageRate,
  verificationPassRate,
  evidenceCoverageRate,
  traceabilityRate,
  overdueRate,
  totalSpend,
  estimatedSavings,
  netImpact,
  roiPercent,
  logEventBreakdown,
}: EnterpriseTrustSectionProps) {
  const router = useRouter()

  return (
    <section style={{ order: 9 }} className="mb-8 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
            {language === 'id' ? 'Enterprise Trust & ROI' : 'Enterprise Trust & ROI'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {language === 'id'
              ? 'Validasi kesiapan enterprise melalui traceability tindakan, kualitas verifikasi, dan dampak finansial yang terukur.'
              : 'Validate enterprise readiness through action traceability, verification quality, and measurable financial impact.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/purchases')}
            className="mt-3 px-3 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold uppercase tracking-wide hover:bg-gray-100 transition-colors"
          >
            {language === 'id' ? 'Buka Purchase Analytics' : 'Open Purchase Analytics'}
          </button>
        </div>
        <div className={`px-4 py-3 rounded-2xl border ${enterpriseTrustScore >= 80 ? 'bg-emerald-50 border-emerald-200' : enterpriseTrustScore >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{language === 'id' ? 'Enterprise Trust Score' : 'Enterprise Trust Score'}</p>
          <p className={`text-3xl font-black ${enterpriseTrustScore >= 80 ? 'text-emerald-700' : enterpriseTrustScore >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
            {enterpriseTrustScore}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3 mb-5 text-xs font-semibold">
        <div className="rounded-2xl bg-gray-50 border border-gray-200 px-3 py-2 text-center">
          <div className="text-gray-600 uppercase tracking-wide">{language === 'id' ? 'Assignment' : 'Assignment'}</div>
          <div className="text-lg font-black text-gray-900">{assignmentCoverageRate}%</div>
        </div>
        <div className="rounded-2xl bg-gray-50 border border-gray-200 px-3 py-2 text-center">
          <div className="text-gray-600 uppercase tracking-wide">{language === 'id' ? 'Due Date' : 'Due Date'}</div>
          <div className="text-lg font-black text-gray-900">{dueDateCoverageRate}%</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-center">
          <div className="text-emerald-700 uppercase tracking-wide">{language === 'id' ? 'Verify Pass' : 'Verify Pass'}</div>
          <div className="text-lg font-black text-emerald-900">{verificationPassRate}%</div>
        </div>
        <div className="rounded-2xl bg-blue-50 border border-blue-200 px-3 py-2 text-center">
          <div className="text-blue-700 uppercase tracking-wide">{language === 'id' ? 'Evidence' : 'Evidence'}</div>
          <div className="text-lg font-black text-blue-900">{evidenceCoverageRate}%</div>
        </div>
        <div className="rounded-2xl bg-purple-50 border border-purple-200 px-3 py-2 text-center">
          <div className="text-purple-700 uppercase tracking-wide">{language === 'id' ? 'Traceability' : 'Traceability'}</div>
          <div className="text-lg font-black text-purple-900">{traceabilityRate}%</div>
        </div>
        <div className="rounded-2xl bg-red-50 border border-red-200 px-3 py-2 text-center">
          <div className="text-red-700 uppercase tracking-wide">{language === 'id' ? 'Overdue' : 'Overdue'}</div>
          <div className="text-lg font-black text-red-900">{overdueRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">{language === 'id' ? 'Total Spend (Completed Purchase)' : 'Total Spend (Completed Purchase)'}</p>
          <p className="text-2xl font-black text-gray-900">Rp {Math.round(totalSpend).toLocaleString('id-ID')}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-1">{language === 'id' ? 'Estimated Savings' : 'Estimated Savings'}</p>
          <p className="text-2xl font-black text-emerald-900">Rp {Math.round(estimatedSavings).toLocaleString('id-ID')}</p>
        </div>
        <div className={`rounded-2xl border px-4 py-4 ${netImpact >= 0 ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}`}>
          <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${netImpact >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{language === 'id' ? 'ROI Net Impact' : 'ROI Net Impact'}</p>
          <p className={`text-2xl font-black ${netImpact >= 0 ? 'text-blue-900' : 'text-red-900'}`}>Rp {Math.round(netImpact).toLocaleString('id-ID')}</p>
          <p className={`text-sm font-semibold mt-1 ${netImpact >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{roiPercent}% ROI</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
        <h3 className="text-lg font-black text-gray-900 mb-3">{language === 'id' ? 'Audit Event Summary' : 'Audit Event Summary'}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 text-xs font-semibold">
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <div className="text-gray-500 uppercase tracking-wide">created</div>
            <div className="text-base font-black text-gray-900">{logEventBreakdown.created || 0}</div>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <div className="text-gray-500 uppercase tracking-wide">updated</div>
            <div className="text-base font-black text-gray-900">{logEventBreakdown.updated || 0}</div>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <div className="text-gray-500 uppercase tracking-wide">status</div>
            <div className="text-base font-black text-gray-900">{logEventBreakdown.status_changed || 0}</div>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <div className="text-gray-500 uppercase tracking-wide">assigned</div>
            <div className="text-base font-black text-gray-900">{logEventBreakdown.assigned || 0}</div>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <div className="text-gray-500 uppercase tracking-wide">completed</div>
            <div className="text-base font-black text-gray-900">{logEventBreakdown.completed || 0}</div>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <div className="text-gray-500 uppercase tracking-wide">verified</div>
            <div className="text-base font-black text-gray-900">{logEventBreakdown.verified || 0}</div>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <div className="text-gray-500 uppercase tracking-wide">reopened</div>
            <div className="text-base font-black text-gray-900">{logEventBreakdown.reopened || 0}</div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          {language === 'id'
            ? 'Catatan: ROI adalah estimasi model berbasis histori purchase, verifikasi action, dan potensi downtime yang dihindari.'
            : 'Note: ROI is a model estimate based on purchase history, action verification, and avoided downtime potential.'}
        </p>
      </div>
    </section>
  )
}
