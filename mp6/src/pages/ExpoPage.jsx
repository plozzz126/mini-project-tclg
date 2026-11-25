import { useState } from 'react'
import { Link } from 'react-router-dom'
import { artistName, countByDepartment, encodeExpo, MAX_EXPO } from '../lib/art.js'
import { TASK, variant } from '../config.js'
import { useExpo } from '../expo/ExpoContext.jsx'
import ArtImage from '../components/ArtImage.jsx'
import Slideshow from '../components/Slideshow.jsx'
import { Empty } from '../components/Status.jsx'

export default function ExpoPage() {
  const { expo, dispatch } = useExpo()
  const { items } = expo
  const [copied, setCopied] = useState('')
  const [dragFrom, setDragFrom] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [slides, setSlides] = useState(false)

  // BASE_URL = "/mp6/" — приложение живёт не в корне сайта
  const link = `${window.location.origin}${import.meta.env.BASE_URL}expo/view${encodeExpo(expo)}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied('Ссылка скопирована')
    } catch {
      setCopied('Не удалось скопировать — выделите ссылку ниже вручную')
    }
    setTimeout(() => setCopied(''), 2500)
  }

  return (
    <section>
      <label className="expo-title">
        <span className="muted">Название выставки</span>
        <input
          value={expo.title}
          onChange={(e) => dispatch({ type: 'rename', title: e.target.value })}
          maxLength={80}
          aria-label="Название выставки"
        />
      </label>
      <p className="muted">
        Работ: {items.length} / {MAX_EXPO}. Порядок меняется перетаскиванием мышью или кнопками ↑ ↓.
      </p>

      {items.length === 0 ? (
        <Empty>
          Выставка пуста. <Link to="/">Найдите работы</Link> и нажмите «В выставку».
        </Empty>
      ) : (
        <>
          <div className="toolbar">
            <button type="button" className="primary" onClick={copyLink}>
              Скопировать ссылку
            </button>
            <button type="button" onClick={() => setSlides(true)}>
              ▶ Слайд-шоу
            </button>
            {variant.task === TASK.CHRONO && (
              <button type="button" onClick={() => dispatch({ type: 'sortByYear' })}>
                Хронологически
              </button>
            )}
            <button
              type="button"
              className="danger"
              onClick={() => confirm('Убрать все работы из выставки?') && dispatch({ type: 'clear' })}
            >
              Очистить
            </button>
            {copied && <span className="ok">{copied}</span>}
          </div>
          <input className="share-link" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Ссылка на выставку" />

          {variant.task === TASK.DEPARTMENTS && <DepartmentCounter items={items} />}

          <ol className="expo-list">
            {items.map((art, i) => (
              <li
                key={art.id}
                draggable
                className={`${dragFrom === i ? 'dragging' : ''} ${dragOver === i && dragFrom !== i ? 'drag-over' : ''}`}
                onDragStart={(e) => {
                  setDragFrom(i)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', String(i))
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(i)
                }}
                onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
                onDrop={(e) => {
                  e.preventDefault()
                  const from = Number(e.dataTransfer.getData('text/plain'))
                  dispatch({ type: 'move', from, to: i })
                  setDragFrom(null)
                  setDragOver(null)
                }}
                onDragEnd={() => {
                  setDragFrom(null)
                  setDragOver(null)
                }}
              >
                <span className="handle" aria-hidden="true">
                  ⋮⋮
                </span>
                <span className="num">{i + 1}</span>
                <Link to={`/artwork/${art.id}`} className="thumb" draggable={false}>
                  <ArtImage art={art} width={200} />
                </Link>
                <div className="expo-info">
                  <Link to={`/artwork/${art.id}`} draggable={false}>
                    <strong>{art.title}</strong>
                  </Link>
                  <span className="muted">
                    {artistName(art.artist_display)}
                    {art.date_display ? `, ${art.date_display}` : ''}
                  </span>
                </div>
                <div className="expo-actions">
                  <button type="button" disabled={i === 0} onClick={() => dispatch({ type: 'moveUp', id: art.id })} aria-label="Выше">
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === items.length - 1}
                    onClick={() => dispatch({ type: 'moveDown', id: art.id })}
                    aria-label="Ниже"
                  >
                    ↓
                  </button>
                  <button type="button" className="danger" onClick={() => dispatch({ type: 'remove', id: art.id })}>
                    Убрать
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {slides && <Slideshow items={items} onClose={() => setSlides(false)} />}
    </section>
  )
}

function DepartmentCounter({ items }) {
  const rows = countByDepartment(items)
  return (
    <div className="departments">
      <h2>Работы по отделам музея</h2>
      <ul>
        {rows.map((r) => (
          <li key={r.department}>
            <span>{r.department}</span>
            <b>{r.count}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
