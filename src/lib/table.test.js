import { describe, it, expect } from 'vitest'
import mini from './fixtures/mini.json'
import season from './fixtures/en1-2024-25.json'
import {
  scoreOf,
  matchResult,
  buildTable,
  compareRows,
  roundNumber,
  tableAfterRound,
  teamForm,
  teamMatches,
  biggestWin,
  positionsByRound,
  lastPlayedRound,
  sortLaLiga,
  isFresh,
  DAY_MS,
  predictionPoints,
  predictionSummary,
  matchKey,
} from './table.js'
import { teamIdByName } from '../data/teams-map.js'
import { appReducer, initialState, loadState, saveState, STORAGE_KEY } from './store.js'

const m = (round, date, team1, team2, ft, ht) => ({
  round: `Matchday ${round}`,
  date,
  team1,
  team2,
  ...(ft ? { score: { ft, ...(ht ? { ht } : {}) } } : {}),
})
const abc = [
  m(1, '2024-08-01', 'A', 'B', [2, 0], [1, 0]),
  m(2, '2024-08-08', 'B', 'C', [1, 1], [0, 1]),
  m(3, '2024-08-15', 'C', 'A', [0, 3], [0, 0]),
]
const row = (t, team) => t.find((r) => r.team === team)

describe('matchResult', () => {
  it('победа хозяев: W для team1, L для team2', () => {
    expect(matchResult({ ft: [2, 1] }, 'team1')).toBe('W')
    expect(matchResult({ ft: [2, 1] }, 'team2')).toBe('L')
    expect(matchResult({ ft: [1, 1] }, 2)).toBe('D')
  })
  it('матч без score → null', () => {
    expect(matchResult(mini.matches[7])).toBeNull()
    expect(matchResult(null)).toBeNull()
  })
  it('короткий формат счёта массивом [0, 0]', () => {
    expect(scoreOf(mini.matches[6])).toEqual([0, 0])
    expect(matchResult(mini.matches[6], 2)).toBe('D')
  })
})

describe('buildTable', () => {
  it('A–B 2:0, B–C 1:1, C–A 0:3', () => {
    const t = buildTable(abc)
    expect(t.map((r) => r.team)).toEqual(['A', 'B', 'C'])
    expect(row(t, 'A')).toMatchObject({ points: 6, gf: 5, ga: 0, won: 2, played: 2 })
    expect(row(t, 'B').points).toBe(1)
    expect(row(t, 'C').points).toBe(1)
  })
  it('матч без score не учитывается ни в играх, ни в очках', () => {
    const t = buildTable([...abc, m(4, '2024-08-22', 'A', 'C')])
    expect(row(t, 'A').played).toBe(2)
    expect(row(t, 'A').points).toBe(6)
  })
  it('дома / в гостях / по первым таймам', () => {
    expect(row(buildTable(abc, { venue: 'home' }), 'A')).toMatchObject({ played: 1, points: 3 })
    expect(row(buildTable(abc, { venue: 'away' }), 'A')).toMatchObject({ played: 1, gf: 3 })
    const ht = buildTable(abc, { half: 'ht' })
    expect(row(ht, 'C').points).toBe(4) // 1:0 у B в гостях и 0:0 с A
  })
  it('проверка на реальном сезоне АПЛ 2024-25', () => {
    expect(season.matches).toHaveLength(380)
    const t = buildTable(season.matches)
    expect(t[0]).toMatchObject({ team: 'Liverpool FC', points: 84, played: 38 })
    expect(t[19]).toMatchObject({ team: 'Southampton FC', points: 12 })
  })
})

describe('compareRows', () => {
  const base = { points: 10, gd: 0, gf: 10 }
  it('равные очки → выше разница +5, чем +3', () => {
    const rows = [{ ...base, team: 'X', gd: 3 }, { ...base, team: 'Y', gd: 5 }]
    expect([...rows].sort(compareRows)[0].team).toBe('Y')
  })
  it('очки, разница и забитые равны → по алфавиту', () => {
    const rows = [{ ...base, team: 'Chelsea' }, { ...base, team: 'Arsenal' }]
    expect([...rows].sort(compareRows).map((r) => r.team)).toEqual(['Arsenal', 'Chelsea'])
  })
  it('при равной разнице выше тот, кто больше забил', () => {
    expect(compareRows({ ...base, team: 'A', gf: 8 }, { ...base, team: 'B', gf: 9 })).toBeGreaterThan(0)
  })
})

describe('туры', () => {
  it('roundNumber', () => {
    expect(roundNumber('Matchday 12')).toBe(12)
    expect(roundNumber('Final')).toBeNull()
  })
  it('tableAfterRound(matches, 1) — только 1-й тур', () => {
    const t = tableAfterRound(abc, 1)
    expect(row(t, 'A').played).toBe(1)
    expect(row(t, 'C').played).toBe(0)
    expect(tableAfterRound(season.matches, 1).reduce((s, r) => s + r.played, 0)).toBe(20)
  })
  it('lastPlayedRound и места по турам', () => {
    expect(lastPlayedRound(season.matches)).toBe(38)
    const pos = positionsByRound(abc, 'A')
    expect(pos).toEqual([
      { round: 1, position: 1 },
      { round: 2, position: 1 },
      { round: 3, position: 1 },
    ])
  })
})

