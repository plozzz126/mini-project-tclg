// Матчи сезона из openfootball. Загруженный сезон хранится в Map и повторно не скачивается.

const BASE = 'https://raw.githubusercontent.com/openfootball/football.json/master'

export const LEAGUES = [
  { code: 'en.1', name: 'Англия', title: 'Премьер-лига', flag: '🏴' },
  { code: 'es.1', name: 'Испания', title: 'Ла Лига', flag: '🇪🇸' },
  { code: 'de.1', name: 'Германия', title: 'Бундеслига', flag: '🇩🇪' },
  { code: 'it.1', name: 'Италия', title: 'Серия A', flag: '🇮🇹' },
  { code: 'fr.1', name: 'Франция', title: 'Лига 1', flag: '🇫🇷' },
]
export const SEASONS = ['2026-27', '2025-26', '2024-25', '2023-24']
export const CURRENT_SEASON = SEASONS[0]

export const leagueByCode = (code) => LEAGUES.find((l) => l.code === code) ?? null

const cache = new Map() // url → Promise<{ name, matches }>

export function getSeason(code, season) {
  if (!leagueByCode(code) || !/^\d{4}-\d{2}$/.test(season)) {
    return Promise.reject(Object.assign(new Error('Такой лиги или сезона нет'), { status: 404 }))
  }
  const url = `${BASE}/${season}/${code}.json`
  if (cache.has(url)) return cache.get(url)

  const promise = fetch(url)
    .catch(() => {
      throw new Error('Нет связи с сервером. Проверьте интернет.')
    })
    .then((res) => {
      if (res.status === 404) throw Object.assign(new Error('Сезон не найден'), { status: 404 })
      if (!res.ok) throw new Error(`Ошибка загрузки (${res.status})`)
      return res.json()
    })
    .then((data) => ({ name: data.name ?? '', matches: Array.isArray(data.matches) ? data.matches : [] }))

  cache.set(url, promise)
  promise.catch(() => cache.delete(url))
  return promise
}
