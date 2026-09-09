// src/app/profile/loading.tsx
// Shows while the profile page (details + the viewer's films) is loading.

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)] pt-16">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Identity */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-full bg-[color:var(--border)] animate-pulse shrink-0" />
          <div className="space-y-2.5 flex-1">
            <div className="h-6 w-48 bg-[color:var(--border)] rounded animate-pulse" />
            <div className="h-3 w-32 bg-[color:var(--border)] rounded animate-pulse" />
          </div>
          <div className="h-9 w-24 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg animate-pulse" />
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
              <div className="h-6 w-12 bg-[color:var(--border)] rounded animate-pulse mx-auto mb-2" />
              <div className="h-2.5 w-16 bg-[color:var(--border)] rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>

        {/* Films */}
        <div className="h-5 w-32 bg-[color:var(--border)] rounded animate-pulse mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl overflow-hidden">
              <div className="aspect-video bg-[color:var(--border)] animate-pulse" />
              <div className="p-4 space-y-2.5">
                <div className="h-4 w-3/4 bg-[color:var(--border)] rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-[color:var(--border)] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
