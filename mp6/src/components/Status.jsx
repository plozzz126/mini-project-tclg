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

export function Empty({ children = 'Ничего не найдено' }) {
  return <p className="status empty">{children}</p>
}
