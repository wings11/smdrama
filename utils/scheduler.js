const cron = require('node-cron');
const Click = require('../models/Click');
const { logger } = require('../utils/logger');

// Clean up old click records (older than 1 year) every day at 2 AM
const cleanupOldClicks = cron.schedule('0 2 * * *', async () => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await Click.deleteMany({
      timestamp: { $lt: oneYearAgo }
    });

    logger.info(`Cleanup completed: ${result.deletedCount} old click records removed`);
  } catch (error) {
    logger.error('Cleanup job error:', error);
  }
}, {
  scheduled: false
});

// Generate daily analytics summary every day at 1 AM
const generateDailyAnalytics = cron.schedule('0 1 * * *', async () => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const dailyStats = await Click.aggregate([
      {
        $match: {
          timestamp: {
            $gte: yesterday,
            $lte: endOfYesterday
          }
        }
      },
      {
        $group: {
          _id: '$movieId',
          clickCount: { $sum: 1 },
          uniqueIPs: { $addToSet: '$ipAddress' }
        }
      },
      {
        $project: {
          movieId: '$_id',
          clickCount: 1,
          uniqueIPCount: { $size: '$uniqueIPs' },
          _id: 0
        }
      }
    ]);

    logger.info(`Daily analytics generated: ${dailyStats.length} movies had clicks yesterday`);
  } catch (error) {
    logger.error('Daily analytics job error:', error);
  }
}, {
  scheduled: false
});

const startScheduledJobs = () => {
  cleanupOldClicks.start();
  generateDailyAnalytics.start();
  logger.info('Scheduled jobs started');
};

const stopScheduledJobs = () => {
  cleanupOldClicks.stop();
  generateDailyAnalytics.stop();
  logger.info('Scheduled jobs stopped');
};

module.exports = {
  startScheduledJobs,
  stopScheduledJobs
};
