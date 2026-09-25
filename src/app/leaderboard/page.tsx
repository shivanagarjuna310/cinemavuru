// /leaderboard — district and filmmaker rankings.
//
// Exists to answer "what do I get out of uploading here that YouTube does not
// give me": a place on a board scoped to Telugu short film and to your own
// district, where 9 views is a rank rather than a rounding error.
//
// Two views on one route so the URL is shareable — "we are #2 in Kurnool".

import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import TierBadge from '@/components/TierBadge'
import { getLeaderboard } from '@/lib/leaderboard'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Leaderboard — CinemaVuru',
  description:
    'District and filmmaker rankings across Telugu independent short film. See where your district stands.',
}

const MEDALS = ['🥇', '🥈', '🥉']

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

function Tab({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-full text-sm font-bold ring-1 transition ${
        active
          ? 'bg-[#D4A017]/15 text-[color:var(--accent)] ring-[color:var(--accent)]/45'
          : 'bg-[color:var(--surface)] text-[color:var(--muted)] ring-[color:var(--border)] hover:text-[color:var(--accent)]'
      }`}
    >
      {children}
    </Link>
  )
}

function Rank({ i }: { i: number }) {
  return (
    <div className="w-8 shrink-0 text-center">
      {i < 3 ? (
        <span className="text-xl" aria-label={`Rank ${i + 1}`}>{MEDALS[i]}</span>
      ) : (
        <span className="text-sm font-bold text-[color:var(--faint)] tabular-nums">{i + 1}</span>
      )}
    </div>
  )
}

const STAT_LABEL = 'text-[10px] text-[color:var(--muted)] uppercase tracking-wide'
const CARD =
  'flex items-center gap-3 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-3.5 hover:border-[color:var(--accent)]/30 hover:-translate-y-0.5 transition-all group'

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  const showCreators = view === 'filmmakers'
  const { byDistrict, byCreator } = await getLeaderboard()

  // All 134 creators rendered to 547 KB of HTML. The tail is filmmakers on
  // single-digit views, for whom a rank of #126 is not the motivating part of
  // this page — the CTA at the bottom is.
  const creators = byCreator.slice(0, 100)

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[color:var(--text)] pt-16">
        <div className="max-w-3xl mx-auto px-6 py-10">

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
            <p className="text-sm text-[color:var(--muted)] leading-relaxed">
              Every district and every filmmaker on CinemaVuru, ranked by the audience they have
              brought to Telugu short film. Updated every few minutes.
            </p>
          </div>

          <div className="flex gap-2 mb-7">
            <Tab active={!showCreators} href="/leaderboard">Districts</Tab>
            <Tab active={showCreators} href="/leaderboard?view=filmmakers">Filmmakers</Tab>
          </div>

          {showCreators ? (
            <ol className="space-y-2">
              {creators.map((c, i) => (
                <li key={c.id}>
                  <Link href={`/creator/${c.id}`} className={CARD}>
                    <Rank i={i} />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-black font-bold shrink-0">
                      {(c.name[0] ?? 'C').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm group-hover:text-[color:var(--accent)] transition line-clamp-1">
                          {c.name}
                        </span>
                        <TierBadge tier={c.tier} size="sm" showLabel={false} />
                      </div>
                      <p className="text-xs text-[color:var(--muted)] mt-0.5">
                        {c.districtName ? `📍 ${c.districtName} · ` : ''}
                        {c.films} {c.films === 1 ? 'film' : 'films'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-[color:var(--accent)] tabular-nums">{fmt(c.views)}</div>
                      <div className={STAT_LABEL}>views</div>
                    </div>
                    <div className="text-right shrink-0 w-14">
                      <div className="text-sm font-bold text-[color:var(--accent-hot)] tabular-nums">{c.supporters}</div>
                      <div className={STAT_LABEL}>support</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="space-y-2">
              {byDistrict.map((d, i) => (
                <li key={d.id}>
                  <Link href={`/${d.stateSlug}/${d.slug}`} className={CARD}>
                    <Rank i={i} />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm group-hover:text-[color:var(--accent)] transition">
                        {d.name}
                      </span>
                      <p className="text-xs text-[color:var(--muted)] mt-0.5">
                        {d.films} {d.films === 1 ? 'film' : 'films'} · {d.creators}{' '}
                        {d.creators === 1 ? 'filmmaker' : 'filmmakers'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-[color:var(--accent)] tabular-nums">{fmt(d.views)}</div>
                      <div className={STAT_LABEL}>views</div>
                    </div>
                    <div className="text-right shrink-0 w-14">
                      <div className="text-sm font-bold text-[color:var(--accent-hot)] tabular-nums">{fmt(d.likes)}</div>
                      <div className={STAT_LABEL}>likes</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}

          {/* A board only motivates if the gap is closeable. Say how to close it. */}
          <div className="mt-8 rounded-xl border border-dashed border-[color:var(--border)] p-5 text-center">
            <p className="text-sm text-[color:var(--text)] font-semibold mb-1">Not on the board yet?</p>
            <p className="text-xs text-[color:var(--muted)] mb-4">
              Every film published on CinemaVuru counts towards its district.
            </p>
            <Link
              href="/upload"
              className="inline-block bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-5 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition"
            >
              Publish your film — free
            </Link>
          </div>

        </div>
      </main>
    </>
  )
}
