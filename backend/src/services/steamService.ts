import axios from 'axios';

// === ИНТЕРФЕЙСЫ ДЛЯ ТИПИЗАЦИИ ===
export interface VerificationSuccess {
  steamId: string;
  rankTier: number;
  rankName: string;
  stars: number;
  division: string;
  platformDivision: string;
  divisionDetails: any;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  isEligible: boolean;
  eligibilityDetails: {
    meetsDivision: boolean;
    meetsMatches: boolean;
    requiredDivision: string;
    requiredMatches: number;
    hasEnoughData: boolean;
  };
  profile: {
    personaname: string;
    avatarfull: string;
    profileurl: string;
    realData: boolean;
    dataSource: string;
  };
  dataStatus: {
    hasRealData: boolean;
    dataSource: string;
    rankAvailable: boolean;
    matchesAvailable: boolean;
    isEstimated: boolean;
  };
  leaderboardRank?: number;
  // MMR УДАЛЕН
}

export interface VerificationNoData {
  steamId: string;
  rankTier: null;
  rankName: string;
  stars: number;
  division: string;
  platformDivision: string;
  isEligible: boolean;
  profile: {
    personaname: string;
    avatarfull: string;
    profileurl: string;
    realData: boolean;
    dataSource: string;
  };
  dataStatus: {
    hasRealData: boolean;
    error: string;
    rankAvailable: boolean;
    matchesAvailable: boolean;
    isEstimated: boolean;
  };
  instructions: string[];
}

export interface VerificationError {
  steamId: string;
  rankTier: null;
  rankName: string;
  stars: number;
  division: string;
  platformDivision: string;
  isEligible: boolean;
  profile: {
    personaname: string;
    avatarfull: string;
    profileurl: string;
    realData: boolean;
    dataSource: string;
  };
  dataStatus: {
    hasRealData: boolean;
    error: string;
    rankAvailable: boolean;
    matchesAvailable: boolean;
    isEstimated: boolean;
  };
  instructions: string[];
}

export type VerificationResult = VerificationSuccess | VerificationNoData | VerificationError;

// Вспомогательные функции для проверки типов
export function isVerificationSuccess(result: VerificationResult): result is VerificationSuccess {
  return result.dataStatus.hasRealData === true;
}

export function isVerificationNoData(result: VerificationResult): result is VerificationNoData {
  return !result.dataStatus.hasRealData && 'instructions' in result;
}

export function isVerificationError(result: VerificationResult): result is VerificationError {
  const dataStatus = result.dataStatus as any;
  return !result.dataStatus.hasRealData && dataStatus.error !== undefined;
}
// === КОНЕЦ ИНТЕРФЕЙСОВ ===

export class SteamService {
  // Конвертация SteamID в Dota 2 account_id
  private static convertToDotaAccountId(steamId: string): string {
    try {
      const steamId64 = BigInt(steamId);
      const dotaAccountId = (steamId64 - BigInt(76561197960265728)).toString();
      console.log(`🔄 SteamID ${steamId} → Dota account_id: ${dotaAccountId}`);
      return dotaAccountId;
    } catch (error) {
      console.error('Error converting SteamID to Dota account_id:', error);
      return steamId;
    }
  }

  // РЕАЛЬНАЯ ПРОВЕРКА ДАННЫХ
  static async verifyPlayer(steamId: string): Promise<VerificationResult> {
    try {
      console.log(`🔍 Starting REAL verification for SteamID: ${steamId}`);
      
      // 1. Получаем профиль из Steam API
      const profile = await this.getPlayerProfile(steamId);
      console.log(`✅ Steam profile: ${profile.personaname}`);
      
      // 2. Конвертируем SteamID в Dota account_id
      const dotaAccountId = this.convertToDotaAccountId(steamId);
      console.log(`🔄 Using Dota account_id: ${dotaAccountId}`);
      
      // 3. Пробуем получить реальные данные из OpenDota
      console.log(`🔄 Trying to fetch REAL data from OpenDota...`);
      const realData = await this.getRealPlayerData(dotaAccountId);
      
      if (realData.success) {
        console.log(`✅ REAL data obtained:`, {
          rankTier: realData.rankTier,
          rankName: realData.rankName,
          stars: realData.stars,
          matches: realData.totalMatches,
          winRate: realData.winRate
        });
        return this.formatRealDataResult(steamId, profile, realData);
      }
      
      // 4. Если реальных данных нет - сообщаем игроку
      console.log(`❌ No real data available: ${realData.error}`);
      return this.formatNoDataResult(steamId, profile, realData.error || 'UNKNOWN_ERROR');
      
    } catch (error) {
      console.error('Verification failed:', error);
      return this.formatErrorResult(steamId, error);
    }
  }

