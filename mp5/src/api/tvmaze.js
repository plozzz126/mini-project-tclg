// Слой API TVmaze. Лимит — 20 запросов за 10 секунд с IP, поэтому:
// кеш ответов в Map, а при 429 — пауза 2 с и одна повторная попытка.

const BASE = 'https://api.tvmaze.com'
const cache = new Map() // url → Promise<json>

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function request(url, retried = false) {
  let res
  try {
    res = await fetch(url)
  } catch {
    throw new ApiError('Нет связи с TVmaze. Проверьте интернет.', 0)
  }
  if (res.status === 429) {
    if (retried) throw new ApiError('Слишком много запросов. Подождите несколько секунд.', 429)
    await sleep(2000)
    return request(url, true)
  }
  if (res.status === 404) throw new ApiError('Не найдено', 404)
  if (!res.ok) throw new ApiError(`Ошибка TVmaze (${res.status})`, res.status)
  return res.json()
}

/** Кеш → запрос → при 429 пауза и повтор. Ошибки не кешируются. */
export function getJson(path) {
  const url = BASE + path
  if (cache.has(url)) return cache.get(url)
  const p = request(url)
  cache.set(url, p)
  p.catch(() => cache.delete(url))
  return p
}

/** Поиск: [{ score, show }] */
export const searchShows = (q) => getJson(`/search/shows?q=${encodeURIComponent(q.trim())}`)

/** Сериал + _embedded.episodes + _embedded.cast одним запросом. */
export const getShowFull = (id) => getJson(`/shows/${Number(id)}?embed[]=episodes&embed[]=cast`)

/** Серии стриминговых сервисов, выходящие в этот день. */
export const getTodayWeb = (date) => getJson(`/schedule/web?date=${date}`)

/** Актёр и его роли (с сериалами). */
export const getPerson = (id) => getJson(`/people/${Number(id)}`)
export const getCastCredits = (id) => getJson(`/people/${Number(id)}/castcredits?embed=show`)

/** Страница каталога (250 сериалов) — источник для рекомендаций. */
export const getShowIndex = (page = 0) => getJson(`/shows?page=${page}`)
