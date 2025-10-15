export interface Team {
  id: string;
  name: string;
  tag: string;
  captainId: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'disbanded';
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    rating: number;
  };
  members: TeamMember[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  steamConnectionId: string;
  joinDate: Date;
  role: 'captain' | 'player' | 'substitute' | 'coach';
  isActive: boolean;
  username?: string; // Добавляем поля для отображения
  steamUsername?: string;
  avatarUrl?: string;
  rankTier?: number;
  rankName?: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  invitedUserId: string;
  invitedByUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

// Дополнительный интерфейс для отображения расширенной информации
export interface TeamMemberWithDetails extends TeamMember {
  username: string;
  steamUsername: string;
  avatarUrl: string;
  rankTier?: number;
  rankName?: string;
}