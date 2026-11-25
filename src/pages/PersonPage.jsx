import { useParams } from 'react-router-dom'
import { getCastCredits, getPerson } from '../api/tvmaze.js'
import { useAsync } from '../state/useAsync.js'
import { useTracker } from '../state/TrackerContext.jsx'
import { ErrorBox, Loading, NotFound, Poster, ShowCard } from '../components/ui.jsx'

export default function PersonPage() {
  const { id } = useParams()
  const valid = /^\d+$/.test(id)
  const { tracker } = useTracker()
  const { data, error, loading, retry } = useAsync(
    () => Promise.all([getPerson(id), getCastCredits(id)]),
    valid ? id : null,
  )

  if (!valid || error?.status === 404) return <NotFound text="Актёр не найден" />
  if (error) return <ErrorBox error={error} onRetry={retry} />
  if (loading || !data) return <Loading />

  const [person, credits] = data
  // у актёра может быть несколько ролей в одном сериале — показываем сериал один раз
  const seen = new Set()
  const shows = []
  for (const c of credits) {
    const show = c._embedded?.show
    if (!show || seen.has(show.id)) continue
    seen.add(show.id)
    shows.push({ show, character: c._links?.character?.name })
  }
  shows.sort((a, b) => (b.show.premiered ?? '').localeCompare(a.show.premiered ?? ''))

  return (
    <section>
      <div className="show-head">
        <Poster src={person.image?.medium} alt={person.name} className="face-big" />
        <div>
          <h1>{person.name}</h1>
          <p className="muted">
            {[person.birthday && `родился ${person.birthday}`, person.country?.name, person.deathday && `умер ${person.deathday}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p>Сериалов: {shows.length}</p>
        </div>
      </div>
      <div className="grid">
        {shows.map(({ show, character }) => (
          <div key={show.id}>
            <ShowCard show={show} tracked={Boolean(tracker[show.id])} />
            {character && <p className="muted small role">в роли: {character}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
