-- CreateTable
CREATE TABLE "BacktestRun" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "initialCapital" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "positionSize" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "signalTypes" JSONB,
    "minConfidence" DOUBLE PRECISION,
    "maxRisk" TEXT,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winningTrades" INTEGER NOT NULL DEFAULT 0,
    "losingTrades" INTEGER NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION,
    "totalReturn" DOUBLE PRECISION,
    "totalPnL" DOUBLE PRECISION,
    "avgReturn" DOUBLE PRECISION,
    "maxDrawdown" DOUBLE PRECISION,
    "sharpeRatio" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BacktestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacktestTrade" (
    "id" TEXT NOT NULL,
    "backtestRunId" TEXT NOT NULL,
    "signalId" TEXT,
    "ticker" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "strikePrice" DOUBLE PRECISION NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "exitPrice" DOUBLE PRECISION NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "exitDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "pnl" DOUBLE PRECISION NOT NULL,
    "returnPercent" DOUBLE PRECISION NOT NULL,
    "outcome" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,

    CONSTRAINT "BacktestTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalSignalOutcome" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "strikePrice" DOUBLE PRECISION NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "exitPrice" DOUBLE PRECISION,
    "exitDate" TIMESTAMP(3),
    "highPrice" DOUBLE PRECISION,
    "lowPrice" DOUBLE PRECISION,
    "outcome" TEXT,
    "actualReturn" DOUBLE PRECISION,
    "maxDrawdown" DOUBLE PRECISION,
    "maxProfit" DOUBLE PRECISION,
    "dataCollectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalSignalOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BacktestRun_status_idx" ON "BacktestRun"("status");

-- CreateIndex
CREATE INDEX "BacktestRun_createdAt_idx" ON "BacktestRun"("createdAt");

-- CreateIndex
CREATE INDEX "BacktestTrade_backtestRunId_idx" ON "BacktestTrade"("backtestRunId");

-- CreateIndex
CREATE INDEX "BacktestTrade_outcome_idx" ON "BacktestTrade"("outcome");

-- CreateIndex
CREATE INDEX "BacktestTrade_ticker_idx" ON "BacktestTrade"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalSignalOutcome_signalId_key" ON "HistoricalSignalOutcome"("signalId");

-- CreateIndex
CREATE INDEX "HistoricalSignalOutcome_ticker_idx" ON "HistoricalSignalOutcome"("ticker");

-- CreateIndex
CREATE INDEX "HistoricalSignalOutcome_outcome_idx" ON "HistoricalSignalOutcome"("outcome");

-- CreateIndex
CREATE INDEX "HistoricalSignalOutcome_expirationDate_idx" ON "HistoricalSignalOutcome"("expirationDate");

-- AddForeignKey
ALTER TABLE "BacktestTrade" ADD CONSTRAINT "BacktestTrade_backtestRunId_fkey" FOREIGN KEY ("backtestRunId") REFERENCES "BacktestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
