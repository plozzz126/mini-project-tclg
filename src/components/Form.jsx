const LABEL = { W: 'победа', D: 'ничья', L: 'поражение' }

/** Форма команды: цветные кружки W / D / L. */
export default function Form({ form }) {
  if (!form) return <span className="muted">—</span>
  return (
    <span className="form" aria-label={`Форма: ${[...form].map((c) => LABEL[c]).join(', ')}`}>
      {[...form].map((c, i) => (
        <span key={i} className={`dot ${c}`} title={LABEL[c]}>
          {c === 'W' ? 'В' : c === 'D' ? 'Н' : 'П'}
        </span>
      ))}
    </span>
  )
}
