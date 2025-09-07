const express = require('express');
const SupabaseCronController = require('../controllers/supabaseCronController');

const router = express.Router();
const cronController = new SupabaseCronController();

router.get('/status', async (req, res) => {
  await cronController.getCronStatus(req, res);
});

router.post('/test/collection', async (req, res) => {
  await cronController.testDataCollection(req, res);
});

router.post('/test/cleanup', async (req, res) => {
  await cronController.testDataCleanup(req, res);
});

router.get('/collections', async (req, res) => {
  await cronController.getDataCollections(req, res);
});

router.get('/collections/:id', async (req, res) => {
  await cronController.getDataCollection(req, res);
});

router.get('/jobs/:jobId', async (req, res) => {
  await cronController.getCronJob(req, res);
});

process.on('SIGINT', async () => {
  console.log('Shutting down Supabase Cron Controller...');
  await cronController.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Supabase Cron Controller...');
  await cronController.disconnect();
  process.exit(0);
});

module.exports = router;
