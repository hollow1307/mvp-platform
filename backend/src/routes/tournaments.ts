import express from 'express';
import { Tournament, Team } from '../models/tournament';

const router = express.Router();

// Локальная функция для генерации пароля лобби
function generateLobbyPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Функция для генерации пошаговых инструкций
function generateLobbyInstructions(lobbyName: string, password: string, match: any): string[] {
  return [
    '🎮 ШАГ 1: Нажмите кнопку "Открыть Dota 2" ниже',
    '📋 ШАГ 2: В главном меню нажмите "Play Dota" → "Lobby" → "Create Lobby"',
    `🏷️  ШАГ 3: Название лобби: "${lobbyName}"`,
    `🔑 ШАГ 4: Пароль лобби: "${password}"`,
    '⚙️  ШАГ 5: Настройки лобби:',
    '   • Режим игры: Captains Mode',
    '   • Регион сервера: Europe', 
    '   • Зрители: Разрешены',
    '   • Паузы: Без ограничений',
    '👥 ШАГ 6: Пригласите капитана команды противника',
    '👥 ШАГ 7: Пригласите игроков своей команды',
    '✅ ШАГ 8: Начните матч когда все готовы'
  ];
}

// Временное хранилище
let tournaments: Tournament[] = [];
let teams: Team[] = [];
let brackets: any[] = [];
let lobbies: any[] = [];

// Получить все турниры
router.get('/', (req, res) => {
  try {
    const { status } = req.query;

    let filteredTournaments = tournaments;

    if (status) {
      filteredTournaments = filteredTournaments.filter(t => t.status === status);
    }

    res.json({
      success: true,
      tournaments: filteredTournaments.map(t => ({
        ...t,
        canRegister: t.status === 'registration' && t.currentTeams < t.maxTeams
      }))
    });
  } catch (error: any) {
    console.error('Get tournaments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournaments'
    });
  }
});

// Получить турнир по ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const tournament = tournaments.find(t => t.id === id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    const tournamentTeams = teams.filter(t => t.tournamentId === id);

    res.json({
      success: true,
      tournament: {
        ...tournament,
        teams: tournamentTeams
      }
    });
  } catch (error: any) {
    console.error('Get tournament error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournament'
    });
  }
});

