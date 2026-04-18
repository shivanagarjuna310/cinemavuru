// src/app/[state]/[district]/film/[id]/loading.tsx
// Shows while individual film page is loading

export default function FilmLoading() {
  return (
    <div className="min-h-screen bg-[#0D0A06] pt-16">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Breadcrumb skeleton */}
        <div className="flex gap-2 mb-6">
          <div className="h-3 w-12 bg-[#2E2010] rounded animate-pulse" />
          <div className="h-3 w-3 bg-[#2E2010] rounded animate-pulse" />
          <div className="h-3 w-20 bg-[#2E2010] rounded animate-pulse" />
          <div className="h-3 w-3 bg-[#2E2010] rounded animate-pulse" />
          <div className="h-3 w-32 bg-[#2E2010] rounded animate-pulse" />
        </div>

        {/* Video player skeleton */}
        <div className="aspect-video bg-[#1A1208] border border-[#2E2010] rounded-2xl animate-pulse mb-6 flex items-center justify-center">
          <div className="text-5xl opacity-20">🎬</div>
        </div>

        {/* Title skeleton */}
        <div className="mb-6 space-y-3">
          <div className="h-8 w-2/3 bg-[#2E2010] rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-[#2E2010] rounded animate-pulse" />
          <div className="flex gap-3">
            <div className="h-3 w-16 bg-[#2E2010] rounded animate-pulse" />
            <div className="h-3 w-16 bg-[#2E2010] rounded animate-pulse" />
            <div className="h-3 w-16 bg-[#2E2010] rounded animate-pulse" />
          </div>
        </div>

        {/* Like/Share buttons skeleton */}
        <div className="flex gap-3 mb-6">
          <div className="h-10 w-24 bg-[#1A1208] border border-[#2E2010] rounded-lg animate-pulse" />
          <div className="h-10 w-24 bg-[#1A1208] border border-[#2E2010] rounded-lg animate-pulse" />
        </div>

        {/* Description skeleton */}
        <div className="p-4 bg-[#1A1208] border border-[#2E2010] rounded-xl mb-6 space-y-2">
          <div className="h-3 w-full bg-[#2E2010] rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-[#2E2010] rounded animate-pulse" />
          <div className="h-3 w-4/6 bg-[#2E2010] rounded animate-pulse" />
        </div>

        {/* Comments skeleton */}
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#2E2010] animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-[#2E2010] rounded animate-pulse" />
                <div className="h-3 w-full bg-[#2E2010] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}