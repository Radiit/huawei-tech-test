const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');
const config = require('../config/config');

class SupabaseStorageService {
  constructor() {
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      logger.warn('Supabase not configured, file storage will be disabled');
      this.supabase = null;
      this.bucketName = 'huawei';
      return;
    }

    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );
    this.bucketName = 'huawei';
  }

  async uploadFile(file, path, options = {}) {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not configured');
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          ...options
        });

      if (error) {
        logger.error('Supabase upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(path);

      logger.info(`File uploaded successfully: ${path}`);
      return {
        path: data.path,
        publicUrl: urlData.publicUrl,
        fullPath: data.fullPath
      };
    } catch (error) {
      logger.error('Error uploading file to Supabase:', error);
      throw error;
    }
  }

  async downloadFile(path) {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not configured');
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(path);

      if (error) {
        logger.error('Supabase download error:', error);
        throw new Error(`Download failed: ${error.message}`);
      }

      logger.info(`File downloaded successfully: ${path}`);
      return data;
    } catch (error) {
      logger.error('Error downloading file from Supabase:', error);
      throw error;
    }
  }

  getFileUrl(path) {
    if (!this.supabase) {
      return `https://supabase-not-configured.com/${path}`;
    }

    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  async deleteFile(path) {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not configured');
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([path]);

      if (error) {
        logger.error('Supabase delete error:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      logger.info(`File deleted successfully: ${path}`);
      return data;
    } catch (error) {
      logger.error('Error deleting file from Supabase:', error);
      throw error;
    }
  }

  async listFiles(folder = '') {
    try {
      if (!this.supabase) {
        return [];
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(folder);

      if (error) {
        logger.error('Supabase list error:', error);
        throw new Error(`List failed: ${error.message}`);
      }

      logger.info(`Files listed successfully from folder: ${folder}`);
      return data;
    } catch (error) {
      logger.error('Error listing files from Supabase:', error);
      throw error;
    }
  }

  async createSignedUrl(path, expiresIn = 3600) {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not configured');
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(path, expiresIn);

      if (error) {
        logger.error('Supabase signed URL error:', error);
        throw new Error(`Signed URL creation failed: ${error.message}`);
      }

      logger.info(`Signed URL created successfully: ${path}`);
      return data;
    } catch (error) {
      logger.error('Error creating signed URL:', error);
      throw error;
    }
  }

  async uploadEmployeeDocument(employeeId, file, documentType) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${documentType}_${timestamp}.${fileExtension}`;
    const path = `employees/${employeeId}/documents/${fileName}`;

    return await this.uploadFile(file, path, {
      metadata: {
        employeeId: employeeId.toString(),
        documentType: documentType,
        uploadedAt: new Date().toISOString()
      }
    });
  }

  async uploadProfilePicture(userId, file) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `profile_${timestamp}.${fileExtension}`;
    const path = `users/${userId}/profile/${fileName}`;

    return await this.uploadFile(file, path, {
      metadata: {
        userId: userId.toString(),
        type: 'profile_picture',
        uploadedAt: new Date().toISOString()
      }
    });
  }

  async uploadDataCollectionFile(file, collectionId) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `collection_${collectionId}_${timestamp}.${fileExtension}`;
    const path = `data-collections/${collectionId}/${fileName}`;

    return await this.uploadFile(file, path, {
      metadata: {
        collectionId: collectionId.toString(),
        type: 'data_collection',
        uploadedAt: new Date().toISOString()
      }
    });
  }

  async healthCheck() {
    try {
      await this.listFiles();
      return { status: 'healthy'm, service: 'supabase_storage' };
    } catch (error) {
      logger.error('Supabase Storage health check failed:', error);
      return { status: 'unhealthy', service: 'supabase_storage', error: error.message };
    }
  }
}

module.exports = new SupabaseStorageService();
