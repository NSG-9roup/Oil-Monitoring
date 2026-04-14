/**
 * Skeleton components — placeholder loading UI
 * Gunakan saat data sedang di-fetch untuk UX yang lebih halus
 */

/** Skeleton dasar dengan animasi pulse */
function SkeletonBase({ className }: { className?: string }) {
  return (
    <div className={`bg-gray-200 rounded animate-pulse ${className ?? ''}`} />
  )
}

/** Skeleton untuk kartu mesin di carousel */
export function MachineCardSkeleton() {
  return (
    <div className="w-80 flex-shrink-0 rounded-2xl border-2 border-gray-100 bg-white p-6 snap-start">
      <SkeletonBase className="h-1.5 w-full rounded-full mb-6" />
      <div className="mb-4">
        <SkeletonBase className="h-5 w-3/4 mb-2" />
        <SkeletonBase className="h-4 w-1/2 mb-3" />
        <SkeletonBase className="h-6 w-24 rounded-full" />
      </div>
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <SkeletonBase className="h-3 w-20" />
          <SkeletonBase className="h-6 w-12" />
        </div>
        <SkeletonBase className="h-2.5 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SkeletonBase className="h-14 rounded-lg" />
        <SkeletonBase className="h-14 rounded-lg" />
      </div>
    </div>
  )
}

/** Skeleton untuk section statistik header */
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <SkeletonBase className="h-3 w-16 mb-3" />
      <SkeletonBase className="h-8 w-12 mb-1" />
      <SkeletonBase className="h-3 w-20" />
    </div>
  )
}

/** Skeleton untuk grafik chart */
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <SkeletonBase className="h-5 w-40 mb-6" />
      <div className="relative" style={{ height }}>
        {/* Axis lines */}
        <div className="absolute left-8 top-0 bottom-8 w-px bg-gray-200" />
        <div className="absolute left-8 right-0 bottom-8 h-px bg-gray-200" />
        {/* Bars placeholder */}
        <div className="absolute inset-x-10 top-4 bottom-10 flex items-end gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-200 rounded-t animate-pulse"
              style={{ height: `${30 + Math.random() * 60}%`, animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Skeleton untuk baris lab report */
export function LabReportRowSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <SkeletonBase className="h-5 w-5 rounded" />
            <SkeletonBase className="h-5 w-40" />
            <SkeletonBase className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex gap-6">
            <SkeletonBase className="h-4 w-32" />
            <SkeletonBase className="h-4 w-28" />
            <SkeletonBase className="h-4 w-24" />
          </div>
        </div>
        <SkeletonBase className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  )
}

/** Skeleton untuk alert card */
export function AlertCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <SkeletonBase className="h-5 w-16 rounded-full" />
        <SkeletonBase className="h-4 w-20" />
      </div>
      <SkeletonBase className="h-5 w-3/4 mb-2" />
      <SkeletonBase className="h-4 w-full mb-1" />
      <SkeletonBase className="h-4 w-5/6" />
    </div>
  )
}
