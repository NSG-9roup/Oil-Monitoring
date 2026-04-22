import type { MaintenanceAction, MaintenanceActionPriority, MaintenanceActionStatus, MaintenanceVerificationStatus } from '@/lib/types'

interface ActionBoardForm {
  machine_id: string
  title: string
  description: string
  priority: MaintenanceActionPriority
  due_date: string
  owner_profile_id: string
}

interface MaintenanceActionBoardSectionProps {
  language: 'id' | 'en'
  maintenanceActionStats: {
    open: number
    inProgress: number
    completed: number
    overdue: number
  }
  actionFilter: 'all' | MaintenanceActionStatus
  visibleMaintenanceActions: MaintenanceAction[]
  actionForm: ActionBoardForm
  machines: Array<{ id: string; machine_name: string }>
  teamMembers: Array<{ id: string; full_name: string }>
  todayIso: string
  actionSaving: boolean
  onOpenCompare: () => void
  onActionFilterChange: (status: 'all' | MaintenanceActionStatus) => void
  onActionFormChange: (patch: Partial<ActionBoardForm>) => void
  onCreateMaintenanceAction: () => void
  onUpdateMaintenanceAction: (actionId: string, patch: {
    status?: MaintenanceActionStatus
    verification_status?: MaintenanceVerificationStatus
  }) => void
}

