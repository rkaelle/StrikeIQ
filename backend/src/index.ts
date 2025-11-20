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
import { initializeInstitutionalSignalEngine } from './services/institutionalSignalEngine';
import { startDataCollection } from './services/dataCollection';

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS origins - add your production domain
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://localhost:19006',
  'https://strikeiq.vercel.app',
  process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin));

const io = new SocketServer(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
  initializeInstitutionalSignalEngine(io);
  startDataCollection();

  console.log('🏦 Institutional Signal Engine V2.0 started');
  console.log('📡 Data collection started');
});

export { io };
