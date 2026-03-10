import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'poker.db');

let db: Database | null = null;

// Инициализация базы данных
export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  // Загружаем существующую БД или создаем новую
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('База данных загружена из файла');
  } else {
    db = new SQL.Database();
    createTables(db);
    saveDatabase();
    console.log('Создана новая база данных');
  }

  return db;
}

// Создание таблиц
function createTables(database: Database) {
  // Таблица комнат
  database.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      owner_password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Таблица задач
  database.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )
  `);

  // Таблица участников
  database.run(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_owner INTEGER DEFAULT 0,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )
  `);

  // Таблица сессий голосования
  database.run(`
    CREATE TABLE IF NOT EXISTS voting_sessions (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      final_estimate TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    )
  `);

  // Таблица голосов
  database.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES voting_sessions(id)
    )
  `);

  console.log('Таблицы созданы');
}

// Сохранение базы данных в файл
export function saveDatabase() {
  if (!db) throw new Error('Database not initialized');
  
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

// Вспомогательные функции для работы с БД
export function dbRun(sql: string, params: any[] = []): void {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  saveDatabase();
}

export function dbGet<T>(sql: string, params: any[] = []): T | null {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const result = stmt.getAsObject() as T;
  stmt.free();
  return result || null;
}

export function dbAll<T>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

// Функции CRUD

// Комнаты
export function createRoom(room: {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerPassword: string;
}) {
  dbRun(
    'INSERT INTO rooms (id, name, owner_id, owner_name, owner_password) VALUES (?, ?, ?, ?, ?)',
    [room.id, room.name, room.ownerId, room.ownerName, room.ownerPassword]
  );
}

export function getRoom(roomId: string) {
  return dbGet<any>('SELECT * FROM rooms WHERE id = ?', [roomId]);
}

// Задачи
export function createTask(task: {
  id: string;
  roomId: string;
  title: string;
  description?: string;
}) {
  dbRun(
    'INSERT INTO tasks (id, room_id, title, description) VALUES (?, ?, ?, ?)',
    [task.id, task.roomId, task.title, task.description || null]
  );
}

export function getTasksByRoom(roomId: string) {
  return dbAll<any>('SELECT * FROM tasks WHERE room_id = ? ORDER BY created_at', [roomId]);
}

// Участники
export function createParticipant(participant: {
  id: string;
  roomId: string;
  name: string;
  isOwner: boolean;
}) {
  dbRun(
    'INSERT INTO participants (id, room_id, name, is_owner) VALUES (?, ?, ?, ?)',
    [participant.id, participant.roomId, participant.name, participant.isOwner ? 1 : 0]
  );
}

export function getParticipantsByRoom(roomId: string) {
  return dbAll<any>('SELECT * FROM participants WHERE room_id = ? ORDER BY joined_at', [roomId]);
}

export function deleteParticipant(userId: string) {
  dbRun('DELETE FROM participants WHERE id = ?', [userId]);
}

export function getParticipantCount(roomId: string): number {
  const result = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM participants WHERE room_id = ?', [roomId]);
  return result?.count || 0;
}

// Сессии голосования
export function createVotingSession(session: {
  id: string;
  roomId: string;
  taskId: string;
}) {
  dbRun(
    'INSERT INTO voting_sessions (id, room_id, task_id, status) VALUES (?, ?, ?, ?)',
    [session.id, session.roomId, session.taskId, 'active']
  );
}

export function getActiveSession(roomId: string) {
  return dbGet<any>('SELECT * FROM voting_sessions WHERE room_id = ? AND status = ?', [roomId, 'active']);
}

export function getCompletedSessions(roomId: string) {
  return dbAll<any>('SELECT * FROM voting_sessions WHERE room_id = ? AND status = ? ORDER BY completed_at DESC', [roomId, 'completed']);
}

export function completeSession(sessionId: string, finalEstimate: string) {
  dbRun(
    'UPDATE voting_sessions SET status = ?, final_estimate = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
    ['completed', finalEstimate, sessionId]
  );
}

// Голоса
export function createVote(vote: {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  value: string;
}) {
  dbRun(
    'INSERT INTO votes (id, session_id, user_id, user_name, value) VALUES (?, ?, ?, ?, ?)',
    [vote.id, vote.sessionId, vote.userId, vote.userName, vote.value]
  );
}

export function getVotesBySession(sessionId: string) {
  return dbAll<any>('SELECT * FROM votes WHERE session_id = ? ORDER BY created_at', [sessionId]);
}

export function hasUserVoted(sessionId: string, userId: string): boolean {
  const result = dbGet<{ count: number }>(
    'SELECT COUNT(*) as count FROM votes WHERE session_id = ? AND user_id = ?',
    [sessionId, userId]
  );
  return (result?.count || 0) > 0;
}

// Получение полной информации о комнате с данными
export function getRoomData(roomId: string) {
  const room = getRoom(roomId);
  if (!room) return null;

  const tasks = getTasksByRoom(roomId);
  const participants = getParticipantsByRoom(roomId);
  const currentSession = getActiveSession(roomId);
  const completedSessions = getCompletedSessions(roomId);

  return {
    room,
    tasks,
    participants,
    currentSession,
    completedSessions,
  };
}