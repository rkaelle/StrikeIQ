-- CreateTable
CREATE TABLE "WatchlistFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistFolder_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Watchlist" ADD COLUMN "folderId" TEXT;

-- CreateIndex
CREATE INDEX "WatchlistFolder_userId_idx" ON "WatchlistFolder"("userId");

-- CreateIndex
CREATE INDEX "WatchlistFolder_userId_order_idx" ON "WatchlistFolder"("userId", "order");

-- CreateIndex
CREATE INDEX "Watchlist_userId_folderId_idx" ON "Watchlist"("userId", "folderId");

-- AddForeignKey
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "WatchlistFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistFolder" ADD CONSTRAINT "WatchlistFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
