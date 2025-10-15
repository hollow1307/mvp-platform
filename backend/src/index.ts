import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from './config/passport';
import { initializeDatabase } from './database/database';
import { config } from './config/environment';

// Асинхронная инициализация приложения
async function startServer() {
  try {
    console.log('🚀 Starting MVP Platform Server...');
    
    // Ждем инициализации БД
    console.log('📁 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database ready');

    // Инициализация Express
    const app = express();
    const PORT = config.port;

    // Middleware
    app.use(cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Session configuration
    app.use(session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: true, // Изменено на true для сохранения пустых сессий
      cookie: {
        secure: false, // false для HTTP (локальная разработка)
        maxAge: 24 * 60 * 60 * 1000, // 24 часа
        httpOnly: false, // Изменено на false для доступа через JavaScript (если нужно)
        sameSite: 'lax', // lax для локальной разработки
        path: '/' // Явно указываем path
      }
    }));

    // Passport initialization (БЕЗ passport.session - не используем Passport сессии)
    app.use(passport.initialize());
    // app.use(passport.session()); // ОТКЛЮЧЕНО - используем только express-session

    // Basic health check route
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        message: 'MVP Platform API is running',
        timestamp: new Date().toISOString(),
        database: 'Connected'
      });
    });

    // TEST ROUTE - проверка работы БД
    app.get('/api/test-db', async (req, res) => {
      try {
        const db = await initializeDatabase();
        const result = await db.get('SELECT 1 as test');
        res.json({ 
          success: true, 
          message: 'Database is working!',
          test: result 
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: 'Database test failed',
          details: error 
        });
      }
    });

    // Миграция для таблиц команд
app.get('/api/migrate-teams', async (req, res) => {
  try {
    const db = await initializeDatabase();
    
    // Таблица команд
    await db.run(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tag TEXT NOT NULL UNIQUE,
        captain_id TEXT NOT NULL REFERENCES platform_users(id),
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Статистика команд
    await db.run(`
      CREATE TABLE IF NOT EXISTS team_stats (
        team_id TEXT PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
        matches_played INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        win_rate REAL DEFAULT 0,
        rating INTEGER DEFAULT 1000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Участники команд
    await db.run(`
      CREATE TABLE IF NOT EXISTS team_members (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES platform_users(id),
        steam_connection_id TEXT NOT NULL REFERENCES user_steam_connections(id),
        join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        role TEXT DEFAULT 'player',
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(team_id, user_id)
      )
    `);

    // Приглашения в команды
    await db.run(`
      CREATE TABLE IF NOT EXISTS team_invites (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        invited_user_id TEXT NOT NULL REFERENCES platform_users(id),
        invited_by_user_id TEXT NOT NULL REFERENCES platform_users(id),
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )
    `);

    res.json({ 
      success: true, 
      message: 'Team tables migrated successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Team migration failed',
      details: error 
    });
  }
});
    // Auth routes (единая система)
    app.use('/api/auth-new', require('./routes/auth-new').default);
    
    // Other routes
    app.use('/api/player', require('./routes/player').default);
    app.use('/api/divisions', require('./routes/divisions').default);
    app.use('/api/tournaments', require('./routes/tournaments').default);

    // Подключаем роуты команд
    app.use('/api/teams', require('./routes/teams').default);
    
    // Подключаем роуты друзей и приглашений
    app.use('/api/friends', require('./routes/friends').default);
    app.use('/api/team-invites', require('./routes/teamInvites').default);

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 DB Test: http://localhost:${PORT}/api/test-db`);
      console.log(`🎮 Steam auth: http://localhost:${PORT}/api/auth/steam`);
      console.log(`🔐 New auth: http://localhost:${PORT}/api/auth-new/test`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Запускаем сервер
startServer();