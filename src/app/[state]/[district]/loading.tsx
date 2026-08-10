// src/app/[state]/[district]/loading.tsx
// Shows while district film feed is loading

export default function DistrictLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)] pt-16">

      {/* Header skeleton */}
      <div className="bg-gradient-to-b from-[color:var(--surface)] to-transparent border-b border-[color:var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="h-3 w-32 bg-[color:var(--border)] rounded animate-pulse mb-6" />
          <div className="h-10 w-56 bg-[color:var(--border)] rounded animate-pulse mb-3" />
          <div className="h-4 w-40 bg-[color:var(--border)] rounded animate-pulse mb-3" />
          <div className="h-3 w-24 bg-[color:var(--border)] rounded animate-pulse" />
        </div>
      </div>

      {/* Sort tabs skeleton */}
      <div className="max-w-6xl mx-auto px-6 mt-8 flex gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-8 w-24 bg-[color:var(--surface)] rounded animate-pulse" />
        ))}
      </div>

      {/* Film cards skeleton grid */}
      <div className="max-w-6xl mx-auto px-6 mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl overflow-hidden">
            {/* Thumbnail */}
            <div className="aspect-video bg-[color:var(--border)] animate-pulse" />
            {/* Info */}
            <div className="p-4 space-y-3">
              <div className="h-5 w-3/4 bg-[color:var(--border)] rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-[color:var(--border)] rounded animate-pulse" />
              <div className="flex gap-4 mt-2">
                <div className="h-3 w-12 bg-[color:var(--border)] rounded animate-pulse" />
                <div className="h-3 w-12 bg-[color:var(--border)] rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}