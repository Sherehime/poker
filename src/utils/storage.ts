import type { Room } from '../types';

const STORAGE_KEYS = {
  ROOMS: 'poker_rooms',
  CURRENT_USER: 'poker_current_user',
} as const;

export const storage = {
  // Получить все комнаты
  getRooms(): Room[] {
    const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
    return data ? JSON.parse(data) : [];
  },

  // Сохранить все комнаты
  saveRooms(rooms: Room[]): void {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
  },

  // Получить комнату по ID
  getRoom(roomId: string): Room | null {
    const rooms = this.getRooms();
    return rooms.find((room) => room.id === roomId) || null;
  },

  // Сохранить или обновить комнату
  saveRoom(room: Room): void {
    const rooms = this.getRooms();
    const index = rooms.findIndex((r) => r.id === room.id);
    if (index >= 0) {
      rooms[index] = room;
    } else {
      rooms.push(room);
    }
    this.saveRooms(rooms);
  },

  // Удалить комнату
  deleteRoom(roomId: string): void {
    const rooms = this.getRooms().filter((room) => room.id !== roomId);
    this.saveRooms(rooms);
  },

  // Сохранить текущего пользователя
  saveCurrentUser(roomId: string, userId: string, isOwner: boolean): void {
    localStorage.setItem(
      STORAGE_KEYS.CURRENT_USER,
      JSON.stringify({ roomId, userId, isOwner })
    );
  },

  // Получить текущего пользователя
  getCurrentUser(): { roomId: string; userId: string; isOwner: boolean } | null {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  // Удалить текущего пользователя (выход)
  clearCurrentUser(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },
};