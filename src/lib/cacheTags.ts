// Tags for Next's Data Cache. One place, so a page that caches under a tag and
// the write path that busts it can never drift apart on the string.
//
// 'films' and 'contests' predate this file — the film page already caches under
// them as literals — so the values here must stay identical to those.
export const TAG = {
  films: 'films',
  contests: 'contests',
  contestEntries: 'contest-entries',
  districts: 'districts',
  winners: 'winners',
  leaderboard: 'leaderboard',
} as const
