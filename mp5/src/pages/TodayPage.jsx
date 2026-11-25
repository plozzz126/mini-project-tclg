import { Link } from 'react-router-dom'
import { getTodayWeb } from '../api/tvmaze.js'
import { episodeCode, todayLocal } from '../lib/episodes.js'
import { useAsync } from '../state/useAsync.js'
import { useTracker } from '../state/TrackerContext.jsx'
import { ErrorBox, Loading, Poster } from '../components/ui.jsx'

export default function TodayPage() {
  const today = todayLocal()
  const { data, error, loading, retry } = useAsync(() => getTodayWeb(today), today)
  const { tracker } = useTracker()

  const list = (data ?? []).filter((ep) => ep._embedded?.show)
  const mine = list.filter((ep) => tracker[ep._embedded.show.id])
  const rest = list.filter((ep) => !tracker[ep._embedded.show.id])

  return (
    <section>
      <h1>Сегодня в эфире</h1>
      <p className="muted">Серии стриминговых сервисов, выходящие {today}.</p>
      {loading && <Loading />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && (
        <>
          <h2>Мои сериалы</h2>
          {mine.length ? <EpisodeList items={mine} mine /> : <p className="muted">Сегодня из ваших сериалов ничего не выходит.</p>}
          <h2>Остальное ({rest.length})</h2>
          {rest.length ? <EpisodeList items={rest} /> : <p className="muted">Пусто.</p>}
        </>
      )}
    </section>
  )
}

function EpisodeList({ items, mine }) {
  return (
    <ul className={`today ${mine ? 'mine' : ''}`}>
      {items.map((ep) => {
        const show = ep._embedded.show
        return (
          <li key={ep.id}>
            <Link to={`/show/${show.id}`} className="thumb">
              <Poster src={show.image?.medium} alt={show.name} />
            </Link>
            <span>
              <Link to={`/show/${show.id}`}>
                <b>{show.name}</b>
              </Link>
              <small className="muted">
                {episodeCode(ep)} — {ep.name}
                {show.webChannel?.name ? ` · ${show.webChannel.name}` : ''}
              </small>
            </span>
            {mine && <span className="tag inline">моё</span>}
          </li>
        )
      })}
    </ul>
  )
}
