const express = require('express');
const { FileController, upload } = require('../controllers/fileController');
const { authenticate, canManageFiles } = require('../middleware/authMiddleware');

const router = express.Router();

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

router.get('/storage/health', 
  authenticate, 
  FileController.getStorageHealth
);

module.exports = router;
