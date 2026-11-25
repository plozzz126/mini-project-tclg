import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getArtwork } from '../api/artic.js'
import { artistName, MAX_EXPO, toItem } from '../lib/art.js'
import { useExpo } from '../expo/ExpoContext.jsx'
import ArtImage from '../components/ArtImage.jsx'
import { ErrorBox, Loading } from '../components/Status.jsx'
import NotFound from './NotFound.jsx'

export default function ArtworkPage() {
  const { id } = useParams()
  const valid = /^\d+$/.test(id) && Number(id) > 0
  const { expo, dispatch, has, isFull } = useExpo()
  const [res, setRes] = useState(null)
  const [error, setError] = useState(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!valid) return
    const ctrl = new AbortController()
    setRes(null)
    setError(null)
    getArtwork(id, { signal: ctrl.signal })
      .then(setRes)
      .catch((e) => e.name !== 'AbortError' && setError(e))
    return () => ctrl.abort()
  }, [id, valid, retry])

  if (!valid || error?.status === 404) return <NotFound what="Работа не найдена" />
  if (error) return <ErrorBox error={error} onRetry={() => setRetry((n) => n + 1)} />
  if (!res) return <Loading />

  const art = res.data
  const iiif = res.config?.iiif_url
  const inExpo = has(art.id)

  const rows = [
    ['Автор', artistName(art.artist_display)],
    ['Дата', art.date_display],
    ['Техника', art.medium_display],
    ['Отдел музея', art.department_title],
    ['Происхождение', art.place_of_origin],
    ['Размеры', art.dimensions],
  ].filter(([, v]) => v)

  return (
    <article className="artwork">
      <div className="artwork-image">
        <ArtImage art={art} iiifUrl={iiif} width={843} />
      </div>
      <div className="artwork-info">
        <h1>{art.title}</h1>
        {art.artist_display && <p className="muted pre">{art.artist_display}</p>}
        <dl>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {inExpo ? (
          <p className="ok">
            ✓ Уже в выставке. <Link to="/expo">Открыть выставку</Link>
          </p>
        ) : (
          <>
            <button
              type="button"
              className="primary"
              disabled={isFull}
              onClick={() => dispatch({ type: 'add', item: toItem(art, iiif) })}
            >
              В выставку
            </button>
            {isFull && <p className="muted">В выставке уже {MAX_EXPO} работ — уберите какую-нибудь.</p>}
          </>
        )}
        <p className="muted">
          В выставке: {expo.items.length} / {MAX_EXPO}
        </p>
        <p>
          <a href={`https://www.artic.edu/artworks/${art.id}`} target="_blank" rel="noreferrer">
            Страница на сайте музея ↗
          </a>
        </p>
      </div>
    </article>
  )
}
