// Модели для системы друзей

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

export interface FriendWithDetails extends Friendship {
  friendUsername: string;
  friendSteamId?: string;
  friendAvatarUrl?: string;
  friendRankTier?: number;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  invitedUserId: string;
  invitedByUserId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

export interface TeamInviteWithDetails extends TeamInvite {
  teamName: string;
  teamTag: string;
  invitedByUsername: string;
  invitedUsername: string;
}

