import { Link } from 'react-router-dom'

export default function NotFound({ what = 'Страница не найдена' }) {
  return (
    <section className="status">
      <h1>404</h1>
      <p>{what}</p>
      <Link to="/">На главную</Link>
    </section>
  )
}
