// Утилиты для работы с рангами Dota 2

export interface RankInfo {
  tier: number;        // rank_tier от OpenDota (например, 35)
  name: string;        // Название ранга на русском
  nameEn: string;      // Название ранга на английском
  stars: number;       // Количество звезд (1-5)
  bracket: string;     // Категория (Herald, Guardian, и т.д.)
  isEligible: boolean; // Допускается ли к турнирам
}

// Маппинг rank_tier к названиям рангов
export const RANK_NAMES: { [key: number]: string } = {
  // Herald (Рекрут) - 10-15
  11: 'Рекрут I',
  12: 'Рекрут II',
  13: 'Рекрут III',
  14: 'Рекрут IV',
  15: 'Рекрут V',
  
  // Guardian (Страж) - 20-25
  21: 'Страж I',
  22: 'Страж II',
  23: 'Страж III',
  24: 'Страж IV',
  25: 'Страж V',
  
  // Crusader (Рыцарь) - 30-35
  31: 'Рыцарь I',
  32: 'Рыцарь II',
  33: 'Рыцарь III',
  34: 'Рыцарь IV',
  35: 'Рыцарь V',
  
  // Archon (Герой) - 40-45
  41: 'Герой I',
  42: 'Герой II',
  43: 'Герой III',
  44: 'Герой IV',
  45: 'Герой V',
  
  // Legend (Легенда) - 50-55
  51: 'Легенда I',
  52: 'Легенда II',
  53: 'Легенда III',
  54: 'Легенда IV',
  55: 'Легенда V',
  
  // Ancient (Властелин) - 60-65
  61: 'Властелин I',
  62: 'Властелин II',
  63: 'Властелин III',
  64: 'Властелин IV',
  65: 'Властелин V',
  
  // Divine (Божество) - 70-75 (НЕ допускается)
  71: 'Божество I',
  72: 'Божество II',
  73: 'Божество III',
  74: 'Божество IV',
  75: 'Божество V',
  
  // Immortal (Титан) - 80+ (НЕ допускается)
  80: 'Титан'
};

// Английские названия для API
export const RANK_NAMES_EN: { [key: number]: string } = {
  11: 'Herald I', 12: 'Herald II', 13: 'Herald III', 14: 'Herald IV', 15: 'Herald V',
  21: 'Guardian I', 22: 'Guardian II', 23: 'Guardian III', 24: 'Guardian IV', 25: 'Guardian V',
  31: 'Crusader I', 32: 'Crusader II', 33: 'Crusader III', 34: 'Crusader IV', 35: 'Crusader V',
  41: 'Archon I', 42: 'Archon II', 43: 'Archon III', 44: 'Archon IV', 45: 'Archon V',
  51: 'Legend I', 52: 'Legend II', 53: 'Legend III', 54: 'Legend IV', 55: 'Legend V',
  61: 'Ancient I', 62: 'Ancient II', 63: 'Ancient III', 64: 'Ancient IV', 65: 'Ancient V',
  71: 'Divine I', 72: 'Divine II', 73: 'Divine III', 74: 'Divine IV', 75: 'Divine V',
  80: 'Immortal'
};

// Категории рангов
export const RANK_BRACKETS: { [key: string]: { min: number, max: number, nameRu: string, nameEn: string } } = {
  herald: { min: 10, max: 19, nameRu: 'Рекрут', nameEn: 'Herald' },
  guardian: { min: 20, max: 29, nameRu: 'Страж', nameEn: 'Guardian' },
  crusader: { min: 30, max: 39, nameRu: 'Рыцарь', nameEn: 'Crusader' },
  archon: { min: 40, max: 49, nameRu: 'Герой', nameEn: 'Archon' },
  legend: { min: 50, max: 59, nameRu: 'Легенда', nameEn: 'Legend' },
  ancient: { min: 60, max: 69, nameRu: 'Властелин', nameEn: 'Ancient' },
  divine: { min: 70, max: 79, nameRu: 'Божество', nameEn: 'Divine' },
  immortal: { min: 80, max: 100, nameRu: 'Титан', nameEn: 'Immortal' }
};

// Максимальный допустимый ранг для турниров (Ancient V = 65)
export const MAX_ELIGIBLE_RANK = 65;

// Проверка, допускается ли ранг к турнирам
export function isRankEligible(rankTier: number | null): boolean {
  if (!rankTier) return false;
  return rankTier >= 11 && rankTier <= MAX_ELIGIBLE_RANK;
}

// Получить информацию о ранге
export function getRankInfo(rankTier: number | null): RankInfo | null {
  if (!rankTier) return null;
  
  const bracket = Math.floor(rankTier / 10);
  const stars = rankTier % 10;
  
  let bracketKey = '';
  let bracketInfo = null;
  
  for (const [key, info] of Object.entries(RANK_BRACKETS)) {
    if (rankTier >= info.min && rankTier <= info.max) {
      bracketKey = key;
      bracketInfo = info;
      break;
    }
  }
  
  return {
    tier: rankTier,
    name: RANK_NAMES[rankTier] || `Ранг ${rankTier}`,
    nameEn: RANK_NAMES_EN[rankTier] || `Rank ${rankTier}`,
    stars: stars,
    bracket: bracketKey,
    isEligible: isRankEligible(rankTier)
  };
}

// Получить название категории ранга
export function getRankBracketName(rankTier: number | null, lang: 'ru' | 'en' = 'ru'): string {
  if (!rankTier) return lang === 'ru' ? 'Без ранга' : 'Unranked';
  
  for (const [key, info] of Object.entries(RANK_BRACKETS)) {
    if (rankTier >= info.min && rankTier <= info.max) {
      return lang === 'ru' ? info.nameRu : info.nameEn;
    }
  }
  
  return lang === 'ru' ? 'Неизвестно' : 'Unknown';
}

// Получить цвет для ранга (для UI)
export function getRankColor(rankTier: number | null): string {
  if (!rankTier) return '#6B7280'; // gray
  
  if (rankTier >= 80) return '#FFD700'; // gold (Immortal)
  if (rankTier >= 70) return '#9333EA'; // purple (Divine)
  if (rankTier >= 60) return '#0EA5E9'; // sky (Ancient)
  if (rankTier >= 50) return '#8B5CF6'; // violet (Legend)
  if (rankTier >= 40) return '#10B981'; // emerald (Archon)
  if (rankTier >= 30) return '#F59E0B'; // amber (Crusader)
  if (rankTier >= 20) return '#6B7280'; // gray (Guardian)
  return '#78716C'; // stone (Herald)
}

// Форматировать сообщение о недопустимом ранге
export function getIneligibilityMessage(rankTier: number | null): string | null {
  if (!rankTier) {
    return 'У игрока нет рейтингового ранга. Необходимо сыграть калибровочные матчи в Dota 2.';
  }
  
  if (rankTier < 11) {
    return 'Ранг слишком низкий для участия в турнирах.';
  }
  
  if (rankTier > MAX_ELIGIBLE_RANK) {
    const rankInfo = getRankInfo(rankTier);
    return `Ранг ${rankInfo?.name} (${rankInfo?.nameEn}) слишком высокий. Максимально допустимый ранг: Властелин V (Ancient V).`;
  }
  
  return null;
}


