import { db } from '../database/database';
import bcrypt from 'bcryptjs';

export interface PlatformUser {
  id: string;
  email?: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  role: 'player' | 'organizer' | 'admin';
  isActive: boolean;
}

export interface SteamConnection {
  id: string;
  userId: string;
  steamId: string;
  steamUsername: string;
  avatarUrl?: string;
  profileUrl?: string;
  isVerified: boolean;
  verifiedAt?: Date;
  rankTier?: number; // ТОЛЬКО РАНГ ИЗ OPENDOTA
  rankName?: string; // Название ранга (Herald, Guardian, etc)
  totalMatches: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UserRepository {
  // Создание пользователя
  static async createUser(user: Omit<PlatformUser, 'createdAt' | 'updatedAt'>): Promise<PlatformUser> {
    await db.run(
      `INSERT INTO platform_users (id, email, username, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, user.username, user.passwordHash, user.role, user.isActive ? 1 : 0]
    );

    return await this.findUserById(user.id) as PlatformUser;
  }

  // Поиск пользователя по ID
  static async findUserById(id: string): Promise<PlatformUser | null> {
    const row = await db.get(
      'SELECT * FROM platform_users WHERE id = ?',
      [id]
    );

    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      username: row.username,
      passwordHash: row.password_hash,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      role: row.role as 'player' | 'organizer' | 'admin',
      isActive: Boolean(row.is_active)
    };
  }

  // Поиск по email или username
  static async findUserByEmailOrUsername(email: string, username: string): Promise<PlatformUser | null> {
    const row = await db.get(
      `SELECT * FROM platform_users 
       WHERE email = ? OR username = ? 
       LIMIT 1`,
      [email, username]
    );

    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      username: row.username,
      passwordHash: row.password_hash,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      role: row.role as 'player' | 'organizer' | 'admin',
      isActive: Boolean(row.is_active)
    };
  }

  // Создание Steam привязки
  static async createSteamConnection(connection: Omit<SteamConnection, 'createdAt' | 'updatedAt'>): Promise<SteamConnection> {
    await db.run(
      `INSERT INTO user_steam_connections 
       (id, user_id, steam_id, steam_username, avatar_url, profile_url, is_verified, verified_at, rank_tier, rank_name, total_matches)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        connection.id,
        connection.userId,
        connection.steamId,
        connection.steamUsername,
        connection.avatarUrl,
        connection.profileUrl,
        connection.isVerified ? 1 : 0,
        connection.verifiedAt?.toISOString(),
        connection.rankTier,
        connection.rankName,
        connection.totalMatches
      ]
    );

    return await this.findSteamConnectionById(connection.id) as SteamConnection;
  }

  // Поиск Steam привязки по SteamID
  static async findSteamConnectionBySteamId(steamId: string): Promise<SteamConnection | null> {
    const row = await db.get(
      'SELECT * FROM user_steam_connections WHERE steam_id = ?',
      [steamId]
    );

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      steamId: row.steam_id,
      steamUsername: row.steam_username,
      avatarUrl: row.avatar_url,
      profileUrl: row.profile_url,
      isVerified: Boolean(row.is_verified),
      verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
      rankTier: row.rank_tier,
      rankName: row.rank_name,
      totalMatches: row.total_matches,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // Поиск Steam привязки по ID
  static async findSteamConnectionById(id: string): Promise<SteamConnection | null> {
    const row = await db.get(
      'SELECT * FROM user_steam_connections WHERE id = ?',
      [id]
    );

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      steamId: row.steam_id,
      steamUsername: row.steam_username,
      avatarUrl: row.avatar_url,
      profileUrl: row.profile_url,
      isVerified: Boolean(row.is_verified),
      verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
      rankTier: row.rank_tier,
      rankName: row.rank_name,
      totalMatches: row.total_matches,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // Получение всех Steam привязок пользователя
  static async getUserSteamConnections(userId: string): Promise<SteamConnection[]> {
    const rows = await db.all(
      'SELECT * FROM user_steam_connections WHERE user_id = ?',
      [userId]
    );

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      steamId: row.steam_id,
      steamUsername: row.steam_username,
      avatarUrl: row.avatar_url,
      profileUrl: row.profile_url,
      isVerified: Boolean(row.is_verified),
      verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
      rankTier: row.rank_tier,
      rankName: row.rank_name,
      totalMatches: row.total_matches,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }
}