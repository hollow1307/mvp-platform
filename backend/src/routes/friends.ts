import express from 'express';
import { FriendsService } from '../services/friendsService';

const router = express.Router();

// Отправить запрос в друзья
router.post('/request', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username обязателен'
      });
    }

    const friendship = await FriendsService.sendFriendRequest(userId, username);

    res.json({
      success: true,
      message: 'Запрос в друзья отправлен',
      friendship
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Принять запрос в друзья
router.post('/:friendshipId/accept', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { friendshipId } = req.params;

    await FriendsService.acceptFriendRequest(userId, friendshipId);

    res.json({
      success: true,
      message: 'Запрос принят'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Отклонить запрос в друзья
router.post('/:friendshipId/reject', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { friendshipId } = req.params;

    await FriendsService.rejectFriendRequest(userId, friendshipId);

    res.json({
      success: true,
      message: 'Запрос отклонен'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Удалить из друзей
router.delete('/:friendId', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { friendId } = req.params;

    await FriendsService.removeFriend(userId, friendId);

    res.json({
      success: true,
      message: 'Удалено из друзей'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Получить список друзей
router.get('/list', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const friends = await FriendsService.getFriends(userId);

    res.json({
      success: true,
      friends
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Получить входящие запросы
router.get('/requests', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const requests = await FriendsService.getIncomingRequests(userId);

    res.json({
      success: true,
      requests
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Поиск игроков
router.get('/search', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { q, limit } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Поисковый запрос обязателен'
      });
    }

    const players = await FriendsService.searchPlayers(
      q,
      limit ? parseInt(limit as string) : 10
    );

    res.json({
      success: true,
      players
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

