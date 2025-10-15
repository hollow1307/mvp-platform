import { db } from '../database/database';
import { Friendship, FriendWithDetails } from '../models/friends';

export class FriendsService {
  // Отправить запрос в друзья
  static async sendFriendRequest(userId: string, friendUsername: string): Promise<Friendship> {
    // Находим пользователя по username
    const friend = await db.get(
      'SELECT id FROM platform_users WHERE username = ?',
      [friendUsername]
    );

    if (!friend) {
      throw new Error('Пользователь не найден');
    }

    if (friend.id === userId) {
      throw new Error('Нельзя добавить себя в друзья');
    }

    // Проверяем, нет ли уже связи
    const existing = await db.get(
      `SELECT * FROM friendships 
       WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
      [userId, friend.id, friend.id, userId]
    );

    if (existing) {
      if (existing.status === 'pending') {
        throw new Error('Запрос уже отправлен');
      } else if (existing.status === 'accepted') {
        throw new Error('Уже в друзьях');
      } else if (existing.status === 'blocked') {
        throw new Error('Пользователь заблокирован');
      }
    }

    const friendshipId = `friend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.run(
      `INSERT INTO friendships (id, user_id, friend_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', datetime('now'), datetime('now'))`,
      [friendshipId, userId, friend.id]
    );

    return await db.get('SELECT * FROM friendships WHERE id = ?', [friendshipId]) as Friendship;
  }

  // Принять запрос в друзья
  static async acceptFriendRequest(userId: string, friendshipId: string): Promise<void> {
    const friendship = await db.get(
      'SELECT * FROM friendships WHERE id = ? AND friend_id = ? AND status = "pending"',
      [friendshipId, userId]
    );

    if (!friendship) {
      throw new Error('Запрос не найден или уже обработан');
    }

    await db.run(
      `UPDATE friendships SET status = 'accepted', updated_at = datetime('now') WHERE id = ?`,
      [friendshipId]
    );
  }

  // Отклонить запрос в друзья
  static async rejectFriendRequest(userId: string, friendshipId: string): Promise<void> {
    const friendship = await db.get(
      'SELECT * FROM friendships WHERE id = ? AND friend_id = ? AND status = "pending"',
      [friendshipId, userId]
    );

    if (!friendship) {
      throw new Error('Запрос не найден или уже обработан');
    }

    await db.run(
      `UPDATE friendships SET status = 'rejected', updated_at = datetime('now') WHERE id = ?`,
      [friendshipId]
    );
  }

  // Удалить из друзей
  static async removeFriend(userId: string, friendId: string): Promise<void> {
    await db.run(
      `DELETE FROM friendships 
       WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
      [userId, friendId, friendId, userId]
    );
  }

  // Получить список друзей
  static async getFriends(userId: string): Promise<FriendWithDetails[]> {
    const friends = await db.all<any>(
      `SELECT 
        f.*,
        pu.username as friendUsername,
        usc.steam_id as friendSteamId,
        usc.avatar_url as friendAvatarUrl,
        usc.rank_tier as friendRankTier
      FROM friendships f
      INNER JOIN platform_users pu ON (
        CASE 
          WHEN f.user_id = ? THEN pu.id = f.friend_id
          ELSE pu.id = f.user_id
        END
      )
      LEFT JOIN user_steam_connections usc ON pu.id = usc.user_id
      WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'`,
      [userId, userId, userId]
    );

    return friends.map(f => ({
      id: f.id,
      userId: f.user_id === userId ? f.user_id : f.friend_id,
      friendId: f.user_id === userId ? f.friend_id : f.user_id,
      status: f.status,
      createdAt: new Date(f.created_at),
      updatedAt: new Date(f.updated_at),
      friendUsername: f.friendUsername,
      friendSteamId: f.friendSteamId,
      friendAvatarUrl: f.friendAvatarUrl,
      friendRankTier: f.friendRankTier
    }));
  }

  // Получить входящие запросы в друзья
  static async getIncomingRequests(userId: string): Promise<FriendWithDetails[]> {
    const requests = await db.all<any>(
      `SELECT 
        f.*,
        pu.username as friendUsername,
        usc.avatar_url as friendAvatarUrl
      FROM friendships f
      INNER JOIN platform_users pu ON pu.id = f.user_id
      LEFT JOIN user_steam_connections usc ON pu.id = usc.user_id
      WHERE f.friend_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC`,
      [userId]
    );

    return requests.map(r => ({
      id: r.id,
      userId: r.user_id,
      friendId: r.friend_id,
      status: r.status,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
      friendUsername: r.friendUsername,
      friendAvatarUrl: r.friendAvatarUrl
    }));
  }

  // Поиск игроков по username
  static async searchPlayers(query: string, limit: number = 10): Promise<any[]> {
    const players = await db.all(
      `SELECT 
        pu.id,
        pu.username,
        usc.steam_id,
        usc.avatar_url,
        usc.rank_tier,
        usc.rank_name
      FROM platform_users pu
      LEFT JOIN user_steam_connections usc ON pu.id = usc.user_id
      WHERE pu.username LIKE ?
      LIMIT ?`,
      [`%${query}%`, limit]
    );

    return players;
  }
}

