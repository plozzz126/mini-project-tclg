import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { TrackerProvider, useTracker } from './state/TrackerContext.jsx'
import SearchPage from './pages/SearchPage.jsx'
import ShowPage from './pages/ShowPage.jsx'
import MyPage from './pages/MyPage.jsx'
import TodayPage from './pages/TodayPage.jsx'
import PersonPage from './pages/PersonPage.jsx'
import { NotFound } from './components/ui.jsx'

function Header() {
  const { tracker } = useTracker()
  return (
    <header className="header">
      <NavLink to="/" className="logo">
        📺 Сериальный трекер
      </NavLink>
      <nav>
        <NavLink to="/" end>
          Поиск
        </NavLink>
        <NavLink to="/my">Мои сериалы ({Object.keys(tracker).length})</NavLink>
        <NavLink to="/today">Сегодня</NavLink>
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <TrackerProvider>
        <Header />
        <main className="container">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/show/:id" element={<ShowPage />} />
            <Route path="/my" element={<MyPage />} />
            <Route path="/today" element={<TodayPage />} />
            <Route path="/people/:id" element={<PersonPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="footer muted">
          Данные:{' '}
          <a href="https://www.tvmaze.com" target="_blank" rel="noreferrer">
            TVmaze.com
          </a>{' '}
          (CC BY-SA)
        </footer>
      </TrackerProvider>
    </BrowserRouter>
  )
}
