import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getOptionsChain } from '../services/analysis/flowAnalysis';
import { analyzeTechnicals } from '../services/analysis/technicalAnalysis';
import { analyzeVolatility, getVIXData } from '../services/analysis/volatilityAnalysis';
import { analyzeSentiment, fetchNews } from '../services/analysis/sentimentAnalysis';

const router = Router();
const prisma = new PrismaClient();

// Get quote for ticker
router.get('/quote/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;

    // Fetch latest market data
    const latestData = await prisma.marketData.findFirst({
      where: { ticker },
      orderBy: { timestamp: 'desc' }
    });

    if (!latestData) {
      // Return mock data if no data available
      return res.json({
        ticker,
        price: 100 + Math.random() * 50,
        change: (Math.random() - 0.5) * 5,
        changePercent: (Math.random() - 0.5) * 3,
        volume: Math.floor(Math.random() * 10000000),
        high: 105,
        low: 95,
        open: 100
      });
    }

    res.json({
      ticker,
      price: latestData.close,
      change: latestData.close - latestData.open,
      changePercent: ((latestData.close - latestData.open) / latestData.open) * 100,
      volume: Number(latestData.volume),
      high: latestData.high,
      low: latestData.low,
      open: latestData.open
    });
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Get options chain
router.get('/options/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { expiration } = req.query;

    const chain = await getOptionsChain(ticker, expiration as string);
    res.json(chain);
  } catch (error) {
    console.error('Error fetching options chain:', error);
    res.status(500).json({ error: 'Failed to fetch options chain' });
  }
});

// Get options flow
router.get('/flow/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;

    const flow = await prisma.optionsFlow.findMany({
      where: {
        ticker,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    res.json(flow);
  } catch (error) {
    console.error('Error fetching options flow:', error);
    res.status(500).json({ error: 'Failed to fetch options flow' });
  }
});

// Get VIX data
router.get('/vix', async (req, res) => {
  try {
    const vixData = await getVIXData();
    res.json(vixData);
  } catch (error) {
    console.error('Error fetching VIX:', error);
    res.status(500).json({ error: 'Failed to fetch VIX' });
  }
});

// Get technical analysis
router.get('/technicals/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const analysis = await analyzeTechnicals(ticker);
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching technicals:', error);
    res.status(500).json({ error: 'Failed to fetch technicals' });
  }
});

// Get volatility analysis
router.get('/volatility/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const analysis = await analyzeVolatility(ticker);
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching volatility:', error);
    res.status(500).json({ error: 'Failed to fetch volatility' });
  }
});

// Get sentiment analysis
router.get('/sentiment/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const analysis = await analyzeSentiment(ticker);
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching sentiment:', error);
    res.status(500).json({ error: 'Failed to fetch sentiment' });
  }
});

// Get news
router.get('/news', async (req, res) => {
  try {
    const { ticker } = req.query;
    const news = await fetchNews(ticker as string);
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Get historical data for charts
router.get('/history/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { interval = '1D', limit = 100 } = req.query;

    const data = await prisma.marketData.findMany({
      where: { ticker },
      orderBy: { timestamp: 'desc' },
      take: Number(limit)
    });

    res.json(data.reverse());
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

export default router;