  // ПОЛУЧЕНИЕ РЕАЛЬНЫХ ДАННЫХ ИЗ OPEN DOTA
  private static async getRealPlayerData(dotaAccountId: string) {
    try {
      console.log(`📊 Fetching OpenDota data for account_id: ${dotaAccountId}`);
      
      // Получаем основные данные игрока
      const playerResponse = await axios.get(
        `https://api.opendota.com/api/players/${dotaAccountId}`,
        { 
          timeout: 15000,
          validateStatus: (status) => status < 500
        }
      );

      console.log(`📡 OpenDota API response status: ${playerResponse.status}`);

      // Если игрок не найден
      if (playerResponse.status === 404) {
        return {
          success: false,
          error: 'PLAYER_NOT_FOUND',
          message: 'Игрок не найден в базе OpenDota'
        };
      }

      // Если другие ошибки
      if (playerResponse.status !== 200) {
        return {
          success: false,
          error: 'API_ERROR',
          message: `OpenDota API error: ${playerResponse.status}`
        };
      }

      const playerData = playerResponse.data;
      const rankTier = playerData.rank_tier;
      
      console.log('🔍 Analyzing OpenDota data:', {
        profile: playerData.profile ? 'available' : 'missing',
        rank_tier: rankTier,
        leaderboard_rank: playerData.leaderboard_rank
      });

      // Получаем статистику побед/поражений
      const wlData = await this.getWinLossData(dotaAccountId);
      
      // Если нет rank_tier, считаем что данных нет
      if (!rankTier) {
        return {
          success: false,
          error: 'NO_RANK_DATA',
          message: 'Ранг игрока не доступен'
        };
      }

      // Расшифровываем ранг
      const rankInfo = this.decodeRankTier(rankTier);
      
      return {
        success: true,
        rankTier: rankTier,
        rankName: rankInfo.rankName,
        stars: rankInfo.stars,
        division: rankInfo.division,
        platformDivision: rankInfo.platformDivision,
        totalMatches: wlData.totalMatches,
        wins: wlData.wins,
        losses: wlData.losses,
        winRate: wlData.winRate,
        leaderboard_rank: playerData.leaderboard_rank,
        profile: playerData.profile
      };

    } catch (error: any) {
      console.error('OpenDota API error:', error.message);
      
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'PLAYER_NOT_FOUND',
          message: 'Игрок не найден в базе OpenDota'
        };
      }
      
