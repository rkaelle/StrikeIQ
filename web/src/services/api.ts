import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('strikeiq-token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// WebSocket connection
let socket: Socket | null = null;

export function initializeWebSocket(onSignal?: (signal: any) => void) {
  if (socket) return socket;

  const token = typeof window !== 'undefined' ? localStorage.getItem('strikeiq-token') : null;

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });

  socket.on('newSignal', (signal) => {
    console.log('New signal received:', signal);
    if (onSignal) onSignal(signal);
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
  });

  return socket;
}

export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribeToTicker(ticker: string) {
  if (socket) {
    socket.emit('subscribe:ticker', ticker);
  }
}

export function unsubscribeFromTicker(ticker: string) {
  if (socket) {
    socket.emit('unsubscribe:ticker', ticker);
  }
}

// API Services
export const signalService = {
  getAll: async (params?: {
    type?: string;
    direction?: string;
    minConfidence?: number;
    ticker?: string;
  }) => {
    const response = await api.get('/signals', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/signals/${id}`);
    return response.data;
  },

  getByType: async (type: string) => {
    const response = await api.get(`/signals/type/${type}`);
    return response.data;
  },

  getHistory: async (days: number = 30, type?: string) => {
    const response = await api.get('/signals/history/all', {
      params: { days, type },
    });
    return response.data;
  },

  getTopPerformers: async () => {
    const response = await api.get('/signals/top/performers');
    return response.data;
  },

  getActivated: async () => {
    const response = await api.get('/signals/activated');
    return response.data;
  },

  activate: async (signalId: string) => {
    const response = await api.post(`/signals/${signalId}/activate`);
    return response.data;
  },

  deactivate: async (signalId: string) => {
    const response = await api.post(`/signals/${signalId}/deactivate`);
    return response.data;
  },

  checkActivationStatus: async (signalId: string) => {
    const response = await api.get(`/signals/${signalId}/activation-status`);
    return response.data;
  },
};

export const marketService = {
  getQuote: async (ticker: string) => {
    const response = await api.get(`/market/quote/${ticker}`);
    return response.data;
  },

  getOptionsChain: async (ticker: string, expiration?: string) => {
    const response = await api.get(`/market/options/${ticker}`, {
      params: { expiration },
    });
    return response.data;
  },

  getFlow: async (ticker: string) => {
    const response = await api.get(`/market/flow/${ticker}`);
    return response.data;
  },

  getVIX: async () => {
    const response = await api.get('/market/vix');
    return response.data;
  },

  getTechnicals: async (ticker: string) => {
    const response = await api.get(`/market/technicals/${ticker}`);
    return response.data;
  },

  getVolatility: async (ticker: string) => {
    const response = await api.get(`/market/volatility/${ticker}`);
    return response.data;
  },

  getSentiment: async (ticker: string) => {
    const response = await api.get(`/market/sentiment/${ticker}`);
    return response.data;
  },

  getNews: async (ticker?: string) => {
    const response = await api.get('/market/news', {
      params: { ticker },
    });
    return response.data;
  },

  getHistory: async (ticker: string, interval?: string, limit?: number) => {
    const response = await api.get(`/market/history/${ticker}`, {
      params: { interval, limit },
    });
    return response.data;
  },
};

export const authService = {
  register: async (email: string, password: string, name?: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    if (response.data.token) {
      localStorage.setItem('strikeiq-token', response.data.token);
      localStorage.setItem('strikeiq-user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('strikeiq-token', response.data.token);
      localStorage.setItem('strikeiq-user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('strikeiq-token');
    localStorage.removeItem('strikeiq-user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('strikeiq-user');
    return user ? JSON.parse(user) : null;
  },

  updateSettings: async (settings: any) => {
    const response = await api.put('/auth/settings', settings);
    return response.data;
  },
};

export const watchlistService = {
  get: async (userId: string) => {
    const response = await api.get(`/watchlist/${userId}`);
    return response.data;
  },

  add: async (userId: string, signalId: string, notes?: string) => {
    const response = await api.post('/watchlist', { userId, signalId, notes });
    return response.data;
  },

  update: async (id: string, data: { notes?: string; alertSet?: boolean }) => {
    const response = await api.put(`/watchlist/${id}`, data);
    return response.data;
  },

  remove: async (id: string) => {
    const response = await api.delete(`/watchlist/${id}`);
    return response.data;
  },
};

export const watchlistFolderService = {
  getAll: async () => {
    const response = await api.get('/watchlist-folders');
    return response.data.folders;
  },

  create: async (name: string, color?: string) => {
    const response = await api.post('/watchlist-folders', { name, color });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get(`/watchlist-folders/${id}`);
    return response.data;
  },

  update: async (id: string, data: { name?: string; color?: string }) => {
    const response = await api.put(`/watchlist-folders/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/watchlist-folders/${id}`);
    return response.data;
  },

  reorder: async (folders: { id: string; order: number }[]) => {
    const response = await api.post('/watchlist-folders/reorder', { folders });
    return response.data;
  },

  moveItem: async (folderId: string, watchlistItemId: string) => {
    const response = await api.post(`/watchlist-folders/${folderId}/move`, {
      watchlistItemId,
    });
    return response.data;
  },
};

export const tradeService = {
  get: async (userId: string, status?: string) => {
    const response = await api.get(`/trades/${userId}`, {
      params: { status },
    });
    return response.data;
  },

  create: async (trade: {
    userId: string;
    signalId?: string;
    ticker: string;
    direction: string;
    strikePrice: number;
    expirationDate: string;
    entryPrice: number;
    quantity: number;
    notes?: string;
  }) => {
    const response = await api.post('/trades', trade);
    return response.data;
  },

  close: async (id: string, exitPrice: number, notes?: string) => {
    const response = await api.put(`/trades/${id}/close`, { exitPrice, notes });
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/trades/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/trades/${id}`);
    return response.data;
  },
};

export const metricsService = {
  getSystem: async (days: number = 30) => {
    const response = await api.get('/metrics/system', {
      params: { days },
    });
    return response.data;
  },

  getUser: async (userId: string, days: number = 30) => {
    const response = await api.get(`/metrics/user/${userId}`, {
      params: { days },
    });
    return response.data;
  },

  getLeaderboard: async () => {
    const response = await api.get('/metrics/leaderboard');
    return response.data;
  },
};

export const educationService = {
  getModules: async () => {
    const response = await api.get('/education/modules');
    return response.data;
  },

  getModule: async (moduleId: string) => {
    const response = await api.get(`/education/modules/${moduleId}`);
    return response.data;
  },

  getQuotes: async () => {
    const response = await api.get('/education/quotes');
    return response.data;
  },

  getRandomQuote: async () => {
    const response = await api.get('/education/quotes/random');
    return response.data;
  },
};

export default api;