// Создать турнир
router.post('/', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    // Получаем пользователя с Steam подключениями
    const { UserService } = await import('../services/userService');
    const user = await UserService.getUserWithConnections(userId);
    
    if (!user || !user.steamConnections || user.steamConnections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо привязать Steam аккаунт для создания турнира'
      });
    }

    const steamConnection = user.steamConnections[0];

    const {
      name,
      description,
      maxTeams,
      registrationEnd,
      tournamentStart
    } = req.body;

    const newTournament: Tournament = {
      id: `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      organizerId: steamConnection.steamId,
      maxTeams: maxTeams || 16,
      currentTeams: 0,
      status: 'registration',
      rules: {
        maxMMR: 4000, // Фиксировано для MVP
        minMatches: 100,
        format: 'single-elimination', // Фиксировано
        matchRules: {
          seriesType: 'bo1', // Все матчи BO1 по умолчанию
          finalSeriesType: 'bo3', // Финал BO3
          allowTies: false
        }
      },
      schedule: {
        registrationStart: new Date(),
        registrationEnd: new Date(registrationEnd),
        tournamentStart: new Date(tournamentStart),
        checkinTime: new Date(new Date(tournamentStart).getTime() - 30 * 60 * 1000) // за 30 минут до начала
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    tournaments.push(newTournament);

    console.log(`🎯 Tournament created: ${name} by ${steamConnection.steamUsername}`);

    res.status(201).json({
      success: true,
      tournament: newTournament
    });
  } catch (error: any) {
    console.error('Create tournament error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tournament'
    });
  }
});

// Зарегистрировать команду в турнире
router.post('/:id/register', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { id } = req.params;
    const { teamId } = req.body;

    console.log(`🎯 Registering team ${teamId} for tournament ${id} by user ${userId}`);

    // Получаем турнир
    const tournament = tournaments.find(t => t.id === id);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Турнир не найден'
      });
    }

    if (tournament.status !== 'registration') {
      return res.status(400).json({
        success: false,
        error: 'Регистрация в турнир закрыта'
      });
    }

    if (tournament.currentTeams >= tournament.maxTeams) {
      return res.status(400).json({
        success: false,
        error: 'Турнир заполнен'
      });
    }

    // Получаем команду из базы данных
    const { TeamRepository } = await import('../repositories/teamRepository');
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
        error: 'Только капитан может регистрировать команду в турнире'
      });
    }

    // Проверяем минимальное количество игроков
    if (team.members.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Команда должна содержать минимум 2 игроков'
      });
    }

    // Проверяем, что команда еще не зарегистрирована в турнире
    const existingRegistration = teams.find(t => t.tournamentId === id && t.name === team.name);
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        error: 'Команда уже зарегистрирована в этом турнире'
      });
    }

    // Проверяем, что все участники команды имеют привязанные Steam аккаунты
    const membersWithoutSteam = team.members.filter((member: any) => !member.steamUsername);
    if (membersWithoutSteam.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Все участники команды должны иметь привязанные Steam аккаунты'
      });
    }

    // Проверяем, что у капитана есть Steam username
    if (!captain.steamUsername) {
      return res.status(400).json({
        success: false,
        error: 'У капитана команды должен быть привязан Steam аккаунт'
      });
    }

    // Создаем команду для турнира на основе существующей команды
    const tournamentTeam: Team = {
      id: `tournament_team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: team.name,
      tag: team.tag,
      captainId: captain.steamUsername, // Теперь гарантированно строка
      players: team.members.map((member: any) => ({
        steamId: member.steamUsername || '', // Fallback на пустую строку
        username: member.username,
        avatar: '', // Можно добавить аватар позже
        isCaptain: member.role === 'captain',
        joinDate: new Date()
      })),
      tournamentId: id,
      joinedAt: new Date(),
      status: 'registered'
    };

    // Добавляем команду в турнир
    teams.push(tournamentTeam);
    tournament.currentTeams++;

    console.log(`✅ Team registered: ${team.name} for tournament ${tournament.name}`);

    res.status(201).json({
      success: true,
      message: 'Команда успешно зарегистрирована в турнире',
      team: tournamentTeam,
      tournament: {
        ...tournament,
        canRegister: tournament.currentTeams < tournament.maxTeams
      }
    });
  } catch (error: any) {
    console.error('Register team error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при регистрации команды в турнире'
    });
  }
});

// Получить команды турнира
router.get('/:id/teams', (req, res) => {
  try {
    const { id } = req.params;
    const tournamentTeams = teams.filter(t => t.tournamentId === id);

    res.json({
      success: true,
      teams: tournamentTeams
    });
  } catch (error: any) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teams'
    });
  }
});

// Временный endpoint для изменения статуса турнира (для тестирования)
router.post('/:id/start-registration', (req, res) => {
  try {
    const { id } = req.params;
    const tournament = tournaments.find(t => t.id === id);

    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    tournament.status = 'registration';
    tournament.updatedAt = new Date();

    console.log(`🎯 Tournament ${tournament.name} status changed to: registration`);

    res.json({
      success: true,
      tournament: tournament
    });
  } catch (error: any) {
    console.error('Start registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start registration'
    });
  }
});

// Функция для определения формата матча по раунду
const getMatchSeriesType = (tournament: Tournament, round: number, totalRounds: number): 'bo1' | 'bo3' => {
  // Если это финальный раунд - BO3
  if (round === totalRounds) {
    return tournament.rules.matchRules.finalSeriesType as 'bo3';
  }
  // Все остальные матчи - BO1
  return tournament.rules.matchRules.seriesType as 'bo1';
};

