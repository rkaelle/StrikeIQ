import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function initializeWebSocket(io: SocketServer) {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'secret'
        ) as { userId: string };
        socket.userId = decoded.userId;
      } catch (error) {
        // Allow unauthenticated connections for public data
      }
    }

    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join user-specific room if authenticated
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Subscribe to ticker updates
    socket.on('subscribe:ticker', (ticker: string) => {
      socket.join(`ticker:${ticker}`);
      console.log(`${socket.id} subscribed to ${ticker}`);
    });

    // Unsubscribe from ticker
    socket.on('unsubscribe:ticker', (ticker: string) => {
      socket.leave(`ticker:${ticker}`);
      console.log(`${socket.id} unsubscribed from ${ticker}`);
    });

    // Subscribe to signal type
    socket.on('subscribe:signalType', (type: string) => {
      socket.join(`signalType:${type}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Helper function to broadcast to specific channels
  return {
    broadcastSignal: (signal: any) => {
      io.emit('newSignal', signal);
      io.to(`ticker:${signal.ticker}`).emit('tickerSignal', signal);
      io.to(`signalType:${signal.signalType}`).emit('typeSignal', signal);
    },

    broadcastPriceUpdate: (ticker: string, data: any) => {
      io.to(`ticker:${ticker}`).emit('priceUpdate', { ticker, ...data });
    },

    notifyUser: (userId: string, event: string, data: any) => {
      io.to(`user:${userId}`).emit(event, data);
    },

    broadcastVIXUpdate: (data: any) => {
      io.emit('vixUpdate', data);
    },

    broadcastMarketStatus: (status: any) => {
      io.emit('marketStatus', status);
    }
  };
}
