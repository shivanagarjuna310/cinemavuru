// src/app/loading.tsx
// Shows while the homepage (hero + film rails) is loading.

function Rail() {
  return (
    <div className="max-w-6xl mx-auto px-6 pb-10">
      <div className="h-3 w-28 bg-[color:var(--border)] rounded animate-pulse mb-3" />
      <div className="h-7 w-48 bg-[color:var(--border)] rounded animate-pulse mb-6" />
      <div className="flex gap-6 overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="w-[260px] shrink-0">
            <div className="aspect-video bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl animate-pulse mb-3" />
            <div className="h-4 w-3/4 bg-[color:var(--border)] rounded animate-pulse mb-2" />
            <div className="h-3 w-1/2 bg-[color:var(--border)] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)] pt-16">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="h-3 w-40 bg-[color:var(--border)] rounded animate-pulse mb-6" />
        <div className="h-12 w-3/4 bg-[color:var(--border)] rounded animate-pulse mb-4" />
        <div className="h-4 w-1/2 bg-[color:var(--border)] rounded animate-pulse mb-8" />
        <div className="flex gap-3">
          <div className="h-12 w-40 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl animate-pulse" />
          <div className="h-12 w-32 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl animate-pulse" />
        </div>
      </div>
      <Rail />
      <Rail />
    </div>
  )
}
