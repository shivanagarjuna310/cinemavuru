// src/app/contest/loading.tsx
// Shows while the contest page (standings + entries) is loading.

export default function ContestLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)] pt-16">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="h-12 w-12 bg-[color:var(--border)] rounded-full animate-pulse mx-auto mb-4" />
          <div className="h-8 w-64 bg-[color:var(--border)] rounded animate-pulse mx-auto mb-3" />
          <div className="h-4 w-80 bg-[color:var(--border)] rounded animate-pulse mx-auto" />
        </div>

        {/* Countdown / stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
              <div className="h-7 w-16 bg-[color:var(--border)] rounded animate-pulse mx-auto mb-2" />
              <div className="h-2.5 w-12 bg-[color:var(--border)] rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>

        {/* Leaderboard rows */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-4 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-4">
              <div className="w-8 h-8 bg-[color:var(--border)] rounded animate-pulse shrink-0" />
              <div className="w-32 aspect-video bg-[color:var(--border)] rounded-lg animate-pulse shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-4 w-2/3 bg-[color:var(--border)] rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-[color:var(--border)] rounded animate-pulse" />
                <div className="h-3 w-20 bg-[color:var(--border)] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
