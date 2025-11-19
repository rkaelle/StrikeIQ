import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import cron from 'node-cron';

const prisma = new PrismaClient();

// Rate limiting helper - delay between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch and store market data from Polygon.io
async function fetchMarketData() {
  const tickers = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'AMD', 'AMZN', 'META', 'GOOGL', 'MSFT'];

  for (const ticker of tickers) {
    try {
      // Rate limit: wait 12 seconds between requests (5 req/min = 12s between)
      await delay(12000);

      // Fetch from Polygon.io API
      const response = await axios.get(`https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`, {
        params: { apiKey: process.env.POLYGON_API_KEY }
      });

      const result = response.data.results?.[0];
      if (!result) continue;

      const { o: open, h: high, l: low, c: close, v: volume, vw: vwap } = result;

      // Fetch technical indicators from Alpha Vantage
      let rsi = 50, macd = 0;
      try {
        await delay(12000); // Alpha Vantage also has rate limits
        const rsiResponse = await axios.get('https://www.alphavantage.co/query', {
          params: {
            function: 'RSI',
            symbol: ticker,
            interval: 'daily',
            time_period: 14,
            series_type: 'close',
            apikey: process.env.ALPHA_VANTAGE_KEY
          }
        });
        const rsiData = rsiResponse.data['Technical Analysis: RSI'];
        if (rsiData) {
          const latestDate = Object.keys(rsiData)[0];
          rsi = parseFloat(rsiData[latestDate]?.RSI || '50');
        }
      } catch (err) {
        console.error(`Error fetching RSI for ${ticker}:`, err);
      }

      // Skip IV fetch on free tier to reduce API calls
      const impliedVolatility = 25;
      const historicalVolatility = 20;

      await prisma.marketData.create({
        data: {
          ticker,
          timestamp: new Date(),
          open,
          high,
          low,
          close,
          volume: BigInt(Math.round(volume)),
          impliedVolatility,
          historicalVolatility,
          vwap: vwap || (high + low + close) / 3,
          rsi,
          macd
        }
      });

      console.log(`✓ Fetched market data for ${ticker}`);
    } catch (error) {
      console.error(`Error fetching data for ${ticker}:`, error);
    }
  }
}

// Fetch and store options flow from Polygon.io
async function fetchOptionsFlow() {
  const tickers = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA'];

  for (const ticker of tickers) {
    try {
      // Rate limit: wait 12 seconds between requests
      await delay(12000);

      // Fetch options chain from Polygon.io
      const response = await axios.get(`https://api.polygon.io/v3/snapshot/options/${ticker}`, {
        params: {
          apiKey: process.env.POLYGON_API_KEY,
          limit: 50
        }
      });

      console.log(`✓ Fetched options flow for ${ticker}`);

      const options = response.data.results || [];

      for (const option of options) {
        const details = option.details || {};
        const day = option.day || {};
        const greeks = option.greeks || {};

        const volume = day.volume || 0;
        const openInterest = option.open_interest || 0;
        const premium = day.vwap || day.close || 0;

        // Determine if unusual activity
        const avgVolume = openInterest > 0 ? openInterest / 10 : 1000;
        const isUnusual = volume > avgVolume * 2;
        const isSweep = isUnusual && volume > 1000;
        const isBlock = isUnusual && !isSweep && volume > 500;

        // Determine sentiment
        let sentiment = 'NEUTRAL';
        if (details.contract_type === 'call') {
          sentiment = greeks.delta > 0.5 ? 'BULLISH' : 'NEUTRAL';
        } else {
          sentiment = greeks.delta < -0.5 ? 'BEARISH' : 'NEUTRAL';
        }

        await prisma.optionsFlow.create({
          data: {
            ticker,
            timestamp: new Date(),
            strikePrice: details.strike_price || 0,
            expirationDate: new Date(details.expiration_date || Date.now()),
            optionType: details.contract_type?.toUpperCase() || 'CALL',
            volume,
            openInterest,
            premium,
            isUnusual,
            isSweep,
            isBlock,
            sentiment
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching flow for ${ticker}:`, error);
    }
  }
}

// Fetch and store news from Finnhub
async function fetchNews() {
  const tickers = ['SPY', 'AAPL', 'TSLA', 'NVDA', 'MSFT'];

  for (const ticker of tickers) {
    try {
      // Rate limit: Finnhub free tier is 60 calls/min, so 1 second delay is safe
      await delay(1000);

      // Fetch from Finnhub API
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const response = await axios.get('https://finnhub.io/api/v1/company-news', {
        params: {
          symbol: ticker,
          from: weekAgo.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0],
          token: process.env.FINNHUB_API_KEY
        }
      });

      console.log(`✓ Fetched news for ${ticker}`);

      const articles = response.data?.slice(0, 5) || [];

      for (const article of articles) {
        // Analyze sentiment from headline
        const headline = (article.headline || '').toLowerCase();
        let sentiment = 'NEUTRAL';
        let sentimentScore = 0;

        const positiveWords = ['upgrade', 'beat', 'surge', 'rally', 'strong', 'bullish', 'record', 'growth'];
        const negativeWords = ['downgrade', 'miss', 'fall', 'decline', 'weak', 'bearish', 'concern', 'risk'];

        const positiveCount = positiveWords.filter(word => headline.includes(word)).length;
        const negativeCount = negativeWords.filter(word => headline.includes(word)).length;

        if (positiveCount > negativeCount) {
          sentiment = 'POSITIVE';
          sentimentScore = Math.min(0.3 + positiveCount * 0.2, 1);
        } else if (negativeCount > positiveCount) {
          sentiment = 'NEGATIVE';
          sentimentScore = Math.max(-0.3 - negativeCount * 0.2, -1);
        }

        await prisma.newsArticle.create({
          data: {
            ticker,
            title: article.headline || 'No title',
            summary: article.summary || '',
            source: article.source || 'Unknown',
            url: article.url || '',
            publishedAt: new Date(article.datetime * 1000),
            sentiment,
            sentimentScore,
            relevance: article.related?.includes(ticker) ? 0.9 : 0.7
          }
        });
      }
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
  // Fetch market data every 5 minutes during market hours (rate-limited)
  cron.schedule('*/5 9-16 * * 1-5', () => {
    fetchMarketData();
  });

  // Fetch options flow every 15 minutes (rate-limited, requires paid tier)
  cron.schedule('*/15 9-16 * * 1-5', () => {
    fetchOptionsFlow();
  });

  // Fetch news every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    fetchNews();
  });

  // Cleanup old data daily at midnight
  cron.schedule('0 0 * * *', () => {
    cleanupOldData();
  });

  // Initial data fetch - staggered to avoid rate limits
  console.log('📊 Data collection initialized - starting initial fetch...');

  // Start with news (fastest, least rate-limited)
  fetchNews().then(() => {
    console.log('📰 Initial news fetch complete');
    // Then fetch market data
    return fetchMarketData();
  }).then(() => {
    console.log('📈 Initial market data fetch complete');
    // Options flow last (most API calls)
    return fetchOptionsFlow();
  }).then(() => {
    console.log('📊 Initial data collection complete');
  }).catch(err => {
    console.error('Error during initial data fetch:', err);
  });
}

export { fetchMarketData, fetchOptionsFlow, fetchNews };
