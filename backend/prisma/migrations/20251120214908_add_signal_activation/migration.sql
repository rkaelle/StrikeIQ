-- CreateTable
CREATE TABLE "UserSignalActivation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSignalActivation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSignalActivation_userId_idx" ON "UserSignalActivation"("userId");

-- CreateIndex
CREATE INDEX "UserSignalActivation_signalId_idx" ON "UserSignalActivation"("signalId");

-- CreateIndex
CREATE INDEX "UserSignalActivation_activated_idx" ON "UserSignalActivation"("activated");

-- CreateIndex
CREATE UNIQUE INDEX "UserSignalActivation_userId_signalId_key" ON "UserSignalActivation"("userId", "signalId");

-- AddForeignKey
ALTER TABLE "UserSignalActivation" ADD CONSTRAINT "UserSignalActivation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSignalActivation" ADD CONSTRAINT "UserSignalActivation_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
