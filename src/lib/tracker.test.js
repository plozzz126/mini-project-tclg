import { describe, it, expect } from 'vitest'
import bb from './fixtures/bb.json'
import {
  stripHtml,
  groupBySeason,
  seasonProgress,
  nextEpisode,
  episodeCode,
  watchMinutes,
  watchTime,
  formatMinutes,
  isAired,
  todayLocal,
  daysUntil,
  countdown,
  upcomingEpisodes,
} from './episodes.js'
import {
  trackerReducer,
  loadTracker,
  saveTracker,
  validateTracker,
  genreStats,
  yearStats,
  recommend,
  STORAGE_KEY,
} from './tracker.js'

const episodes = bb._embedded.episodes
const seasons = groupBySeason(episodes)
const s1 = seasons[1]
const ids = (list) => list.map((e) => e.id)

describe('stripHtml', () => {
  it('убирает теги', () => {
    expect(stripHtml('<p><b>Breaking Bad</b> is…</p>')).toBe('Breaking Bad is…')
  })
  it('null → пустая строка', () => {
    expect(stripHtml(null)).toBe('')
    expect(stripHtml(undefined)).toBe('')
  })
  it('сущности и опасный HTML превращаются в текст', () => {
    expect(stripHtml('<p>Tom &amp; Jerry&#39;s</p><p>2</p>')).toBe("Tom & Jerry's 2")
    expect(stripHtml('<img src=x onerror="alert(1)">Hi')).toBe('Hi')
    expect(stripHtml(bb.summary).startsWith('Breaking Bad follows')).toBe(true)
  })
})

