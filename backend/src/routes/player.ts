import express from 'express';
import { SteamService, VerificationResult, isVerificationSuccess, isVerificationNoData, isVerificationError } from '../services/steamService';

const router = express.Router();

// Verify player eligibility
router.get('/verify/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const verification = await SteamService.verifyPlayer(steamId) as VerificationResult;
    
    // Базовый ответ, который есть у всех типов
    const baseResponse = {
      steamId: verification.steamId,
      rankTier: verification.rankTier,
      rankName: verification.rankName,
      stars: verification.stars,
      division: verification.division,
      isEligible: verification.isEligible,
      profile: verification.profile,
      dataStatus: verification.dataStatus
    };

    // Добавляем дополнительные поля в зависимости от типа результата
    let response;
    
    if (isVerificationSuccess(verification)) {
      response = {
        ...baseResponse,
        divisionDetails: verification.divisionDetails,
        totalMatches: verification.totalMatches,
        wins: verification.wins,
        losses: verification.losses,
        winRate: verification.winRate,
        eligibilityDetails: verification.eligibilityDetails,
        leaderboardRank: verification.leaderboardRank
      };
    } else if (isVerificationNoData(verification) || isVerificationError(verification)) {
      response = {
        ...baseResponse,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        eligibilityDetails: {
          meetsDivision: false,
          meetsMatches: false,
          requiredDivision: 'до Властелина',
          requiredMatches: 100,
          hasEnoughData: false
        },
        instructions: verification.instructions
      };
    } else {
      // Fallback для неизвестного типа
      response = {
        ...baseResponse,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        eligibilityDetails: {
          meetsDivision: false,
          meetsMatches: false,
          requiredDivision: 'до Властелина',
          requiredMatches: 100,
          hasEnoughData: false
        },
        instructions: ['Неизвестная ошибка']
      };
    }

    res.json(response);
  } catch (error: any) {
    console.error('Verification error:', error);
    res.status(500).json({
      error: 'Failed to verify player',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get player stats
router.get('/stats/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const verification = await SteamService.verifyPlayer(steamId) as VerificationResult;

    // Базовые данные которые есть у всех
    const baseStats = {
      profile: verification.profile,
      rankInfo: {
        rankTier: verification.rankTier,
        rankName: verification.rankName,
        stars: verification.stars,
        division: verification.division
      },
      dataStatus: verification.dataStatus
    };

    // Добавляем статистику матчей если есть данные
    let stats;
    if (isVerificationSuccess(verification)) {
      stats = {
        ...baseStats,
        matches: {
          total: verification.totalMatches,
          wins: verification.wins,
          losses: verification.losses,
          winRate: verification.winRate
        },
        eligibility: {
          isEligible: verification.isEligible,
          details: verification.eligibilityDetails
        }
      };
    } else {
      stats = {
        ...baseStats,
        matches: {
          total: 0,
          wins: 0,
          losses: 0,
          winRate: 0
        },
        eligibility: {
          isEligible: false,
          details: {
            meetsDivision: false,
            meetsMatches: false,
            requiredDivision: 'до Властелина',
            requiredMatches: 100,
            hasEnoughData: false
          }
        }
      };
    }

    res.json(stats);
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch player stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get player profile only
router.get('/profile/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const profile = await SteamService.getPlayerProfile(steamId);
    
    res.json({
      success: true,
      profile: {
        steamId: steamId,
        username: profile.personaname,
        avatar: {
          small: profile.avatar,
          medium: profile.avatarmedium,
          large: profile.avatarfull
        },
        profileUrl: profile.profileurl
      }
    });
  } catch (error: any) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch player profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Refresh player data
router.post('/refresh/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    
    // Прямое преобразование SteamID в Dota account_id
    const convertToDotaAccountId = (steamId: string) => {
      try {
        const steamId64 = BigInt(steamId);
        return (steamId64 - BigInt(76561197960265728)).toString();
      } catch (error) {
        return steamId;
      }
    };

    const dotaAccountId = convertToDotaAccountId(steamId);
    const refreshUrl = `https://api.opendota.com/api/players/${dotaAccountId}/refresh`;
    
    // Отправляем запрос на обновление данных в OpenDota
    const axios = require('axios');
    await axios.post(refreshUrl);
    
    // Ждем немного и возвращаем обновленные данные
    setTimeout(async () => {
      const verification = await SteamService.verifyPlayer(steamId);
      res.json({
        success: true,
        message: 'Данные обновлены',
        data: verification
      });
    }, 2000);
    
  } catch (error: any) {
    console.error('Refresh error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh player data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get divisions list
router.get('/divisions', async (req, res) => {
  try {
    const divisions = SteamService.getDivisions();
    res.json({
      success: true,
      divisions: divisions
    });
  } catch (error: any) {
    console.error('Divisions error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch divisions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check if player exists and has data
router.get('/check/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const verification = await SteamService.verifyPlayer(steamId) as VerificationResult;
    
    const hasRealData = isVerificationSuccess(verification);
    
    res.json({
      exists: true,
      hasData: hasRealData,
      rankAvailable: verification.dataStatus.rankAvailable,
      matchesAvailable: verification.dataStatus.matchesAvailable,
      isEligible: verification.isEligible,
      rank: verification.rankName,
      division: verification.division
    });
  } catch (error: any) {
    console.error('Check error:', error);
    res.status(500).json({ 
      exists: false,
      error: 'Player check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;