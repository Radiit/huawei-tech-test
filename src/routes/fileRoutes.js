const express = require('express');
const { FileController, upload } = require('../controllers/fileController');
const { authenticate, canManageFiles } = require('../middleware/authMiddleware');

const router = express.Router();

// File upload routes
router.post('/employees/:employeeId/documents', 
  authenticate, 
  canManageFiles, 
  upload.single('file'), 
  FileController.uploadEmployeeDocument
);

router.post('/users/:userId/profile-picture', 
  authenticate, 
  canManageFiles, 
  upload.single('file'), 
  FileController.uploadProfilePicture
);

// File management routes
router.get('/files', 
  authenticate, 
  FileController.listFiles
);

router.get('/files/:fileId', 
  authenticate, 
  FileController.getFile
);

router.get('/files/:fileId/download', 
  authenticate, 
  FileController.downloadFile
);

router.delete('/files/:fileId', 
  authenticate, 
  canManageFiles, 
  FileController.deleteFile
);

// Storage health check
router.get('/storage/health', 
  authenticate, 
  FileController.getStorageHealth
);

module.exports = router;
