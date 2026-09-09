// Placeholder for the personalised homepage rails while their data is in
// flight. Those rails hide themselves when empty, so without this the row
// silently pops in once the query lands.
//
// Only rendered when there is a signed-in user, i.e. when something actually
// might arrive — a signed-out visitor should see nothing, not a skeleton for a
// rail that will never appear.

export default function RailSkeleton({ cards = 5 }: { cards?: number }) {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-12 pt-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading films…</span>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-px h-6 bg-[color:var(--border)]" />
        <div className="h-3 w-28 bg-[color:var(--border)] rounded animate-pulse" />
      </div>
      <div className="h-7 w-52 bg-[color:var(--border)] rounded animate-pulse mb-6" />
      <div className="flex gap-6 overflow-hidden">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="w-[260px] shrink-0">
            <div className="aspect-video bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl animate-pulse mb-3" />
            <div className="h-4 w-3/4 bg-[color:var(--border)] rounded animate-pulse mb-2" />
            <div className="h-3 w-1/2 bg-[color:var(--border)] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  )
}
