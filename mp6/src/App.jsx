import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { ExpoProvider, useExpo } from './expo/ExpoContext.jsx'
import SearchPage from './pages/SearchPage.jsx'
import ArtworkPage from './pages/ArtworkPage.jsx'
import ExpoPage from './pages/ExpoPage.jsx'
import ExpoViewPage from './pages/ExpoViewPage.jsx'
import NotFound from './pages/NotFound.jsx'
import { variant } from './config.js'

function Header() {
  const { expo } = useExpo()
  return (
    <header className="header">
      <NavLink to="/" className="logo">
        Своя выставка
      </NavLink>
      <nav>
        <NavLink to="/" end>
          Поиск
        </NavLink>
        <NavLink to="/expo">Выставка ({expo.items.length})</NavLink>
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ExpoProvider>
        <Header />
        <main className="container">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/artwork/:id" element={<ArtworkPage />} />
            <Route path="/expo" element={<ExpoPage />} />
            <Route path="/expo/view" element={<ExpoViewPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="footer muted">
          Вариант {variant.number}: «{variant.topic}» · данные и изображения —{' '}
          <a href="https://www.artic.edu" target="_blank" rel="noreferrer">
            Art Institute of Chicago
          </a>{' '}
          API
        </footer>
      </ExpoProvider>
    </BrowserRouter>
  )
}
