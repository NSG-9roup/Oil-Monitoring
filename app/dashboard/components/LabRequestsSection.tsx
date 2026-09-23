'use client'

import type { LabRequest, DashboardLanguage } from '@/app/dashboard/components/types'

interface LabRequestsSectionProps {
  labRequests: LabRequest[]
  language: DashboardLanguage
  expandedRequestIds: Set<string>
  toggleRequestExpand: (id: string) => void
  onOpenRequestModal: () => void
}

export function LabRequestsSection({
  labRequests,
  language,
  expandedRequestIds,
  toggleRequestExpand,
  onOpenRequestModal,
}: LabRequestsSectionProps) {
  const activeRequests = labRequests.filter((req) =>
    ['pending', 'assigned', 'sampling'].includes(req.status)
  )

  const steps = [
    { key: 'pending', label: language === 'id' ? 'Permintaan Diterima' : 'Request Received', icon: '📋', desc: language === 'id' ? 'Tim sales akan segera menghubungi Anda' : 'Sales team will contact you soon' },
    { key: 'assigned', label: language === 'id' ? 'Sales Ditugaskan' : 'Sales Assigned', icon: '👤', desc: language === 'id' ? 'Sales sedang dalam perjalanan ke lokasi Anda' : 'Sales is heading to your location' },
    { key: 'sampling', label: language === 'id' ? 'Pengambilan Sampel' : 'Sample Collection', icon: '🧪', desc: language === 'id' ? 'Sampel sedang diambil dari mesin Anda' : 'Sample being collected from your machine' },
    { key: 'completed', label: language === 'id' ? 'Hasil Lab Selesai' : 'Lab Results Ready', icon: '✅', desc: language === 'id' ? 'Laporan hasil uji lab siap diunduh' : 'Lab test report is ready for download' },
  ]

  const statusColors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600 border-slate-200',
    assigned: 'bg-blue-50 text-blue-700 border-blue-100',
    sampling: 'bg-amber-50 text-amber-700 border-amber-100',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    cancelled: 'bg-red-50 text-red-700 border-red-100',
  }

  const statusLabel: Record<string, string> = {
    pending: language === 'id' ? 'Menunggu' : 'Pending',
    assigned: language === 'id' ? 'Ditugaskan' : 'Assigned',
    sampling: language === 'id' ? 'Pengambilan Sampel' : 'Sampling',
    completed: language === 'id' ? 'Selesai' : 'Completed',
    cancelled: language === 'id' ? 'Dibatalkan' : 'Cancelled',
  }

  return (
    <div key="requests" className="w-full">
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm shadow-orange-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {language === 'id' ? 'Status Lab Request' : 'Lab Request Status'}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {language === 'id' ? 'Lacak perjalanan sampel Anda' : 'Track your sample journey'}
              </p>
            </div>
          </div>

          {activeRequests.length > 0 && (
            <button
              type="button"
              onClick={onOpenRequestModal}
              className="self-start sm:self-center px-5 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-black uppercase tracking-wider border border-orange-200 shadow-sm transition-all active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              {language === 'id' ? 'Ajukan Uji Lab' : 'Request Lab Test'}
            </button>
          )}
        </div>

        {activeRequests.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-16 h-16 bg-orange-50/80 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-200/60 shadow-xs">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {language === 'id' ? 'Belum Ada Permintaan Uji Lab Aktif' : 'No Active Lab Requests'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-6 max-w-md mx-auto">
              {language === 'id' 
                ? 'Jadwalkan pengambilan sampel oli mesin Anda sekarang. Tim teknis dan sales kami siap melayani.' 
                : 'Schedule an oil sample test for your machines now. Our technical and sales teams are ready to assist.'}
            </p>
            <button
              onClick={onOpenRequestModal}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 active:scale-95 transition-all mb-10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              {language === 'id' ? 'Ajukan Uji Lab Sekarang' : 'Request Lab Test Now'}
            </button>

            {/* Workflow Guide (Alur Kerja Pengujian Sampel) */}
            <div className="border-t border-slate-100 pt-8 mt-2 text-left">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {language === 'id' ? 'Alur & Tahapan Pengujian Sampel Lab' : 'Lab Sample Testing Workflow'}
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {steps.map((step, idx) => (
                  <div key={step.key} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/50 flex flex-col justify-between hover:bg-orange-50/40 hover:border-orange-200/60 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">{step.icon}</span>
                        <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200/50">
                          {language === 'id' ? `Tahap 0${idx + 1}` : `Step 0${idx + 1}`}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{step.label}</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeRequests.map((req) => {
              const currentStepIdx = steps.findIndex(s => s.key === req.status)
              const statusStep = currentStepIdx >= 0 ? currentStepIdx : 0

              return (
                <div
                  key={req.id}
                  onClick={() => toggleRequestExpand(req.id)}
                  className="bg-white rounded-[1.5rem] border border-slate-100 p-5 hover:shadow-md hover:border-orange-200 transition-all duration-300 cursor-pointer relative overflow-hidden group"
                >
                  {/* Card Header (Collapsed view contents) */}
                  <div className="flex items-start justify-between pb-3">
                    <div className="min-w-0 pr-4">
                      <h3 className="text-sm font-black text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                        {req.is_new_machine
                          ? (req.new_machine_data?.machine_name || 'Mesin Baru')
                          : (req.machine?.machine_name || 'Mesin')}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {language === 'id' ? 'Diminta' : 'Requested'}: {new Date(req.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium' })}
                        </p>
                        {req.running_hours ? (
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                            ⏱️ {req.running_hours} {req.running_hours_unit === 'months' ? (language === 'id' ? 'Bulan' : 'mos') : req.running_hours_unit === 'years' ? (language === 'id' ? 'Tahun' : 'yrs') : (language === 'id' ? 'Jam' : 'hrs')}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${statusColors[req.status] || statusColors['pending']}`}>
                        {statusLabel[req.status] || req.status}
                      </span>
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${expandedRequestIds.has(req.id) ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-slate-100/60 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${req.status === 'cancelled' ? 'bg-red-500' : 'bg-gradient-to-r from-orange-400 to-emerald-500'}`}
                      style={{ width: `${Math.min((statusStep / (steps.length - 1)) * 100, 100)}%` }}
                    />
                  </div>

                  {/* Accordion Expanded Content */}
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${
                      expandedRequestIds.has(req.id)
                        ? 'max-h-[800px] opacity-100 mt-4 pt-5 border-t border-slate-100'
                        : 'max-h-0 opacity-0 pointer-events-none'
                    }`}
                  >
                    {/* Vertical Stepper Tracker */}
                    <div className="relative pl-12 space-y-6 py-2">
                      {/* Vertical timeline line */}
                      <div className="absolute top-4 bottom-4 left-[15px] w-[2px] bg-slate-100">
                        <div
                          className={`absolute top-0 left-0 w-full transition-all duration-700 ${req.status === 'cancelled' ? 'bg-red-400' : 'bg-emerald-400'}`}
                          style={{ height: `${Math.min((statusStep / (steps.length - 1)) * 100, 100)}%` }}
                        />
                      </div>

                      {steps.map((step, idx) => {
                        const isCompleted = idx <= statusStep
                        const isCurrent = idx === statusStep

                        return (
                          <div key={step.key} className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            {/* Circle indicator */}
                            <div className="absolute -left-12 top-0.5 flex items-center justify-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-500 z-10 ${
                                isCompleted
                                  ? isCurrent
                                    ? req.status === 'cancelled'
                                      ? 'bg-red-500 shadow-md shadow-red-200 ring-4 ring-red-50 scale-105'
                                      : 'bg-orange-500 shadow-md shadow-orange-200 ring-4 ring-orange-50 scale-105 animate-pulse'
                                    : 'bg-emerald-500 shadow-sm shadow-emerald-100'
                                  : 'bg-white border-2 border-slate-200'
                              }`}>
                                {isCompleted ? (
                                  isCurrent ? (
                                    <span className="text-xs">{step.icon}</span>
                                  ) : (
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-slate-200" />
                                )}
                              </div>
                            </div>

                            {/* Step text content */}
                            <div className="flex-1 min-w-0 pr-2">
                              <h4 className={`text-xs font-black uppercase tracking-wider ${
                                isCurrent
                                  ? req.status === 'cancelled' ? 'text-red-600' : 'text-orange-600'
                                  : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                              }`}>
                                {step.label}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-semibold mt-0.5 leading-relaxed">
                                {step.desc}
                              </p>
                            </div>

                            {/* Additional details (PIC or update timestamp) */}
                            {isCompleted && (
                              <div className="text-[10px] text-slate-400 font-semibold sm:text-right shrink-0 mt-1 sm:mt-0">
                                {step.key === 'pending' && (
                                  <span>
                                    {new Date(req.created_at).toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                {(step.key === 'assigned' || step.key === 'sampling') && req.assigned_to && (
                                  <div className="flex flex-col sm:items-end">
                                    <span className="text-slate-600 font-bold">
                                      PIC: {req.assigned_to.full_name}
                                    </span>
                                    <span className="text-[9px] text-slate-400">
                                      {language === 'id' ? 'Sales NSG' : 'NSG Sales'}
                                    </span>
                                  </div>
                                )}
                                {step.key === 'completed' && req.updated_at && (
                                  <span>
                                    {new Date(req.updated_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'short' })}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Request Notes / Description */}
                    {(req.description || req.notes) && (
                      <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {language === 'id' ? 'Catatan Permintaan' : 'Request Notes'}
                        </h5>
                        <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                          {req.description || req.notes}
                        </p>
                      </div>
                    )}

                    {/* Additional metadata info (priority, location etc.) */}
                    <div className="mt-4 flex flex-wrap gap-3 items-center justify-between text-[10px] text-slate-400 font-semibold border-t border-slate-50 pt-4 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span>{language === 'id' ? 'Prioritas:' : 'Priority:'}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${
                          req.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' :
                          req.priority === 'medium' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {req.priority}
                        </span>
                      </div>
                      {req.sample_photo_path && (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{language === 'id' ? 'Foto Sampel Tersedia' : 'Sample Photo Available'}</span>
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
    </div>
  )
}
