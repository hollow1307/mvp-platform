import express from 'express';
import passport from 'passport';
import { UserService } from '../services/userService';
import { UserRepository } from '../models/user';
import { SteamService } from '../services/steamService';
import { config } from '../config/environment';
import { getRankInfo, isRankEligible, getIneligibilityMessage } from '../utils/rankUtils';

const router = express.Router();

// Простой тестовый эндпоинт для проверки
router.get('/test', (req, res) => {
  res.json({ 
    message: 'New auth system is working!',
    timestamp: new Date().toISOString()
  });
});

// Получение текущего пользователя
router.get('/user', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    console.log('🔍 GET /user - Session check:', {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      userId: userId,
      cookies: req.headers.cookie,
      allSessionData: req.session
    });
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const userWithConnections = await UserService.getUserWithConnections(userId);
    
    if (!userWithConnections) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: userWithConnections.id,
        email: userWithConnections.email,
        username: userWithConnections.username,
        role: userWithConnections.role,
        steamConnections: userWithConnections.steamConnections
      }
    });
  } catch (error: any) {
    console.error('Get user error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
});

// Регистрация через email/пароль
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    console.log('📝 Registration attempt:', { email, username });

    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Все поля обязательны для заполнения'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Пароль должен быть не менее 6 символов'
      });
    }

    const user = await UserService.registerUser(email, username, password);
    
    console.log('✅ User registered successfully:', user.username);

    // Создаем сессию
    (req.session as any).userId = user.id;

    res.status(201).json({
      success: true,
      message: 'Аккаунт успешно создан',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('❌ Registration error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Вход через email/пароль
router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    console.log('🔐 Login attempt:', { emailOrUsername });

    const user = await UserService.authenticateUser(emailOrUsername, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Неверный email/username или пароль'
      });
    }

    // Создаем сессию
    (req.session as any).userId = user.id;
    
    console.log('✅ User logged in:', {
      username: user.username,
      userId: user.id,
      sessionID: req.sessionID,
      sessionData: req.session
    });

    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при входе в систему'
    });
  }
});

// Выход
router.post('/logout', (req, res) => {
  try {
    console.log('👋 User logging out');
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({
          success: false,
          error: 'Logout failed'
        });
      }
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  } catch (error: any) {
    console.error('Logout error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// Привязка Steam аккаунта - ОБНОВЛЕНО БЕЗ MMR
router.post('/steam/connect', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { steamId } = req.body;

    if (!steamId) {
      return res.status(400).json({
        success: false,
        error: 'SteamID обязателен'
      });
    }

    console.log('🔗 Steam connection attempt:', { userId, steamId });
    
    // Получаем профиль Steam
    const steamProfile = await SteamService.getPlayerProfile(steamId);
    
    // Верифицируем игрока
    const verification = await SteamService.verifyPlayer(steamId);
    
    // Получаем информацию о ранге
    const rankInfo = getRankInfo(verification.rankTier);
    const eligible = isRankEligible(verification.rankTier);
    const ineligibilityMessage = getIneligibilityMessage(verification.rankTier);
    
    console.log('📊 Rank verification:', {
      rankTier: verification.rankTier,
      rankName: rankInfo?.name,
      eligible,
      message: ineligibilityMessage
    });

    // Привязываем аккаунт
    const connection = await UserService.connectSteamAccount(
      userId,
      {
        steamId,
        username: steamProfile.personaname,
        avatar: {
          large: steamProfile.avatarfull
        },
        profileUrl: steamProfile.profileurl
      },
      verification
    );

    console.log('✅ Steam account connected:', connection.steamUsername);

    res.json({
      success: true,
      message: 'Steam аккаунт успешно привязан',
      connection: {
        id: connection.id,
        steamUsername: connection.steamUsername,
        isVerified: connection.isVerified,
        rankTier: connection.rankTier,
        rankName: connection.rankName,
        rankInfo: rankInfo,
        isEligible: eligible,
        ineligibilityMessage: ineligibilityMessage,
        totalMatches: connection.totalMatches
      }
    });
  } catch (error: any) {
    console.error('❌ Steam connection error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Проверка доступности имени пользователя
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.length < 3) {
      return res.json({
        available: false,
        message: 'Имя пользователя должно быть не менее 3 символов'
      });
    }

    // TODO: Реализовать проверку в БД
    const available = true; // Временная заглушка

    res.json({
      available,
      message: available ? 'Имя пользователя доступно' : 'Имя пользователя занято'
    });
  } catch (error: any) {
    console.error('Check username error:', error.message);
    res.status(500).json({
      available: false,
      error: 'Ошибка при проверке имени пользователя'
    });
  }
});

// Создание сессии для пользователя (используется после Steam авторизации)
router.post('/create-session', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'UserID обязателен'
      });
    }

    console.log('🔐 Creating session for user:', userId);

    // Проверяем, что пользователь существует
    const user = await UserService.getUserWithConnections(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    // Создаем сессию
    (req.session as any).userId = userId;

    console.log('✅ Session created successfully for user:', user.username);

    res.json({
      success: true,
      message: 'Сессия создана успешно',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        steamConnections: user.steamConnections
      }
    });
  } catch (error: any) {
    console.error('Create session error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании сессии'
    });
  }
});

