import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getShowFull } from '../api/tvmaze.js'
import {
  episodeCode,
  groupBySeason,
  isAired,
  isRegular,
  nextEpisode,
  seasonProgress,
  stripHtml,
  todayLocal,
  watchTime,
} from '../lib/episodes.js'
import { useAsync } from '../state/useAsync.js'
import { useTracker } from '../state/TrackerContext.jsx'
import { ErrorBox, Loading, NotFound, Poster, Progress } from '../components/ui.jsx'

export default function ShowPage() {
  const { id } = useParams()
  const valid = /^\d+$/.test(id)
  const { data: show, error, loading, retry } = useAsync(() => getShowFull(id), valid ? id : null)
  const { tracker, dispatch } = useTracker()
  const [open, setOpen] = useState(null)
  const today = todayLocal()

  const episodes = useMemo(() => show?._embedded?.episodes ?? [], [show])
  const seasons = useMemo(() => groupBySeason(episodes), [episodes])

  if (!valid || error?.status === 404) return <NotFound text="Сериал не найден" />
  if (error) return <ErrorBox error={error} onRetry={retry} />
  if (loading || !show) return <Loading />

  const showId = show.id
  const entry = tracker[showId]
  const watched = new Set(entry?.watched ?? [])
  const total = seasonProgress(episodes, watched)
  const next = nextEpisode(episodes, watched)
  const cast = show._embedded?.cast ?? []
  const firstOpen = open ?? Number(next?.season ?? Object.keys(seasons)[0])
  const watchedEps = episodes.filter((e) => watched.has(e.id))

  return (
    <section>
      <div className="show-head">
        <Poster src={show.image?.original ?? show.image?.medium} alt={show.name} className="big" />
        <div>
          <h1>{show.name}</h1>
          <p className="muted">
            {[show.premiered?.slice(0, 4), show.genres?.join(', '), show.network?.name ?? show.webChannel?.name]
              .filter(Boolean)
              .join(' · ')}
            {show.rating?.average && <> · ★ {show.rating.average}</>}
          </p>
          <p>{stripHtml(show.summary) || 'Описания нет.'}</p>
          {entry ? (
            <>
              <Progress value={total.watched} total={total.total} label={`Просмотрено ${total.watched} из ${total.total} серий · ${watchTime(watchedEps, show.averageRuntime)}`} />
              <p>
                {next ? (
                  <>
                    Следующая серия: <b>{episodeCode(next)}</b> — {next.name}
                    {!isAired(next.airdate, today) && <span className="muted"> (выйдет {next.airdate || 'позже'})</span>}
                  </>
                ) : (
                  <b>Все вышедшие серии просмотрены 🎉</b>
                )}
              </p>
              <button type="button" className="danger" onClick={() => confirm('Убрать сериал и все отметки?') && dispatch({ type: 'REMOVE_SHOW', showId })}>
                Убрать из трекера
              </button>
            </>
          ) : (
            <button type="button" className="primary" onClick={() => dispatch({ type: 'ADD_SHOW', show })}>
              + Добавить в «Мои сериалы»
            </button>
          )}
        </div>
      </div>

      <h2>Сезоны</h2>
      {Object.keys(seasons).length === 0 && <p className="muted">Серий пока нет.</p>}
      <div className="seasons">
        {Object.entries(seasons).map(([num, eps]) => {
          const n = Number(num)
          const prog = seasonProgress(eps, watched)
          const airedIds = eps.filter((e) => isRegular(e) && isAired(e.airdate, today)).map((e) => e.id)
          const allDone = airedIds.length > 0 && airedIds.every((eid) => watched.has(eid))
          const isOpen = firstOpen === n
          return (
            <div key={num} className={`season ${isOpen ? 'open' : ''}`}>
              <div className="season-head">
                <button type="button" className="season-toggle" onClick={() => setOpen(isOpen ? -1 : n)} aria-expanded={isOpen}>
                  {isOpen ? '▾' : '▸'} Сезон {num}
                </button>
                <Progress value={prog.watched} total={prog.total} />
                <button
                  type="button"
                  disabled={!airedIds.length}
                  onClick={() => dispatch({ type: 'MARK_SEASON', showId, episodeIds: airedIds, show })}
                >
                  {allDone ? 'Снять отметки' : 'Отметить весь сезон'}
                </button>
              </div>
              {isOpen && (
                <ul className="episodes">
                  {eps.map((ep) => {
                    const aired = isAired(ep.airdate, today)
                    return (
                      <li key={ep.id} className={aired ? '' : 'future'}>
                        <label>
                          <input
                            type="checkbox"
                            checked={watched.has(ep.id)}
                            disabled={!aired}
                            onChange={() => dispatch({ type: 'TOGGLE_EPISODE', showId, episodeId: ep.id, show })}
                          />
                          <span className="code">{isRegular(ep) ? `E${String(ep.number).padStart(2, '0')}` : 'Спец.'}</span>
                          <span className="ep-name">{ep.name}</span>
                        </label>
                        <span className="muted small">
                          {aired ? ep.airdate : `выйдет ${ep.airdate || 'позже'}`}
                          {ep.runtime ? ` · ${ep.runtime} мин` : ''}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {cast.length > 0 && (
        <>
          <h2>Актёры</h2>
          <ul className="cast">
            {cast.slice(0, 18).map(({ person, character }) => (
              <li key={`${person.id}-${character.id}`}>
                <Link to={`/people/${person.id}`}>
                  <Poster src={person.image?.medium ?? character.image?.medium} alt={person.name} className="face" />
                  <span>
                    <b>{person.name}</b>
                    <small className="muted">{character.name}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
