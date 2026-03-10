import { makeAutoObservable, runInAction } from 'mobx';
import { socketService } from '../services/socket';
import type { Room, User, Task, VotingSession, VoteValue } from '../types';

export class RoomStore {
  currentRoom: Room | null = null;
  currentUser: User | null = null;
  currentVotingSession: VotingSession | null = null;
  votingHistory: VotingSession[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
    this.setupSocketListeners();
  }

  // Настройка слушателей WebSocket событий
  private setupSocketListeners() {
    socketService.onParticipantJoined((participant) => {
      runInAction(() => {
        if (this.currentRoom) {
          const exists = this.currentRoom.participants.find(p => p.id === participant.id);
          if (!exists) {
            this.currentRoom.participants.push(participant);
          }
        }
      });
    });

    socketService.onVotingStarted((session) => {
      runInAction(() => {
        this.currentVotingSession = {
          id: session.id,
          taskId: session.taskId,
          status: session.status,
          votes: [],
          createdAt: session.createdAt,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
        };
      });
    });

    socketService.onVoteReceived((vote) => {
      runInAction(() => {
        if (this.currentVotingSession) {
          const existingVote = this.currentVotingSession.votes.find(v => v.userId === vote.userId);
          if (!existingVote) {
            this.currentVotingSession.votes.push({
              userId: vote.userId,
              userName: vote.userName,
              value: '?', // Скрываем значение до завершения
            });
          }
        }
      });
    });

        socketService.onVotingCompleted((data) => {
      runInAction(() => {
        this.currentVotingSession = {
          id: data.session.id,
          taskId: data.session.taskId,
          status: data.session.status,
          votes: data.votes.map(v => ({
            userId: v.userId,
            userName: v.userName,
            value: v.value as VoteValue,
          })),
          finalEstimate: data.finalEstimate as VoteValue,
          createdAt: data.session.createdAt,
          startedAt: data.session.startedAt,
          completedAt: data.session.completedAt,
          duration: data.session.duration,
        };

        // Добавляем в историю
        if (this.currentVotingSession) {
          this.votingHistory.unshift(this.currentVotingSession);
        }
      });
    });

    socketService.onError((error) => {
      runInAction(() => {
        this.error = error.message || 'Произошла ошибка';
      });
    });
  }

  // Создать новую комнату через WebSocket
  async createRoom(name: string, ownerName: string, ownerPassword: string, tasks: Omit<Task, 'id'>[]): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await socketService.createRoom({
        name,
        ownerName,
        ownerPassword,
        tasks: tasks.map(t => ({
          title: t.title,
          description: t.description,
        })),
      });

      runInAction(() => {
        this.currentRoom = {
          id: response.roomId,
          name: response.room.name,
          ownerId: response.room.ownerId,
          ownerPassword: response.room.ownerPassword,
          tasks: response.tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
          })),
          participants: [response.user],
          votingHistory: [],
        };

        this.currentUser = response.user;
        this.isLoading = false;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Не удалось создать комнату';
        this.isLoading = false;
      });
      throw err;
    }
  }

  // Присоединиться к комнате через WebSocket
  async joinRoom(roomId: string, userName: string, isOwner: boolean = false, password?: string): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      // Переустанавливаем слушатели перед подключением
      this.setupSocketListeners();
      
      const response = await socketService.joinRoom({
        roomId,
        name: userName,
        isOwner,
        password,
      });

      runInAction(() => {
        this.currentRoom = {
          id: response.room.id,
          name: response.room.name,
          ownerId: response.room.ownerId,
          ownerPassword: response.room.ownerPassword,
          tasks: response.tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
          })),
          participants: response.participants,
          votingHistory: response.votingHistory.map(h => ({
            id: h.session.id,
            taskId: h.session.taskId,
            status: h.session.status,
            votes: h.votes.map(v => ({
              userId: v.userId,
              userName: v.userName,
              value: (v.value === '?' ? '?' : v.value) as VoteValue,
            })),
            finalEstimate: h.session.finalEstimate as VoteValue,
            createdAt: h.session.createdAt,
            startedAt: h.session.startedAt,
            completedAt: h.session.completedAt,
            duration: h.session.duration,
          })),
        };

        this.currentUser = response.user;
        this.votingHistory = this.currentRoom.votingHistory;

        if (response.currentSession) {
          this.currentVotingSession = {
            id: response.currentSession.id,
            taskId: response.currentSession.taskId,
            status: response.currentSession.status,
            votes: [],
            createdAt: response.currentSession.createdAt,
            startedAt: response.currentSession.startedAt,
            completedAt: response.currentSession.completedAt,
          };
        }

        this.isLoading = false;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Не удалось присоединиться к комнате';
        this.isLoading = false;
      });
      throw err;
    }
  }

  // Выйти из комнаты
  leaveRoom() {
    if (this.currentRoom && this.currentUser) {
      socketService.leaveRoom({
        roomId: this.currentRoom.id,
        userId: this.currentUser.id,
      });
    }

    runInAction(() => {
      this.currentRoom = null;
      this.currentUser = null;
      this.currentVotingSession = null;
      this.votingHistory = [];
      this.error = null;
    });
  }

  // Запустить голосование
  startVoting(taskId: string) {
    if (!this.currentRoom || !this.currentUser?.isOwner) {
      throw new Error('Только owner может запускать голосование');
    }

    socketService.startVoting({
      roomId: this.currentRoom.id,
      taskId,
    });
  }

  // Проголосовать
  vote(taskId: string, value: number | '?') {
    if (!this.currentRoom || !this.currentUser) return;

    socketService.castVote({
      roomId: this.currentRoom.id,
      taskId,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      value,
    });
  }

  // Завершить голосование
  completeVoting() {
    if (!this.currentRoom || !this.currentUser?.isOwner) {
      throw new Error('Только owner может завершать голосование');
    }

    socketService.completeVoting({
      roomId: this.currentRoom.id,
    });
  }

  // Проверить, проголосовал ли текущий пользователь
  hasVoted(): boolean {
    if (!this.currentVotingSession || !this.currentUser) return false;
    return this.currentVotingSession.votes.some(v => v.userId === this.currentUser!.id);
  }

  // Получить ссылку для приглашения в комнату
  getInviteLink(): string {
    if (!this.currentRoom) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/room/${this.currentRoom.id}`;
  }
}

export const roomStore = new RoomStore();