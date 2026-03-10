// Типы данных для WebSocket сервера

export interface Room {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerPassword: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  createdAt: Date;
}

export interface Participant {
  id: string;
  roomId: string;
  name: string;
  isOwner: boolean;
  joinedAt: Date;
}

export interface VotingSession {
  id: string;
  roomId: string;
  taskId: string;
  status: 'active' | 'completed';
  finalEstimate?: number | '?';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // в секундах
}

export interface Vote {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  value: number | '?';
  createdAt: Date;
}

// Запросы от клиента
export interface CreateRoomRequest {
  name: string;
  ownerName: string;
  ownerPassword: string;
  tasks: Array<{
    title: string;
    description?: string;
  }>;
}

export interface JoinRoomRequest {
  roomId: string;
  name: string;
  isOwner?: boolean;
  password?: string;
}

export interface StartVotingRequest {
  roomId: string;
  taskId: string;
}

export interface CastVoteRequest {
  roomId: string;
  taskId: string;
  value: number | '?';
  userId: string;
  userName: string;
}

export interface CompleteVotingRequest {
  roomId: string;
}

// Ответы сервера
export interface CreateRoomResponse {
  room: Room;
  tasks: Task[];
  user: Participant;
  roomId: string;
  userId: string;
}

export interface JoinRoomResponse {
  room: Room;
  tasks: Task[];
  participants: Participant[];
  currentSession?: VotingSession;
  votingHistory: Array<{
    session: VotingSession;
    votes: Vote[];
  }>;
  user: Participant;
  userId: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

// События Socket.io
export type ServerToClientEvents = {
  'room:created': (data: CreateRoomResponse) => void;
  'room:joined': (data: JoinRoomResponse) => void;
  'room:updated': (room: Room) => void;
  'participant:joined': (participant: Participant) => void;
  'voting:started': (session: VotingSession) => void;
  'vote:received': (vote: { userId: string; userName: string }) => void;
  'voting:completed': (data: {
    session: VotingSession;
    votes: Vote[];
    finalEstimate: number | '?';
  }) => void;
  'error': (data: ErrorResponse) => void;
};

export type ClientToServerEvents = {
  'room:create': (data: CreateRoomRequest) => void;
  'room:join': (data: JoinRoomRequest) => void;
  'room:leave': (data: { roomId: string; userId: string }) => void;
  'voting:start': (data: StartVotingRequest) => void;
  'vote:cast': (data: CastVoteRequest) => void;
  'voting:complete': (data: CompleteVotingRequest) => void;
};