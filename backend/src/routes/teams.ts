import express from 'express';
import { TeamService } from '../services/teamService';
import { FriendsService } from '../services/friendsService';
import { TeamRepository } from '../repositories/teamRepository';

const router = express.Router();

// 🔧 ВАЖНО: Специфичные маршруты должны быть ВЫШЕ динамических!

// Тестовый эндпоинт для проверки работы
router.get('/test', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Teams API is working correctly!',
      timestamp: new Date().toISOString(),
      endpoints: {
        'GET /api/teams/my': 'Get user teams',
        'POST /api/teams/create': 'Create new team',
        'GET /api/teams/:teamId': 'Get team details'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Teams test failed'
    });
  }
});

// Получение команд пользователя
router.get('/my', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const teams = await TeamService.getUserTeams(userId);
    
    res.json({
      success: true,
      teams
    });
  } catch (error: any) {
    console.error('Get user teams error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении команд'
    });
  }
});

// Создание команды
router.post('/create', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { name, tag } = req.body;

    if (!name || !tag) {
      return res.status(400).json({
        success: false,
        error: 'Название и тег команды обязательны'
      });
    }

    if (name.length < 3 || name.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Название команды должно быть от 3 до 20 символов'
      });
    }

    if (tag.length < 2 || tag.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Тег команды должен быть от 2 до 5 символов'
      });
    }

    const team = await TeamService.createTeam(name, tag, userId);
    
    console.log('✅ Team created:', team.name);

    res.status(201).json({
      success: true,
      message: 'Команда успешно создана',
      team
    });
  } catch (error: any) {
    console.error('Create team error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Получение всех команд (ВАЖНО: ДОЛЖЕН БЫТЬ ПЕРЕД /:teamId!)
router.get('/all', async (req, res) => {
  try {
    // Получаем команды из базы данных
    const userId = (req.session as any).userId;
    console.log('📡 GET /api/teams/all - userId:', userId);
    
    let teams = [];

    if (userId) {
      // Если пользователь авторизован, получаем его команды
      console.log('🔐 User authenticated, fetching teams for user:', userId);
      teams = await TeamService.getUserTeams(userId);
      console.log(`📦 Fetched ${teams.length} teams for user`);
    } else {
      // Иначе возвращаем тестовые данные
      console.log('⚠️ User not authenticated, returning test data');
      teams = [
        {
          id: 'team_1',
          name: 'Тестовая команда 1',
          tag: 'TEST1',
          status: 'active',
          members: [
            {
              id: 'member_1',
              username: 'testuser1',
              role: 'captain',
              steamUsername: 'TestPlayer1'
            }
          ]
        },
        {
          id: 'team_2', 
          name: 'Тестовая команда 2',
          tag: 'TEST2',
          status: 'active',
          members: [
            {
              id: 'member_2',
              username: 'testuser2', 
              role: 'captain',
              steamUsername: 'TestPlayer2'
            }
          ]
        }
      ];
    }

    console.log(`✅ Sending response with ${teams.length} teams`);
    res.json({
      success: true,
      teams: teams
    });
  } catch (error: any) {
    console.error('❌ Get all teams error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении команд',
      teams: [] // Всегда возвращаем массив
    });
  }
});

// Получение информации о команде (ДОЛЖЕН БЫТЬ ПОСЛЕДНИМ - после всех специфичных роутов!)
router.get('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    console.log(`🔍 Getting team details for teamId: ${teamId}`);
    
    // Получаем детальную информацию о команде
    const team = await TeamRepository.findTeamById(teamId);
    
    if (!team) {
      console.log(`❌ Team not found: ${teamId}`);
      return res.status(404).json({
        success: false,
        error: 'Команда не найдена'
      });
    }

    console.log(`✅ Found team: ${team.name} with ${team.members?.length || 0} members`);
    
    res.json({
      success: true,
      team: team
    });
  } catch (error: any) {
    console.error('Get team error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении информации о команде'
    });
  }
});

