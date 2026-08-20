// Loads the YouTube IFrame Player API exactly once and resolves when ready.
// Lets multiple players share a single injected <script>.

let ytReady: Promise<void> | null = null

export function loadYouTubeAPI(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  const w = window as any
  if (w.YT?.Player) return Promise.resolve()
  if (ytReady) return ytReady

  ytReady = new Promise<void>((resolve) => {
    const prev = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script')
      tag.id = 'yt-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
  })
  return ytReady
}

export function ytIdFromUrl(url?: string | null): string | null {
  return url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1] ?? null
}
