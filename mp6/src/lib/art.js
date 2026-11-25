// Контракт мини-проекта «Своя выставка».
// Чистые функции без обращения к сети и DOM — их проверяют тесты.

export const DEFAULT_TITLE = 'Моя выставка'
export const MAX_EXPO = 12
export const RESULT_CAP = 10000
export const IMAGE_WIDTH = 843
export const UNKNOWN_ARTIST = 'Неизвестный автор'

/** Имя автора — первая строка artist_display. */
export function artistName(display) {
  if (typeof display !== 'string') return UNKNOWN_ARTIST
  const first = display.split('\n')[0].trim()
  return first || UNKNOWN_ARTIST
}

/** IIIF-адрес картинки. Нет image_id или iiif_url → null (рисуем заглушку). */
export function imageUrl(iiifUrl, imageId, width = IMAGE_WIDTH) {
  if (!iiifUrl || !imageId) return null
  const base = String(iiifUrl).replace(/\/+$/, '')
  return `${base}/${imageId}/full/${width},/0/default.jpg`
}

/** Пропорции из thumbnail (известны до загрузки картинки). Нет данных → 1. */
export function aspectRatio(thumbnail) {
  const w = Number(thumbnail?.width)
  const h = Number(thumbnail?.height)
  if (!(w > 0) || !(h > 0)) return 1
  return w / h
}

/** Группа цвета по тону h. Насыщенность < 15 → "gray". Нет цвета → null. */
export function hueBucket(color) {
  if (!color || typeof color !== 'object') return null
  const h = Number(color.h)
  const s = Number(color.s)
  if (!Number.isFinite(h) || !Number.isFinite(s)) return null
  if (s < 15) return 'gray'
  const hue = ((Math.floor(h) % 360) + 360) % 360
  if (hue < 15 || hue >= 345) return 'red'
  if (hue < 45) return 'orange'
  if (hue < 70) return 'yellow'
  if (hue < 170) return 'green'
  if (hue < 260) return 'blue'
  return 'purple'
}

/** Последняя доступная страница с учётом лимита 10 000 результатов. */
export function maxPage(total, limit) {
  const t = Number(total)
  const l = Number(limit)
  if (!(t > 0) || !(l > 0)) return 0
  return Math.min(Math.ceil(t / l), Math.floor(RESULT_CAP / l))
}

/** Случайная страница 1..max (задача варианта «Случайная работа»). */
export function randomPage(max, rnd = Math.random) {
  const m = Math.floor(Number(max))
  if (!(m >= 1)) return 0
  return Math.min(m, Math.floor(rnd() * m) + 1)
}

/** Чистит список id: только целые > 0, без повторов, не больше 12. */
export function cleanIds(list) {
  const out = []
  for (const raw of list) {
    const s = String(raw).trim()
    if (!/^\d+$/.test(s)) continue
    const n = Number(s)
    if (n <= 0 || out.includes(n)) continue
    out.push(n)
    if (out.length === MAX_EXPO) break
  }
  return out
}

/** Выставка → строка адреса "?title=…&ids=1,2,3". */
export function encodeExpo(expo) {
  const title = (expo?.title ?? '').trim() || DEFAULT_TITLE
  const source = expo?.ids ?? (expo?.items ?? []).map((it) => it.id)
  const ids = cleanIds(source)
  return `?title=${encodeURIComponent(title)}&ids=${ids.join(',')}`
}

/** Строка адреса → { title, ids }. */
export function decodeExpo(search) {
  const params = new URLSearchParams(typeof search === 'string' ? search : '')
  const title = (params.get('title') ?? '').trim() || DEFAULT_TITLE
  const rawIds = params.get('ids') ?? ''
  const ids = rawIds === '' ? [] : cleanIds(rawIds.split(','))
  return { title, ids }
}

