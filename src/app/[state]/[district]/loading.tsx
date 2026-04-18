// src/app/[state]/[district]/loading.tsx
// Shows while district film feed is loading

export default function DistrictLoading() {
  return (
    <div className="min-h-screen bg-[#0D0A06] pt-16">

      {/* Header skeleton */}
      <div className="bg-gradient-to-b from-[#1A1208] to-transparent border-b border-[#2E2010]">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="h-3 w-32 bg-[#2E2010] rounded animate-pulse mb-6" />
          <div className="h-10 w-56 bg-[#2E2010] rounded animate-pulse mb-3" />
          <div className="h-4 w-40 bg-[#2E2010] rounded animate-pulse mb-3" />
          <div className="h-3 w-24 bg-[#2E2010] rounded animate-pulse" />
        </div>
      </div>

      {/* Sort tabs skeleton */}
      <div className="max-w-6xl mx-auto px-6 mt-8 flex gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-8 w-24 bg-[#1A1208] rounded animate-pulse" />
        ))}
      </div>

      {/* Film cards skeleton grid */}
      <div className="max-w-6xl mx-auto px-6 mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="bg-[#1A1208] border border-[#2E2010] rounded-2xl overflow-hidden">
            {/* Thumbnail */}
            <div className="aspect-video bg-[#2E2010] animate-pulse" />
            {/* Info */}
            <div className="p-4 space-y-3">
              <div className="h-5 w-3/4 bg-[#2E2010] rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-[#2E2010] rounded animate-pulse" />
              <div className="flex gap-4 mt-2">
                <div className="h-3 w-12 bg-[#2E2010] rounded animate-pulse" />
                <div className="h-3 w-12 bg-[#2E2010] rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}