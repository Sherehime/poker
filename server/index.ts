import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initDatabase } from './db.js';
import { registerHandlers } from './handlers/index.js';
import type { ServerToClientEvents, ClientToServerEvents } from './types.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Инициализация базы данных и запуск сервера
async function startServer() {
  try {
    console.log('Инициализация базы данных...');
    await initDatabase();
    console.log('База данных готова');

    io.on('connection', (socket) => {
      console.log(`Клиент подключён: ${socket.id}`);

      // Регистрируем обработчики событий
      registerHandlers(io, socket);

      socket.on('disconnect', () => {
        console.log(`Клиент отключён: ${socket.id}`);
      });
    });

    httpServer.listen(PORT, () => {
      console.log(``);
      console.log(`🚀 WebSocket сервер запущен`);
      console.log(`📡 Порт: ${PORT}`);
      console.log(`🔗 URL: http://localhost:${PORT}`);
      console.log(``);
    });
  } catch (error) {
    console.error('Ошибка при запуске сервера:', error);
    process.exit(1);
  }
}

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Запуск сервера
startServer();