export interface User {
  id: string;
  name: string;
  isOwner: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
}

export type VoteValue = 0 | 1 | 2 | 3 | 5 | 8 | 13 | 21 | 34 | 55 | '?';

export interface Vote {
  userId: string;
  userName: string;
  value: VoteValue;
}

export type VotingStatus = 'pending' | 'active' | 'completed';

export interface VotingSession {
  id: string;
  taskId: string;
  status: VotingStatus;
  votes: Vote[];
  finalEstimate?: VoteValue;
  createdAt: Date;
  completedAt?: Date;
}

export interface Room {
  id: string;
  name: string;
  ownerId: string;
  ownerPassword: string; // hashed
  tasks: Task[];
  votingHistory: VotingSession[];
  participants: User[];
  currentVotingSession?: VotingSession;
}