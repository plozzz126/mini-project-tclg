import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getArtworks } from '../api/artic.js'
import { decodeExpo, orderByIds, toItem } from '../lib/art.js'
import { useExpo } from '../expo/ExpoContext.jsx'
import ArtCard from '../components/ArtCard.jsx'
import Slideshow from '../components/Slideshow.jsx'
import { Empty, ErrorBox, Loading } from '../components/Status.jsx'

/** Просмотр чужой выставки по ссылке: все работы одним запросом /artworks?ids=… */
export default function ExpoViewPage() {
  const { search } = useLocation()
  const { title, ids } = useMemo(() => decodeExpo(search), [search])
  const key = ids.join(',')
  const { expo, dispatch } = useExpo()
  const [res, setRes] = useState(null)
  const [error, setError] = useState(null)
  const [retry, setRetry] = useState(0)
  const [slides, setSlides] = useState(false)

  useEffect(() => {
    if (!key) return
    const ctrl = new AbortController()
    setRes(null)
    setError(null)
    getArtworks(key.split(',').map(Number), { signal: ctrl.signal })
      .then(setRes)
      .catch((e) => e.name !== 'AbortError' && setError(e))
    return () => ctrl.abort()
  }, [key, retry])

  if (!ids.length) {
    return (
      <section>
        <h1>{title}</h1>
        <Empty>В ссылке нет работ.</Empty>
      </section>
    )
  }

  // API отдаёт работы в своём порядке и молча пропускает несуществующие id
  const items = res ? orderByIds(res.data, ids).map((a) => toItem(a, res.config?.iiif_url)) : []
  const missing = res ? ids.length - items.length : 0

  function copyToMine() {
    if (expo.items.length && !confirm('Заменить вашу выставку этой?')) return
    dispatch({ type: 'load', expo: { title, items } })
  }

  return (
    <section>
      <p className="muted">Выставка по ссылке</p>
      <h1>{title}</h1>
      {error && <ErrorBox error={error} onRetry={() => setRetry((n) => n + 1)} />}
      {!res && !error && <Loading text="Загружаю выставку одним запросом…" />}
      {res && (
        <>
          <div className="toolbar">
            {items.length > 0 && (
              <button type="button" className="primary" onClick={() => setSlides(true)}>
                ▶ Слайд-шоу
              </button>
            )}
            {items.length > 0 && (
              <button type="button" onClick={copyToMine}>
                Сделать своей выставкой
              </button>
            )}
            <Link to="/expo">Моя выставка</Link>
          </div>
          {missing > 0 && <p className="muted">Не найдено работ: {missing} (возможно, удалены из коллекции).</p>}
          {items.length === 0 ? (
            <Empty>Работы из ссылки не найдены.</Empty>
          ) : (
            <div className="grid">
              {items.map((art) => (
                <ArtCard key={art.id} art={art} />
              ))}
            </div>
          )}
        </>
      )}
      {slides && <Slideshow items={items} onClose={() => setSlides(false)} />}
    </section>
  )
}