describe('команда', () => {
  it('teamForm: 7 сыгранных матчей → 5 последних по дате', () => {
    const games = [
      m(1, '2024-08-01', 'T', 'X', [0, 1]), // L
      m(7, '2024-09-20', 'X', 'T', [0, 2]), // W
      m(2, '2024-08-08', 'T', 'X', [0, 0]), // D
      m(3, '2024-08-15', 'T', 'X', [3, 0]), // W
      m(4, '2024-08-22', 'X', 'T', [1, 1]), // D
      m(5, '2024-08-29', 'T', 'X', [0, 2]), // L
      m(6, '2024-09-05', 'T', 'X', [1, 0]), // W
      m(8, '2024-09-27', 'T', 'X'), // не сыгран
    ]
    expect(teamForm(games, 'T')).toBe('WDLWW')
    expect(teamForm([], 'T')).toBe('')
  })
  it('teamMatches — 38 матчей клуба по дате', () => {
    const list = teamMatches(season.matches, 'Arsenal FC')
    expect(list).toHaveLength(38)
    expect(list[0].date <= list[37].date).toBe(true)
  })
  it('biggestWin', () => {
    expect(biggestWin(abc, 'A')).toMatchObject({ gf: 3, ga: 0 })
    expect(biggestWin(abc, 'C')).toBeNull()
  })
  it('teamIdByName', () => {
    expect(teamIdByName('Arsenal FC')).toBe(133604)
    expect(teamIdByName('Unknown FC')).toBeNull()
    expect(teamIdByName('toString')).toBeNull()
  })
})

describe('личные встречи (правила Ла Лиги)', () => {
  it('при равных очках выше тот, кто выиграл личную встречу, даже с худшей разницей', () => {
    const games = [
      m(1, '2024-08-01', 'P', 'Q', [1, 0]),
      m(2, '2024-08-08', 'Q', 'Z', [5, 0]),
      m(3, '2024-08-15', 'Z', 'P', [1, 0]),
    ]
    // у всех по 3 очка, мини-таблица тоже равна → общая разница: Q +4, P 0, Z -4
    expect(buildTable(games, { rules: 'laliga' }).map((r) => r.team)).toEqual(['Q', 'P', 'Z'])
  })
  it('двое равных по очкам: АПЛ смотрит на разницу, Ла Лига — на личную встречу', () => {
    const eplTie = [
      m(1, '2024-08-01', 'P', 'Q', [1, 0]),
      m(2, '2024-08-08', 'Q', 'Z', [6, 0]),
      m(3, '2024-08-15', 'P', 'Z', [0, 1]),
      m(4, '2024-08-22', 'Z', 'Q', [0, 1]),
    ]
    // Q — 6 очков; P и Z — по 3. Разница: P 0, Z −6 → по АПЛ P выше.
    // Личная встреча P–Z 0:1 → по Ла Лиге выше Z.
    expect(buildTable(eplTie).map((r) => r.team)).toEqual(['Q', 'P', 'Z'])
    expect(sortLaLiga(buildTable(eplTie), eplTie).map((r) => r.team)).toEqual(['Q', 'Z', 'P'])
  })
})

describe('isFresh', () => {
  const now = Date.UTC(2026, 10, 25, 12)
  it('23 ч назад — свежо, 25 ч назад — нет', () => {
    expect(isFresh(now - 23 * 3600e3, now, DAY_MS)).toBe(true)
    expect(isFresh(now - 25 * 3600e3, now, DAY_MS)).toBe(false)
  })
  it('мусор и время из будущего → false', () => {
    expect(isFresh('abc', now)).toBe(false)
    expect(isFresh(now + 1000, now)).toBe(false)
  })
})

describe('прогнозы', () => {
  const played = m(1, '2024-08-01', 'A', 'B', [2, 1])
  it('точный счёт 3, исход 1, мимо 0, не сыгран null', () => {
    expect(predictionPoints({ home: 2, away: 1 }, played)).toBe(3)
    expect(predictionPoints({ home: 1, away: 0 }, played)).toBe(1)
    expect(predictionPoints({ home: 1, away: 1 }, played)).toBe(0)
    expect(predictionPoints({ home: 1, away: 1 }, m(2, '2099-01-01', 'A', 'B'))).toBeNull()
  })
  it('predictionSummary', () => {
    const preds = {
      [matchKey('en.1', 's', abc[0])]: { home: 2, away: 0 },
      [matchKey('en.1', 's', abc[1])]: { home: 2, away: 0 },
      [matchKey('en.1', 's', abc[2])]: { home: 0, away: 1 },
    }
    expect(predictionSummary(preds, abc, 'en.1', 's')).toMatchObject({ made: 3, exact: 1, outcome: 1, miss: 1, points: 4 })
  })
})

describe('appReducer + localStorage', () => {
  it('TOGGLE_FAVORITE два раза → снова пусто, исходный state не меняется', () => {
    const a = { type: 'TOGGLE_FAVORITE', code: 'en.1', season: '2024-25', team: 'Arsenal FC' }
    const s1 = appReducer(initialState, a)
    expect(s1.favorites).toHaveLength(1)
    expect(appReducer(s1, a).favorites).toHaveLength(0)
    expect(initialState.favorites).toHaveLength(0)
  })
  it('SET_PREDICTION проверяет счёт', () => {
    const s = appReducer(initialState, { type: 'SET_PREDICTION', key: 'k', home: '2', away: 1 })
    expect(s.predictions.k).toEqual({ home: 2, away: 1 })
    expect(appReducer(s, { type: 'SET_PREDICTION', key: 'k', home: -1, away: 1 })).toBe(s)
    expect(appReducer(s, { type: 'REMOVE_PREDICTION', key: 'k' }).predictions).toEqual({})
  })
  it('битый JSON в localStorage → пустое состояние', () => {
    const mem = new Map()
    const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }
    st.setItem(STORAGE_KEY, 'abc')
    expect(loadState(st)).toEqual(initialState)
    const good = { favorites: [{ code: 'en.1', season: '2024-25', team: 'Arsenal FC' }], predictions: { k: { home: 1, away: 0 } } }
    saveState(good, st)
    expect(loadState(st)).toEqual(good)
  })
})
