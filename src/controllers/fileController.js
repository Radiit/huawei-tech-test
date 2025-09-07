const multer = require('multer');
const { logger } = require('../utils/logger');
const supabaseStorageService = require('../services/supabaseStorageService');
const { prisma } = require('../lib/prisma');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and documents are allowed.'), false);
    }
  }
});

class FileController {
  // Upload employee document
  async uploadEmployeeDocument(req, res) {
    try {
      const { employeeId } = req.params;
      const { documentType } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Check if employee exists
      const employee = await prisma.client.employee.findUnique({
        where: { id: parseInt(employeeId) }
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Upload to Supabase Storage
      const uploadResult = await supabaseStorageService.uploadEmployeeDocument(
        employeeId,
        req.file,
        documentType
      );

      // Save file record to database
      const fileRecord = await prisma.client.dataCollection.create({
        data: {
          collectionDate: new Date().toISOString().split('T')[0],
          collectionTime: new Date().toTimeString().split(' ')[0],
          dataSource: 'file_upload',
          dataContent: JSON.stringify({
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            documentType: documentType,
            employeeId: parseInt(employeeId)
          }),
          filePath: uploadResult.path
        }
      });

      logger.info(`Employee document uploaded: ${uploadResult.path}`);

      res.json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
          fileId: fileRecord.id,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          documentType: documentType,
          publicUrl: uploadResult.publicUrl,
          path: uploadResult.path,
          uploadedAt: fileRecord.createdAt
        }
      });
    } catch (error) {
      logger.error('Error uploading employee document:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Upload profile picture
  async uploadProfilePicture(req, res) {
    try {
      const { userId } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Check if user exists
      const user = await prisma.client.user.findUnique({
        where: { id: parseInt(userId) }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Upload to Supabase Storage
      const uploadResult = await supabaseStorageService.uploadProfilePicture(
        userId,
        req.file
      );

      logger.info(`Profile picture uploaded: ${uploadResult.path}`);

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          publicUrl: uploadResult.publicUrl,
          path: uploadResult.path,
          uploadedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error uploading profile picture:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get file by ID
  async getFile(req, res) {
    try {
      const { fileId } = req.params;

      const fileRecord = await prisma.client.dataCollection.findUnique({
        where: { id: parseInt(fileId) }
      });

      if (!fileRecord) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Get file URL
      const publicUrl = supabaseStorageService.getFileUrl(fileRecord.filePath);

      res.json({
        success: true,
        data: {
          id: fileRecord.id,
          fileName: fileRecord.filePath.split('/').pop(),
          filePath: fileRecord.filePath,
          publicUrl: publicUrl,
          dataContent: JSON.parse(fileRecord.dataContent),
          uploadedAt: fileRecord.createdAt
        }
      });
    } catch (error) {
      logger.error('Error getting file:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Download file
  async downloadFile(req, res) {
    try {
      const { fileId } = req.params;

      const fileRecord = await prisma.client.dataCollection.findUnique({
        where: { id: parseInt(fileId) }
      });

      if (!fileRecord) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Download from Supabase Storage
      const fileBuffer = await supabaseStorageService.downloadFile(fileRecord.filePath);

      res.set({
        'Content-Type': fileRecord.dataContent ? JSON.parse(fileRecord.dataContent).mimeType : 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileRecord.filePath.split('/').pop()}"`
      });

      res.send(fileBuffer);
    } catch (error) {
      logger.error('Error downloading file:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Delete file
  async deleteFile(req, res) {
    try {
      const { fileId } = req.params;

      const fileRecord = await prisma.client.dataCollection.findUnique({
        where: { id: parseInt(fileId) }
      });

      if (!fileRecord) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Delete from Supabase Storage
      await supabaseStorageService.deleteFile(fileRecord.filePath);

      // Delete from database
      await prisma.client.dataCollection.delete({
        where: { id: parseInt(fileId) }
      });

      logger.info(`File deleted: ${fileRecord.filePath}`);

      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting file:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // List files
  async listFiles(req, res) {
    try {
      const { folder = '', page = 1, limit = 10 } = req.query;

      // List files from Supabase Storage
      const files = await supabaseStorageService.listFiles(folder);

      // Get file records from database
      const fileRecords = await prisma.client.dataCollection.findMany({
        where: {
          filePath: {
            contains: folder
          }
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc'
        }
      });

      const filesWithUrls = fileRecords.map(record => ({
        id: record.id,
        fileName: record.filePath.split('/').pop(),
        filePath: record.filePath,
        publicUrl: supabaseStorageService.getFileUrl(record.filePath),
        dataContent: JSON.parse(record.dataContent),
        uploadedAt: record.createdAt
      }));

      res.json({
        success: true,
        data: {
          files: filesWithUrls,
          total: fileRecords.length,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error listing files:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get storage health
  async getStorageHealth(req, res) {
    try {
      const health = await supabaseStorageService.healthCheck();
      
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Error checking storage health:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = {
  FileController: new FileController(),
  upload
};
