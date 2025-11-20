import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NewsCatalyst {
  isRealCatalyst: boolean;
  catalystType: 'EARNINGS' | 'FDA' | 'ANALYST' | 'MACRO' | 'SEC_FILING' | 'MERGER' | 'GUIDANCE' | 'NONE';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number; // -1 to 1
  headline: string;
  source: string;
  timestamp: Date;
  relevance: number; // 0-1
  shouldFireSignal: boolean;
}

/**
 * INSTITUTIONAL-GRADE NEWS CATALYST FILTER
 *
 * ONLY fire news signals for REAL catalysts:
 * - Earnings reports
 * - FDA approvals/rejections
 * - Major analyst upgrades/downgrades
 * - Macro events (CPI, jobs, Fed, etc.)
 * - SEC filings (8-K, 13F, etc.)
 * - M&A announcements
 * - Company guidance changes
 *
 * SUPPRESS signals for:
 * - Generic sentiment articles
 * - Price target adjustments without rating changes
 * - Routine news
 * - Opinion pieces
 * - Clickbait headlines
 */
export async function analyzeNewsCatalyst(ticker: string): Promise<NewsCatalyst> {
  try {
    // Get recent news (last 30 minutes)
    const recentNews = await prisma.newsArticle.findMany({
      where: {
        ticker,
        publishedAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000),
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      select: {
        title: true,
        summary: true,
        source: true,
        publishedAt: true,
        sentiment: true,
        sentimentScore: true,
        relevance: true,
      },
    });

    if (recentNews.length === 0) {
      return createNoCatalyst();
    }

    // Analyze each news item for catalyst potential
    const catalystScores = recentNews.map((news) => ({
      news,
      ...analyzeCatalystType(news.title, news.summary),
    }));

    // Find highest-scoring catalyst
    catalystScores.sort((a, b) => {
      if (a.isRealCatalyst && !b.isRealCatalyst) return -1;
      if (!a.isRealCatalyst && b.isRealCatalyst) return 1;
      return (b.news.relevance || 0) - (a.news.relevance || 0);
    });

    const bestCatalyst = catalystScores[0];

    // Determine if this should fire a signal
    const shouldFireSignal = determineShouldFireSignal(
      bestCatalyst.isRealCatalyst,
      bestCatalyst.catalystType,
      bestCatalyst.news.relevance || 0,
      Math.abs(bestCatalyst.news.sentimentScore || 0)
    );

    // Ensure sentiment is one of the expected types
    const sentiment = bestCatalyst.news.sentiment as 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;

    return {
      isRealCatalyst: bestCatalyst.isRealCatalyst,
      catalystType: bestCatalyst.catalystType,
      sentiment: sentiment || 'NEUTRAL',
      sentimentScore: bestCatalyst.news.sentimentScore || 0,
      headline: bestCatalyst.news.title,
      source: bestCatalyst.news.source,
      timestamp: bestCatalyst.news.publishedAt,
      relevance: bestCatalyst.news.relevance || 0,
      shouldFireSignal,
    };

  } catch (error) {
    console.error(`[NewsCatalyst] Error analyzing catalyst for ${ticker}:`, error);
    return createNoCatalyst();
  }
}

/**
 * Analyze headline and summary to determine catalyst type
 */
