import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateRoomRequest,
  JoinRoomRequest,
  CreateRoomResponse,
  JoinRoomResponse,
} from '../types.js';
import * as db from '../db.js';

// Обработчик создания комнаты
export async function handleCreateRoom(
  socket: Socket,
  data: CreateRoomRequest,
  callback: (response: CreateRoomResponse | { error: string }) => void
) {
  try {
    const roomId = uuidv4();
    const ownerId = uuidv4();

    // Создаём комнату
    db.createRoom({
      id: roomId,
      name: data.name,
      ownerId,
      ownerName: data.ownerName,
      ownerPassword: data.ownerPassword,
    });

    // Создаём задачи
    const tasks = data.tasks.map((task) => {
      const taskId = uuidv4();
      db.createTask({
        id: taskId,
        roomId,
        title: task.title,
        description: task.description,
      });
      return {
        id: taskId,
        roomId,
        title: task.title,
        description: task.description,
        createdAt: new Date(),
      };
    });

    // Создаём owner как участника
    db.createParticipant({
      id: ownerId,
      roomId,
      name: data.ownerName,
      isOwner: true,
    });

    // Подключаем socket к комнате
    socket.join(roomId);

    // Получаем данные комнаты
    const roomData = db.getRoom(roomId);
    if (!roomData) throw new Error('Failed to create room');

    const response: CreateRoomResponse = {
      room: {
        ...roomData,
        createdAt: new Date(roomData.created_at),
      },
      tasks,
      user: {
        id: ownerId,
        roomId,
        name: data.ownerName,
        isOwner: true,
        joinedAt: new Date(),
      },
      roomId,
      userId: ownerId,
    };

    // Сохраняем данные в socket для будущих обращений
    socket.data.userId = ownerId;
    socket.data.roomId = roomId;
    socket.data.isOwner = true;

    callback(response);
    console.log(`Комната создана: ${roomId} owner: ${data.ownerName}`);
  } catch (error) {
    console.error('Error creating room:', error);
    callback({ error: 'Failed to create room' });
  }
}

// Обработчик входа в комнату
export async function handleJoinRoom(
  socket: Socket,
  data: JoinRoomRequest,
  callback: (response: JoinRoomResponse | { error: string }) => void
) {
  try {
    // Проверяем существование комнаты
    const roomData = db.getRoom(data.roomId);
    if (!roomData) {
      return callback({ error: 'Комната не найдена' });
    }

    // Если входит owner
    if (data.isOwner) {
      if (data.password !== roomData.owner_password) {
        return callback({ error: 'Неверный пароль' });
      }

      // Owner уже был создан при создании комнаты
      const participant = {
        id: roomData.owner_id,
        roomId: data.roomId,
        name: roomData.owner_name,
        isOwner: true,
        joinedAt: new Date(roomData.created_at),
      };

      socket.join(data.roomId);
      socket.data.userId = roomData.owner_id;
      socket.data.roomId = data.roomId;
      socket.data.isOwner = true;

      // Получаем все данные комнаты
      const tasks = db.getTasksByRoom(data.roomId);
      const participants = db.getParticipantsByRoom(data.roomId);
      const currentSession = db.getActiveSession(data.roomId);
      const completedSessions = db.getCompletedSessions(data.roomId);

      // Формируем историю голосований с голосами
      const votingHistory = await Promise.all(
        completedSessions.map(async (session) => {
          const votes = db.getVotesBySession(session.id);
          return {
            session: {
              ...session,
              createdAt: new Date(session.created_at),
              completedAt: session.completed_at ? new Date(session.completed_at) : undefined,
            },
            votes,
          };
        })
      );

      const response: JoinRoomResponse = {
        room: {
          ...roomData,
          createdAt: new Date(roomData.created_at),
        },
        tasks: tasks.map((t) => ({
          ...t,
          createdAt: new Date(t.created_at),
        })),
        participants: participants.map((p) => ({
          ...p,
          isOwner: p.is_owner === 1,
          joinedAt: new Date(p.joined_at),
        })),
        currentSession: currentSession
          ? {
              ...currentSession,
              createdAt: new Date(currentSession.created_at),
              completedAt: currentSession.completed_at
                ? new Date(currentSession.completed_at)
                : undefined,
            }
          : undefined,
        votingHistory,
        user: participant,
        userId: roomData.owner_id,
      };

      callback(response);
      console.log(`Owner вошёл в комнату: ${data.roomId}`);
      return;
    }

    // Если входит обычный участник
    const participantCount = db.getParticipantCount(data.roomId);
    if (participantCount >= 10) {
      return callback({ error: 'Комната заполнена (максимум 10 человек)' });
    }

    const userId = uuidv4();

    // Создаём участника
    db.createParticipant({
      id: userId,
      roomId: data.roomId,
      name: data.name,
      isOwner: false,
    });

    const participant = {
      id: userId,
      roomId: data.roomId,
      name: data.name,
      isOwner: false,
      joinedAt: new Date(),
    };

    socket.join(data.roomId);
    socket.data.userId = userId;
    socket.data.roomId = data.roomId;
    socket.data.isOwner = false;

    // Получаем все данные комнаты
    const tasks = db.getTasksByRoom(data.roomId);
    const participants = db.getParticipantsByRoom(data.roomId);
    const currentSession = db.getActiveSession(data.roomId);
    const completedSessions = db.getCompletedSessions(data.roomId);

    // Формируем историю голосований с голосами
    const votingHistory = await Promise.all(
      completedSessions.map(async (session) => {
        const votes = db.getVotesBySession(session.id);
        return {
          session: {
            ...session,
            createdAt: new Date(session.created_at),
            completedAt: session.completed_at ? new Date(session.completed_at) : undefined,
          },
          votes,
        };
      })
    );

    const response: JoinRoomResponse = {
      room: {
        ...roomData,
        createdAt: new Date(roomData.created_at),
      },
      tasks: tasks.map((t) => ({
        ...t,
        createdAt: new Date(t.created_at),
      })),
      participants: participants.map((p) => ({
        ...p,
        isOwner: p.is_owner === 1,
        joinedAt: new Date(p.joined_at),
      })),
      currentSession: currentSession
        ? {
            ...currentSession,
            createdAt: new Date(currentSession.created_at),
            completedAt: currentSession.completed_at
              ? new Date(currentSession.completed_at)
              : undefined,
          }
        : undefined,
      votingHistory,
      user: participant,
      userId,
    };

    callback(response);

    // Оповещаем всех в комнате о новом участнике
    socket.to(data.roomId).emit('participant:joined', participant);
    console.log(`Участник ${data.name} вошёл в комнату: ${data.roomId}`);
  } catch (error) {
    console.error('Error joining room:', error);
    callback({ error: 'Failed to join room' });
  }
}

// Обработчик выхода из комнаты
export async function handleLeaveRoom(
  socket: Socket,
  data: { roomId: string; userId: string }
) {
  try {
    // Удаляем участника из БД (если не owner)
    const roomData = db.getRoom(data.roomId);
    if (roomData && data.userId !== roomData.owner_id) {
      db.deleteParticipant(data.userId);
    }

    socket.leave(data.roomId);
    socket.data.userId = undefined;
    socket.data.roomId = undefined;
    socket.data.isOwner = undefined;

    console.log(`Пользователь ${data.userId} покинул комнату: ${data.roomId}`);
  } catch (error) {
    console.error('Error leaving room:', error);
  }
}