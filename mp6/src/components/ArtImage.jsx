import { useState } from 'react'
import { aspectRatio, imageUrl } from '../lib/art.js'

/**
 * Картинка работы: aspect-ratio из thumbnail (сетка не прыгает),
 * размытое превью lqip, пока грузится, и заглушка, если картинки нет.
 */
export default function ArtImage({ art, iiifUrl, width = 400, className = '' }) {
  const [state, setState] = useState('loading') // loading | loaded | error
  const src = imageUrl(iiifUrl ?? art.iiif_url, art.image_id, width)
  const ratio = src ? aspectRatio(art.thumbnail) : 1
  const alt = art.thumbnail?.alt_text || `${art.title ?? 'Работа'} — описание изображения отсутствует`
  const lqip = art.thumbnail?.lqip

  if (!src || state === 'error') {
    return (
      <div className={`art-img placeholder ${className}`} style={{ aspectRatio: ratio }} role="img" aria-label="Нет изображения">
        <span>🖼️</span>
        <small>Нет изображения</small>
      </div>
    )
  }

  return (
    <div
      className={`art-img ${state} ${className}`}
      style={{ aspectRatio: ratio, backgroundImage: lqip && state !== 'loaded' ? `url("${lqip}")` : undefined }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setState('loaded')}
        onError={() => setState('error')}
      />
    </div>
  )
}
