// src/app/reels/loading.tsx
// Shows while the reels feed is loading. Full-bleed to match the player.

export default function ReelsLoading() {
  return (
    <div className="min-h-screen bg-black grid place-items-center">
      <div className="w-full max-w-[420px] aspect-[9/16] bg-[color:var(--surface)]/40 rounded-2xl animate-pulse grid place-items-center">
        <div className="text-5xl opacity-20">🎬</div>
      </div>
    </div>
  )
}
