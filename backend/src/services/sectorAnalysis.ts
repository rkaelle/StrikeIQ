// Sector mapping for major tickers
export const SECTOR_MAP: Record<string, string> = {
  // Technology
  'AAPL': 'Technology',
  'MSFT': 'Technology',
  'GOOGL': 'Technology',
  'GOOG': 'Technology',
  'NVDA': 'Technology',
  'AMD': 'Technology',
  'INTC': 'Technology',
  'META': 'Technology',
  'TSLA': 'Consumer Cyclical',
  'AMZN': 'Consumer Cyclical',

  // Financials
  'JPM': 'Financial Services',
  'BAC': 'Financial Services',
  'WFC': 'Financial Services',
  'GS': 'Financial Services',
  'MS': 'Financial Services',
  'C': 'Financial Services',
  'V': 'Financial Services',
  'MA': 'Financial Services',

  // Healthcare
  'UNH': 'Healthcare',
  'JNJ': 'Healthcare',
  'PFE': 'Healthcare',
  'ABBV': 'Healthcare',
  'MRK': 'Healthcare',
  'TMO': 'Healthcare',
  'ABT': 'Healthcare',
  'LLY': 'Healthcare',

  // Energy
  'XOM': 'Energy',
  'CVX': 'Energy',
  'COP': 'Energy',
  'SLB': 'Energy',
  'MPC': 'Energy',

  // Consumer
  'WMT': 'Consumer Defensive',
  'PG': 'Consumer Defensive',
  'KO': 'Consumer Defensive',
  'PEP': 'Consumer Defensive',
  'COST': 'Consumer Defensive',
  'HD': 'Consumer Cyclical',
  'MCD': 'Consumer Cyclical',
  'NKE': 'Consumer Cyclical',
  'SBUX': 'Consumer Cyclical',

  // Industrials
  'BA': 'Industrials',
  'CAT': 'Industrials',
  'GE': 'Industrials',
  'UNP': 'Industrials',
  'HON': 'Industrials',
  'MMM': 'Industrials',

  // Communication
  'T': 'Communication Services',
  'VZ': 'Communication Services',
  'DIS': 'Communication Services',
  'NFLX': 'Communication Services',
  'CMCSA': 'Communication Services',

  // Utilities
  'NEE': 'Utilities',
  'DUK': 'Utilities',
  'SO': 'Utilities',
  'D': 'Utilities',

  // Real Estate
  'AMT': 'Real Estate',
  'PLD': 'Real Estate',
  'CCI': 'Real Estate',
  'EQIX': 'Real Estate',

  // Materials
  'LIN': 'Basic Materials',
  'APD': 'Basic Materials',
  'ECL': 'Basic Materials',
  'SHW': 'Basic Materials'
};

export function getSector(ticker: string): string {
  return SECTOR_MAP[ticker.toUpperCase()] || 'Other';
}

export interface SectorBreakdown {
  sector: string;
  count: number;
  percentage: number;
  tickers: string[];
}

export function analyzeSectorDistribution(tickers: string[]): SectorBreakdown[] {
  const sectorCounts: Record<string, { count: number; tickers: string[] }> = {};
  const total = tickers.length;

  // Count tickers by sector
  tickers.forEach(ticker => {
    const sector = getSector(ticker);
    if (!sectorCounts[sector]) {
      sectorCounts[sector] = { count: 0, tickers: [] };
    }
    sectorCounts[sector].count++;
    sectorCounts[sector].tickers.push(ticker);
  });

  // Convert to array and calculate percentages
  const breakdown: SectorBreakdown[] = Object.entries(sectorCounts)
    .map(([sector, data]) => ({
      sector,
      count: data.count,
      percentage: (data.count / total) * 100,
      tickers: data.tickers
    }))
    .sort((a, b) => b.count - a.count);

  return breakdown;
}

export interface PortfolioSectorAnalysis {
  totalSignals: number;
  sectors: SectorBreakdown[];
  diversificationScore: number; // 0-100, higher is more diversified
  concentration: {
    topSector: string;
    topSectorPercentage: number;
  };
}

export function analyzePortfolioSectors(tickers: string[]): PortfolioSectorAnalysis {
  const sectors = analyzeSectorDistribution(tickers);

  // Calculate diversification score (lower concentration = higher score)
  // Using Herfindahl-Hirschman Index (HHI) inverse
  const hhi = sectors.reduce((sum, s) => sum + Math.pow(s.percentage, 2), 0);
  const diversificationScore = Math.max(0, 100 - (hhi / 100));

  const topSector = sectors[0] || { sector: 'None', percentage: 0 };

  return {
    totalSignals: tickers.length,
    sectors,
    diversificationScore: Math.round(diversificationScore),
    concentration: {
      topSector: topSector.sector,
      topSectorPercentage: Math.round(topSector.percentage * 10) / 10
    }
  };
}
