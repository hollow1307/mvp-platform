export interface Tournament {
  id: string;
  name: string;
  description: string;
  organizerId: string; // SteamID организатора
  maxTeams: number;
  currentTeams: number;
  status: 'draft' | 'registration' | 'ongoing' | 'completed' | 'cancelled';
  rules: TournamentRules;
  schedule: TournamentSchedule;
  prizePool?: PrizePool;
  createdAt: Date;
  updatedAt: Date;
  // Division убран - теперь все турниры для игроков до 4000 MMR
}

export interface TournamentRules {
  maxMMR: number;
  minMatches: number;
  format: 'single-elimination' | 'double-elimination' | 'round-robin';
  matchRules: {
    seriesType: 'bo1' | 'bo2' | 'bo3' | 'bo5';
    finalSeriesType: 'bo1' | 'bo2' | 'bo3' | 'bo5'; // Отдельно для финала
    allowTies: boolean;
  };
}

export interface TournamentSchedule {
  registrationStart: Date;
  registrationEnd: Date;
  tournamentStart: Date;
  checkinTime: Date;
}

export interface PrizePool {
  total: number;
  distribution: {
    place: number;
    amount: number;
    currency: string;
  }[];
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  captainId: string; // SteamID капитана
  players: TeamPlayer[];
  tournamentId: string;
  joinedAt: Date;
  status: 'registered' | 'checked-in' | 'disqualified';
}

export interface TeamPlayer {
  steamId: string;
  username: string;
  avatar: string;
  isCaptain: boolean;
  joinDate: Date;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  teamAId?: string;
  teamBId?: string;
  winnerId?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  seriesType: 'bo1' | 'bo2' | 'bo3' | 'bo5';
  games: Game[];
  scheduledTime?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Game {
  gameNumber: number;
  winnerId?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
}