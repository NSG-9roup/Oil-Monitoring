import type { LabRequest, DashboardLanguage } from '@/app/dashboard/components/types'

interface LabRequestsTabProps {
  requests: LabRequest[]
  language: DashboardLanguage
}

const TEXTS = {
  id: {
    emptyTitle: 'Tidak Ada Permintaan Uji',
    emptyDesc: 'Anda belum pernah mengirimkan permohonan analisis sampel lab.',
    priority: 'Prioritas',
    dueDate: 'Tenggat Uaktu',
    newMachine: 'Mesin Baru',
    registeredMachine: 'Mesin Terdaftar',
    statusCancelled: 'Dibatalkan',
    stages: [
      { key: 'pending', label: 'Diajukan', desc: 'Permohonan berhasil dikirim' },
      { key: 'assigned', label: 'Ditugaskan', desc: 'Petugas / kurir ditugaskan' },
      { key: 'sampling', label: 'Sedang Diuji', desc: 'Botol sampel di lab & sedang dianalisis' },
      { key: 'completed', label: 'Selesai', desc: 'Laporan PDF telah diterbitkan' }
    ]
  },
  en: {
    emptyTitle: 'No Requests Found',
    emptyDesc: 'You have not submitted any laboratory sample requests yet.',
    priority: 'Priority',
    dueDate: 'Due Date',
    newMachine: 'New Machine',
    registeredMachine: 'Registered Machine',
    statusCancelled: 'Cancelled',
    stages: [
      { key: 'pending', label: 'Submitted', desc: 'Request successfully sent' },
      { key: 'assigned', label: 'Assigned', desc: 'Technician/courier assigned' },
      { key: 'sampling', label: 'In Progress', desc: 'Sample in lab & being analyzed' },
      { key: 'completed', label: 'Completed', desc: 'PDF report published' }
    ]
  }
}

export function LabRequestsTab({ requests, language }: LabRequestsTabProps) {
  const texts = TEXTS[language] || TEXTS.id

  const getStageIndex = (status: string) => {
    switch (status) {
      case 'pending':
        return 0
      case 'assigned':
        return 1
      case 'sampling':
        return 2
      case 'completed':
        return 3
      default:
        return -1
    }
  }

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-50 text-red-700 border border-red-100'
      case 'medium':
        return 'bg-amber-50 text-amber-700 border border-amber-100'
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-100'
    }
  }

  const formatPriority = (priority: string) => {
    if (language === 'id') {
      if (priority?.toLowerCase() === 'high') return 'Tinggi'
      if (priority?.toLowerCase() === 'medium') return 'Sedang'
      return 'Rendah'
    }
    return priority
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
        <svg className="w-16 h-16 text-gray-300 mb-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h4 className="text-xl font-bold text-gray-700 mb-1">{texts.emptyTitle}</h4>
        <p className="text-sm text-gray-500 text-center max-w-[35ch]">{texts.emptyDesc}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {requests.map((req) => {
        const stageIndex = getStageIndex(req.status)
        const isCancelled = req.status === 'cancelled'
        const machineName = req.is_new_machine 
          ? (req.new_machine_data as any)?.machine_name || 'New Machine' 
          : req.machine?.machine_name || 'Machine'

        return (
          <div key={req.id} className="bg-white rounded-2xl shadow-md border-2 border-gray-100 hover:border-primary-100 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
            {/* Header info */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${req.is_new_machine ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'}`}>
                    {req.is_new_machine ? texts.newMachine : texts.registeredMachine}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${getPriorityBadgeColor(req.priority)}`}>
                    {texts.priority}: {formatPriority(req.priority)}
                  </span>
                </div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{machineName}</h4>
                {req.machine?.location && (
                  <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {req.machine.location}
                  </p>
                )}
              </div>
              <div className="text-left sm:text-right flex-shrink-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">{language === 'id' ? 'Tanggal Diajukan' : 'Submitted Date'}</span>
                <span className="text-sm font-extrabold text-slate-700">
                  {new Date(req.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                {req.due_date && (
                  <div className="mt-1.5 flex items-center justify-start sm:justify-end gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span className="text-xs text-slate-500 font-medium">
                      {texts.dueDate}: {new Date(req.due_date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Request Content */}
            <div className="p-6 border-b border-gray-100 flex-1">
              <h5 className="text-md font-extrabold text-slate-800 mb-1">{req.title}</h5>
              {req.description && (
                <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-[80ch]">{req.description}</p>
              )}
            </div>

            {/* Status Stepper */}
            <div className="p-6 bg-white">
              {isCancelled ? (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-red-800 font-bold flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-none">{texts.statusCancelled}</p>
                    <p className="text-xs text-red-600 font-medium mt-1">{language === 'id' ? 'Permintaan uji dibatalkan atau ditolak' : 'Request cancelled or rejected'}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                  {/* Stage Step Items */}
                  {texts.stages.map((stage, idx) => {
                    const isCompleted = idx <= stageIndex
                    const isCurrent = idx === stageIndex

                    return (
                      <div key={stage.key} className="flex gap-4 md:flex-col items-start md:items-center relative z-10">
                        {/* Circle Indicator */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                            isCompleted 
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                              : 'bg-white border-gray-200 text-gray-400'
                          } ${isCurrent ? 'ring-4 ring-emerald-100 scale-110' : ''}`}>
                            {isCompleted ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <span className="text-xs font-black">{idx + 1}</span>
                            )}
                          </div>
                        </div>

                        {/* Labels */}
                        <div className="text-left md:text-center mt-1 md:mt-2">
                          <p className={`text-sm font-black transition-colors duration-300 ${isCompleted ? 'text-emerald-800' : 'text-gray-400'}`}>
                            {stage.label}
                          </p>
                          <p className="text-xs text-gray-500 font-medium mt-0.5 leading-tight md:max-w-[18ch] md:mx-auto">
                            {stage.desc}
                          </p>
                        </div>
                      </div>
                    )
                  })}

                  {/* Desktop Background Line Tracker */}
                  <div className="hidden md:block absolute top-5 left-[12%] right-[12%] h-0.5 bg-gray-100 z-0">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-700 ease-out"
                      style={{ width: `${stageIndex * 33.3}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