/** Работы из пакетного ответа в порядке ids (API порядок не сохраняет). */
export function orderByIds(artworks, ids) {
  const byId = new Map((artworks ?? []).map((a) => [a.id, a]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}

/** Год для сортировки: date_start или +∞ (неизвестные — в конец). */
function yearOf(item) {
  const y = Number(item?.date_start)
  return item?.date_start == null || !Number.isFinite(y) ? Infinity : y
}

/** Хронологическая сортировка (стабильная, не меняет исходный массив). */
export function sortByYear(items) {
  return items
    .map((it, i) => [it, i])
    .sort((a, b) => yearOf(a[0]) - yearOf(b[0]) || a[1] - b[1])
    .map(([it]) => it)
}

/** Счётчик работ по отделам: [{ department, count }] по убыванию. */
export function countByDepartment(items) {
  const counts = new Map()
  for (const it of items) {
    const dep = it?.department_title || 'Без отдела'
    counts.set(dep, (counts.get(dep) ?? 0) + 1)
  }
  return [...counts]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count || a.department.localeCompare(b.department))
}

/** Минимальная запись работы для хранения в выставке. */
export function toItem(artwork, iiifUrl) {
  return {
    id: artwork.id,
    title: artwork.title ?? 'Без названия',
    artist_display: artwork.artist_display ?? null,
    date_display: artwork.date_display ?? null,
    date_start: artwork.date_start ?? null,
    department_title: artwork.department_title ?? null,
    image_id: artwork.image_id ?? null,
    thumbnail: artwork.thumbnail
      ? {
          width: artwork.thumbnail.width ?? null,
          height: artwork.thumbnail.height ?? null,
          alt_text: artwork.thumbnail.alt_text ?? null,
          lqip: artwork.thumbnail.lqip ?? null,
        }
      : null,
    iiif_url: iiifUrl ?? artwork.iiif_url ?? null,
  }
}

export const initialExpo = { title: DEFAULT_TITLE, items: [] }

function move(items, from, to) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items
  }
  const next = items.slice()
  const [it] = next.splice(from, 1)
  next.splice(to, 0, it)
  return next
}

/** Единственный способ изменить выставку. Неизвестное действие → то же состояние. */
export function expoReducer(state, action) {
  const items = state.items
  const indexOf = (id) => items.findIndex((it) => it.id === id)

  switch (action?.type) {
    case 'add': {
      const art = action.item
      if (!art || !Number.isInteger(art.id) || art.id <= 0) return state
      if (items.length >= MAX_EXPO || indexOf(art.id) !== -1) return state
      return { ...state, items: [...items, art] }
    }
    case 'remove': {
      if (indexOf(action.id) === -1) return state
      return { ...state, items: items.filter((it) => it.id !== action.id) }
    }
    case 'moveUp': {
      const i = indexOf(action.id)
      if (i <= 0) return state
      return { ...state, items: move(items, i, i - 1) }
    }
    case 'moveDown': {
      const i = indexOf(action.id)
      if (i === -1 || i === items.length - 1) return state
      return { ...state, items: move(items, i, i + 1) }
    }
    case 'move': {
      const next = move(items, action.from, action.to)
      return next === items ? state : { ...state, items: next }
    }
    case 'rename': {
      const title = String(action.title ?? '')
      return title === state.title ? state : { ...state, title }
    }
    case 'sortByYear':
      return { ...state, items: sortByYear(items) }
    case 'clear':
      return { ...state, items: [] }
    case 'load':
      return normalizeExpo(action.expo)
    default:
      return state
  }
}

/** Приводит что угодно (в т.ч. мусор из localStorage) к корректной выставке. */
export function normalizeExpo(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return initialExpo
  const seen = new Set()
  const items = []
  for (const it of raw.items) {
    if (!it || !Number.isInteger(it.id) || it.id <= 0 || seen.has(it.id)) continue
    seen.add(it.id)
    items.push(it)
    if (items.length === MAX_EXPO) break
  }
  const title = typeof raw.title === 'string' ? raw.title : DEFAULT_TITLE
  return { title, items }
}

export const STORAGE_KEY = 'my-expo:v1'

/** Чтение из localStorage: JSON.parse в try/catch, мусор → пустая выставка. */
export function loadExpo(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    return raw ? normalizeExpo(JSON.parse(raw)) : initialExpo
  } catch {
    return initialExpo
  }
}

export function saveExpo(expo, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(expo))
  } catch {
    // переполнено или запрещено — выставка просто не сохранится
  }
}
