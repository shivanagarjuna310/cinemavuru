// src/app/contest/enter/loading.tsx
// Shows while the contest entry form is loading.

export default function ContestEnterLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)] pt-16">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="h-12 w-12 bg-[color:var(--border)] rounded-full animate-pulse mx-auto mb-4" />
          <div className="h-8 w-56 bg-[color:var(--border)] rounded animate-pulse mx-auto mb-3" />
          <div className="h-4 w-80 max-w-full bg-[color:var(--border)] rounded animate-pulse mx-auto" />
        </div>
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-5 mb-8 grid grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[color:var(--border)] animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 bg-[color:var(--border)] rounded animate-pulse" />
                <div className="h-2.5 w-32 bg-[color:var(--border)] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i}>
              <div className="h-3 w-28 bg-[color:var(--border)] rounded animate-pulse mb-2" />
              <div className="h-11 w-full bg-[color:var(--border)]/60 rounded-lg animate-pulse" />
            </div>
          ))}
          <div className="h-12 w-full bg-[color:var(--border)] rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}
