import express from 'express';
import { TeamInvitesService } from '../services/teamInvitesService';

const router = express.Router();

// Пригласить игрока в команду
router.post('/invite', async (req, res) => {
  try {
    console.log('📨 POST /api/team-invites/invite - Request received');
    console.log('📦 Request body:', req.body);
    
    const userId = (req.session as any).userId;
    console.log('👤 User ID from session:', userId);
    
    if (!userId) {
      console.log('❌ No user ID in session');
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { teamId, invitedUserId } = req.body;
    console.log('🎯 Invite params:', { teamId, invitedUserId, inviterUserId: userId });

    if (!teamId || !invitedUserId) {
      console.log('❌ Missing required parameters');
      return res.status(400).json({
        success: false,
        error: 'teamId и invitedUserId обязательны'
      });
    }

    console.log('🔄 Calling TeamInvitesService.invitePlayerToTeam...');
    const invite = await TeamInvitesService.invitePlayerToTeam(teamId, invitedUserId, userId);
    console.log('✅ Invite created:', invite);

    res.json({
      success: true,
      message: 'Приглашение отправлено',
      invite
    });
  } catch (error: any) {
    console.error('❌ Error in invite endpoint:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Принять приглашение в команду
router.post('/:inviteId/accept', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { inviteId } = req.params;

    await TeamInvitesService.acceptTeamInvite(userId, inviteId);

    res.json({
      success: true,
      message: 'Приглашение принято, вы добавлены в команду'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Отклонить приглашение в команду
router.post('/:inviteId/reject', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { inviteId } = req.params;

    await TeamInvitesService.rejectTeamInvite(userId, inviteId);

    res.json({
      success: true,
      message: 'Приглашение отклонено'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Получить мои приглашения
router.get('/my-invites', async (req, res) => {
  try {
    console.log('📬 GET /api/team-invites/my-invites - Request received');
    
    const userId = (req.session as any).userId;
    console.log('👤 User ID from session:', userId);
    
    if (!userId) {
      console.log('❌ No user ID in session');
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    console.log('🔍 Loading user invites...');
    const invites = await TeamInvitesService.getUserInvites(userId);
    console.log('📊 Found invites:', invites.length, invites.map(i => ({ id: i.id, teamName: i.teamName, status: i.status })));

    res.json({
      success: true,
      invites
    });
  } catch (error: any) {
    console.error('❌ Error loading invites:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Получить приглашения команды (для капитана)
router.get('/team/:teamId', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { teamId } = req.params;

    const invites = await TeamInvitesService.getTeamInvites(teamId, userId);

    res.json({
      success: true,
      invites
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Отменить приглашение (для капитана)
router.delete('/:inviteId', async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Необходима авторизация'
      });
    }

    const { inviteId } = req.params;

    await TeamInvitesService.cancelTeamInvite(inviteId, userId);

    res.json({
      success: true,
      message: 'Приглашение отменено'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