describe('groupBySeason', () => {
  it('Breaking Bad: сезоны 1–5, в 1-м 7 серий, всего 62', () => {
    expect(Object.keys(seasons)).toEqual(['1', '2', '3', '4', '5'])
    expect(s1).toHaveLength(7)
    expect(Object.values(seasons).flat()).toHaveLength(62)
    expect(s1.map((e) => e.number)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('seasonProgress', () => {
  it('3 из 7 → 43%', () => {
    expect(seasonProgress(s1, ids(s1).slice(0, 3))).toEqual({ watched: 3, total: 7, percent: 43 })
  })
  it('спецвыпуск (number = null) не входит в total', () => {
    const special = { id: 999, season: 1, number: null, runtime: 30 }
    expect(seasonProgress([...s1, special], [999]).total).toBe(7)
    expect(seasonProgress([...s1, special], [999]).watched).toBe(0)
  })
  it('весь 1-й сезон → 7 из 62 по сериалу', () => {
    expect(seasonProgress(episodes, ids(s1))).toEqual({ watched: 7, total: 62, percent: 11 })
    expect(seasonProgress([], [])).toEqual({ watched: 0, total: 0, percent: 0 })
  })
})

describe('nextEpisode', () => {
  it('просмотрены S01E01–S01E07 → S02E01', () => {
    expect(episodeCode(nextEpisode(episodes, ids(s1)))).toBe('S02E01')
  })
  it('пропуск в середине — следующая та, что пропущена', () => {
    const watched = ids(s1).filter((_, i) => i !== 2)
    expect(episodeCode(nextEpisode(episodes, watched))).toBe('S01E03')
  })
  it('просмотрено всё → null', () => {
    expect(nextEpisode(episodes, ids(episodes))).toBeNull()
  })
})

describe('время', () => {
  const ten = Array.from({ length: 10 }, (_, i) => ({ id: i, runtime: 45 }))
  it('10 серий по 45 мин → "7 ч 30 мин"', () => {
    expect(watchTime(ten)).toBe('7 ч 30 мин')
  })
  it('нет runtime → берётся averageRuntime', () => {
    expect(watchMinutes([{ runtime: null }, { runtime: 30 }], 50)).toBe(80)
    expect(formatMinutes(60)).toBe('1 ч')
    expect(formatMinutes(5)).toBe('5 мин')
    expect(watchTime(s1, bb.averageRuntime)).toBe('7 ч')
  })
})

describe('даты', () => {
  it('isAired', () => {
    expect(isAired('2099-01-01', '2026-11-11')).toBe(false)
    expect(isAired('2026-11-11', '2026-11-11')).toBe(true)
    expect(isAired('2008-01-20', '2026-11-11')).toBe(true)
    expect(isAired(null, '2026-11-11')).toBe(false)
    expect(isAired('', '2026-11-11')).toBe(false)
  })
  it('todayLocal берёт местную дату, а не UTC', () => {
    // 2026-11-11 03:00 в Алматы — по UTC это ещё 10-е число
    const d = new Date(2026, 10, 11, 3, 0)
    expect(todayLocal(d)).toBe('2026-11-11')
  })
  it('обратный отсчёт', () => {
    expect(daysUntil('2026-12-01', '2026-11-25')).toBe(6)
    expect(countdown(6)).toBe('через 6 дней')
    expect(countdown(1)).toBe('завтра')
    expect(countdown(22)).toBe('через 22 дня')
    expect(countdown(21)).toBe('через 21 день')
  })
  it('upcomingEpisodes — только будущие с датой, по дате', () => {
    const list = [
      { id: 1, season: 1, number: 2, airdate: '2026-12-10' },
      { id: 2, season: 1, number: 1, airdate: '2026-12-01' },
      { id: 3, season: 1, number: 3, airdate: '' },
      { id: 4, season: 0, number: 9, airdate: '2020-01-01' },
    ]
    expect(upcomingEpisodes(list, '2026-11-25').map((e) => e.id)).toEqual([2, 1])
  })
})

describe('trackerReducer', () => {
  const show = { id: 169, name: 'Breaking Bad', image: { medium: 'x.jpg' }, genres: ['Drama'], premiered: '2008-01-20' }
  const ep = s1[0].id

  it('TOGGLE_EPISODE два раза → снова не отмечена, исходный state не изменён', () => {
    const s0 = Object.freeze({})
    const s1st = trackerReducer(s0, { type: 'TOGGLE_EPISODE', showId: 169, episodeId: ep, show })
    expect(s1st[169].watched).toEqual([ep])
    expect(s1st[169].name).toBe('Breaking Bad')
    const s2 = trackerReducer(s1st, { type: 'TOGGLE_EPISODE', showId: 169, episodeId: ep, show })
    expect(s2[169].watched).toEqual([])
    expect(s0).toEqual({})
    expect(s1st[169].watched).toEqual([ep])
  })
  it('MARK_SEASON отмечает весь сезон, повторно — снимает', () => {
    const a = trackerReducer({}, { type: 'MARK_SEASON', showId: 169, episodeIds: ids(s1), show })
    expect(a[169].watched).toHaveLength(7)
    expect(trackerReducer(a, { type: 'MARK_SEASON', showId: 169, episodeIds: ids(s1) })[169].watched).toEqual([])
  })
  it('ADD_SHOW / REMOVE_SHOW / SET_STATUS / SET_RATING', () => {
    const a = trackerReducer({}, { type: 'ADD_SHOW', show })
    expect(a[169]).toMatchObject({ watched: [], status: 'watching', rating: null })
    expect(trackerReducer(a, { type: 'ADD_SHOW', show })).toBe(a)
    expect(trackerReducer(a, { type: 'SET_STATUS', showId: 169, status: 'dropped' })[169].status).toBe('dropped')
    expect(trackerReducer(a, { type: 'SET_STATUS', showId: 169, status: 'bad' })).toBe(a)
    expect(trackerReducer(a, { type: 'SET_RATING', showId: 169, rating: 9 })[169].rating).toBe(9)
    expect(trackerReducer(a, { type: 'SET_RATING', showId: 169, rating: 11 })).toBe(a)
    expect(trackerReducer(a, { type: 'REMOVE_SHOW', showId: 169 })).toEqual({})
  })
})

describe('localStorage и импорт', () => {
  const mem = () => {
    const m = new Map()
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }
  }
  it('"abc" в localStorage → {} без ошибки', () => {
    const st = mem()
    st.setItem(STORAGE_KEY, 'abc')
    expect(loadTracker(st)).toEqual({})
  })
  it('сохранение и чтение', () => {
    const st = mem()
    const data = { 169: { name: 'BB', image: null, genres: [], premiered: null, watched: [1, 2], status: 'watching', rating: null } }
    saveTracker(data, st)
    expect(loadTracker(st)).toEqual(data)
  })
  it('validateTracker отбрасывает битые записи и сообщает об ошибках', () => {
    const r = validateTracker({ 169: { name: 'BB', watched: [1, 1, 'x'] }, abc: {}, 5: { watched: [] } })
    expect(Object.keys(r.data)).toEqual(['169'])
    expect(r.data[169].watched).toEqual([1])
    expect(r.errors).toHaveLength(3)
    expect(validateTracker([1, 2]).ok).toBe(false)
    expect(validateTracker('abc').ok).toBe(false)
  })
})

describe('статистика и рекомендации', () => {
  const tracker = {
    1: { name: 'A', genres: ['Drama', 'Crime'], premiered: '2008-01-01', watched: [] },
    2: { name: 'B', genres: ['Drama'], premiered: '2013-05-01', watched: [] },
  }
  it('genreStats / yearStats', () => {
    expect(genreStats(tracker)).toEqual([
      { genre: 'Drama', count: 2 },
      { genre: 'Crime', count: 1 },
    ])
    expect(yearStats(tracker)).toEqual([
      { year: 2008, count: 1 },
      { year: 2013, count: 1 },
    ])
  })
  it('recommend: те же жанры, без уже добавленных', () => {
    const shows = [
      { id: 1, genres: ['Drama'], rating: { average: 9 } },
      { id: 10, genres: ['Comedy'], rating: { average: 9 } },
      { id: 11, genres: ['Drama'], rating: { average: 7 } },
      { id: 12, genres: ['Drama', 'Crime'], rating: { average: 6 } },
    ]
    expect(recommend(shows, tracker).map((s) => s.id)).toEqual([12, 11])
    expect(recommend(shows, {})).toEqual([])
  })
})
