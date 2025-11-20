import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface FlowAnalysisResult {
  score: number;
  oiScore: number;
  direction: 'CALL' | 'PUT';
  strikePrice: number;
  premium: number;
  unusual0DTE: boolean;
  unusualWeekly: boolean;
  weeklyScore: number;
  weeklyOiScore: number;
  weeklyStrike: number;
  weeklyPremium: number;
  darkPoolAlert: boolean;
  darkPoolDirection: 'CALL' | 'PUT';
  darkPoolStrike: number;
  darkPoolPremium: number;
  darkPoolScore: number;
  darkPoolOi: number;
}

export async function analyzeOptionsFlow(ticker: string): Promise<FlowAnalysisResult> {
  try {
    // Fetch recent options flow data
    const recentFlow = await prisma.optionsFlow.findMany({
      where: {
        ticker,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    // Calculate flow metrics
    let callVolume = 0;
    let putVolume = 0;
    let callPremium = 0;
    let putPremium = 0;
    let unusualCalls = 0;
    let unusualPuts = 0;
    let sweepCount = 0;
    let blockCount = 0;

    for (const flow of recentFlow) {
      if (flow.optionType === 'CALL') {
        callVolume += flow.volume;
        callPremium += flow.premium;
        if (flow.isUnusual) unusualCalls++;
      } else {
        putVolume += flow.volume;
        putPremium += flow.premium;
        if (flow.isUnusual) unusualPuts++;
      }
      if (flow.isSweep) sweepCount++;
      if (flow.isBlock) blockCount++;
    }

    // Determine direction based on flow
    const totalVolume = callVolume + putVolume;
    const callRatio = totalVolume > 0 ? callVolume / totalVolume : 0.5;
    const direction: 'CALL' | 'PUT' = callRatio > 0.55 ? 'CALL' : callRatio < 0.45 ? 'PUT' : 'CALL';

    // Calculate scores
    const flowScore = Math.min(
      ((unusualCalls + unusualPuts) / Math.max(recentFlow.length, 1)) * 100 +
      (sweepCount * 5) +
      (blockCount * 10),
      100
    );

    const oiScore = Math.min(
      recentFlow.reduce((sum: any, f: any) => sum + f.openInterest, 0) / 10000,
      100
    );

    // Find best strikes
    const callFlows = recentFlow.filter((f: any) => f.optionType === 'CALL');
    const putFlows = recentFlow.filter((f: any) => f.optionType === 'PUT');

    const bestCallStrike = callFlows.length > 0
      ? callFlows.reduce((max: any, f: any) => f.volume > max.volume ? f : max).strikePrice
      : 0;

    const bestPutStrike = putFlows.length > 0
      ? putFlows.reduce((max: any, f: any) => f.volume > max.volume ? f : max).strikePrice
      : 0;

    const strikePrice = direction === 'CALL' ? bestCallStrike : bestPutStrike;
    const premium = direction === 'CALL' ? callPremium / Math.max(callFlows.length, 1) : putPremium / Math.max(putFlows.length, 1);

    // Detect unusual activity
    const unusual0DTE = (sweepCount > 5 || blockCount > 3) && flowScore > 60;
    const unusualWeekly = flowScore > 50 && (unusualCalls > 3 || unusualPuts > 3);

    // Dark pool detection
    const darkPoolAlert = blockCount > 5 && flowScore > 70;

    return {
      score: flowScore,
      oiScore,
      direction,
      strikePrice,
      premium,
      unusual0DTE,
      unusualWeekly,
      weeklyScore: flowScore * 0.9,
      weeklyOiScore: oiScore * 0.95,
      weeklyStrike: strikePrice,
      weeklyPremium: premium * 1.2,
      darkPoolAlert,
      darkPoolDirection: direction,
      darkPoolStrike: strikePrice,
      darkPoolPremium: premium * 1.5,
      darkPoolScore: flowScore * 1.1,
      darkPoolOi: oiScore * 1.05
    };
  } catch (error) {
    console.error(`Flow analysis error for ${ticker}:`, error);
    // Return neutral values on error
    return {
      score: 50,
      oiScore: 50,
      direction: 'CALL',
      strikePrice: 0,
      premium: 0,
      unusual0DTE: false,
      unusualWeekly: false,
      weeklyScore: 50,
      weeklyOiScore: 50,
      weeklyStrike: 0,
      weeklyPremium: 0,
      darkPoolAlert: false,
      darkPoolDirection: 'CALL',
      darkPoolStrike: 0,
      darkPoolPremium: 0,
      darkPoolScore: 50,
      darkPoolOi: 50
    };
  }
}

export async function getOptionsChain(ticker: string, expiration: string) {
  try {
    // In production, call actual API
    // const response = await axios.get(`https://api.polygon.io/v3/snapshot/options/${ticker}`, {
    //   params: { apiKey: process.env.POLYGON_API_KEY }
    // });

    // Mock data for development
    return {
      calls: [],
      puts: [],
      underlying: { price: 100, change: 0.5 }
    };
  } catch (error) {
    console.error('Options chain fetch error:', error);
    throw error;
  }
}
