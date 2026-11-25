// Слой API Чикагского института искусств: кеш ответов + очередь (≤ 1 запрос/сек).
import { createQueue } from './queue.js'
import { cleanIds } from '../lib/art.js'

const BASE = 'https://api.artic.edu/api/v1'
export const PAGE_LIMIT = 24

const SEARCH_FIELDS =
  'id,title,artist_display,date_display,date_start,image_id,thumbnail,color,is_public_domain,department_title'
const DETAIL_FIELDS =
  'id,title,artist_display,date_display,date_start,medium_display,department_title,image_id,thumbnail,color,is_public_domain,dimensions,place_of_origin'
const LIST_FIELDS =
  'id,title,artist_display,date_display,date_start,image_id,thumbnail,department_title'

/** Диапазоны тона h для фильтра по цвету (совпадают с hueBucket). */
const HUE_RANGES = {
  red: [[0, 15], [345, 360]],
  orange: [[15, 45]],
  yellow: [[45, 70]],
  green: [[70, 170]],
  blue: [[170, 260]],
  purple: [[260, 345]],
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const queue = createQueue(1000)
const cache = new Map() // url → Promise<json>

async function fetchJson(url, signal) {
  if (cache.has(url)) return cache.get(url)

  const promise = queue.enqueue(async () => {
    let res
    try {
      res = await fetch(url, { signal })
    } catch (e) {
      if (e.name === 'AbortError') throw e
      throw new ApiError('Нет связи с сервером музея. Проверьте интернет.', 0)
    }
    if (res.status === 429) throw new ApiError('Слишком много запросов, подождите минуту', 429)
    if (res.status === 404) throw new ApiError('Работа не найдена', 404)
    if (!res.ok) throw new ApiError(`Ошибка сервера (${res.status})`, res.status)
    return res.json()
  }, signal)

  cache.set(url, promise)
  // ошибки и отмены не кешируем — следующая попытка пойдёт в сеть
  promise.catch(() => cache.delete(url))
  return promise
}

function colorQuery(color) {
  const ranges = HUE_RANGES[color]
  if (color === 'gray') return { range: { 'color.s': { lt: 15 } } }
  if (!ranges) return null
  return {
    bool: {
      filter: [{ range: { 'color.s': { gte: 15 } } }],
      should: ranges.map(([gte, lt]) => ({ range: { 'color.h': { gte, lt } } })),
      minimum_should_match: 1,
    },
  }
}

/**
 * Поиск. options: { color, publicDomain, signal }
 * Возвращает { data, pagination, config }.
 */
export function searchArtworks(q, page = 1, options = {}) {
  const { color = '', publicDomain = false, signal } = options
  const filters = []
  const cq = colorQuery(color)
  if (cq) filters.push(cq)
  if (publicDomain) filters.push({ term: { is_public_domain: true } })

  const params = {
    q: q.trim(),
    page,
    limit: PAGE_LIMIT,
    fields: SEARCH_FIELDS,
  }
  if (filters.length) params.query = { bool: { filter: filters } }
  const url = `${BASE}/artworks/search?params=${encodeURIComponent(JSON.stringify(params))}`
  return fetchJson(url, signal)
}

/** Одна работа: { data, config }. */
export function getArtwork(id, { signal } = {}) {
  return fetchJson(`${BASE}/artworks/${Number(id)}?fields=${DETAIL_FIELDS}`, signal)
}

/** Несколько работ одним запросом: { data, config }. Порядок API не гарантирует. */
export async function getArtworks(ids, { signal } = {}) {
  const list = cleanIds(ids)
  if (!list.length) return { data: [], config: null }
  return fetchJson(`${BASE}/artworks?ids=${list.join(',')}&fields=${LIST_FIELDS}`, signal)
}
