// Чистые функции турнирной таблицы. Здесь нет fetch, state и JSX.

/**
 * Итоговый счёт матча [голы team1, голы team2] или null, если матч не сыгран.
 * В openfootball счёт бывает в двух видах: { ft: [1, 0], ht: [0, 0] }
 * и коротко массивом [0, 0] (встречается в сезоне 2026-27).
 */
export function scoreOf(match, half = 'ft') {
  const s = match?.score
  if (!s) return null
  if (Array.isArray(s)) return half === 'ft' && isScore(s) ? s : null
  return isScore(s[half]) ? s[half] : null
}

function isScore(s) {
  return Array.isArray(s) && s.length === 2 && s.every((n) => Number.isInteger(n) && n >= 0)
}

/**
 * Результат для одной из сторон: "W" | "D" | "L", или null, если матч не сыгран.
 * Первый аргумент — объект score ({ ft: [2, 1] }) или целый матч.
 * side — 1 / "team1" (хозяева) или 2 / "team2" (гости).
 */
export function matchResult(scoreOrMatch, side = 1) {
  if (!scoreOrMatch) return null
  const ft = 'team1' in scoreOrMatch || 'round' in scoreOrMatch
    ? scoreOf(scoreOrMatch)
    : scoreOf({ score: scoreOrMatch })
  if (!ft) return null
  const [a, b] = side === 2 || side === 'team2' ? [ft[1], ft[0]] : ft
  if (a > b) return 'W'
  if (a < b) return 'L'
  return 'D'
}

export const POINTS = { W: 3, D: 1, L: 0 }