function analyzeCatalystType(
  title: string,
  summary: string
): { isRealCatalyst: boolean; catalystType: 'EARNINGS' | 'FDA' | 'ANALYST' | 'MACRO' | 'SEC_FILING' | 'MERGER' | 'GUIDANCE' | 'NONE' } {
  const combined = `${title} ${summary}`.toLowerCase();

  // EARNINGS
  if (
    combined.includes('earnings') ||
    combined.includes('reports q') ||
    combined.includes('quarterly results') ||
    combined.includes('beats estimates') ||
    combined.includes('misses estimates')
  ) {
    return { isRealCatalyst: true, catalystType: 'EARNINGS' };
  }

  // FDA (for pharma/biotech)
  if (
    combined.includes('fda') ||
    combined.includes('approval') ||
    combined.includes('clinical trial') ||
    combined.includes('phase 3') ||
    combined.includes('drug approval')
  ) {
    return { isRealCatalyst: true, catalystType: 'FDA' };
  }

  // ANALYST UPGRADES/DOWNGRADES
  if (
    (combined.includes('upgrade') ||
      combined.includes('downgrade') ||
      combined.includes('initiates coverage') ||
      combined.includes('raises target') ||
      combined.includes('lowers target')) &&
    (combined.includes('buy') ||
      combined.includes('sell') ||
      combined.includes('hold') ||
      combined.includes('overweight') ||
      combined.includes('underweight'))
  ) {
    return { isRealCatalyst: true, catalystType: 'ANALYST' };
  }

  // MACRO EVENTS
  if (
    combined.includes('cpi') ||
    combined.includes('jobs report') ||
    combined.includes('non-farm payroll') ||
    combined.includes('federal reserve') ||
    combined.includes('interest rate') ||
    combined.includes('fomc') ||
    combined.includes('pce') ||
    combined.includes('gdp report')
  ) {
    return { isRealCatalyst: true, catalystType: 'MACRO' };
  }

  // SEC FILINGS
  if (
    combined.includes('8-k') ||
    combined.includes('13f') ||
    combined.includes('sec filing') ||
    combined.includes('insider trading') ||
    combined.includes('insider buy') ||
    combined.includes('insider sell')
  ) {
    return { isRealCatalyst: true, catalystType: 'SEC_FILING' };
  }

  // M&A
  if (
    combined.includes('merger') ||
    combined.includes('acquisition') ||
    combined.includes('acquires') ||
    combined.includes('takeover') ||
    combined.includes('buyout')
  ) {
    return { isRealCatalyst: true, catalystType: 'MERGER' };
  }

  // GUIDANCE CHANGES
  if (
    combined.includes('guidance') ||
    combined.includes('forecast') ||
    combined.includes('raises outlook') ||
    combined.includes('lowers outlook') ||
    combined.includes('revises estimates')
  ) {
    return { isRealCatalyst: true, catalystType: 'GUIDANCE' };
  }

  // NOT A REAL CATALYST
  return { isRealCatalyst: false, catalystType: 'NONE' };
}

/**
 * Determine if catalyst should fire a signal
 */
function determineShouldFireSignal(
  isRealCatalyst: boolean,
  catalystType: string,
  relevance: number,
  sentimentMagnitude: number
): boolean {
  // Must be a real catalyst
  if (!isRealCatalyst) return false;

  // Must have high relevance (> 0.7)
  if (relevance < 0.7) return false;

  // Must have strong sentiment (> 0.5 magnitude)
  if (sentimentMagnitude < 0.5) return false;

  // Certain catalyst types always fire if they meet above criteria
  const highPriorityCatalysts = ['EARNINGS', 'FDA', 'MERGER', 'MACRO'];
  if (highPriorityCatalysts.includes(catalystType)) {
    return true;
  }

  // Analyst upgrades/downgrades need very strong sentiment (> 0.7)
  if (catalystType === 'ANALYST' && sentimentMagnitude > 0.7) {
    return true;
  }

  return false;
}

/**
 * Create "no catalyst" response
 */
function createNoCatalyst(): NewsCatalyst {
  return {
    isRealCatalyst: false,
    catalystType: 'NONE',
    sentiment: 'NEUTRAL',
    sentimentScore: 0,
    headline: 'No recent catalysts',
    source: 'N/A',
    timestamp: new Date(),
    relevance: 0,
    shouldFireSignal: false,
  };
}

/**
 * Check if ticker has had a catalyst in the last N hours
 * (Used to avoid duplicate news signals)
 */
export async function hasRecentCatalyst(ticker: string, hours: number = 4): Promise<boolean> {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const recentNews = await prisma.newsArticle.findMany({
    where: {
      ticker,
      publishedAt: { gte: cutoff },
      relevance: { gte: 0.7 },
    },
  });

  for (const news of recentNews) {
    const { isRealCatalyst } = analyzeCatalystType(news.title, news.summary || '');
    if (isRealCatalyst) return true;
  }

  return false;
}

/**
 * Get catalyst summary for display
 */
export function formatCatalystSummary(catalyst: NewsCatalyst): string {
  if (!catalyst.isRealCatalyst) {
    return 'No catalyst detected';
  }

  const sentiment = catalyst.sentimentScore > 0 ? '📈' : catalyst.sentimentScore < 0 ? '📉' : '➡️';

  return `${sentiment} ${catalyst.catalystType}: ${catalyst.headline.slice(0, 80)}${
    catalyst.headline.length > 80 ? '...' : ''
  }`;
}
