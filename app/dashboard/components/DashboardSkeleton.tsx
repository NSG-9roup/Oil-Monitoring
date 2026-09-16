'use client'

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* 1. Header & Profile Skeleton */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-200 shrink-0"></div>
          <div className="space-y-2">
            <div className="h-5 w-48 bg-slate-200 rounded-lg"></div>
            <div className="h-3.5 w-32 bg-slate-100 rounded-md"></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 bg-slate-100 rounded-xl"></div>
          <div className="h-10 w-36 bg-slate-200 rounded-xl"></div>
        </div>
      </div>

      {/* 2. Top Navigation Tabs Skeleton (5 Tabs) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full p-1 bg-white rounded-2xl border border-slate-100 shadow-sm">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-11 bg-slate-100 rounded-xl flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-md bg-slate-200"></div>
            <div className="h-3 w-16 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* 3. Machine Carousel Selector Skeleton */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 bg-slate-200 rounded"></div>
          <div className="h-3 w-20 bg-slate-100 rounded"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100 p-3 space-y-2 flex flex-col justify-between">
              <div className="h-3 w-3/4 bg-slate-200 rounded"></div>
              <div className="h-4 w-1/2 bg-slate-200 rounded-md"></div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Metric Summary Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-100 rounded"></div>
              <div className="h-6 w-16 bg-slate-200 rounded-lg"></div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-slate-200"></div>
            </div>
          </div>
        ))}
      </div>

      {/* 5. 4-Grid Charts Skeleton Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-2">
            <div className="h-5 w-56 bg-slate-200 rounded-lg"></div>
            <div className="h-3.5 w-80 bg-slate-100 rounded-md"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-16 bg-slate-100 rounded-lg"></div>
            <div className="h-8 w-16 bg-slate-100 rounded-lg"></div>
            <div className="h-8 w-16 bg-slate-100 rounded-lg"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            'Viskositas @ 40°C',
            'Viskositas @ 100°C',
            'Kandungan Air (Water Content)',
            'Total Acid Number (TAN)',
          ].map((title, idx) => (
            <div key={idx} className="bg-slate-50/70 rounded-2xl p-5 border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-40 bg-slate-200 rounded"></div>
                <div className="h-3 w-16 bg-slate-200 rounded-full"></div>
              </div>
              <div className="h-52 w-full bg-slate-100/80 rounded-xl flex items-end p-4 gap-3">
                <div className="w-full h-24 bg-slate-200/60 rounded-t-md"></div>
                <div className="w-full h-36 bg-slate-200/80 rounded-t-md"></div>
                <div className="w-full h-28 bg-slate-200/60 rounded-t-md"></div>
                <div className="w-full h-44 bg-slate-200/90 rounded-t-md"></div>
                <div className="w-full h-32 bg-slate-200/70 rounded-t-md"></div>
                <div className="w-full h-40 bg-slate-200/80 rounded-t-md"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}