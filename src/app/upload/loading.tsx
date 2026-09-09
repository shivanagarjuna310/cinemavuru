// src/app/upload/loading.tsx
// Shows while the upload page (form + aside) is loading.

export default function UploadLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)] pt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <div className="h-3 w-28 bg-[color:var(--border)] rounded animate-pulse mx-auto mb-3" />
          <div className="h-9 w-72 bg-[color:var(--border)] rounded animate-pulse mx-auto mb-3" />
          <div className="h-4 w-96 max-w-full bg-[color:var(--border)] rounded animate-pulse mx-auto" />
        </div>

        <div className="grid lg:grid-cols-[1fr_20rem] gap-6 lg:gap-8 items-start">
          {/* Form card */}
          <div className="order-2 lg:order-1 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5 sm:p-8 space-y-5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i}>
                <div className="h-3 w-24 bg-[color:var(--border)] rounded animate-pulse mb-2" />
                <div className="h-11 w-full bg-[color:var(--border)]/60 rounded-lg animate-pulse" />
              </div>
            ))}
            <div className="h-12 w-full bg-[color:var(--border)] rounded-xl animate-pulse" />
          </div>

          {/* Aside */}
          <aside className="order-1 lg:order-2 space-y-4">
            {[1, 2].map(card => (
              <div key={card} className="bg-[color:var(--surface-2)] border border-[color:var(--border-2)] rounded-2xl p-5">
                <div className="h-4 w-40 bg-[color:var(--border)] rounded animate-pulse mb-4" />
                <div className="space-y-3.5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 bg-[color:var(--border)] rounded animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-2/3 bg-[color:var(--border)] rounded animate-pulse" />
                        <div className="h-2.5 w-full bg-[color:var(--border)] rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </div>
  )
}
