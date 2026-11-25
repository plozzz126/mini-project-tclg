// Чистые функции трекера: серии, прогресс, время, даты. Здесь нет fetch, state и JSX.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }

/** HTML из поля summary → обычный текст (без dangerouslySetInnerHTML и без XSS). */
export function stripHtml(html) {
  if (typeof html !== 'string') return ''
  return html
    .replace(/<\s*br\s*\/?>/gi, ' ')
    .replace(/<\/p>\s*<p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, code) => {
      if (code[0] === '#') {
        const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
        return Number.isFinite(n) ? String.fromCodePoint(n) : m
      }
      return ENTITIES[code.toLowerCase()] ?? m
    })
    .replace(/\s+/g, ' ')
    .trim()
}

/** Обычная серия — с номером. Спецвыпуски (number = null) в прогресс не входят. */
export const isRegular = (ep) => Number.isInteger(ep?.number)

const byOrder = (a, b) =>
  a.season - b.season || (a.number ?? Infinity) - (b.number ?? Infinity) || String(a.airdate).localeCompare(String(b.airdate))

/** { 1: [серии…], 2: […] } — серии каждого сезона по порядку, спецвыпуски в конце сезона. */
export function groupBySeason(episodes) {
  const out = {}
  for (const ep of episodes ?? []) {
    ;(out[ep.season] ??= []).push(ep)
  }
  for (const k of Object.keys(out)) out[k].sort(byOrder)
  return out
}

const toSet = (watched) => (watched instanceof Set ? watched : new Set(watched ?? []))

/** Прогресс по списку серий: { watched, total, percent }. */
export function seasonProgress(episodes, watched) {
  const w = toSet(watched)
  const regular = (episodes ?? []).filter(isRegular)
  const done = regular.filter((ep) => w.has(ep.id)).length
  const total = regular.length
  return { watched: done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}

/** Следующая серия к просмотру: первая непросмотренная обычная серия по порядку. Всё просмотрено → null. */
export function nextEpisode(episodes, watched) {
  const w = toSet(watched)
  return [...(episodes ?? [])].filter(isRegular).sort(byOrder).find((ep) => !w.has(ep.id)) ?? null
}

/** «S03E05» */
export function episodeCode(ep) {
  if (!ep) return ''
  const p = (n) => String(n).padStart(2, '0')
  return isRegular(ep) ? `S${p(ep.season)}E${p(ep.number)}` : `S${p(ep.season)} спецвыпуск`
}

/** Минуты просмотра: runtime серии, а если его нет — averageRuntime сериала. */
export function watchMinutes(episodes, fallbackRuntime = 0) {
  return (episodes ?? []).reduce((sum, ep) => sum + (Number(ep.runtime) || Number(fallbackRuntime) || 0), 0)
}

/** 450 → "7 ч 30 мин" */
export function formatMinutes(total) {
  const m = Math.max(0, Math.round(Number(total) || 0))
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (!h) return `${rest} мин`
  return rest ? `${h} ч ${rest} мин` : `${h} ч`
}

/** Время просмотра списка серий строкой: 10 серий по 45 мин → "7 ч 30 мин". */
export function watchTime(episodes, fallbackRuntime = 0) {
  return formatMinutes(watchMinutes(episodes, fallbackRuntime))
}

/** Сегодня по местному времени, "ГГГГ-ММ-ДД" (не toISOString — в Алматы до 05:00 это «вчера»). */
export function todayLocal(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

/** Вышла ли серия к дате today. Нет даты — считаем, что ещё не вышла. */
export function isAired(airdate, today = todayLocal()) {
  if (typeof airdate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(airdate)) return false
  return airdate <= today
}

/** Сколько дней от today до airdate (0 — сегодня). */
export function daysUntil(airdate, today = todayLocal()) {
  const a = Date.UTC(...airdate.split('-').map((n, i) => Number(n) - (i === 1 ? 1 : 0)))
  const t = Date.UTC(...today.split('-').map((n, i) => Number(n) - (i === 1 ? 1 : 0)))
  return Math.round((a - t) / 86400000)
}

/** «через 3 дня» / «завтра» / «сегодня» */
export function countdown(days) {
  if (days <= 0) return 'сегодня'
  if (days === 1) return 'завтра'
  const n = days % 100
  const word = n % 10 === 1 && n !== 11 ? 'день' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n) ? 'дня' : 'дней'
  return `через ${days} ${word}`
}

/** Ближайшие невышедшие серии (с известной датой), по дате. */
export function upcomingEpisodes(episodes, today = todayLocal(), limit = Infinity) {
  return (episodes ?? [])
    .filter((ep) => typeof ep.airdate === 'string' && ep.airdate && !isAired(ep.airdate, today))
    .sort((a, b) => a.airdate.localeCompare(b.airdate) || byOrder(a, b))
    .slice(0, limit)
}
