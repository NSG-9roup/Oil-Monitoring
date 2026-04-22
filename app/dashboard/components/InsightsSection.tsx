import { SectionHeader } from '@/app/dashboard/components/SectionHeader'
import type { DashboardLanguage } from '@/app/dashboard/components/types'

interface InsightsSectionProps {
  language: DashboardLanguage
  title: string
  description: string
  refreshLabel: string
  loading: boolean
  onOpenCompare: () => void
  onRefresh: () => void
}

export function InsightsSection({
  language,
  title,
  description,
  refreshLabel,
  loading,
  onOpenCompare,
  onRefresh,
}: InsightsSectionProps) {
  return (
    <section id="section-insights" style={{ order: 11 }} className="mb-8 bg-white/80 backdrop-blur rounded-3xl shadow-xl p-6 sm:p-8">
      <SectionHeader
        title={title}
        description={description}
        titleClassName="text-3xl"
        actions={
          <>
            <button
              onClick={onOpenCompare}
              className="px-4 py-2 rounded-xl border border-primary-200 text-primary-700 font-semibold hover:bg-primary-50 transition-colors"
            >
              {language === 'id' ? 'Buka Compare' : 'Open Compare'}
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60"
            >
              {loading ? (language === 'id' ? 'Memuat...' : 'Loading...') : refreshLabel}
            </button>
          </>
        }
      />
    </section>
  )
}
