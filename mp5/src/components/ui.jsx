import { Link } from 'react-router-dom'
import { stripHtml } from '../lib/episodes.js'

export function Loading({ text = 'Загрузка…' }) {
  return (
    <p className="status" role="status">
      <span className="spinner" aria-hidden="true" /> {text}
    </p>
  )
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="status error" role="alert">
      <p>{error?.message ?? 'Что-то пошло не так'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  )
}

export function NotFound({ text = 'Страница не найдена' }) {
  return (
    <section className="status">
      <h1>404</h1>
      <p>{text}</p>
      <Link to="/">На главную</Link>
    </section>
  )
}

export function Poster({ src, alt, className = '' }) {
  return src ? (
    <img className={`poster ${className}`} src={src} alt={alt} loading="lazy" />
  ) : (
    <div className={`poster placeholder ${className}`} role="img" aria-label={`${alt}: нет постера`}>
      <span>📺</span>
    </div>
  )
}

export function Progress({ value, total, label }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="progress" title={`${pct}%`}>
      <div className="bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <small>{label ?? `${value} из ${total}`}</small>
    </div>
  )
}

const STATUS_RU = { Running: 'Выходит', Ended: 'Завершён', 'To Be Determined': 'Неизвестно', 'In Development': 'В разработке' }

export function ShowCard({ show, tracked }) {
  const year = show.premiered?.slice(0, 4)
  return (
    <article className="card">
      <Link to={`/show/${show.id}`} className="card-link">
        <Poster src={show.image?.medium} alt={show.name} />
        {tracked && <span className="tag">✓ В трекере</span>}
        <div className="card-body">
          <h3>{show.name}</h3>
          <p className="muted small">
            {[year, show.genres?.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}
          </p>
          <p className="small">
            {show.rating?.average ? <b>★ {show.rating.average}</b> : <span className="muted">нет рейтинга</span>}{' '}
            <span className={`status-pill ${show.status === 'Running' ? 'on' : ''}`}>{STATUS_RU[show.status] ?? show.status}</span>
          </p>
        </div>
      </Link>
    </article>
  )
}

export const plain = stripHtml
