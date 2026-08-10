import Navbar           from '@/components/Navbar'
import ContestEntryForm from '@/components/ContestEntryForm'

export default function ContestEnterPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[color:var(--text)] pt-16">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="text-center mb-10">
            <div className="text-5xl mb-4">🏆</div>
            <h1 className="text-3xl font-bold text-[color:var(--text)] mb-2">Enter the Contest</h1>
            <p className="text-[color:var(--muted)] leading-relaxed">
              Submit your short film to compete for prizes.
              100% public voting — the film with the most votes wins.
            </p>
          </div>

          {/* Updated scoring info */}
          <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-5 mb-8">
            <h3 className="text-sm font-bold text-[color:var(--accent)] uppercase tracking-wide mb-3">How Voting Works</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#D4A017]/15 border border-[color:var(--accent)]/30 flex items-center justify-center text-[color:var(--accent)] font-bold text-lg flex-shrink-0">🗳️</div>
                <div>
                  <div className="font-semibold text-[color:var(--text)]">1 Vote Per User</div>
                  <div className="text-xs text-[color:var(--muted)]">Each viewer gets exactly 1 vote</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FF6B1A]/15 border border-[color:var(--accent-hot)]/30 flex items-center justify-center text-[color:var(--accent-hot)] font-bold text-lg flex-shrink-0">🔒</div>
                <div>
                  <div className="font-semibold text-[color:var(--text)]">Final Vote</div>
                  <div className="text-xs text-[color:var(--muted)]">Once cast, votes cannot be changed</div>
                </div>
              </div>
            </div>
          </div>

          <ContestEntryForm />
        </div>
      </main>
    </>
  )
}
