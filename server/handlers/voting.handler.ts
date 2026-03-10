import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { StartVotingRequest, CastVoteRequest, CompleteVotingRequest, CancelVotingRequest } from '../types.js';
import * as db from '../db.js';

// Числа Фибоначчи для покер-планирования
const FIBONACCI_NUMBERS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55];

// Округление до ближайшего числа Фибоначчи
function roundToFibonacci(value: number): number {
  if (value === 0) return 0;
  
  let closest = FIBONACCI_NUMBERS[0];
  let minDiff = Math.abs(value - closest);
  
  for (const num of FIBONACCI_NUMBERS) {
    const diff = Math.abs(value - num);
    if (diff < minDiff) {
      minDiff = diff;
      closest = num;
    }
  }
  
  return closest;
}

// Обработчик запуска голосования
export async function handleStartVoting(
  socket: Socket,
  data: StartVotingRequest,
  io: any
) {
  try {
    // Проверяем, что пользователь является owner
    if (!socket.data.isOwner) {
      return socket.emit('error', { error: 'Только owner может запускать голосование' });
    }

    // Проверяем существование комнаты
    const roomData = db.getRoom(data.roomId);
    if (!roomData) {
      return socket.emit('error', { error: 'Комната не найдена' });
    }

    // Проверяем, что нет активного голосования
    const activeSession = db.getActiveSession(data.roomId);
    if (activeSession) {
      return socket.emit('error', { error: 'Уже есть активное голосование' });
    }

    // Создаём сессию голосования
    const sessionId = uuidv4();
    db.createVotingSession({
      id: sessionId,
      roomId: data.roomId,
      taskId: data.taskId,
    });

    const sessionData = db.getActiveSession(data.roomId);
    if (!sessionData) {
      return socket.emit('error', { error: 'Не удалось создать сессию голосования' });
    }

    console.log('📦 sessionData from DB:', JSON.stringify(sessionData, null, 2));

    const session = {
      id: sessionData.id,
      roomId: sessionData.room_id,
      taskId: sessionData.task_id,
      status: sessionData.status as 'active' | 'completed',
      finalEstimate: sessionData.final_estimate,
      createdAt: new Date(sessionData.created_at),
      startedAt: sessionData.started_at ? new Date(sessionData.started_at) : undefined,
      completedAt: sessionData.completed_at ? new Date(sessionData.completed_at) : undefined,
    };

    console.log('🚀 Emitting voting:started to room', data.roomId);
    console.log('  Session object:', JSON.stringify(session, null, 2));
    
    // Проверяем кто в комнате
    const room = io.sockets.adapter.rooms.get(data.roomId);
    console.log('👥 Participants in room:', room ? room.size : 0, 'sockets');
    const socketsInRoom = room ? Array.from(room) : [];
    console.log('🔌 Socket IDs in room:', socketsInRoom);
    
    // Оповещаем всех участников о старте голосования
    io.to(data.roomId).emit('voting:started', session);
    console.log(`✅ Голосование запущено в комнате ${data.roomId} для задачи ${data.taskId}`);
  } catch (error) {
    console.error('Error starting voting:', error);
    socket.emit('error', { error: 'Failed to start voting' });
  }
}

// Обработчик голосования
export async function handleCastVote(
  socket: Socket,
  data: CastVoteRequest,
  io: any
) {
  try {
    // Проверяем существование активной сессии
    const sessionData = db.getActiveSession(data.roomId);
    if (!sessionData) {
      return socket.emit('error', { error: 'Нет активного голосования' });
    }

    // Проверяем, что задача совпадает
    if (sessionData.task_id !== data.taskId) {
      return socket.emit('error', { error: 'Задача не совпадает с активным голосованием' });
    }

    // Проверяем, что пользователь ещё не голосовал
    const hasVoted = db.hasUserVoted(sessionData.id, data.userId);
    if (hasVoted) {
      return socket.emit('error', { error: 'Вы уже проголосовали' });
    }

    // Создаём голос
    const voteId = uuidv4();
    const valueStr = data.value === '?' ? '?' : data.value.toString();
    
    db.createVote({
      id: voteId,
      sessionId: sessionData.id,
      userId: data.userId,
      userName: data.userName,
      value: valueStr,
    });

    // Оповещаем всех о новом голосе (без раскрытия значения)
    io.to(data.roomId).emit('vote:received', {
      userId: data.userId,
      userName: data.userName,
    });

    console.log(`Пользователь ${data.userName} проголосовал в комнате ${data.roomId}`);
  } catch (error) {
    console.error('Error casting vote:', error);
    socket.emit('error', { error: 'Failed to cast vote' });
  }
}

