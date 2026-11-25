import { useCallback, useEffect, useState } from 'react'
import ArtImage from './ArtImage.jsx'
import { artistName, imageUrl } from '../lib/art.js'

/** Слайд-шоу: ← → листают, Esc — выход, следующая картинка предзагружается. */
export default function Slideshow({ items, iiifUrl, start = 0, onClose }) {
  const [index, setIndex] = useState(start)
  const count = items.length
  const go = useCallback((d) => setIndex((i) => (i + d + count) % count), [count])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [go, onClose])

  // предзагрузка следующей картинки
  useEffect(() => {
    if (count < 2) return
    const next = items[(index + 1) % count]
    const src = imageUrl(iiifUrl ?? next.iiif_url, next.image_id, 843)
    if (src) new Image().src = src
  }, [index, items, count, iiifUrl])

  if (!count) return null
  const art = items[index]

  return (
    <div className="slideshow" role="dialog" aria-modal="true" aria-label="Слайд-шоу выставки">
      <button type="button" className="ss-close" onClick={onClose} aria-label="Закрыть (Esc)">
        ✕
      </button>
      <button type="button" className="ss-nav prev" onClick={() => go(-1)} aria-label="Предыдущая (←)">
        ←
      </button>
      <figure key={art.id}>
        <ArtImage art={art} iiifUrl={iiifUrl} width={843} className="ss-img" />
        <figcaption>
          <strong>{art.title}</strong>
          <span>
            {artistName(art.artist_display)}
            {art.date_display ? `, ${art.date_display}` : ''}
          </span>
          <small>
            {index + 1} / {count}
          </small>
        </figcaption>
      </figure>
      <button type="button" className="ss-nav next" onClick={() => go(1)} aria-label="Следующая (→)">
        →
      </button>
    </div>
  )
}
