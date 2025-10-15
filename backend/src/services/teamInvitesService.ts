import { db } from '../database/database';
import { TeamInvite, TeamInviteWithDetails } from '../models/friends';

export class TeamInvitesService {
  // Пригласить игрока в команду
  static async invitePlayerToTeam(
    teamId: string, 
    invitedUserId: string, 
    invitedByUserId: string
  ): Promise<TeamInvite> {
    console.log('🎯 TeamInvitesService.invitePlayerToTeam called with:', { teamId, invitedUserId, invitedByUserId });
    
    // Проверяем, что приглашающий - капитан команды
    console.log('🔍 Checking if user is captain of team...');
    const team = await db.get(
      `SELECT t.*, tm.user_id as captain_id 
       FROM teams t
       INNER JOIN team_members tm ON t.id = tm.team_id 
       WHERE t.id = ? AND tm.role = 'captain'`,
      [teamId]
    );
    
    console.log('📊 Team query result:', team);

    if (!team) {
      throw new Error('Команда не найдена');
    }

    if (team.captain_id !== invitedByUserId) {
      throw new Error('Только капитан может приглашать игроков');
    }

    // Проверяем, не приглашен ли уже
    const existingInvite = await db.get(
      'SELECT * FROM team_invites WHERE team_id = ? AND invited_user_id = ? AND status = "pending"',
      [teamId, invitedUserId]
    );

    if (existingInvite) {
      throw new Error('Игрок уже приглашен в команду');
    }

    // Проверяем, не в команде ли уже
    const existingMember = await db.get(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, invitedUserId]
    );

    if (existingMember) {
      throw new Error('Игрок уже в команде');
    }

    // Проверяем лимит команды (5 игроков)
    const memberCount = await db.get(
      'SELECT COUNT(*) as count FROM team_members WHERE team_id = ?',
      [teamId]
    ) as { count: number };

    if (memberCount.count >= 5) {
      throw new Error('В команде уже максимальное количество игроков (5)');
    }

    // Проверяем, что у приглашаемого есть Steam аккаунт
    const userSteamConnection = await db.get(
      'SELECT * FROM user_steam_connections WHERE user_id = ?',
      [invitedUserId]
    );

    if (!userSteamConnection) {
      throw new Error('У игрока должен быть привязан Steam аккаунт');
    }

    const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней

    await db.run(
      `INSERT INTO team_invites (
        id, team_id, invited_user_id, invited_by_user_id, 
        status, created_at, expires_at
      ) VALUES (?, ?, ?, ?, 'pending', datetime('now'), ?)`,
      [inviteId, teamId, invitedUserId, invitedByUserId, expiresAt.toISOString()]
    );

