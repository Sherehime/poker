import { makeAutoObservable, runInAction } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
import type { Room, User, Task, VotingSession } from '../types';
import { storage } from '../utils/storage';

export class RoomStore {
  rooms: Room[] = [];
  currentRoom: Room | null = null;
  currentUser: User | null = null;

  constructor() {
    makeAutoObservable(this);
    this.loadFromStorage();
  }

  // Загрузка данных из localStorage
  private loadFromStorage() {
    runInAction(() => {
      this.rooms = storage.getRooms();
      const currentUserData = storage.getCurrentUser();
      
      if (currentUserData) {
        const room = this.getRoomById(currentUserData.roomId);
        if (room) {
          this.currentRoom = room;
          const user = room.participants.find(p => p.id === currentUserData.userId);
          if (user) {
            this.currentUser = user;
          }
        }
      }
    });
  }

  // Получить комнату по ID
  getRoomById(roomId: string): Room | undefined {
    return this.rooms.find(room => room.id === roomId);
  }

  // Создать новую комнату
  createRoom(name: string, ownerName: string, ownerPassword: string, tasks: Omit<Task, 'id'>[]): Room {
    const roomId = uuidv4();
    const ownerId = uuidv4();
    
    const room: Room = {
      id: roomId,
      name,
      ownerId,
      ownerPassword, // TODO: хэшировать пароль
      tasks: tasks.map(task => ({ ...task, id: uuidv4() })),
      votingHistory: [],
      participants: [{
        id: ownerId,
        name: ownerName,
        isOwner: true,
      }],
    };

    runInAction(() => {
      this.rooms.push(room);
      storage.saveRooms(this.rooms);
    });

    return room;
  }

  // Присоединиться к комнате как участник
  joinRoom(roomId: string, userName: string): Room | null {
    const room = this.getRoomById(roomId);
    if (!room) return null;

    if (room.participants.length >= 10) {
      throw new Error('Максимум 10 участников в комнате');
    }

    const newUser: User = {
      id: uuidv4(),
      name: userName,
      isOwner: false,
    };

    runInAction(() => {
      room.participants.push(newUser);
      storage.saveRooms(this.rooms);
    });

    return room;
  }

  // Проверить пароль Owner
  verifyOwnerPassword(roomId: string, password: string): boolean {
    const room = this.getRoomById(roomId);
    return room ? room.ownerPassword === password : false;
  }

  // Установить текущего пользователя
  setCurrentUser(roomId: string, userId: string, isOwner: boolean) {
    const room = this.getRoomById(roomId);
    if (!room) return;

    const user = room.participants.find(p => p.id === userId);
    if (!user) return;

    runInAction(() => {
      this.currentRoom = room;
      this.currentUser = user;
      storage.saveCurrentUser(roomId, userId, isOwner);
    });
  }

  // Выйти из комнаты
  leaveRoom() {
    runInAction(() => {
      this.currentRoom = null;
      this.currentUser = null;
      storage.clearCurrentUser();
    });
  }

  // Создать сессию голосования
  createVotingSession(taskId: string): void {
    if (!this.currentRoom || !this.currentUser?.isOwner) return;

    const session: VotingSession = {
      id: uuidv4(),
      taskId,
      status: 'active',
      votes: [],
      createdAt: new Date(),
    };

    runInAction(() => {
      if (this.currentRoom) {
        this.currentRoom.currentVotingSession = session;
        storage.saveRooms(this.rooms);
      }
    });
  }

  // Проголосовать
  vote(taskId: string, value: number | '?'): void {
    if (!this.currentRoom || !this.currentUser) return;
    const session = this.currentRoom.currentVotingSession;
    if (!session || session.taskId !== taskId) return;

    runInAction(() => {
      const existingVoteIndex = session.votes.findIndex(v => v.userId === this.currentUser!.id);
      
      const vote = {
        userId: this.currentUser!.id,
        userName: this.currentUser!.name,
        value: value as any,
      };

      if (existingVoteIndex >= 0) {
        session.votes[existingVoteIndex] = vote;
      } else {
        session.votes.push(vote);
      }

      storage.saveRooms(this.rooms);
    });
  }

  // Завершить голосование и раскрыть результаты
  completeVoting(): void {
    if (!this.currentRoom || !this.currentUser?.isOwner) return;
    const session = this.currentRoom.currentVotingSession;
    if (!session || session.status !== 'active') return;

    runInAction(() => {
      session.status = 'completed';
      session.completedAt = new Date();
      
      // Подсчёт средней оценки (исключая '?')
      const numericVotes = session.votes.filter(v => v.value !== '?').map(v => v.value as number);
      if (numericVotes.length > 0) {
        const sum = numericVotes.reduce((a, b) => a + b, 0);
        const avg = sum / numericVotes.length;
        // Округляем до ближайшего числа Фибоначчи
        const fibSequence = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55];
        session.finalEstimate = fibSequence.reduce((prev, curr) =>
          Math.abs(curr - avg) < Math.abs(prev - avg) ? curr : prev
        ) as any;
      }

      if (this.currentRoom) {
        this.currentRoom.votingHistory.push(session);
        this.currentRoom.currentVotingSession = undefined;
        storage.saveRooms(this.rooms);
      }
    });
  }
}

export const roomStore = new RoomStore();