// Обработчик завершения голосования
export async function handleCompleteVoting(
  socket: Socket,
  data: CompleteVotingRequest,
  io: any
) {
  try {
    // Проверяем, что пользователь является owner
    if (!socket.data.isOwner) {
      return socket.emit('error', { error: 'Только owner может завершать голосование' });
    }

    // Проверяем существование активной сессии
    const sessionData = db.getActiveSession(data.roomId);
    if (!sessionData) {
      return socket.emit('error', { error: 'Нет активного голосования' });
    }

    // Получаем все голоса
    const votes = db.getVotesBySession(sessionData.id);

    // Проверяем, что все участники проголосовали
    const participants = db.getParticipantsByRoom(data.roomId);
    const allVoted = votes.length === participants.length;

    if (!allVoted) {
      return socket.emit('error', { error: 'Не все участники проголосовали' });
    }

    // Вычисляем длительность голосования
    const startedAt = sessionData.started_at ? new Date(sessionData.started_at) : new Date(sessionData.created_at);
    const completedAt = new Date();
    const duration = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000); // в секундах

    // Вычисляем итоговую оценку
    const numericVotes = votes
      .map(v => v.value)
      .filter(v => v !== '?')
      .map(v => parseFloat(v));

    let finalEstimate: number | '?' = '?';

    if (numericVotes.length > 0) {
      // Убираем выбросы (минимум и максимум) если голосов больше 2
      let sortedVotes = [...numericVotes].sort((a, b) => a - b);
      if (sortedVotes.length > 2) {
        sortedVotes = sortedVotes.slice(1, -1);
      }

      // Считаем среднее
      const average = sortedVotes.reduce((sum, v) => sum + v, 0) / sortedVotes.length;
      finalEstimate = roundToFibonacci(average);
    }

    // Обновляем сессию
    db.completeSession(sessionData.id, finalEstimate.toString(), duration);

    // Формируем ответ
    const completedSession = {
      id: sessionData.id,
      roomId: sessionData.room_id,
      taskId: sessionData.task_id,
      status: 'completed' as const,
      finalEstimate,
      createdAt: new Date(sessionData.created_at),
      startedAt: sessionData.started_at ? new Date(sessionData.started_at) : new Date(sessionData.created_at),
      completedAt: new Date(),
      duration,
    };

    const response = {
      session: completedSession,
      votes: votes.map(v => ({
        id: v.id,
        sessionId: v.session_id,
        userId: v.user_id,
        userName: v.user_name,
        value: v.value === '?' ? '?' : parseFloat(v.value),
        createdAt: new Date(v.created_at),
      })),
      finalEstimate,
    };

    // Оповещаем всех о завершении голосования
    io.to(data.roomId).emit('voting:completed', response);
    console.log(`Голосование завершено в комнате ${data.roomId}. Итоговая оценка: ${finalEstimate}`);
  } catch (error) {
    console.error('Error completing voting:', error);
    socket.emit('error', { error: 'Failed to complete voting' });
  }
}

// Обработчик отмены голосования
export async function handleCancelVoting(
  socket: Socket,
  data: CancelVotingRequest,
  io: any
) {
  try {
    // Проверяем, что пользователь является owner
    if (!socket.data.isOwner) {
      return socket.emit('error', { error: 'Только owner может отменять голосование' });
    }

    // Проверяем существование активной сессии
    const sessionData = db.getActiveSession(data.roomId);
    if (!sessionData) {
      return socket.emit('error', { error: 'Нет активного голосования' });
    }

    // Отменяем сессию
    db.cancelSession(sessionData.id);

    // Оповещаем всех об отмене голосования
    io.to(data.roomId).emit('voting:cancelled', {
      sessionId: sessionData.id,
      taskId: sessionData.task_id,
    });
    console.log(`Голосование отменено в комнате ${data.roomId}`);
  } catch (error) {
    console.error('Error cancelling voting:', error);
    socket.emit('error', { error: 'Failed to cancel voting' });
  }
}
