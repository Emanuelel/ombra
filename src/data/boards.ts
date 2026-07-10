// Seed leaderboard datasets - exact content from the design handoff. These are
// invented demo data; the live app replaces them via /api/leaderboard (see Boards).

export type BoardTab = 'terrace' | 'hood' | 'friends' | 'city'

export interface BoardRow {
  rank: number
  name: string
  meta: string
  val: number
  crown?: boolean
  you?: boolean
}

export interface Board {
  title: string
  sub: string
  foot: string
  rows: BoardRow[]
}

export const BOARD_TABS: [BoardTab, string][] = [
  ['terrace', 'Bar Nàufrag'],
  ['hood', 'Poble-sec'],
  ['friends', 'Friends'],
  ['city', 'All BCN'],
]

export function boardData(tab: BoardTab, held: boolean): Board {
  switch (tab) {
    case 'terrace':
      return {
        title: 'Bar Nàufrag',
        sub: 'Crown · rolling 7d',
        foot: held ? 'you snatched it - 1 visit ahead' : 'top 4 of 38 regulars',
        rows: held
          ? [
              { rank: 1, name: '@martina · you', meta: '5 check-ins this week', val: 374, crown: true, you: true },
              { rank: 2, name: '@laies', meta: '6 check-ins this week', val: 340 },
              { rank: 3, name: '@quimet', meta: '3 check-ins this week', val: 180 },
              { rank: 4, name: '@noa.bcn', meta: '2 check-ins this week', val: 120 },
            ]
          : [
              { rank: 1, name: '@laies', meta: '6 check-ins this week', val: 340, crown: true },
              { rank: 2, name: '@martina · you', meta: '4 check-ins this week', val: 290, you: true },
              { rank: 3, name: '@quimet', meta: '3 check-ins this week', val: 180 },
              { rank: 4, name: '@noa.bcn', meta: '2 check-ins this week', val: 120 },
            ],
      }
    case 'hood':
      return {
        title: 'Poble-sec',
        sub: 'Neighbourhood · 7d',
        foot: 'crowns held across 41 terraces',
        rows: [
          { rank: 1, name: '@laies', meta: '4 crowns held', val: 1240, crown: true },
          { rank: 2, name: '@martina · you', meta: '3 crowns held', val: 1080, you: true },
          { rank: 3, name: '@pau_ombra', meta: '3 crowns held', val: 940 },
          { rank: 4, name: '@quimet', meta: '2 crowns held', val: 610 },
          { rank: 5, name: '@noa.bcn', meta: '1 crown held', val: 340 },
        ],
      }
    case 'friends':
      return {
        title: 'Your friends',
        sub: 'This week',
        foot: '9 friends hunting shade',
        rows: [
          { rank: 1, name: '@laies', meta: 'stole 2 of your crowns', val: 1240, crown: true },
          { rank: 2, name: '@martina · you', meta: 'held the line', val: 1080, you: true },
          { rank: 3, name: '@bru', meta: 'Gràcia loyalist', val: 720 },
          { rank: 4, name: '@nina.g', meta: 'weekend hunter', val: 540 },
        ],
      }
    case 'city':
      return {
        title: 'All Barcelona',
        sub: 'Top hunters · 7d',
        foot: "you're #47 city-wide - climbing",
        rows: [
          { rank: 1, name: '@solbandit', meta: 'Gràcia · 11 crowns', val: 3120, crown: true },
          { rank: 2, name: '@ombravedor', meta: 'El Raval · 9 crowns', val: 2980 },
          { rank: 3, name: '@la_reina', meta: 'Sant Antoni · 8 crowns', val: 2610 },
          { rank: 47, name: '@martina · you', meta: 'Poble-sec · 3 crowns', val: 1080, you: true },
        ],
      }
  }
}
