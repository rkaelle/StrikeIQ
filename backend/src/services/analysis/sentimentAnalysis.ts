import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface SentimentAnalysisResult {
  score: number;
  overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  newsCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  breakingNews: boolean;
  newsDirection: 'CALL' | 'PUT';
  topHeadlines: string[];
  socialSentiment: number;
}

export async function analyzeSentiment(ticker: string): Promise<SentimentAnalysisResult> {
  try {
    // Fetch recent news
    const recentNews = await prisma.newsArticle.findMany({
      where: {
        ticker,
        publishedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: 20
    });

    if (recentNews.length === 0) {
      return getDefaultSentiment();
    }

    // Analyze sentiment distribution
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let totalScore = 0;
    const topHeadlines: string[] = [];

    for (const article of recentNews) {
      if (article.sentiment === 'POSITIVE') {
        positiveCount++;
      } else if (article.sentiment === 'NEGATIVE') {
        negativeCount++;
      } else {
        neutralCount++;
      }

      totalScore += article.sentimentScore;

      if (topHeadlines.length < 5 && article.relevance > 0.5) {
        topHeadlines.push(article.title);
      }
    }

    const avgScore = totalScore / recentNews.length;

    // Determine overall sentiment
    let overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (avgScore > 0.2) {
      overall = 'BULLISH';
    } else if (avgScore < -0.2) {
      overall = 'BEARISH';
    }

    // Check for breaking news (high relevance recent article)
    const breakingNews = recentNews.some(
      article => article.relevance > 0.8 &&
      new Date(article.publishedAt).getTime() > Date.now() - 2 * 60 * 60 * 1000
    );

    // Calculate sentiment score (0-100)
    const sentimentScore = Math.min(
      Math.max(
        50 + (avgScore * 50) + (breakingNews ? 15 : 0),
        0
      ),
      100
    );

    // Determine news direction for trading
    const newsDirection: 'CALL' | 'PUT' = avgScore > 0 ? 'CALL' : 'PUT';

    // Mock social sentiment (in production, integrate social media APIs)
    const socialSentiment = 50 + (Math.random() - 0.5) * 30;

    return {
      score: sentimentScore,
      overall,
      newsCount: recentNews.length,
      positiveCount,
      negativeCount,
      neutralCount,
      breakingNews,
      newsDirection,
      topHeadlines,
      socialSentiment
    };
  } catch (error) {
    console.error(`Sentiment analysis error for ${ticker}:`, error);
    return getDefaultSentiment();
  }
}

function getDefaultSentiment(): SentimentAnalysisResult {
  return {
    score: 50,
    overall: 'NEUTRAL',
    newsCount: 0,
    positiveCount: 0,
    negativeCount: 0,
    neutralCount: 0,
    breakingNews: false,
    newsDirection: 'CALL',
    topHeadlines: [],
    socialSentiment: 50
  };
}

export async function fetchNews(ticker?: string): Promise<any[]> {
  try {
    // In production, call news API
    // const response = await axios.get(`https://newsapi.org/v2/everything`, {
    //   params: {
    //     q: ticker || 'stock market',
    //     apiKey: process.env.NEWS_API_KEY,
    //     sortBy: 'publishedAt',
    //     pageSize: 20
    //   }
    // });

    // Mock news data
    return [
      {
        title: `${ticker || 'Market'} shows strong momentum`,
        summary: 'Technical indicators suggest continued upward movement.',
        sentiment: 'POSITIVE',
        sentimentScore: 0.6,
        relevance: 0.8
      }
    ];
  } catch (error) {
    console.error('News fetch error:', error);
    return [];
  }
}
