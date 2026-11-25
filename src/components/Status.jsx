import { Link } from 'react-router-dom'

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
