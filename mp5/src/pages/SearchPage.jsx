import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchShows } from '../api/tvmaze.js'
import { useAsync } from '../state/useAsync.js'
import { useTracker } from '../state/TrackerContext.jsx'
import { ErrorBox, Loading, ShowCard } from '../components/ui.jsx'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [draft, setDraft] = useState(q)
  const { tracker } = useTracker()

  // debounce 500 мс: запрос уходит, когда пользователь перестал печатать
  useEffect(() => {
    const t = setTimeout(() => {
      if (draft.trim() !== q) setParams(draft.trim() ? { q: draft.trim() } : {}, { replace: true })
    }, 500)
    return () => clearTimeout(t)
  }, [draft, q, setParams])

  const { data, error, loading, retry } = useAsync(() => searchShows(q), q.length >= 2 ? q : null)

  return (
    <section>
      <h1>Поиск сериалов</h1>
      <input
        className="search"
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Например: breaking bad"
        aria-label="Название сериала"
        autoFocus
      />
      {q.length < 2 && <p className="muted">Введите хотя бы 2 буквы.</p>}
      {loading && <Loading />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && data.length === 0 && <p className="status">Ничего не найдено</p>}
      {data && data.length > 0 && (
        <div className="grid">
          {data.map(({ show }) => (
            <ShowCard key={show.id} show={show} tracked={Boolean(tracker[show.id])} />
          ))}
        </div>
      )}
    </section>
  )
}
