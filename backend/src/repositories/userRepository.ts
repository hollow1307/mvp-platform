import { db } from '../database/database';

export class UserRepository {
  // Получение Steam подключений пользователя
  static async getUserSteamConnections(userId: string): Promise<any[]> {
    try {
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
        isVerified: Boolean(row.is_verified),
        rankTier: row.rank_tier,
        rankName: row.rank_name,
        totalMatches: row.total_matches
      }));
    } catch (error) {
      console.error('Error getting user steam connections:', error);
      return [];
    }
  }

  // Получение основного Steam подключения пользователя
  static async getUserPrimarySteamConnection(userId: string): Promise<any> {
    const connections = await this.getUserSteamConnections(userId);
    return connections.length > 0 ? connections[0] : null;
  }
}