// Steam авторизация - инициация
router.get('/steam', passport.authenticate('steam', { 
  session: false, // НЕ использовать сессии Passport
  failureRedirect: `${config.corsOrigin}/auth?error=steam_auth_failed` 
}));

// Steam авторизация - возврат
router.get('/steam/return', 
  passport.authenticate('steam', { 
    session: false, // НЕ использовать сессии Passport
    failureRedirect: `${config.corsOrigin}/auth?error=steam_auth_failed` 
  }),
  async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user || !user.steamId) {
        return res.redirect(`${config.corsOrigin}/auth?error=steam_user_not_found`);
      }

      console.log('🎮 Steam auth return:', {
        steamUser: user.username,
        steamId: user.steamId,
        hasSession: !!req.session,
        sessionID: req.sessionID,
        currentUserId: (req.session as any).userId,
        cookies: req.headers.cookie
      });

      // Проверяем, есть ли уже пользователь с таким Steam аккаунтом
      const existingConnection = await UserRepository.findSteamConnectionBySteamId(user.steamId);
      
      if (existingConnection) {
        // Если Steam аккаунт уже привязан, авторизуем пользователя
        const platformUser = await UserRepository.findUserById(existingConnection.userId);
        if (platformUser) {
          // Создаем сессию в новой системе
          (req.session as any).userId = platformUser.id;
          
          console.log('✅ Existing Steam user logged in:', {
            username: platformUser.username,
            userId: platformUser.id,
            sessionID: req.sessionID
          });
          return res.redirect(`${config.corsOrigin}/profile`);
        }
      }

      // Если Steam аккаунт не привязан, перенаправляем на страницу привязки
      console.log('⚠️ Steam not bound, redirecting to bind page. Session userId:', (req.session as any).userId);
      return res.redirect(`${config.corsOrigin}/auth/steam-bind?steamId=${user.steamId}&steamUsername=${encodeURIComponent(user.username)}`);
      
    } catch (error: any) {
      console.error('❌ Steam return error:', error.message);
      res.redirect(`${config.corsOrigin}/auth?error=steam_processing_failed`);
    }
  }
);

// Отвязка Steam аккаунта
router.delete('/steam/disconnect/:steamId', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { steamId } = req.params;

    console.log('🔗 Disconnecting Steam account:', { userId, steamId });

    const db = await import('../database/database').then(m => m.db);

    // Проверяем, принадлежит ли этот Steam аккаунт пользователю
    const connection = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT * FROM user_steam_connections WHERE steam_id = ? AND user_id = ?',
        [steamId, userId]
      ).then((row: any) => resolve(row))
        .catch((err: any) => reject(err));
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Steam аккаунт не найден или не принадлежит вам'
      });
    }

    // Удаляем связь
    const result = await new Promise<any>((resolve, reject) => {
      db.run(
        'DELETE FROM user_steam_connections WHERE steam_id = ? AND user_id = ?',
        [steamId, userId]
      ).then((result: any) => resolve(result))
        .catch((err: any) => reject(err));
    });

    console.log('✅ Steam account disconnected:', {
      steamId,
      userId,
      changes: result?.changes || 'unknown'
    });

    res.json({
      success: true,
      message: 'Steam аккаунт успешно отвязан'
    });
  } catch (error: any) {
    console.error('❌ Disconnect Steam error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;