// Получить друзей для приглашения в команду
router.get('/:teamId/inviteable-friends', async (req, res) => {
  try {
    console.log('🔍 GET /api/teams/:teamId/inviteable-friends - Request received');
    
    const userId = (req.session as any).userId;
    console.log('👤 User ID from session:', userId);
    
    if (!userId) {
      console.log('❌ No user ID in session');
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { teamId } = req.params;
    console.log('🎯 Team ID:', teamId);

    // Проверяем, что пользователь - капитан команды
    console.log('🔍 Loading team details...');
    const team = await TeamRepository.findTeamById(teamId);
    console.log('📊 Team loaded:', team ? { id: team.id, name: team.name, membersCount: team.members?.length } : 'null');
    
    if (!team) {
      console.log('❌ Team not found');
      return res.status(404).json({
        success: false,
        error: 'Команда не найдена'
      });
    }

    const captain = team.members.find((m: any) => m.role === 'captain');
    console.log('👑 Captain check:', { captainUserId: captain?.userId, currentUserId: userId, isCaptain: captain?.userId === userId });
    
    if (!captain || captain.userId !== userId) {
      console.log('❌ User is not captain');
      return res.status(403).json({
        success: false,
        error: 'Только капитан может приглашать игроков'
      });
    }

    // Получаем друзей пользователя
    console.log('👥 Loading friends...');
    const friends = await FriendsService.getFriends(userId);
    console.log('📊 All friends:', friends.length, friends.map(f => ({ username: f.friendUsername, steamId: f.friendSteamId })));

    // Фильтруем тех, кто уже в команде
    const teamMemberIds = team.members.map((m: any) => m.userId);
    console.log('👥 Team member IDs:', teamMemberIds);
    
    const inviteableFriends = friends.filter(friend => 
      !teamMemberIds.includes(friend.friendId) && 
      friend.friendSteamId // У друга должен быть Steam аккаунт
    );
    
    console.log('✅ Inviteable friends:', inviteableFriends.length, inviteableFriends.map(f => f.friendUsername));

    res.json({
      success: true,
      friends: inviteableFriends
    });
  } catch (error: any) {
    console.error('❌ Get inviteable friends error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка друзей'
    });
  }
});

// Удаление команды
router.delete('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    console.log(`🗑️ Deleting team ${teamId} by user ${userId}`);

    // Проверяем, что команда существует
    const team = await TeamRepository.findTeamById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Команда не найдена'
      });
    }

    // Проверяем, что пользователь - капитан команды
    const captain = team.members.find((m: any) => m.role === 'captain');
    if (!captain || captain.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Только капитан может удалить команду'
      });
    }

    // Удаляем команду (каскадное удаление через foreign key)
    await TeamRepository.deleteTeam(teamId);

    console.log(`✅ Team ${teamId} deleted successfully`);

    res.json({
      success: true,
      message: 'Команда успешно удалена'
    });
  } catch (error: any) {
    console.error('Delete team error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении команды'
    });
  }
});

// Удалить игрока из команды (только капитан)
router.delete('/:teamId/members/:memberId', async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    console.log(`🗑️ Removing member ${memberId} from team ${teamId} by user ${userId}`);

    // Проверяем, что команда существует
    const team = await TeamRepository.findTeamById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Команда не найдена'
      });
    }

    // Проверяем, что пользователь - капитан команды
    const captain = team.members.find((m: any) => m.role === 'captain');
    if (!captain || captain.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Только капитан может удалять игроков из команды'
      });
    }

    // Проверяем, что участник существует в команде
    const member = team.members.find((m: any) => m.id === memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Участник не найден в команде'
      });
    }

    // Нельзя удалить капитана
    if (member.role === 'captain') {
      return res.status(403).json({
        success: false,
        error: 'Нельзя удалить капитана команды'
      });
    }

    // Удаляем участника
    await TeamRepository.removeTeamMember(teamId, memberId, userId);

    console.log(`✅ Member ${memberId} removed from team ${teamId} successfully`);

    res.json({
      success: true,
      message: 'Игрок удален из команды'
    });
  } catch (error: any) {
    console.error('Remove team member error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении игрока из команды'
    });
  }
});

export default router;