      return {
        success: false,
        error: 'API_ERROR',
        message: `Ошибка при получении данных: ${error.message}`
      };
    }
  }

  // РАСШИФРОВКА RANK_TIER
  private static decodeRankTier(rankTier: number) {
    console.log(`🎯 Decoding rank_tier: ${rankTier}`);
    
    // Разбиваем число на десятки и единицы
    const rankDigit = Math.floor(rankTier / 10); // Первая цифра (ранг)
    const starsDigit = rankTier % 10; // Вторая цифра (звезды)

    const rankInfo = {
      rankName: '',
      stars: starsDigit,
      division: '',
      platformDivision: '',
      description: ''
    };

    // Определяем ранг по первой цифре
    switch (rankDigit) {
      case 1:
        rankInfo.rankName = 'Рекрут';
        rankInfo.division = 'Herald';
        rankInfo.platformDivision = '1';
        rankInfo.description = 'Рекрут';
        break;
      case 2:
        rankInfo.rankName = 'Страж';
        rankInfo.division = 'Guardian';
        rankInfo.platformDivision = '2';
        rankInfo.description = 'Страж';
        break;
      case 3:
        rankInfo.rankName = 'Рыцарь';
        rankInfo.division = 'Knight';
        rankInfo.platformDivision = '3';
        rankInfo.description = 'Рыцарь';
        break;
      case 4:
        rankInfo.rankName = 'Герой';
        rankInfo.division = 'Hero';
        rankInfo.platformDivision = '4';
        rankInfo.description = 'Герой';
        break;
      case 5:
        rankInfo.rankName = 'Легенда';
        rankInfo.division = 'Legend';
        rankInfo.platformDivision = '5';
        rankInfo.description = 'Легенда';
        break;
      case 6:
        rankInfo.rankName = 'Властелин';
        rankInfo.division = 'Archon';
        rankInfo.platformDivision = '6';
        rankInfo.description = 'Властелин';
        break;
      case 7:
        rankInfo.rankName = 'Божество';
        rankInfo.division = 'Divine';
        rankInfo.platformDivision = '7';
        rankInfo.description = 'Божество';
        break;
      case 8:
        rankInfo.rankName = 'Титан';
        rankInfo.division = 'Immortal';
        rankInfo.platformDivision = '8';
        rankInfo.description = 'Титан';
        break;
      default:
        rankInfo.rankName = 'Неизвестно';
        rankInfo.division = 'Unknown';
        rankInfo.platformDivision = 'Unknown';
        rankInfo.description = 'Неизвестный ранг';
    }

    // Добавляем звезды к описанию
    if (starsDigit > 0 && rankDigit < 8) {
      rankInfo.description += ` ${starsDigit}⭐`;
    }

    console.log(`🎯 Rank decoded: ${rankInfo.rankName} (${rankInfo.division}) -> Дивизион ${rankInfo.platformDivision} ${starsDigit} stars`);
    
    return rankInfo;
  }

  // ПОЛУЧЕНИЕ СТАТИСТИКИ ПОБЕД/ПОРАЖЕНИЙ
  private static async getWinLossData(dotaAccountId: string) {
    try {
      const response = await axios.get(
        `https://api.opendota.com/api/players/${dotaAccountId}/wl`,
        { 
          timeout: 10000,
          validateStatus: (status) => status < 500
        }
      );

      if (response.status !== 200) {
        return {
          wins: 0,
          losses: 0,
          totalMatches: 0,
          winRate: 0
        };
      }

      const data = response.data;
      const wins = data.win || 0;
      const losses = data.lose || 0;
      const totalMatches = wins + losses;
      const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

      console.log(`🎮 Win/Loss stats: ${wins}W ${losses}L (${winRate}%)`);
      
      return {
        wins,
        losses,
        totalMatches,
        winRate
      };
    } catch (error) {
      console.error('Error fetching win/loss data:', error);
      return {
        wins: 0,
        losses: 0,
        totalMatches: 0,
        winRate: 0
      };
    }
  }

  // ФОРМАТИРОВАНИЕ РЕЗУЛЬТАТА С РЕАЛЬНЫМИ ДАННЫМИ
 private static formatRealDataResult(steamId: string, profile: any, realData: any): VerificationSuccess {
  const isEligible = this.checkEligibility(realData.division, realData.totalMatches);

  console.log(`✅ REAL verification completed:`, {
    playerName: profile.personaname,
    rank: realData.rankName,
    division: realData.division,
    platformDivision: realData.platformDivision,
    stars: realData.stars,
    matches: realData.totalMatches,
    isEligible
    // MMR УДАЛЕН
  });

  return {
    steamId,
    rankTier: realData.rankTier,
    rankName: realData.rankName,
    stars: realData.stars,
    division: realData.division,
    platformDivision: realData.platformDivision,
    divisionDetails: this.getDivisionDetails(realData.division),
    totalMatches: realData.totalMatches,
    wins: realData.wins,
    losses: realData.losses,
    winRate: realData.winRate,
    isEligible,
    eligibilityDetails: {
      meetsDivision: this.isDivisionAllowed(realData.division),
      meetsMatches: realData.totalMatches >= 100,
      requiredDivision: 'до Властелина',
      requiredMatches: 100,
      hasEnoughData: true
    },
    profile: {
      personaname: profile.personaname,
      avatarfull: profile.avatarfull,
      profileurl: profile.profileurl,
      realData: true,
      dataSource: 'opendota'
    },
    dataStatus: {
      hasRealData: true,
      dataSource: 'rank_tier',
      rankAvailable: true,
      matchesAvailable: realData.totalMatches > 0,
      isEstimated: false
    },
    leaderboardRank: realData.leaderboard_rank
    // MMR УДАЛЕН
  };
}

  // ФОРМАТИРОВАНИЕ РЕЗУЛЬТАТА КОГДА ДАННЫХ НЕТ
  private static formatNoDataResult(steamId: string, profile: any, error: string): VerificationNoData {
    console.log(`❌ No data available: ${error}`);

    return {
      steamId,
      rankTier: null,
      rankName: 'Неизвестно',
      stars: 0,
      division: 'Unknown',
      platformDivision: 'Unknown',
      isEligible: false,
      profile: {
        personaname: profile.personaname,
        avatarfull: profile.avatarfull,
        profileurl: profile.profileurl,
        realData: false,
        dataSource: 'none'
      },
      dataStatus: {
        hasRealData: false,
        error: error,
        rankAvailable: false,
        matchesAvailable: false,
        isEstimated: false
      },
      instructions: this.getInstructions(steamId, error)
    };
  }

  // ФОРМАТИРОВАНИЕ РЕЗУЛЬТАТА ПРИ ОШИБКЕ
  private static formatErrorResult(steamId: string, error: any): VerificationError {
    const profile = {
      personaname: 'Unknown',
      avatarfull: '',
      profileurl: ''
    };

    return {
      steamId,
      rankTier: null,
      rankName: 'Ошибка',
      stars: 0,
      division: 'Unknown',
      platformDivision: 'Unknown',
      isEligible: false,
      profile: {
        personaname: 'Error',
        avatarfull: '',
        profileurl: '',
        realData: false,
        dataSource: 'error'
      },
      dataStatus: {
        hasRealData: false,
        error: 'SYSTEM_ERROR',
        rankAvailable: false,
        matchesAvailable: false,
        isEstimated: false
      },
      instructions: [
        '❌ Произошла системная ошибка',
        '🔄 Пожалуйста, попробуйте позже'
      ]
    };
  }

  // ПРОВЕРКА ELIGIBILITY ДЛЯ ТУРНИРОВ
  private static checkEligibility(division: string, totalMatches: number): boolean {
    const allowedDivisions = ['Herald', 'Guardian', 'Knight', 'Hero', 'Legend', 'Archon'];
    return allowedDivisions.includes(division) && totalMatches >= 100;
  }

  // ПРОВЕРКА РАЗРЕШЕННОГО ДИВИЗИОНА
  private static isDivisionAllowed(division: string): boolean {
    const allowedDivisions = ['Herald', 'Guardian', 'Knight', 'Hero', 'Legend', 'Archon'];
    return allowedDivisions.includes(division);
  }

  // ДЕТАЛИ ДИВИЗИОНА
  private static getDivisionDetails(division: string) {
    const divisions: { [key: string]: any } = {
      'Herald': { 
        name: 'Herald', 
        minMatches: 100,
        color: 'bg-red-500',
        description: 'Рекрут',
        requirements: 'Минимум 100 матчей'
      },
      'Guardian': { 
        name: 'Guardian', 
        minMatches: 100,
        color: 'bg-orange-500',
        description: 'Страж',
        requirements: 'Минимум 100 матчей'
      },
      'Knight': { 
        name: 'Knight', 
        minMatches: 100,
        color: 'bg-yellow-500',
        description: 'Рыцарь',
        requirements: 'Минимум 100 матчей'
      },
      'Hero': { 
        name: 'Hero', 
        minMatches: 100,
        color: 'bg-green-500',
        description: 'Герой',
        requirements: 'Минимум 100 матчей'
      },
      'Legend': { 
        name: 'Legend', 
        minMatches: 100,
        color: 'bg-blue-500',
        description: 'Легенда',
        requirements: 'Минимум 100 матчей'
      },
      'Archon': { 
        name: 'Archon', 
        minMatches: 100,
        color: 'bg-purple-500',
        description: 'Властелин',
        requirements: 'Минимум 100 матчей'
      },
      'Divine': { 
        name: 'Divine', 
        minMatches: 100,
        color: 'bg-pink-500',
        description: 'Божество',
        requirements: 'Минимум 100 матчей'
      },
      'Immortal': { 
        name: 'Immortal', 
        minMatches: 100,
        color: 'bg-indigo-500',
        description: 'Титан',
        requirements: 'Минимум 100 матчей'
      },
      'Unknown': { 
        name: 'Unknown', 
        minMatches: 0,
        color: 'bg-gray-500',
        description: 'Неизвестно',
        requirements: 'Данные не доступны'
      }
    };

    return divisions[division] || divisions['Unknown'];
  }

  // ИНСТРУКЦИИ ДЛЯ ИГРОКА
  private static getInstructions(steamId: string, error: string) {
    const dotaAccountId = this.convertToDotaAccountId(steamId);
    const baseInstructions = [
      '1. 📋 В Dota 2: Настройки → Аккаунт → "Разрешить всем видеть историю матчей"',
      `2. 🔄 Обновите данные: https://www.opendota.com/players/${dotaAccountId}/refresh`,
      '3. ⏳ Подождите 5-10 минут и проверьте снова',
      `4. 🔗 Ваш Dota ID: ${dotaAccountId}`
    ];

    if (error === 'PLAYER_NOT_FOUND') {
      baseInstructions.unshift('❌ Ваш аккаунт не найден в базе OpenDota');
    } else if (error === 'NO_RANK_DATA') {
      baseInstructions.unshift('❌ Ранг игрока не доступен');
    } else if (error === 'API_ERROR') {
      baseInstructions.unshift('❌ Ошибка при получении данных');
    }

    return baseInstructions;
  }

  // Получение профиля
  static async getPlayerProfile(steamId: string) {
    try {
      if (!process.env.STEAM_API_KEY) {
        throw new Error('Steam API key not configured');
      }

      const response = await axios.get(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/`,
        {
          params: {
            key: process.env.STEAM_API_KEY,
            steamids: steamId
          }
        }
      );
      
      if (!response.data.response.players || response.data.response.players.length === 0) {
        throw new Error('Player not found');
      }
      
      return response.data.response.players[0];
    } catch (error) {
      console.error('Error fetching player profile:', error);
      throw error;
    }
  }

  // Получение списка дивизионов
  static getDivisions() {
    return [
      { 
        name: 'Herald', 
        minMatches: 100,
        color: 'bg-red-500',
        description: 'Дивизион 1',
        requirements: 'Минимум 100 матчей'
      },
      { 
        name: 'Guardian', 
        minMatches: 100,
        color: 'bg-orange-500',
        description: 'Дивизион 2',
        requirements: 'Минимум 100 матчей'
      },
      { 
        name: 'Knight', 
        minMatches: 100,
        color: 'bg-yellow-500',
        description: 'Дивизион 3',
        requirements: 'Минимум 100 матчей'
      },
      { 
        name: 'Hero', 
        minMatches: 100,
        color: 'bg-green-500',
        description: 'Дивизион 4',
        requirements: 'Минимум 100 матчей'
      },
      { 
        name: 'Legend', 
        minMatches: 100,
        color: 'bg-blue-500',
        description: 'Дивизион 5',
        requirements: 'Минимум 100 матчей'
      },
      { 
        name: 'Archon', 
        minMatches: 100,
        color: 'bg-purple-500',
        description: 'Дивизион 6',
        requirements: 'Минимум 100 матчей'
      }
    ];
  }
}