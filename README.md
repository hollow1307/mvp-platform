# MVP Platform - Турниры по Dota 2

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-blue.svg)](https://nextjs.org/)

Платформа для организации и участия в турнирах по Dota 2 для игроков до 4000 MMR.

## 🤝 Участие в разработке

Мы приветствуем вклад в развитие проекта! Если вы хотите присоединиться к команде разработчиков, ознакомьтесь с нашим [руководством по участию](CONTRIBUTING.md).

### Быстрый старт для разработчиков
1. Форкните репозиторий
2. Создайте ветку для вашей функции: `git checkout -b feature/amazing-feature`
3. Внесите изменения и закоммитьте: `git commit -m 'feat: add amazing feature'`
4. Отправьте в ветку: `git push origin feature/amazing-feature`
5. Откройте Pull Request

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 18+ 
- npm или yarn
- Git

### Установка

1. **Клонируйте репозиторий**
   ```bash
   git clone <repository-url>
   cd mvp-platform
   ```

2. **Установите зависимости backend**
   ```bash
   cd backend
   npm install
   ```

3. **Установите зависимости frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Настройте переменные окружения**
   
   Скопируйте файл `backend/env.example` в `backend/.env` и настройте переменные:
   ```bash
   cd backend
   cp env.example .env
   ```
   
   Отредактируйте `.env` файл:
   ```env
   # Database
   DATABASE_URL=./data/platform.db
   
   # Server
   PORT=5000
   NODE_ENV=development
   
   # Frontend
   FRONTEND_URL=http://localhost:3000
   BACKEND_URL=http://localhost:5000
   
   # Session (ОБЯЗАТЕЛЬНО измените в продакшене!)
   SESSION_SECRET=your-super-secret-session-key-change-this-in-production
   
   # Steam API (опционально для разработки)
   STEAM_API_KEY=your-steam-api-key
   
   # CORS
   CORS_ORIGIN=http://localhost:3000
   ```

### Запуск

1. **Запустите backend сервер**
   ```bash
   cd backend
   npm run dev
   ```
   Сервер будет доступен на http://localhost:5000

2. **Запустите frontend приложение**
   ```bash
   cd frontend
   npm run dev
   ```
   Приложение будет доступно на http://localhost:3000

## 🛠️ Разработка

### Структура проекта

```
mvp-platform/
├── backend/                 # Backend API (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/         # Конфигурация
│   │   ├── database/       # База данных
│   │   ├── models/         # Модели данных
│   │   ├── repositories/   # Репозитории
│   │   ├── routes/         # API маршруты
│   │   └── services/       # Бизнес-логика
│   └── data/              # База данных SQLite
├── frontend/               # Frontend (Next.js + React + TypeScript)
│   ├── src/
│   │   ├── app/           # Страницы приложения
│   │   ├── components/    # React компоненты
│   │   └── lib/           # Утилиты
│   └── public/            # Статические файлы
└── README.md
```

### Основные функции

- ✅ **Система аутентификации** (email/пароль + Steam)
- ✅ **Верификация игроков** через OpenDota API
- ✅ **Система дивизионов** (Herald, Guardian, Knight, Hero, Legend, Archon)
- ✅ **Профиль пользователя** с статистикой
- 🔄 **Система турниров** (в разработке)
- 🔄 **Система команд** (в разработке)

### API Endpoints

#### Аутентификация (Единая система)
- `POST /api/auth-new/register` - Регистрация
- `POST /api/auth-new/login` - Вход
- `POST /api/auth-new/logout` - Выход
- `GET /api/auth-new/user` - Текущий пользователь
- `GET /api/auth-new/steam` - Steam аутентификация
- `GET /api/auth-new/steam/return` - Возврат от Steam
- `POST /api/auth-new/steam/connect` - Привязка Steam аккаунта

#### Игроки
- `GET /api/player/verify/:steamId` - Верификация игрока

#### Турниры
- `GET /api/tournaments` - Список турниров
- `POST /api/tournaments` - Создание турнира

### База данных

Проект использует SQLite для хранения данных. База данных автоматически создается при первом запуске.

#### Основные таблицы:
- `platform_users` - Пользователи платформы
- `user_steam_connections` - Привязки Steam аккаунтов
- `user_sessions` - Сессии пользователей
- `teams` - Команды
- `tournaments` - Турниры

## 🔧 Настройка Steam API

Для полной функциональности Steam аутентификации:

1. Получите Steam API ключ на https://steamcommunity.com/dev/apikey
2. Добавьте ключ в файл `.env`:
   ```env
   STEAM_API_KEY=your-steam-api-key
   ```

Без API ключа будет использоваться mock аутентификация для разработки.

## 🚀 Деплой

### Backend

1. Соберите проект:
   ```bash
   cd backend
   npm run build
   ```

2. Запустите продакшн сервер:
   ```bash
   npm start
   ```

### Frontend

1. Соберите проект:
   ```bash
   cd frontend
   npm run build
   ```

2. Запустите продакшн сервер:
   ```bash
   npm start
   ```

## 🐛 Известные проблемы

- [ ] Некоторые CSS классы могут не работать в продакшене
- [ ] Нужно добавить валидацию форм на frontend
- [ ] Нужно добавить обработку ошибок в API
- [ ] Нужно добавить логирование

## 📝 Лицензия

MIT License

## 🤝 Вклад в проект

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📞 Поддержка

Если у вас есть вопросы или проблемы, создайте issue в репозитории.

