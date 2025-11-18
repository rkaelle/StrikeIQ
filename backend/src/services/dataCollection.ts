import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import cron from 'node-cron';

const prisma = new PrismaClient();

// Mock data generation for development
function generateMockPrice(basePrice: number): number {
  const change = (Math.random() - 0.5) * 2;
  return Math.round((basePrice + change) * 100) / 100;
}

// Fetch and store market data
async function fetchMarketData() {
  const tickers = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'AMD', 'AMZN', 'META', 'GOOGL', 'MSFT'];

  for (const ticker of tickers) {
    try {
      // In production, fetch from actual API
      // const response = await axios.get(`https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`, {
      //   params: { apiKey: process.env.POLYGON_API_KEY }
      // });

      // Mock data for development
      const basePrice = {
        'SPY': 450, 'QQQ': 380, 'AAPL': 175, 'TSLA': 250, 'NVDA': 500,
        'AMD': 120, 'AMZN': 180, 'META': 350, 'GOOGL': 140, 'MSFT': 400
      }[ticker] || 100;

      const close = generateMockPrice(basePrice);
      const open = generateMockPrice(basePrice);
      const high = Math.max(close, open) + Math.random() * 2;
      const low = Math.min(close, open) - Math.random() * 2;
      const volume = Math.floor(Math.random() * 50000000);

      await prisma.marketData.create({
        data: {
          ticker,
          timestamp: new Date(),
          open,
          high,
          low,
          close,
          volume: BigInt(volume),
          impliedVolatility: 20 + Math.random() * 30,
          historicalVolatility: 15 + Math.random() * 25,
          vwap: (high + low + close) / 3,
          rsi: 30 + Math.random() * 40,
          macd: (Math.random() - 0.5) * 5
        }
      });
    } catch (error) {
      console.error(`Error fetching data for ${ticker}:`, error);
    }
  }
}

// Fetch and store options flow
async function fetchOptionsFlow() {
  const tickers = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA'];

  for (const ticker of tickers) {
    try {
      // Generate mock options flow
      const numFlows = Math.floor(Math.random() * 10) + 1;

      for (let i = 0; i < numFlows; i++) {
        const basePrice = {
          'SPY': 450, 'QQQ': 380, 'AAPL': 175, 'TSLA': 250, 'NVDA': 500
        }[ticker] || 100;

        const optionType = Math.random() > 0.5 ? 'CALL' : 'PUT';
        const strikeOffset = Math.floor((Math.random() - 0.5) * 10) * 5;
        const strikePrice = Math.round(basePrice / 5) * 5 + strikeOffset;

        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + Math.floor(Math.random() * 30));

        const volume = Math.floor(Math.random() * 5000) + 100;
        const openInterest = Math.floor(Math.random() * 50000) + 1000;
        const premium = Math.random() * 10 + 0.5;

        const isUnusual = volume > 2000 && Math.random() > 0.7;
        const isSweep = isUnusual && Math.random() > 0.5;
        const isBlock = !isSweep && isUnusual && Math.random() > 0.5;

        await prisma.optionsFlow.create({
          data: {
            ticker,
            timestamp: new Date(),
            strikePrice,
            expirationDate,
            optionType,
            volume,
            openInterest,
            premium,
            isUnusual,
            isSweep,
            isBlock,
            sentiment: optionType === 'CALL'
              ? (Math.random() > 0.3 ? 'BULLISH' : 'NEUTRAL')
              : (Math.random() > 0.3 ? 'BEARISH' : 'NEUTRAL')
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching flow for ${ticker}:`, error);
    }
  }
}

// Fetch and store news
async function fetchNews() {
  const tickers = ['SPY', 'AAPL', 'TSLA', 'NVDA', 'MSFT'];

  for (const ticker of tickers) {
    try {
      // In production, fetch from news API
      // const response = await axios.get('https://newsapi.org/v2/everything', {
      //   params: {
      //     q: ticker,
      //     apiKey: process.env.NEWS_API_KEY,
      //     pageSize: 5
      //   }
      // });

      // Generate mock news
      const headlines = [
        `${ticker} shows strong momentum ahead of earnings`,
        `Analysts upgrade ${ticker} price target`,
        `${ticker} announces new product launch`,
        `${ticker} faces regulatory concerns`,
        `Institutional investors increase ${ticker} holdings`
      ];

      const randomHeadline = headlines[Math.floor(Math.random() * headlines.length)];
      const sentiment = randomHeadline.includes('upgrade') || randomHeadline.includes('strong')
        ? 'POSITIVE'
        : randomHeadline.includes('concerns')
        ? 'NEGATIVE'
        : 'NEUTRAL';

      await prisma.newsArticle.create({
        data: {
          ticker,
          title: randomHeadline,
          summary: `This article discusses recent developments regarding ${ticker}.`,
          source: 'Market News',
          url: `https://example.com/news/${ticker.toLowerCase()}`,
          publishedAt: new Date(),
          sentiment,
          sentimentScore: sentiment === 'POSITIVE' ? 0.6 : sentiment === 'NEGATIVE' ? -0.4 : 0,
          relevance: 0.7 + Math.random() * 0.3
        }
      });
    } catch (error) {
      console.error(`Error fetching news for ${ticker}:`, error);
    }
  }
}

// Clean up old data
async function cleanupOldData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await prisma.marketData.deleteMany({
    where: { timestamp: { lt: thirtyDaysAgo } }
  });

  await prisma.optionsFlow.deleteMany({
    where: { timestamp: { lt: thirtyDaysAgo } }
  });

  await prisma.newsArticle.deleteMany({
    where: { publishedAt: { lt: thirtyDaysAgo } }
  });

  console.log('🧹 Old data cleaned up');
}

// Start data collection
export function startDataCollection() {
  // Fetch market data every minute during market hours
  cron.schedule('* 9-16 * * 1-5', () => {
    fetchMarketData();
  });

  // Fetch options flow every 5 minutes
  cron.schedule('*/5 9-16 * * 1-5', () => {
    fetchOptionsFlow();
  });

  // Fetch news every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    fetchNews();
  });

  // Cleanup old data daily at midnight
  cron.schedule('0 0 * * *', () => {
    cleanupOldData();
  });

  // Initial data fetch
  fetchMarketData();
  fetchOptionsFlow();
  fetchNews();

  console.log('📊 Data collection initialized');
}

export { fetchMarketData, fetchOptionsFlow, fetchNews };