export function MaintenanceActionBoardSection({
  language,
  maintenanceActionStats,
  actionFilter,
  visibleMaintenanceActions,
  actionForm,
  machines,
  teamMembers,
  todayIso,
  actionSaving,
  onOpenCompare,
  onActionFilterChange,
  onActionFormChange,
  onCreateMaintenanceAction,
  onUpdateMaintenanceAction,
}: MaintenanceActionBoardSectionProps) {
  return (
    <section id="section-actions" style={{ order: 7 }} className="mb-8 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">{language === 'id' ? 'Action Board Maintenance' : 'Maintenance Action Board'}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {language === 'id'
              ? 'Kelola pekerjaan maintenance dari insight, due date, dan penanggung jawab dalam satu alur.'
              : 'Manage maintenance work from insights, due dates, and owners in one workflow.'}
          </p>
          <button
            type="button"
            onClick={onOpenCompare}
            className="mt-3 px-3 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold uppercase tracking-wide hover:bg-gray-100 transition-colors"
          >
            {language === 'id' ? 'Lihat Prioritas Mesin' : 'View Machine Priorities'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
          <div className="rounded-2xl bg-gray-50 border border-gray-200 px-3 py-2 text-center">
            <div className="text-gray-500 uppercase tracking-wide">{language === 'id' ? 'Open' : 'Open'}</div>
            <div className="text-lg font-black text-gray-900">{maintenanceActionStats.open}</div>
          </div>
          <div className="rounded-2xl bg-blue-50 border border-blue-200 px-3 py-2 text-center">
            <div className="text-blue-700 uppercase tracking-wide">{language === 'id' ? 'Active' : 'Active'}</div>
            <div className="text-lg font-black text-blue-900">{maintenanceActionStats.inProgress}</div>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-center">
            <div className="text-emerald-700 uppercase tracking-wide">{language === 'id' ? 'Done' : 'Done'}</div>
            <div className="text-lg font-black text-emerald-900">{maintenanceActionStats.completed}</div>
          </div>
          <div className="rounded-2xl bg-red-50 border border-red-200 px-3 py-2 text-center">
            <div className="text-red-700 uppercase tracking-wide">{language === 'id' ? 'Overdue' : 'Overdue'}</div>
            <div className="text-lg font-black text-red-900">{maintenanceActionStats.overdue}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {(['all', 'open', 'assigned', 'in_progress', 'completed', 'verified', 'overdue'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onActionFilterChange(status)}
            className={`px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
              actionFilter === status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-gray-900">{language === 'id' ? 'Buat Action Baru' : 'Create New Action'}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {language === 'id'
              ? 'Action bisa dibuat dari alert atau diinput manual oleh tim customer.'
              : 'Actions can be created from alerts or entered manually by the customer team.'}
          </p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Machine</span>
              <select
                value={actionForm.machine_id}
                onChange={(e) => onActionFormChange({ machine_id: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{language === 'id' ? 'Pilih machine' : 'Select machine'}</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.machine_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Title</span>
              <input
                type="text"
                value={actionForm.title}
                onChange={(e) => onActionFormChange({ title: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Description</span>
              <textarea
                value={actionForm.description}
                onChange={(e) => onActionFormChange({ description: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Priority</span>
                <select
                  value={actionForm.priority}
                  onChange={(e) => onActionFormChange({ priority: e.target.value as MaintenanceActionPriority })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Due date</span>
                <input
                  type="date"
                  value={actionForm.due_date}
                  onChange={(e) => onActionFormChange({ due_date: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>
            </div>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Owner</span>
              <select
                value={actionForm.owner_profile_id}
                onChange={(e) => onActionFormChange({ owner_profile_id: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{language === 'id' ? 'Belum ditugaskan' : 'Unassigned'}</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onCreateMaintenanceAction}
              disabled={actionSaving}
              className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-4 py-3 text-white font-bold shadow-lg hover:from-primary-600 hover:to-secondary-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {actionSaving ? (language === 'id' ? 'Menyimpan...' : 'Saving...') : (language === 'id' ? 'Simpan Action' : 'Save Action')}
            </button>
          </div>
        </div>

        <div className="xl:col-span-3 space-y-3">
          {visibleMaintenanceActions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-gray-600">
              {language === 'id' ? 'Belum ada maintenance action untuk filter ini.' : 'No maintenance actions match this filter yet.'}
            </div>
          ) : (
            visibleMaintenanceActions.map((action) => {
              const isOverdue = Boolean(action.due_date && action.due_date < todayIso && action.status !== 'completed' && action.status !== 'verified')
              return (
                <div key={action.id} className={`rounded-2xl border px-4 py-4 ${isOverdue ? 'border-red-200 bg-red-50/70' : 'border-gray-200 bg-white'}`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-black uppercase tracking-wide text-gray-500">{action.machine?.machine_name || '-'}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${action.priority === 'high' ? 'bg-red-100 text-red-700' : action.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {action.priority}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${action.status === 'completed' || action.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : action.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {action.status.replace('_', ' ')}
                        </span>
                        {isOverdue && <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-red-100 text-red-700">Overdue</span>}
                      </div>
                      <p className="font-bold text-gray-900">{action.title}</p>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{action.description || (language === 'id' ? 'Tidak ada deskripsi.' : 'No description provided.')}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>{language === 'id' ? 'Due' : 'Due'}: {action.due_date || '-'}</span>
                        <span>{language === 'id' ? 'Owner' : 'Owner'}: {action.owner?.full_name || (language === 'id' ? 'Belum ditugaskan' : 'Unassigned')}</span>
                        <span>{language === 'id' ? 'Alert' : 'Alert'}: {action.alert_key || '-'}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => onUpdateMaintenanceAction(action.id, { status: 'in_progress' })}
                        disabled={actionSaving}
                        className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold disabled:opacity-60"
                      >
                        {language === 'id' ? 'Mulai' : 'Start'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateMaintenanceAction(action.id, { status: 'completed' })}
                        disabled={actionSaving}
                        className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold disabled:opacity-60"
                      >
                        {language === 'id' ? 'Selesai' : 'Complete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateMaintenanceAction(action.id, { status: 'verified', verification_status: 'passed' })}
                        disabled={actionSaving}
                        className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-semibold disabled:opacity-60"
                      >
                        {language === 'id' ? 'Verify OK' : 'Verify OK'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateMaintenanceAction(action.id, { status: 'open', verification_status: 'failed' })}
                        disabled={actionSaving}
                        className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold disabled:opacity-60"
                      >
                        {language === 'id' ? 'Verify Fail' : 'Verify Fail'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