function emptyRow(team) {
  return { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
}

function addResult(row, gf, ga) {
  row.played += 1
  row.gf += gf
  row.ga += ga
  row.gd = row.gf - row.ga
  if (gf > ga) {
    row.won += 1
    row.points += 3
  } else if (gf === ga) {
    row.drawn += 1
    row.points += 1
  } else {
    row.lost += 1
  }
}

/** Порядок АПЛ: очки → разница → забитые → название по алфавиту. */
export function compareRows(a, b) {
  return (
    b.points - a.points ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    a.team.localeCompare(b.team)
  )
}

/**
 * Таблица одним проходом по матчам.
 * options.venue: "all" | "home" | "away"; options.half: "ft" | "ht" (таблица по первым таймам).
 * В таблицу попадают все команды сезона, даже без сыгранных матчей.
 */
export function buildTable(matches, { venue = 'all', half = 'ft', rules = 'epl', upToRound = Infinity } = {}) {
  const rows = {}
  const row = (team) => (rows[team] ??= emptyRow(team))
  const counted = []
  for (const m of matches) {
    row(m.team1)
    row(m.team2)
    if ((roundNumber(m.round) ?? Infinity) > upToRound) continue
    counted.push(m)
    const s = scoreOf(m, half)
    if (!s) continue
    if (venue !== 'away') addResult(row(m.team1), s[0], s[1])
    if (venue !== 'home') addResult(row(m.team2), s[1], s[0])
  }
  const list = Object.values(rows)
  return rules === 'laliga' ? sortLaLiga(list, counted, { venue, half }) : [...list].sort(compareRows)
}

/** Номер тура из строки "Matchday 12" → 12. Нет числа → null. */
export function roundNumber(round) {
  const m = /(\d+)/.exec(String(round ?? ''))
  return m ? Number(m[1]) : null
}

/** Последний тур, в котором сыгран хотя бы один матч (0 — ничего не сыграно). */
export function lastPlayedRound(matches) {
  let max = 0
  for (const m of matches) {
    const r = roundNumber(m.round)
    if (r && scoreOf(m) && r > max) max = r
  }
  return max
}

export function totalRounds(matches) {
  return matches.reduce((max, m) => Math.max(max, roundNumber(m.round) ?? 0), 0)
}

/**
 * Таблица после N-го тура: учитываются только матчи с номером тура ≤ N,
 * но в таблице остаются все команды сезона (с нулями, если ещё не играли).
 */
export function tableAfterRound(matches, n, options = {}) {
  return buildTable(matches, { ...options, upToRound: n })
}

/** Все матчи команды по дате (и времени). */
export function teamMatches(matches, team) {
  return matches
    .filter((m) => m.team1 === team || m.team2 === team)
    .sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`))
}

/** Результат матча для конкретной команды. */
export function resultFor(match, team) {
  return matchResult(match, match.team1 === team ? 1 : 2)
}

/** Форма: последние n сыгранных матчей по дате, от старых к новым, например "WWDLW". */
export function teamForm(matches, team, n = 5) {
  return teamMatches(matches, team)
    .filter((m) => scoreOf(m))
    .slice(-n)
    .map((m) => resultFor(m, team))
    .join('')
}

/** Самая крупная победа команды (по разнице мячей, при равенстве — больше забито). */
export function biggestWin(matches, team) {
  let best = null
  for (const m of teamMatches(matches, team)) {
    const s = scoreOf(m)
    if (!s) continue
    const [gf, ga] = m.team1 === team ? s : [s[1], s[0]]
    if (gf <= ga) continue
    if (!best || gf - ga > best.diff || (gf - ga === best.diff && gf > best.gf)) {
      best = { match: m, gf, ga, diff: gf - ga }
    }
  }
  return best
}

/** Место команды после каждого тура: [{ round, position }] — для графика. */
export function positionsByRound(matches, team, options) {
  const last = lastPlayedRound(matches)
  const out = []
  for (let r = 1; r <= last; r++) {
    const table = tableAfterRound(matches, r, options)
    const i = table.findIndex((row) => row.team === team)
    if (i !== -1) out.push({ round: r, position: i + 1 })
  }
  return out
}

/** Строка команды в таблице и её место (1-based). */
export function findRow(table, team) {
  const i = table.findIndex((r) => r.team === team)
  return i === -1 ? null : { ...table[i], position: i + 1 }
}

// ---------- Правила Ла Лиги: личные встречи ----------

/**
 * При равенстве очков сначала сравниваются личные встречи команд из группы
 * (мини-таблица: очки, затем разница), затем общая разница, забитые, название.
 */
export function sortLaLiga(rows, matches, { venue = 'all', half = 'ft' } = {}) {
  const sorted = [...rows].sort((a, b) => b.points - a.points)
  const out = []
  for (let i = 0; i < sorted.length; ) {
    let j = i
    while (j < sorted.length && sorted[j].points === sorted[i].points) j++
    const group = sorted.slice(i, j)
    if (group.length === 1) out.push(group[0])
    else {
      const names = new Set(group.map((r) => r.team))
      const h2hMatches = matches.filter((m) => names.has(m.team1) && names.has(m.team2))
      const mini = {}
      for (const r of buildTable(h2hMatches, { venue, half })) mini[r.team] = r
      group.sort(
        (a, b) =>
          (mini[b.team]?.points ?? 0) - (mini[a.team]?.points ?? 0) ||
          (mini[b.team]?.gd ?? 0) - (mini[a.team]?.gd ?? 0) ||
          b.gd - a.gd ||
          b.gf - a.gf ||
          a.team.localeCompare(b.team),
      )
      out.push(...group)
    }
    i = j
  }
  return out
}

// ---------- Кеш на 24 часа ----------

export const DAY_MS = 24 * 60 * 60 * 1000

/** Свежи ли данные, сохранённые в savedAt (мс), на момент now. */
export function isFresh(savedAt, now = Date.now(), ttl = DAY_MS) {
  const t = Number(savedAt)
  if (!Number.isFinite(t) || t > now) return false
  return now - t < ttl
}

// ---------- Прогнозы ----------

/** Очки за прогноз: точный счёт — 3, угадан исход — 1, иначе 0. Матч не сыгран → null. */
export function predictionPoints(prediction, match) {
  const ft = scoreOf(match)
  if (!ft || !prediction) return null
  const p = [Number(prediction.home), Number(prediction.away)]
  if (!isScore(p)) return null
  if (p[0] === ft[0] && p[1] === ft[1]) return 3
  return Math.sign(p[0] - p[1]) === Math.sign(ft[0] - ft[1]) ? 1 : 0
}

/** Уникальный ключ матча для хранения прогноза. */
export function matchKey(code, season, match) {
  return `${code}/${season}/${match.date}/${match.team1}/${match.team2}`
}

/** Итоги прогнозов: сколько сделано, сыграно, точных, исходов, очков. */
export function predictionSummary(predictions, matches, code, season) {
  const res = { made: 0, settled: 0, exact: 0, outcome: 0, miss: 0, points: 0 }
  for (const m of matches) {
    const p = predictions[matchKey(code, season, m)]
    if (!p) continue
    res.made += 1
    const pts = predictionPoints(p, m)
    if (pts === null) continue
    res.settled += 1
    res.points += pts
    if (pts === 3) res.exact += 1
    else if (pts === 1) res.outcome += 1
    else res.miss += 1
  }
  return res
}