    return await db.get('SELECT * FROM team_invites WHERE id = ?', [inviteId]) as TeamInvite;
  }

  // Принять приглашение в команду
  static async acceptTeamInvite(userId: string, inviteId: string): Promise<void> {
    const invite = await db.get(
      'SELECT * FROM team_invites WHERE id = ? AND invited_user_id = ? AND status = "pending"',
      [inviteId, userId]
    );

    if (!invite) {
      throw new Error('Приглашение не найдено или уже обработано');
    }

    // Проверяем, не истекло ли приглашение
    if (new Date(invite.expires_at) < new Date()) {
      await db.run(
        'UPDATE team_invites SET status = "expired" WHERE id = ?',
        [inviteId]
      );
      throw new Error('Приглашение истекло');
    }

    // Проверяем лимит команды еще раз
    const memberCount = await db.get(
      'SELECT COUNT(*) as count FROM team_members WHERE team_id = ?',
      [invite.team_id]
    ) as { count: number };

    if (memberCount.count >= 5) {
      throw new Error('В команде уже максимальное количество игроков');
    }

    // Добавляем в команду
    const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.run(
      `INSERT INTO team_members (id, team_id, user_id, steam_connection_id, role, join_date)
       SELECT ?, ?, ?, usc.id, 'member', datetime('now')
       FROM user_steam_connections usc 
       WHERE usc.user_id = ?`,
      [memberId, invite.team_id, userId, userId]
    );

    // Обновляем статус приглашения
    await db.run(
      'UPDATE team_invites SET status = "accepted" WHERE id = ?',
      [inviteId]
    );

    // Отклоняем все остальные приглашения этого игрока в другие команды
    await db.run(
      'UPDATE team_invites SET status = "rejected" WHERE invited_user_id = ? AND status = "pending" AND id != ?',
      [userId, inviteId]
    );
  }

  // Отклонить приглашение в команду
  static async rejectTeamInvite(userId: string, inviteId: string): Promise<void> {
    const invite = await db.get(
      'SELECT * FROM team_invites WHERE id = ? AND invited_user_id = ? AND status = "pending"',
      [inviteId, userId]
    );

    if (!invite) {
      throw new Error('Приглашение не найдено или уже обработано');
    }

    await db.run(
      'UPDATE team_invites SET status = "rejected" WHERE id = ?',
      [inviteId]
    );
  }

  // Получить приглашения пользователя
  static async getUserInvites(userId: string): Promise<TeamInviteWithDetails[]> {
    const invites = await db.all<any>(
      `SELECT 
        ti.*,
        t.name as teamName,
        t.tag as teamTag,
        pu.username as invitedByUsername,
        pu2.username as invitedUsername
      FROM team_invites ti
      INNER JOIN teams t ON ti.team_id = t.id
      INNER JOIN platform_users pu ON ti.invited_by_user_id = pu.id
      INNER JOIN platform_users pu2 ON ti.invited_user_id = pu2.id
      WHERE ti.invited_user_id = ? AND ti.status = 'pending'
      ORDER BY ti.created_at DESC`,
      [userId]
    );

    return invites.map(i => ({
      id: i.id,
      teamId: i.team_id,
      invitedUserId: i.invited_user_id,
      invitedByUserId: i.invited_by_user_id,
      status: i.status,
      createdAt: new Date(i.created_at),
      expiresAt: new Date(i.expires_at),
      teamName: i.teamName,
      teamTag: i.teamTag,
      invitedByUsername: i.invitedByUsername,
      invitedUsername: i.invitedUsername
    }));
  }

  // Получить приглашения команды (для капитана)
  static async getTeamInvites(teamId: string, captainUserId: string): Promise<TeamInviteWithDetails[]> {
    // Проверяем, что пользователь - капитан команды
    const team = await db.get(
      `SELECT t.*, tm.user_id as captain_id 
       FROM teams t
       INNER JOIN team_members tm ON t.id = tm.team_id 
       WHERE t.id = ? AND tm.role = 'captain'`,
      [teamId]
    );

    if (!team || team.captain_id !== captainUserId) {
      throw new Error('Только капитан может просматривать приглашения команды');
    }

    const invites = await db.all<any>(
      `SELECT 
        ti.*,
        t.name as teamName,
        t.tag as teamTag,
        pu.username as invitedByUsername,
        pu2.username as invitedUsername
      FROM team_invites ti
      INNER JOIN teams t ON ti.team_id = t.id
      INNER JOIN platform_users pu ON ti.invited_by_user_id = pu.id
      INNER JOIN platform_users pu2 ON ti.invited_user_id = pu2.id
      WHERE ti.team_id = ?
      ORDER BY ti.created_at DESC`,
      [teamId]
    );

    return invites.map(i => ({
      id: i.id,
      teamId: i.team_id,
      invitedUserId: i.invited_user_id,
      invitedByUserId: i.invited_by_user_id,
      status: i.status,
      createdAt: new Date(i.created_at),
      expiresAt: new Date(i.expires_at),
      teamName: i.teamName,
      teamTag: i.teamTag,
      invitedByUsername: i.invitedByUsername,
      invitedUsername: i.invitedUsername
    }));
  }

  // Отменить приглашение (капитан может отменить свое приглашение)
  static async cancelTeamInvite(inviteId: string, captainUserId: string): Promise<void> {
    const invite = await db.get(
      'SELECT * FROM team_invites WHERE id = ? AND invited_by_user_id = ? AND status = "pending"',
      [inviteId, captainUserId]
    );

    if (!invite) {
      throw new Error('Приглашение не найдено или уже обработано');
    }

    await db.run(
      'UPDATE team_invites SET status = "rejected" WHERE id = ?',
      [inviteId]
    );
  }
}
