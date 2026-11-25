import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './state/AppContext.jsx'
import HomePage from './pages/HomePage.jsx'
import LeaguePage from './pages/LeaguePage.jsx'
import TeamPage from './pages/TeamPage.jsx'
import ComparePage from './pages/ComparePage.jsx'
import FavoritesPage from './pages/FavoritesPage.jsx'
import PredictionsPage from './pages/PredictionsPage.jsx'
import { NotFound } from './components/Status.jsx'

function Header() {
  const { state } = useApp()
  return (
    <header className="header">
      <NavLink to="/" className="logo">
        ⚽ Своя таблица
      </NavLink>
      <nav>
        <NavLink to="/" end>
          Лиги
        </NavLink>
        <NavLink to="/favorites">Избранное ({state.favorites.length})</NavLink>
        <NavLink to="/predictions">Мои прогнозы</NavLink>
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppProvider>
        <Header />
        <main className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/league/:code/:season" element={<LeaguePage />} />
            <Route path="/league/:code/:season/team/:team" element={<TeamPage />} />
            <Route path="/league/:code/:season/compare" element={<ComparePage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/predictions" element={<PredictionsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="footer muted">
          Матчи —{' '}
          <a href="https://github.com/openfootball/football.json" target="_blank" rel="noreferrer">
            openfootball
          </a>{' '}
          (public domain) · клубы и игроки —{' '}
          <a href="https://www.thesportsdb.com" target="_blank" rel="noreferrer">
            TheSportsDB
          </a>
        </footer>
      </AppProvider>
    </BrowserRouter>
  )
}
