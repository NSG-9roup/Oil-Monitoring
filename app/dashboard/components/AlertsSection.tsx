import { SectionHeader } from '@/app/dashboard/components/SectionHeader'
import type { DashboardAlert } from '@/lib/alerts/engine'

interface AlertsSectionProps {
  language: 'id' | 'en'
  title: string
  description: string
  emptyLabel: string
  resetLabel: string
  criticalLabel: string
  warningLabel: string
  normalLabel: string
  unknownLabel: string
  alertMachineLabel: string
  alertNextActionLabel: string
  markAsReadLabel: string
  visibleAlerts: DashboardAlert[]
  actionSaving: boolean
  onOpenActionCenter: () => void
  onResetInbox: () => void
  onCreateActionFromAlert: (alert: DashboardAlert) => void
  onDismissAlert: (alertId: string) => void
}

export function AlertsSection({
  language,
  title,
  description,
  emptyLabel,
  resetLabel,
  criticalLabel,
  warningLabel,
  normalLabel,
  unknownLabel,
  alertMachineLabel,
  alertNextActionLabel,
  markAsReadLabel,
  visibleAlerts,
  actionSaving,
  onOpenActionCenter,
  onResetInbox,
  onCreateActionFromAlert,
  onDismissAlert,
}: AlertsSectionProps) {
  return (
    <section id="section-alerts" style={{ order: 6 }} className="mb-8 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
      <SectionHeader
        title={title}
        description={description}
        actions={
          <>
            <button
              type="button"
              onClick={onOpenActionCenter}
              className="px-3 py-2 rounded-xl border border-primary-200 text-primary-700 font-semibold hover:bg-primary-50 transition-colors"
            >
              {language === 'id' ? 'Buka Action Center' : 'Open Action Center'}
            </button>
            <button
              type="button"
              onClick={onResetInbox}
              className="px-3 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
            >
              {resetLabel}
            </button>
          </>
        }
      />

      {visibleAlerts.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 font-medium">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleAlerts.slice(0, 6).map((alertItem) => (
            <div
              key={alertItem.id}
              className={`rounded-2xl border px-4 py-4 ${
                alertItem.severity === 'critical'
                  ? 'border-red-200 bg-red-50/70'
                  : 'border-amber-200 bg-amber-50/70'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-black uppercase tracking-wide ${alertItem.severity === 'critical' ? 'text-red-700' : 'text-amber-700'}`}>
                      {alertItem.severity === 'critical'
                        ? criticalLabel
                        : alertItem.severity === 'warning'
                        ? warningLabel
                        : alertItem.severity === 'normal'
                        ? normalLabel
                        : unknownLabel}
                    </span>
                    <span className="text-xs text-gray-500">{alertMachineLabel}: {alertItem.machineName}</span>
                  </div>
                  <p className="font-bold text-gray-900">{alertItem.title}</p>
                  <p className="text-sm text-gray-700 mt-1">{alertItem.message}</p>
                  <p className="text-sm text-gray-800 mt-2"><span className="font-semibold">{alertNextActionLabel}:</span> {alertItem.recommendedAction}</p>
                </div>
                <div className="flex flex-col gap-2 self-start">
                  <button
                    type="button"
                    onClick={() => onCreateActionFromAlert(alertItem)}
                    disabled={actionSaving}
                    className="px-3 py-1.5 rounded-lg bg-primary-600 border border-primary-600 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {language === 'id' ? 'Buat action' : 'Create action'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismissAlert(alertItem.id)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    {markAsReadLabel}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
