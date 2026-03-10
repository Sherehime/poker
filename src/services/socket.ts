import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  StartVotingRequest,
  CastVoteRequest,
  CompleteVotingRequest,
  CancelVotingRequest,
} from '../../server/types.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private listeners: Map<string, Function> = new Map();

  // Подключение к серверу
  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Подключено к WebSocket серверу');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Отключено от WebSocket сервера:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket ошибка:', error);
    });

    return this.socket;
  }

  // Отключение от сервера
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Получить экземпляр сокета
  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  // Создание комнаты
  createRoom(data: CreateRoomRequest): Promise<CreateRoomResponse> {
    return new Promise((resolve, reject) => {
      const socket = this.getSocket();
      const socketWithAck = socket as any; // Temporarily bypass strict typing
      socketWithAck.emit('room:create', data, (response: CreateRoomResponse | { error: string }) => {
        if ('error' in response) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Вход в комнату
  joinRoom(data: JoinRoomRequest): Promise<JoinRoomResponse> {
    return new Promise((resolve, reject) => {
      const socket = this.getSocket();
      const socketWithAck = socket as any; // Temporarily bypass strict typing
      socketWithAck.emit('room:join', data, (response: JoinRoomResponse | { error: string }) => {
        if ('error' in response) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Выход из комнаты
  leaveRoom(data: { roomId: string; userId: string }) {
    const socket = this.getSocket();
    socket.emit('room:leave', data);
  }

  // Запуск голосования
  startVoting(data: StartVotingRequest) {
    const socket = this.getSocket();
    socket.emit('voting:start', data);
  }

  // Голосование
  castVote(data: CastVoteRequest) {
    const socket = this.getSocket();
    socket.emit('vote:cast', data);
  }

  // Завершение голосования
  completeVoting(data: CompleteVotingRequest) {
    const socket = this.getSocket();
    socket.emit('voting:complete', data);
  }

  // Отмена голосования
  cancelVoting(data: CancelVotingRequest) {
    const socket = this.getSocket();
    socket.emit('voting:cancel', data);
  }

  // Подписка на события сервера

  onRoomUpdated(callback: (room: any) => void) {
    const socket = this.getSocket();
    const oldCallback = this.listeners.get('room:updated');
    if (oldCallback) {
      socket.off('room:updated', oldCallback as any);
    }
    this.listeners.set('room:updated', callback);
    socket.on('room:updated', callback);
  }

  onParticipantJoined(callback: (participant: any) => void) {
    const socket = this.getSocket();
    const oldCallback = this.listeners.get('participant:joined');
    if (oldCallback) {
      socket.off('participant:joined', oldCallback as any);
    }
    this.listeners.set('participant:joined', callback);
    socket.on('participant:joined', callback);
  }

  onVotingStarted(callback: (session: any) => void) {
    console.log('🔌 Registering onVotingStarted listener');
    const socket = this.getSocket();
    const oldCallback = this.listeners.get('voting:started');
    if (oldCallback) {
      socket.off('voting:started', oldCallback as any);
    }
    this.listeners.set('voting:started', callback);
    socket.on('voting:started', callback);
    console.log('✅ onVotingStarted registered');
  }

  onVoteReceived(callback: (vote: { userId: string; userName: string }) => void) {
    const socket = this.getSocket();
    const oldCallback = this.listeners.get('vote:received');
    if (oldCallback) {
      socket.off('vote:received', oldCallback as any);
    }
    this.listeners.set('vote:received', callback);
    socket.on('vote:received', callback);
  }

  onVotingCompleted(callback: (data: {
    session: any;
    votes: any[];
    finalEstimate: number | '?';
  }) => void) {
    const socket = this.getSocket();
    const oldCallback = this.listeners.get('voting:completed');
    if (oldCallback) {
      socket.off('voting:completed', oldCallback as any);
    }
    this.listeners.set('voting:completed', callback);
    socket.on('voting:completed', callback);
  }

  onVotingCancelled(callback: (data: { sessionId: string; taskId: string }) => void) {
    const socket = this.getSocket();
    const oldCallback = this.listeners.get('voting:cancelled');
    if (oldCallback) {
      socket.off('voting:cancelled', oldCallback as any);
    }
    this.listeners.set('voting:cancelled', callback);
    socket.on('voting:cancelled', callback);
  }

  onError(callback: (error: any) => void) {
    const socket = this.getSocket();
    const oldCallback = this.listeners.get('error');
    if (oldCallback) {
      socket.off('error', oldCallback as any);
    }
    this.listeners.set('error', callback);
    socket.on('error', callback);
  }

  // Отписка от событий
  removeAllListeners() {
    const socket = this.getSocket();
    this.listeners.clear();
    socket.removeAllListeners();
  }
}

// Экспорт singleton инстанса
export const socketService = new SocketService();