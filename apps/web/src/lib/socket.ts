import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  // Only create a new socket if one doesn't exist at all.
  // Checking .connected would create a duplicate while the first is still CONNECTING,
  // which causes the "WebSocket closed before established" browser warning.
  if (!socket) {
    const url = import.meta.env.VITE_API_URL || window.location.origin;

    socket = io(url, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocketInstance(): Socket | null {
  return socket;
}
