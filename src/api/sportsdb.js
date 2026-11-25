// TheSportsDB: эмблема, стадион, описание и игроки клуба.
// Ответы хранятся в localStorage 24 часа: повторное открытие страницы клуба не идёт в сеть.
import { isFresh } from '../lib/table.js'

/** Бесплатный тестовый ключ. Хранится только здесь. */
export const API_KEY = '123'
const BASE = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`
const PREFIX = 'sportsdb:'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    const entry = raw ? JSON.parse(raw) : null
    return entry && typeof entry === 'object' && 'savedAt' in entry ? entry : null
  } catch {
    return null
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }))
  } catch {
    // нет места — просто не кешируем
  }
}

const inflight = new Map()

// Очередь: запросы к TheSportsDB идут по одному, не чаще раза в 2,1 с —
// так 20 эмблем таблицы не упрутся в лимит 30 запросов в минуту.
// Запросы страницы клуба (urgent) встают в начало очереди, эмблемы — в конец.
const GAP_MS = 2100
const queue = []
let busy = false
let lastAt = 0

function pump() {
  if (busy || !queue.length) return
  const wait = lastAt + GAP_MS - Date.now()
  if (wait > 0) {
    setTimeout(pump, wait)
    return
  }
  busy = true
  const job = queue.shift()
  lastAt = Date.now()
  fetch(job.url)
    .then(job.resolve, job.reject)
    .finally(() => {
      busy = false
      pump()
    })
}

function throttled(url, urgent) {
  return new Promise((resolve, reject) => {
    const job = { url, resolve, reject }
    if (urgent) queue.unshift(job)
    else queue.push(job)
    pump()
  })
}

/**
 * Свежий кеш → он; иначе запрос. При 429 или ошибке сети отдаём старый кеш
 * (с пометкой stale), а если его нет — «Попробуйте через минуту».
 */
async function cached(key, path, pick, urgent = true) {
  const entry = readCache(key)
  if (entry && isFresh(entry.savedAt)) return { data: entry.data, stale: false }
  if (inflight.has(key)) return inflight.get(key)

  const p = (async () => {
    let res
    try {
      res = await throttled(`${BASE}/${path}`, urgent)
    } catch {
      if (entry) return { data: entry.data, stale: true }
      throw new ApiError('Нет связи с TheSportsDB. Попробуйте через минуту.', 0)
    }
    if (res.status === 429) {
      if (entry) return { data: entry.data, stale: true }
      throw new ApiError('Слишком много запросов к TheSportsDB. Попробуйте через минуту.', 429)
    }
    if (!res.ok) {
      if (entry) return { data: entry.data, stale: true }
      throw new ApiError(`Ошибка TheSportsDB (${res.status})`, res.status)
    }
    const data = pick(await res.json())
    writeCache(key, data)
    return { data, stale: false }
  })()

  inflight.set(key, p)
  try {
    return await p
  } finally {
    inflight.delete(key)
  }
}

/** Уменьшенная эмблема: /small (250 px) или /tiny (50 px). */
export function badgeUrl(strBadge, size = 'small') {
  return strBadge ? `${strBadge}/${size}` : null
}

/** Клуб: { strTeam, strBadge, intFormedYear, strStadium, intStadiumCapacity, strDescriptionEN, … } или null. */
export function getTeamInfo(id, { urgent = true } = {}) {
  return cached(`team:${id}`, `lookupteam.php?id=${id}`, (json) => {
    const t = json?.teams?.[0]
    if (!t) return null
    // храним только нужные поля, а не весь огромный объект
    return {
      strTeam: t.strTeam,
      strBadge: t.strBadge,
      intFormedYear: t.intFormedYear,
      strStadium: t.strStadium,
      intStadiumCapacity: t.intStadiumCapacity,
      strLocation: t.strLocation,
      strDescriptionEN: t.strDescriptionEN,
      strWebsite: t.strWebsite,
    }
  }, urgent)
}

/** Игроки: [{ strPlayer, strPosition, strNationality, strThumb }] (на бесплатном ключе до 10). */
export function getPlayers(id) {
  return cached(`players:${id}`, `lookup_all_players.php?id=${id}`, (json) =>
    (json?.player ?? []).map((p) => ({
      idPlayer: p.idPlayer,
      strPlayer: p.strPlayer,
      strPosition: p.strPosition,
      strNationality: p.strNationality,
      strThumb: p.strThumb || p.strCutout || null,
    })),
  )
}
