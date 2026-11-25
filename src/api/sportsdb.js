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

/**
 * Свежий кеш → он; иначе запрос. При 429 или ошибке сети отдаём старый кеш
 * (с пометкой stale), а если его нет — «Попробуйте через минуту».
 */
async function cached(key, path, pick) {
  const entry = readCache(key)
  if (entry && isFresh(entry.savedAt)) return { data: entry.data, stale: false }
  if (inflight.has(key)) return inflight.get(key)

  const p = (async () => {
    let res
    try {
      res = await fetch(`${BASE}/${path}`)
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

/** Клуб: { strTeam, strBadge, intFormedYear, strStadium, intStadiumCapacity, strDescriptionEN, … } или null. */
export function getTeamInfo(id) {
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
  })
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