// Генерация турнирной сетки (УЛУЧШЕННАЯ)
router.post('/:id/generate-bracket', (req, res) => {
  try {
    const { id } = req.params;
    const tournament = tournaments.find(t => t.id === id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    if (tournament.status !== 'registration') {
      return res.status(400).json({
        success: false,
        error: 'Can only generate bracket for tournaments in registration'
      });
    }

    const tournamentTeams = teams.filter(t => t.tournamentId === id);

    if (tournamentTeams.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Need at least 2 teams to generate bracket'
      });
    }

    // УДАЛЯЕМ СТАРУЮ СЕТКУ ЕСЛИ ЕСТЬ
    const existingBracketIndex = brackets.findIndex(b => b.tournamentId === id);
    if (existingBracketIndex !== -1) {
      brackets.splice(existingBracketIndex, 1);
    }

    // ГЕНЕРАЦИЯ УЛУЧШЕННОЙ СЕТКИ
    const bracket = generateRealBracket(tournament, tournamentTeams);

    // Сохраняем сетку
    brackets.push(bracket);

    // Обновляем статус турнира
    tournament.status = 'ongoing';
    tournament.updatedAt = new Date();

    console.log(`🎯 Real bracket generated for tournament: ${tournament.name} with ${tournamentTeams.length} teams`);
    console.log(`📊 Bracket details: ${bracket.rounds.length} rounds, ${bracket.matches.length} matches`);

    res.json({
      success: true,
      bracket: bracket,
      tournament: tournament
    });
  } catch (error: any) {
    console.error('Generate bracket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate bracket'
    });
  }
});

