import { Link } from 'react-router-dom'
import ArtImage from './ArtImage.jsx'
import { artistName } from '../lib/art.js'

export default function ArtCard({ art, iiifUrl, inExpo = false }) {
  return (
    <article className="card">
      <Link to={`/artwork/${art.id}`} className="card-link">
        <ArtImage art={art} iiifUrl={iiifUrl} />
        {inExpo && <span className="badge">✓ Уже в выставке</span>}
        <h3 className="card-title">{art.title}</h3>
        <p className="card-artist">{artistName(art.artist_display)}</p>
      </Link>
    </article>
  )
}
