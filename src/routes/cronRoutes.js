const express = require('express');
const cronController = require('../controllers/cronController');
const { authenticate, canManageSystem } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(canManageSystem);

router.post('/initialize', cronController.initializeCronSetup);
router.post('/setup', cronController.setupCronJobs);
router.post('/functions', cronController.createCronFunctions);
router.get('/jobs', cronController.listCronJobs);
router.get('/status', cronController.getCronJobStatus);
router.post('/test/:jobName', cronController.testCronJob);
router.delete('/jobs/:jobName', cronController.deleteCronJob);

module.exports = router;
