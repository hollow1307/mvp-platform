import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: sqlite3.Database;
  private isInitialized = false;

  private constructor() {
    // Создаем папку для БД если нет
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`📁 Created database directory: ${dbDir}`);
    }

    const dbPath = path.join(dbDir, 'platform.db');
    console.log(`🔧 Opening database: ${dbPath}`);
    
    // Открываем БД
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Database connection error:', err);
      } else {
        console.log(`✅ Database connected: ${dbPath}`);
        this.initializeTables().then(() => {
          this.isInitialized = true;
          console.log('🎉 Database fully initialized and ready');
        });
      }
    });
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  getDatabase(): sqlite3.Database {
    return this.db;
  }

  async waitForInitialization(): Promise<void> {
    while (!this.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async initializeTables(): Promise<void> {
    console.log('🔄 Starting database tables initialization...');

    const tables = [
      // Пользователи платформы
      `CREATE TABLE IF NOT EXISTS platform_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        role TEXT DEFAULT 'player',
        is_active BOOLEAN DEFAULT TRUE
      )`,

      // Привязки Steam аккаунтов
      `CREATE TABLE IF NOT EXISTS user_steam_connections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        steam_id TEXT UNIQUE NOT NULL,
        steam_username TEXT NOT NULL,
        avatar_url TEXT,
        profile_url TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        verified_at DATETIME,
        rank_tier INTEGER,
        rank_name TEXT,
        total_matches INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES platform_users(id) ON DELETE CASCADE
      )`,

      // Сессии платформы
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES platform_users(id) ON DELETE CASCADE
      )`,

      // Система друзей
      `CREATE TABLE IF NOT EXISTS friendships (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
        friend_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected', 'blocked')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_id)
      )`,

      // Индексы для friendships
      `CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id)`,
      `CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status)`,

      // Приглашения в команду
      `CREATE TABLE IF NOT EXISTS team_invites (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        invited_user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
        invited_by_user_id TEXT NOT NULL REFERENCES platform_users(id),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'expired')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        responded_at DATETIME,
        UNIQUE(team_id, invited_user_id)
      )`,

      // Индексы для team_invites
      `CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON team_invites(team_id)`,
      `CREATE INDEX IF NOT EXISTS idx_team_invites_invited_user_id ON team_invites(invited_user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_team_invites_status ON team_invites(status)`
    ];

    // Создаем таблицы последовательно с промисами
    for (let i = 0; i < tables.length; i++) {
      await new Promise<void>((resolve, reject) => {
        this.db.run(tables[i], (err) => {
          if (err) {
            console.error(`❌ Error creating table ${i + 1}:`, err);
            reject(err);
          } else {
            console.log(`✅ Table ${i + 1} created successfully`);
            resolve();
          }
        });
      });
    }

    console.log('🎉 All database tables created successfully');
  }

  // Метод для выполнения запросов с промисами
  run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T || null);
      });
    });
  }

  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Создаем экземпляр и экспортируем с ожиданием инициализации
const databaseService = DatabaseService.getInstance();

// Функция для инициализации БД при запуске приложения
export const initializeDatabase = async (): Promise<DatabaseService> => {
  await databaseService.waitForInitialization();
  return databaseService;
};

export const db = databaseService;