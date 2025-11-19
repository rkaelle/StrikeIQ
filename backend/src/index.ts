import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import signalRoutes from './routes/signals';
import marketDataRoutes from './routes/marketData';
import watchlistRoutes from './routes/watchlist';
import tradeRoutes from './routes/trades';
import metricsRoutes from './routes/metrics';
import educationRoutes from './routes/education';
import { initializeWebSocket } from './services/websocket';
import { startSignalEngine } from './services/signalEngine';
import { startDataCollection } from './services/dataCollection';

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS origins - add your production domain
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:19006',
  process.env.FRONTEND_URL,
  // Add your Vercel domain
].filter(Boolean);

const io = new SocketServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/market', marketDataRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/education', educationRoutes);

// Initialize WebSocket
initializeWebSocket(io);

// Start services
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 StrikeIQ API running on port ${PORT}`);

  // Start background services
  startSignalEngine(io);
  startDataCollection();

  console.log('📊 Signal Engine started');
  console.log('📡 Data collection started');
});

export { io };
