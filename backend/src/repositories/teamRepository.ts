import { db } from '../database/database';
import { Team, TeamMember, TeamMemberWithDetails } from '../models/team';

export class TeamRepository {
  // Создание команды
  static async createTeam(team: Omit<Team, 'createdAt' | 'updatedAt' | 'stats' | 'members'>): Promise<Team> {
    await db.run(
      `INSERT INTO teams (id, name, tag, captain_id, status)
       VALUES (?, ?, ?, ?, ?)`,
      [team.id, team.name, team.tag, team.captainId, team.status]
    );

    // Создаем начальную статистику
    await db.run(
      `INSERT INTO team_stats (team_id, matches_played, wins, losses, win_rate, rating)
       VALUES (?, 0, 0, 0, 0, 1000)`,
      [team.id]
    );

    return await this.findTeamById(team.id) as Team;
  }

  // НОВЫЙ МЕТОД: Добавление участника в команду (исправленная версия)
  static async addTeamMember(
    teamId: string,
    userId: string, 
    steamConnectionId: string,
    role: TeamMember['role'] = 'player'
  ): Promise<TeamMember> {
    const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🔹 Adding team member:', { teamId, userId, steamConnectionId, role });
    
    await db.run(
      `INSERT INTO team_members (id, team_id, user_id, steam_connection_id, join_date, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [memberId, teamId, userId, steamConnectionId, new Date().toISOString(), role, 1]
    );

    console.log('✅ Team member added with ID:', memberId);

    return await this.findTeamMemberById(memberId) as TeamMember;
  }

  // СТАРЫЙ МЕТОД (для обратной совместимости) - можно удалить после рефакторинга
  static async addTeamMemberOld(member: Omit<TeamMember, 'id'>): Promise<TeamMember> {
    const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.run(
      `INSERT INTO team_members (id, team_id, user_id, steam_connection_id, join_date, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [memberId, member.teamId, member.userId, member.steamConnectionId, member.joinDate.toISOString(), member.role, member.isActive ? 1 : 0]
    );

    return await this.findTeamMemberById(memberId) as TeamMember;
  }

  // Поиск команды по ID
  static async findTeamById(id: string): Promise<Team | null> {
    const teamRow = await db.get(
      `SELECT t.*, ts.matches_played, ts.wins, ts.losses, ts.win_rate, ts.rating
       FROM teams t
       LEFT JOIN team_stats ts ON t.id = ts.team_id
       WHERE t.id = ?`,
      [id]
    );

    if (!teamRow) return null;

    const members = await this.getTeamMembers(id);

    return {
      id: teamRow.id,
      name: teamRow.name,
      tag: teamRow.tag,
      captainId: teamRow.captain_id,
      createdAt: new Date(teamRow.created_at),
      updatedAt: new Date(teamRow.updated_at),
      status: teamRow.status,
      stats: {
        matchesPlayed: teamRow.matches_played,
        wins: teamRow.wins,
        losses: teamRow.losses,
        winRate: teamRow.win_rate,
        rating: teamRow.rating
      },
      members
    };
  }

  // Получение участников команды
  static async getTeamMembers(teamId: string): Promise<TeamMemberWithDetails[]> {
    const rows = await db.all(
      `SELECT tm.*, u.username, sc.steam_username, sc.avatar_url, sc.rank_tier, sc.rank_name
       FROM team_members tm
       LEFT JOIN platform_users u ON tm.user_id = u.id
       LEFT JOIN user_steam_connections sc ON tm.steam_connection_id = sc.id
       WHERE tm.team_id = ?`,
      [teamId]
    );

    return rows.map(row => ({
      id: row.id,
      teamId: row.team_id,
      userId: row.user_id,
      steamConnectionId: row.steam_connection_id,
      joinDate: new Date(row.join_date),
      role: row.role,
      isActive: Boolean(row.is_active),
      username: row.username,
      steamUsername: row.steam_username,
      avatarUrl: row.avatar_url,
      rankTier: row.rank_tier,
      rankName: row.rank_name
    }));
  }

  // Поиск участника команды по ID
  static async findTeamMemberById(id: string): Promise<TeamMember | null> {
    const row = await db.get(
      `SELECT * FROM team_members WHERE id = ?`,
      [id]
    );

    if (!row) return null;

    return {
      id: row.id,
      teamId: row.team_id,
      userId: row.user_id,
      steamConnectionId: row.steam_connection_id,
      joinDate: new Date(row.join_date),
      role: row.role,
      isActive: Boolean(row.is_active)
    };
  }

  // Получение команд пользователя
  static async getUserTeams(userId: string): Promise<Team[]> {
    console.log('🔍 TeamRepository.getUserTeams called with userId:', userId);
    
    const rows = await db.all(
      `SELECT t.*, ts.matches_played, ts.wins, ts.losses, ts.win_rate, ts.rating
       FROM teams t
       LEFT JOIN team_stats ts ON t.id = ts.team_id
       LEFT JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = ? AND tm.is_active = 1`,
      [userId]
    );

    console.log(`📦 Found ${rows.length} team rows for user ${userId}`);
    if (rows.length > 0) {
      console.log('First team row:', rows[0]);
    }

    const teams: Team[] = [];
    
    for (const row of rows) {
      const members = await this.getTeamMembers(row.id);
      console.log(`👥 Team ${row.name} has ${members.length} members`);
      teams.push({
        id: row.id,
        name: row.name,
        tag: row.tag,
        captainId: row.captain_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        status: row.status,
        stats: {
          matchesPlayed: row.matches_played,
          wins: row.wins,
          losses: row.losses,
          winRate: row.win_rate,
          rating: row.rating
        },
        members
      });
    }

    console.log(`✅ Returning ${teams.length} teams`);
    return teams;
  }

  // Проверка, является ли пользователь капитаном команды
  static async isUserTeamCaptain(teamId: string, userId: string): Promise<boolean> {
    const row = await db.get(
      'SELECT 1 FROM teams WHERE id = ? AND captain_id = ?',
      [teamId, userId]
    );
    return !!row;
  }


  // Поиск команды по названию или тегу
  static async findTeamByNameOrTag(name: string, tag: string): Promise<Team | null> {
    const row = await db.get(
      'SELECT * FROM teams WHERE name = ? OR tag = ?',
      [name, tag.toUpperCase()]
    );

    if (!row) return null;

    const members = await this.getTeamMembers(row.id);

    return {
      id: row.id,
      name: row.name,
      tag: row.tag,
      captainId: row.captain_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      status: row.status,
      stats: {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        rating: 1000
      },
      members
    };
  }

  // Удаление команды
  static async deleteTeam(teamId: string): Promise<void> {
    console.log(`🗑️ TeamRepository.deleteTeam called for teamId: ${teamId}`);
    
    // Удаляем команду (каскадное удаление через foreign key удалит связанные записи)
    const result = await db.run('DELETE FROM teams WHERE id = ?', [teamId]);
    
    console.log(`✅ Team deleted, affected rows: ${result.changes}`);
  }

  // Удаление участника из команды
  static async removeTeamMember(teamId: string, memberId: string, removedByUserId: string): Promise<void> {
    console.log(`🗑️ TeamRepository.removeTeamMember called: teamId=${teamId}, memberId=${memberId}, removedBy=${removedByUserId}`);
    
    // Удаляем участника из команды
    const result = await db.run('DELETE FROM team_members WHERE id = ? AND team_id = ?', [memberId, teamId]);
    
    console.log(`✅ Team member removed, affected rows: ${result.changes}`);
  }
}