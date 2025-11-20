/**
 * CLEANUP SCRIPT: Clear Old Signals Before a Specific Date
 *
 * This script removes signals created before a specific date.
 * Useful if you want to keep recent signals but clean up old junk.
 *
 * Run with: npx ts-node src/scripts/clearOldSignalsBeforeDate.ts
 *
 * To specify a custom date, set the CUTOFF_DATE environment variable:
 * CUTOFF_DATE="2025-01-15" npx ts-node src/scripts/clearOldSignalsBeforeDate.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearOldSignalsBeforeDate() {
  console.log('🗑️  Starting cleanup of old signals by date...\n');

  try {
    // 1. Get cutoff date (default to today if not specified)
    const cutoffDateStr = process.env.CUTOFF_DATE || new Date().toISOString().split('T')[0];
    const cutoffDate = new Date(cutoffDateStr);
    cutoffDate.setHours(0, 0, 0, 0); // Start of day

    console.log(`📅 Cutoff date: ${cutoffDate.toISOString()}`);
    console.log(`   (Will delete signals created BEFORE this date)\n`);

    // 2. Get count of signals to delete
    const totalSignals = await prisma.signal.count();
    const signalsToDelete = await prisma.signal.count({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`📊 Current database state:`);
    console.log(`   - Total signals: ${totalSignals}`);
    console.log(`   - Signals before cutoff: ${signalsToDelete}`);
    console.log(`   - Signals to keep: ${totalSignals - signalsToDelete}\n`);

    if (signalsToDelete === 0) {
      console.log('✅ No signals to delete. Database is clean.\n');
      return;
    }

    // 3. Show warning
    console.log('⚠️  WARNING: This will delete signals created before the cutoff date.');
    console.log('   This action cannot be undone.\n');

    // 4. Get IDs of signals to delete
    const signalIds = await prisma.signal.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
      },
    });

    const idsToDelete = signalIds.map((s) => s.id);

    // 5. Delete accuracy records for these signals
    console.log('🗑️  Deleting accuracy records for old signals...');
    const deletedAccuracy = await prisma.signalAccuracy.deleteMany({
      where: {
        signalId: {
          in: idsToDelete,
        },
      },
    });
    console.log(`   ✅ Deleted ${deletedAccuracy.count} accuracy records\n`);

    // 6. Delete the signals
    console.log('🗑️  Deleting old signals...');
    const deletedSignals = await prisma.signal.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
    console.log(`   ✅ Deleted ${deletedSignals.count} signals\n`);

    // 7. Verify cleanup
    const remainingSignals = await prisma.signal.count();
    const oldSignalsRemaining = await prisma.signal.count({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log('📊 Final database state:');
    console.log(`   - Remaining signals: ${remainingSignals}`);
    console.log(`   - Old signals remaining: ${oldSignalsRemaining}\n`);

    if (oldSignalsRemaining === 0) {
      console.log('✅ Cleanup completed successfully!');
      console.log(`🏦 All signals before ${cutoffDateStr} have been removed.\n`);
    } else {
      console.log('⚠️  Warning: Some old signals may not have been deleted. Please check manually.\n');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearOldSignalsBeforeDate()
  .then(() => {
    console.log('🎉 Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
