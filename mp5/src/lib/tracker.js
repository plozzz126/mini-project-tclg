// Данные трекера: { [showId]: { name, image, watched: [episodeId, …], … } }.
// Хранится только то, что ввёл пользователь, плюс минимум о сериале для списка и статистики.

export const STORAGE_KEY = 'series-tracker:v1'
export const STATUSES = { watching: 'Смотрю', completed: 'Закончил', dropped: 'Бросил' }

/** Короткая запись о сериале из ответа API. */
export function showMeta(show) {
  return {
    name: String(show?.name ?? 'Без названия'),
    image: show?.image?.medium ?? null,
    genres: Array.isArray(show?.genres) ? show.genres.filter((g) => typeof g === 'string') : [],
    premiered: typeof show?.premiered === 'string' ? show.premiered : null,
  }
}

function newEntry(show) {
  return { ...showMeta(show), watched: [], status: 'watching', rating: null }
}

function ensure(state, showId, show) {
  if (state[showId]) return state[showId]
  return newEntry(show)
}

/** Единственный способ изменить трекер. Исходный state не изменяется. */
export function trackerReducer(state, action) {
  switch (action?.type) {
    case 'ADD_SHOW': {
      const id = action.show?.id
      if (!Number.isInteger(id) || state[id]) return state
      return { ...state, [id]: newEntry(action.show) }
    }
    case 'REMOVE_SHOW': {
      if (!state[action.showId]) return state
      const { [action.showId]: _removed, ...rest } = state
      return rest
    }
    case 'TOGGLE_EPISODE': {
      const { showId, episodeId } = action
      if (!Number.isInteger(showId) || !Number.isInteger(episodeId)) return state
      const entry = ensure(state, showId, action.show)
      const watched = entry.watched.includes(episodeId)
        ? entry.watched.filter((id) => id !== episodeId)
        : [...entry.watched, episodeId]
      return { ...state, [showId]: { ...entry, watched } }
    }
    case 'MARK_SEASON': {
      // все отмечены → снять отметки; иначе отметить все
      const { showId } = action
      const ids = (action.episodeIds ?? []).filter(Number.isInteger)
      if (!Number.isInteger(showId) || !ids.length) return state
      const entry = ensure(state, showId, action.show)
      const have = new Set(entry.watched)
      const allDone = ids.every((id) => have.has(id))
      const watched = allDone
        ? entry.watched.filter((id) => !ids.includes(id))
        : [...entry.watched, ...ids.filter((id) => !have.has(id))]
      return { ...state, [showId]: { ...entry, watched } }
    }
    case 'SET_STATUS': {
      const entry = state[action.showId]
      if (!entry || !(action.status in STATUSES) || entry.status === action.status) return state
      return { ...state, [action.showId]: { ...entry, status: action.status } }
    }
    case 'SET_RATING': {
      const entry = state[action.showId]
      const r = action.rating === null ? null : Number(action.rating)
      if (!entry || (r !== null && !(Number.isInteger(r) && r >= 1 && r <= 10))) return state
      return { ...state, [action.showId]: { ...entry, rating: r } }
    }
    case 'IMPORT':
      return validateTracker(action.data).ok ? validateTracker(action.data).data : state
    default:
      return state
  }
}

/**
 * Проверка формата (для localStorage и импорта JSON).
 * → { ok, data, errors }: битые записи отбрасываются, ошибки перечисляются.
 */
export function validateTracker(raw) {
  const errors = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, data: {}, errors: ['Ожидался объект { "id сериала": { name, watched: [...] } }'] }
  }
  const data = {}
  for (const [key, e] of Object.entries(raw)) {
    if (!/^\d+$/.test(key)) {
      errors.push(`«${key}»: ключ должен быть id сериала (число)`)
      continue
    }
    if (!e || typeof e !== 'object' || typeof e.name !== 'string' || !Array.isArray(e.watched)) {
      errors.push(`${key}: нужны поля name (строка) и watched (массив)`)
      continue
    }
    const watched = [...new Set(e.watched.filter((id) => Number.isInteger(id) && id > 0))]
    if (watched.length !== e.watched.length) errors.push(`${key}: в watched есть не-id или повторы — они убраны`)
    data[key] = {
      name: e.name,
      image: typeof e.image === 'string' ? e.image : null,
      genres: Array.isArray(e.genres) ? e.genres.filter((g) => typeof g === 'string') : [],
      premiered: typeof e.premiered === 'string' ? e.premiered : null,
      watched,
      status: e.status in STATUSES ? e.status : 'watching',
      rating: Number.isInteger(e.rating) && e.rating >= 1 && e.rating <= 10 ? e.rating : null,
    }
  }
  const ok = Object.keys(data).length > 0 || Object.keys(raw).length === 0
  return { ok, data, errors }
}

/** Чтение: JSON.parse в try/catch; "abc" или мусор → {} (пустой трекер). */
export function loadTracker(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    return raw ? validateTracker(JSON.parse(raw)).data : {}
  } catch {
    return {}
  }
}

export function saveTracker(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // хранилище недоступно
  }
}

/** Статистика по жанрам: [{ genre, count }] по убыванию. */
export function genreStats(tracker) {
  const counts = {}
  for (const e of Object.values(tracker)) for (const g of e.genres ?? []) counts[g] = (counts[g] ?? 0) + 1
  return Object.entries(counts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre))
}

/** Статистика по годам премьеры: [{ year, count }] по году. */
export function yearStats(tracker) {
  const counts = {}
  for (const e of Object.values(tracker)) {
    const y = /^\d{4}/.exec(e.premiered ?? '')?.[0]
    if (y) counts[y] = (counts[y] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([year, count]) => ({ year: Number(year), count }))
    .sort((a, b) => a.year - b.year)
}

/**
 * Рекомендации: сериалы с теми же жанрами, которых ещё нет в трекере.
 * Очки = сумма «веса» совпавших жанров (сколько моих сериалов в этом жанре), затем рейтинг.
 */
export function recommend(candidates, tracker, limit = 12) {
  const weight = Object.fromEntries(genreStats(tracker).map((g) => [g.genre, g.count]))
  if (!Object.keys(weight).length) return []
  return (candidates ?? [])
    .filter((s) => s && !tracker[s.id] && Array.isArray(s.genres))
    .map((s) => ({ show: s, score: s.genres.reduce((sum, g) => sum + (weight[g] ?? 0), 0) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || (b.show.rating?.average ?? 0) - (a.show.rating?.average ?? 0))
    .slice(0, limit)
    .map((r) => r.show)
}
