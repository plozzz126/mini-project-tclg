# Мини-проекты · ПМ 2 «Frontend MVP Sprint»

Студент: Пан Роман Сергеевич. Все проекты — React + Vite + react-router-dom + vitest, уровень **продвинутый**.

| Папка | Проект | Сайт |
|-------|--------|------|
| [`mp4/`](mp4) | Своя турнирная таблица (openfootball + TheSportsDB) | https://mini-project-tclg.vercel.app/mp4/ |
| [`mp5/`](mp5) | Сериальный трекер (TVmaze) | https://mini-project-tclg.vercel.app/mp5/ |
| [`mp6/`](mp6) | Своя выставка (Art Institute of Chicago API) | https://mini-project-tclg.vercel.app/mp6/ |

Подробности, журнал данных и проверки — в README каждой папки.

## Как устроен деплой

Один проект на Vercel, разные пути.

- **Пути приложений.** В `vite.config.js` каждого проекта задан `base: '/mpN/'`, а у роутера `basename={import.meta.env.BASE_URL}`.
- **Сборка.** [`scripts/build.mjs`](scripts/build.mjs) собирает все три проекта и складывает их в `dist/mp4`, `dist/mp5` и `dist/mp6`. Туда же копируется главная страница из `site/`.
- **Обновление страниц.** [`vercel.json`](vercel.json) отдаёт `mpN/index.html` на любой адрес внутри `/mpN/`, поэтому F5 на внутренней странице не даёт 404.

## Запуск

```bash
cd mp4 && npm install && npm run dev   # так же для mp5 и mp6
npm test                               # из корня: тесты всех трёх проектов
npm run build                          # из корня: общий сайт в dist/
```
