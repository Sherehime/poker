import { Socket } from 'socket.io';
import { handleCreateRoom, handleJoinRoom, handleLeaveRoom } from './room.handler.js';
import { handleStartVoting, handleCastVote, handleCompleteVoting } from './voting.handler.js';

export function registerHandlers(io: any, socket: Socket) {
  // Обработчики комнат
  socket.on('room:create', (data: any, callback: any) => {
    handleCreateRoom(socket, data, callback);
  });

  socket.on('room:join', (data: any, callback: any) => {
    handleJoinRoom(socket, data, callback);
  });

  socket.on('room:leave', (data: any) => {
    handleLeaveRoom(socket, data);
  });

  // Обработчики голосования
  socket.on('voting:start', (data: any) => {
    handleStartVoting(socket, data, io);
  });

  socket.on('vote:cast', (data: any) => {
    handleCastVote(socket, data, io);
  });

  socket.on('voting:complete', (data: any) => {
    handleCompleteVoting(socket, data, io);
  });

  // Обработка отключения
  socket.on('disconnect', () => {
    if (socket.data.roomId && socket.data.userId) {
      handleLeaveRoom(socket, {
        roomId: socket.data.roomId,
        userId: socket.data.userId,
      });
    }
  });

  console.log(`Handlers registered for socket ${socket.id}`);
}