import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getShowIndex } from '../api/tvmaze.js'
import {
  countdown,
  daysUntil,
  episodeCode,
  isAired,
  nextEpisode,
  seasonProgress,
  todayLocal,
  upcomingEpisodes,
  watchMinutes,
  formatMinutes,
} from '../lib/episodes.js'
import { genreStats, recommend, STATUSES, validateTracker, yearStats } from '../lib/tracker.js'
import { useTracker } from '../state/TrackerContext.jsx'
import { useMyShows } from '../state/useMyShows.js'
import { useAsync } from '../state/useAsync.js'
import { Loading, Poster, Progress, ShowCard } from '../components/ui.jsx'

export default function MyPage() {
  const { tracker, dispatch } = useTracker()
  const ids = Object.keys(tracker)
  const { shows, loading, errors } = useMyShows(ids)
  const [filter, setFilter] = useState('all')
  const [msg, setMsg] = useState(null)
  const fileRef = useRef(null)
  const today = todayLocal()

  const totals = useMemo(() => {
    let count = 0
    let minutes = 0
    for (const id of ids) {
      const show = shows[id]
      const w = new Set(tracker[id].watched)
      count += w.size
      if (show) minutes += watchMinutes(show._embedded.episodes.filter((e) => w.has(e.id)), show.averageRuntime)
    }
    return { count, minutes }
  }, [ids, shows, tracker])

  const soon = useMemo(() => {
    const out = []
    for (const id of ids) {
      const show = shows[id]
      if (!show || tracker[id].status === 'dropped') continue
      for (const ep of upcomingEpisodes(show._embedded.episodes, today, 3)) out.push({ show, ep })
    }
    return out.sort((a, b) => a.ep.airdate.localeCompare(b.ep.airdate)).slice(0, 10)
  }, [ids, shows, tracker, today])

  const genres = genreStats(tracker)
  const years = yearStats(tracker)
  const index = useAsync(() => getShowIndex(0), ids.length ? 'index' : null)
  const recs = useMemo(() => recommend(index.data, tracker, 8), [index.data, tracker])

  function exportJson() {
    const blob = new Blob([JSON.stringify(tracker, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `series-tracker-${today}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importJson(file) {
    try {
      const parsed = JSON.parse(await file.text())
      const r = validateTracker(parsed)
      if (!r.ok) {
        setMsg({ type: 'error', text: `Файл не подходит: ${r.errors.join('; ')}` })
        return
      }
      if (ids.length && !confirm(`Заменить текущий трекер (${ids.length} сериалов) данными из файла?`)) return
      dispatch({ type: 'IMPORT', data: parsed })
      setMsg({
        type: 'ok',
        text: `Импортировано сериалов: ${Object.keys(r.data).length}.${r.errors.length ? ` Пропущено/исправлено: ${r.errors.join('; ')}` : ''}`,
      })
    } catch {
      setMsg({ type: 'error', text: 'Это не JSON-файл.' })
    }
  }

  const visible = ids.filter((id) => filter === 'all' || tracker[id].status === filter)

  return (
    <section>
      <h1>Мои сериалы</h1>
      <p className="big">
        Просмотрено <b>{totals.count}</b> серий{loading ? '…' : <>, <b>{formatMinutes(totals.minutes)}</b></>}
      </p>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Фильтр">
          {[['all', 'Все'], ...Object.entries(STATUSES)].map(([v, label]) => (
            <button key={v} type="button" className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>
              {label} ({v === 'all' ? ids.length : ids.filter((id) => tracker[id].status === v).length})
            </button>
          ))}
        </div>
        <button type="button" onClick={exportJson} disabled={!ids.length}>
          ⬇ Экспорт JSON
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          ⬆ Импорт JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            if (e.target.files[0]) importJson(e.target.files[0])
            e.target.value = ''
          }}
        />
      </div>
      {msg && <p className={msg.type === 'error' ? 'error-text' : 'ok-text'}>{msg.text}</p>}
      {errors > 0 && <p className="error-text">Не удалось загрузить данные {errors} сериалов — прогресс показан частично.</p>}

      {ids.length === 0 ? (
        <p className="status">
          Трекер пуст. <Link to="/">Найдите сериал</Link> и отметьте серии.
        </p>
      ) : (
        <ul className="my-list">
          {visible.map((id) => {
            const e = tracker[id]
            const show = shows[id]
            const eps = show?._embedded.episodes ?? []
            const prog = seasonProgress(eps, e.watched)
            const next = show ? nextEpisode(eps, e.watched) : null
            return (
              <li key={id}>
                <Link to={`/show/${id}`} className="thumb">
                  <Poster src={e.image} alt={e.name} />
                </Link>
                <div className="my-info">
                  <Link to={`/show/${id}`}>
                    <b>{e.name}</b>
                  </Link>
                  {show ? <Progress value={prog.watched} total={prog.total} /> : <Loading text="" />}
                  {show &&
                    (next ? (
                      <Link to={`/show/${id}`} className="next-btn">
                        Следующая серия: {episodeCode(next)} — {next.name}
                        {!isAired(next.airdate, today) && ` (${next.airdate ? countdown(daysUntil(next.airdate, today)) : 'дата неизвестна'})`}
                      </Link>
                    ) : (
                      <span className="ok-text">Всё просмотрено</span>
                    ))}
                </div>
                <div className="my-actions">
                  <select value={e.status} onChange={(ev) => dispatch({ type: 'SET_STATUS', showId: Number(id), status: ev.target.value })} aria-label="Статус">
                    {Object.entries(STATUSES).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={e.rating ?? ''}
                    onChange={(ev) =>
                      dispatch({ type: 'SET_RATING', showId: Number(id), rating: ev.target.value === '' ? null : Number(ev.target.value) })
                    }
                    aria-label="Моя оценка"
                  >
                    <option value="">Оценка —</option>
                    {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
                      <option key={n} value={n}>
                        ★ {n}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="danger" onClick={() => confirm(`Удалить «${e.name}» из трекера?`) && dispatch({ type: 'REMOVE_SHOW', showId: Number(id) })}>
                    Удалить
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {soon.length > 0 && (
        <>
          <h2>Скоро выйдет</h2>
          <ul className="soon">
            {soon.map(({ show, ep }) => (
              <li key={ep.id}>
                <b className="countdown">{countdown(daysUntil(ep.airdate, today))}</b>
                <Link to={`/show/${show.id}`}>{show.name}</Link>
                <span>
                  {episodeCode(ep)} — {ep.name}
                </span>
                <span className="muted">{ep.airdate}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {ids.length > 0 && (
        <div className="stats">
          <div className="panel">
            <h2>Жанры</h2>
            <Bars items={genres.map((g) => [g.genre, g.count])} />
          </div>
          <div className="panel">
            <h2>Годы премьеры</h2>
            <Bars items={years.map((y) => [String(y.year), y.count])} />
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <>
          <h2>Рекомендации по вашим жанрам</h2>
          <div className="grid">
            {recs.map((s) => (
              <ShowCard key={s.id} show={s} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function Bars({ items }) {
  if (!items.length) return <p className="muted">Нет данных</p>
  const max = Math.max(...items.map(([, n]) => n))
  return (
    <ul className="bars">
      {items.map(([label, n]) => (
        <li key={label}>
          <span>{label}</span>
          <span className="bar">
            <span style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <b>{n}</b>
        </li>
      ))}
    </ul>
  )
}
