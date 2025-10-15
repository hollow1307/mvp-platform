import { TeamRepository } from '../repositories/teamRepository';
import { Team, TeamMember } from '../models/team';

export class TeamService {
  // Создание команды - ИСПРАВЛЕННАЯ ВЕРСИЯ
  static async createTeam(name: string, tag: string, captainId: string): Promise<Team> {
    // Проверяем, нет ли уже команды с таким именем или тегом
    const existingTeam = await TeamRepository.findTeamByNameOrTag(name, tag);
    if (existingTeam) {
      throw new Error('Команда с таким названием или тегом уже существует');
    }

    const team: Omit<Team, 'createdAt' | 'updatedAt' | 'stats' | 'members'> = {
      id: this.generateId('team'),
      name,
      tag: tag.toUpperCase(),
      captainId,
      status: 'active'
    };

    const newTeam = await TeamRepository.createTeam(team);
    
    // Капитан автоматически становится участником команды
    const captainSteamConnection = await this.getUserPrimarySteamConnection(captainId);
    if (!captainSteamConnection) {
      throw new Error('Для создания команды необходимо иметь привязанный Steam аккаунт');
    }

    // ИСПРАВЛЕННЫЙ ВЫЗОВ - передаем параметры правильно
    await TeamRepository.addTeamMember(
      newTeam.id,
      captainId,
      captainSteamConnection.id,
      'captain'
    );

    return await TeamRepository.findTeamById(newTeam.id) as Team;
  }

  // Получение основного Steam подключения пользователя
  private static async getUserPrimarySteamConnection(userId: string): Promise<any> {
    try {
      const { UserRepository } = await import('../repositories/userRepository');
      return await UserRepository.getUserPrimarySteamConnection(userId);
    } catch (error) {
      console.error('Error getting user primary steam connection:', error);
      return null;
    }
  }

  // Добавление участника в команду (обновленный метод)
  static async addTeamMember(teamId: string, userId: string, steamConnectionId: string, role: TeamMember['role'] = 'player'): Promise<TeamMember> {
    return await TeamRepository.addTeamMember(teamId, userId, steamConnectionId, role);
  }

  // Получение команд пользователя
  static async getUserTeams(userId: string): Promise<Team[]> {
    return await TeamRepository.getUserTeams(userId);
  }

  // Поиск команды по названию или тегу
  static async findTeamByNameOrTag(name: string, tag: string): Promise<Team | null> {
    return await TeamRepository.findTeamByNameOrTag(name, tag);
  }

  // Удаление участника из команды
  static async removeTeamMember(teamId: string, memberId: string, removerUserId: string): Promise<void> {
    const isCaptain = await TeamRepository.isUserTeamCaptain(teamId, removerUserId);
    if (!isCaptain) {
      throw new Error('Только капитан может удалять участников из команды');
    }

    await TeamRepository.removeTeamMember(teamId, memberId, removerUserId);
  }

  // Получение Steam подключений пользователя
  private static async getUserSteamConnections(userId: string): Promise<any[]> {
    try {
      const { UserRepository } = await import('../repositories/userRepository');
      return await UserRepository.getUserSteamConnections(userId);
    } catch (error) {
      console.error('Error getting user steam connections:', error);
      return [];
    }
  }

  // Генерация ID
  private static generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}