import bcrypt from 'bcryptjs';
import { PlatformUser, SteamConnection, UserRepository } from '../models/user';

export class UserService {
  // Регистрация нового пользователя
  static async registerUser(email: string, username: string, password: string): Promise<PlatformUser> {
    const existingUser = await UserRepository.findUserByEmailOrUsername(email, username);
    if (existingUser) {
      throw new Error('Пользователь с таким email или именем уже существует');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    const newUser: Omit<PlatformUser, 'createdAt' | 'updatedAt'> = {
      id: this.generateId('user'),
      email,
      username,
      passwordHash,
      role: 'player',
      isActive: true
    };

    return await UserRepository.createUser(newUser);
  }

  // Аутентификация пользователя
  static async authenticateUser(emailOrUsername: string, password: string): Promise<PlatformUser | null> {
    const user = await UserRepository.findUserByEmailOrUsername(emailOrUsername, emailOrUsername);
    if (!user || !user.isActive) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    return isValidPassword ? user : null;
  }

  // Привязка Steam аккаунта - ОБНОВЛЕНО БЕЗ MMR
  static async connectSteamAccount(userId: string, steamProfile: any, verificationData: any): Promise<SteamConnection> {
    const user = await UserRepository.findUserById(userId);
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Проверяем, не привязан ли уже этот Steam аккаунт
    const existingConnection = await UserRepository.findSteamConnectionBySteamId(steamProfile.steamId);
    if (existingConnection && existingConnection.userId !== userId) {
      throw new Error('Этот Steam аккаунт уже привязан к другому пользователю');
    }

    const steamConnection: Omit<SteamConnection, 'createdAt' | 'updatedAt'> = {
      id: this.generateId('steam'),
      userId,
      steamId: steamProfile.steamId,
      steamUsername: steamProfile.username,
      avatarUrl: steamProfile.avatar?.large,
      profileUrl: steamProfile.profileUrl,
      isVerified: verificationData.isEligible,
      verifiedAt: verificationData.isEligible ? new Date() : undefined,
      rankTier: verificationData.rankTier,        // ТОЛЬКО РАНГ
      rankName: verificationData.rankName,        // Название ранга
      totalMatches: verificationData.totalMatches || 0
    };

    return await UserRepository.createSteamConnection(steamConnection);
  }

  // Генерация ID
  private static generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Получение пользователя с привязанными Steam аккаунтами
  static async getUserWithConnections(userId: string) {
    const user = await UserRepository.findUserById(userId);
    if (!user) return null;

    const steamConnections = await UserRepository.getUserSteamConnections(userId);
    
    return {
      ...user,
      steamConnections
    };
  }
}