// УЛУЧШЕННАЯ функция генерации сетки
const generateRealBracket = (tournament: Tournament, teams: Team[]) => {
  const teamCount = teams.length;
  const rounds = Math.ceil(Math.log2(teamCount));

  // Перемешиваем команды случайным образом для жеребьевки
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

  const bracket = {
    id: `bracket_${tournament.id}_${Date.now()}`,
    tournamentId: tournament.id,
    rounds: Array.from({ length: rounds }, (_, i) => i + 1),
    matches: [] as any[],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Создаем матчи для всех раундов с правильными связями
  const matchesByRound: { [round: number]: any[] } = {};

  // Создаем матчи для каждого раунда
  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = Math.ceil(teamCount / Math.pow(2, round));
    matchesByRound[round] = [];

    for (let i = 1; i <= matchesInRound; i++) {
      const match: any = {
        id: `match_${tournament.id}_r${round}_m${i}`,
        tournamentId: tournament.id,
        round: round,
        position: i,
        teamA: null,
        teamB: null,
        winnerId: null,
        nextMatchId: null, // Ссылка на следующий матч
        status: 'scheduled' as const,
        seriesType: getMatchSeriesType(tournament, round, rounds),
        games: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Для всех раундов кроме финала, устанавливаем связь со следующим матчем
      if (round < rounds) {
        const nextRound = round + 1;
        const nextMatchPosition = Math.ceil(i / 2);
        match.nextMatchId = `match_${tournament.id}_r${nextRound}_m${nextMatchPosition}`;
      }

      matchesByRound[round].push(match);
      bracket.matches.push(match);
    }
  }

  // Заполняем командами первый раунд
  const firstRoundMatches = matchesByRound[1];
  for (let i = 0; i < firstRoundMatches.length; i++) {
    const match = firstRoundMatches[i];
    const teamAIndex = i * 2;
    const teamBIndex = i * 2 + 1;

    if (teamAIndex < shuffledTeams.length) {
      const teamA = shuffledTeams[teamAIndex];
      match.teamA = {
        id: teamA.id,
        name: teamA.name,
        tag: teamA.tag,
        players: teamA.players
      };
    }

    if (teamBIndex < shuffledTeams.length) {
      const teamB = shuffledTeams[teamBIndex];
      match.teamB = {
        id: teamB.id,
        name: teamB.name,
        tag: teamB.tag,
        players: teamB.players
      };
    }

    // Если оба слота заполнены, матч готов к началу
    if (match.teamA && match.teamB) {
      match.status = 'scheduled';
    }
  }

  console.log(`🎯 Generated bracket with ${bracket.matches.length} matches across ${rounds} rounds`);

  return bracket;
};

// Получить турнирную сетку (ОБНОВЛЕННЫЙ)
router.get('/:id/bracket', (req, res) => {
  try {
    const { id } = req.params;
    const tournament = tournaments.find(t => t.id === id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    // Ищем сохраненную сетку
    const bracket = brackets.find(b => b.tournamentId === id);

    if (bracket) {
      return res.json({
        success: true,
        bracket: bracket
      });
    }

    // Если сетки нет и турнир в регистрации
    if (tournament.status === 'registration') {
      return res.json({
        success: true,
        bracket: null,
        message: 'Bracket not generated yet'
      });
    }

    // Если турнир начался, но сетки нет - генерируем автоматически
    if (tournament.status === 'ongoing') {
      const tournamentTeams = teams.filter(t => t.tournamentId === id);
      if (tournamentTeams.length >= 2) {
        console.log(`🔄 Auto-generating bracket for ongoing tournament: ${tournament.name}`);
        const newBracket = generateRealBracket(tournament, tournamentTeams);
        brackets.push(newBracket);

        return res.json({
          success: true,
          bracket: newBracket
        });
      }
    }

    res.json({
      success: true,
      bracket: null,
      message: 'Bracket not available'
    });
  } catch (error: any) {
    console.error('Get bracket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bracket'
    });
  }
});

// ОБНОВЛЕНИЕ РЕЗУЛЬТАТА МАТЧА
router.put('/:id/matches/:matchId', (req, res) => {
  try {
    const { id, matchId } = req.params;
    const { winnerId, status } = req.body;

    // Находим турнир и сетку
    const tournament = tournaments.find(t => t.id === id);
    const bracket = brackets.find(b => b.tournamentId === id);

    if (!tournament || !bracket) {
      return res.status(404).json({
        success: false,
        error: 'Tournament or bracket not found'
      });
    }

    // Находим матч
    const match = bracket.matches.find((m: any) => m.id === matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    // Проверяем, что winnerId - это ID одной из команд
    if (winnerId && winnerId !== match.teamA?.id && winnerId !== match.teamB?.id) {
      return res.status(400).json({
        success: false,
        error: 'Winner ID must be one of the participating teams'
      });
    }

    // Обновляем матч
    match.winnerId = winnerId;
    match.status = status || (winnerId ? 'completed' : 'scheduled');
    match.updatedAt = new Date();

    // Автоматически продвигаем победителя в следующий матч
    if (winnerId && match.nextMatchId) {
      const nextMatch = bracket.matches.find((m: any) => m.id === match.nextMatchId);
      if (nextMatch) {
        // Определяем, в какую позицию (teamA или teamB) поставить победителя
        const winnerTeam = match.teamA?.id === winnerId ? match.teamA : match.teamB;
        if (winnerTeam) {
          // Определяем позицию на основе position текущего матча
          if (match.position % 2 === 1) { // Нечетная позиция -> teamA следующего матча
            nextMatch.teamA = winnerTeam;
          } else { // Четная позиция -> teamB следующего матча
            nextMatch.teamB = winnerTeam;
          }

          // Если оба слота заполнены, меняем статус матча на scheduled
          if (nextMatch.teamA && nextMatch.teamB && nextMatch.status === 'scheduled') {
            nextMatch.status = 'scheduled';
          }

          console.log(`🎯 Winner ${winnerTeam.name} advanced to match ${nextMatch.id}`);
        }
      }
    }

    // Обновляем время изменения сетки
    bracket.updatedAt = new Date();

    console.log(`🎯 Match ${matchId} updated: winner ${winnerId}`);

    res.json({
      success: true,
      match: match,
      bracket: bracket
    });
  } catch (error: any) {
    console.error('Update match error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update match'
    });
  }
});

// Получить конкретный матч
router.get('/:id/matches/:matchId', (req, res) => {
  try {
    const { id, matchId } = req.params;
    const bracket = brackets.find(b => b.tournamentId === id);

    if (!bracket) {
      return res.status(404).json({
        success: false,
        error: 'Bracket not found'
      });
    }

    const match = bracket.matches.find((m: any) => m.id === matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    res.json({
      success: true,
      match: match
    });
  } catch (error: any) {
    console.error('Get match error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match'
    });
  }
});

// ПРОСТОЙ endpoint создания лобби - только инструкции
router.post('/:id/matches/:matchId/create-lobby', async (req, res) => {
  try {
    const { id, matchId } = req.params;

    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }
    
    // Получаем пользователя с Steam подключениями
    const { UserService } = await import('../services/userService');
    const user = await UserService.getUserWithConnections(userId);
    
    if (!user || !user.steamConnections || user.steamConnections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо привязать Steam аккаунт'
      });
    }

    const steamConnection = user.steamConnections[0];
    
    const tournament = tournaments.find(t => t.id === id);
    const bracket = brackets.find(b => b.tournamentId === id);

    if (!tournament || !bracket) {
      return res.status(404).json({
        success: false,
        error: 'Tournament or bracket not found'
      });
    }

    const match = bracket.matches.find((m: any) => m.id === matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    if (!match.teamA || !match.teamB) {
      return res.status(400).json({
        success: false,
        error: 'Both teams must be set'
      });
    }

    // Проверяем, что пользователь является капитаном одной из команд
    const isTeamACaptain = match.teamA.players.some((p: any) => p.steamId === steamConnection.steamId && p.isCaptain);
    const isTeamBCaptain = match.teamB.players.some((p: any) => p.steamId === steamConnection.steamId && p.isCaptain);
    
    if (!isTeamACaptain && !isTeamBCaptain) {
      return res.status(403).json({
        success: false,
        error: 'Only team captains can create lobbies'
      });
    }

    // Генерируем настройки лобби
    const lobbyPassword = generateLobbyPassword();
    const lobbyName = `MVP: ${match.teamA.tag} vs ${match.teamB.tag} - ${tournament.name}`;

    console.log(`🎮 Generating lobby instructions for match ${matchId} by captain ${steamConnection.steamUsername}`);

    // Создаем инструкцию для лобби
    const lobbyRecord = {
      id: `lobby_${matchId}_${Date.now()}`,
      matchId: matchId,
      tournamentId: id,
      password: lobbyPassword,
      connectUrl: 'steam://run/570', // Просто открывает Dota 2
      createdBy: steamConnection.steamId,
      createdAt: new Date(),
      status: 'manual_creation',
      settings: {
        name: lobbyName,
        gameMode: 'Captains Mode',
        serverRegion: 'Europe',
        seriesType: match.seriesType
      },
      instructions: generateLobbyInstructions(lobbyName, lobbyPassword, match)
    };

    // Сохраняем в историю лобби
    const existingLobbyIndex = lobbies.findIndex(l => l.matchId === matchId);
    if (existingLobbyIndex !== -1) {
      lobbies[existingLobbyIndex] = lobbyRecord;
    } else {
      lobbies.push(lobbyRecord);
    }

    // Обновляем статус матча
    match.status = 'ongoing';
    match.updatedAt = new Date();

    console.log(`✅ Lobby instructions generated for match ${matchId}`);

    res.json({
      success: true,
      lobby: lobbyRecord,
      message: 'Инструкции для создания лобби готовы!'
    });

  } catch (error: any) {
    console.error('Create lobby error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate lobby instructions: ' + error.message
    });
  }
});

export default router;