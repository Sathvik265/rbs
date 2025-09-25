const cron = require('node-cron');
const pool = require('../db');

// Schedule a job to run at 12:00 AM every day to open shifts.
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily shift opening job...');
  const today = new Date().toISOString().slice(0, 10);
  const shiftsToOpen = ['`', '``', 'RBS1', 'RBS2'];

  for (const shiftName of shiftsToOpen) {
    try {
      await pool.query(
        "INSERT INTO shifts (shift_name, date, status) VALUES ($1, $2, 'OPEN') ON CONFLICT (shift_name, date) DO NOTHING",
        [shiftName, today]
      );
      console.log(`Shift ${shiftName} for ${today} ensured open.`);
    } catch (error) {
      console.error(`Error opening shift ${shiftName} for ${today}:`, error);
    }
  }
});

// Schedule a job to run at 11:59 PM every day to close open shifts.
// cron.schedule('59 23 * * *', async () => {
//   console.log('Running daily shift closing job...');
//   try {
//     const result = await pool.query(
//       "UPDATE shifts SET status = 'CLOSED', end_time = CURRENT_TIMESTAMP WHERE status = 'OPEN' AND end_time IS NULL RETURNING *"
//     );
//     console.log(`Closed ${result.rowCount} open shifts.`);
//   } catch (error) {
//     console.error('Error closing open shifts:', error);
//   }
// });

console.log('Shift scheduler initialized.');
