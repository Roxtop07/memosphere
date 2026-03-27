import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../config/database';
import { withTenant, requireRole, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed file types
const ALLOWED_TYPES: Record<string, string[]> = {
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
};

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB default

// Upload file
router.post('/', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Check content type for file upload
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data') && !contentType.includes('application/octet-stream')) {
      return res.status(400).json({ error: 'Invalid content type. Use multipart/form-data' });
    }

    // For simplicity, we'll handle base64-encoded files in JSON
    // In production, you'd use multer or similar middleware
    const { filename, mimeType, data, entityType, entityId } = req.body;

    if (!filename || !mimeType || !data) {
      return res.status(400).json({ error: 'Filename, mimeType, and data are required' });
    }

    // Validate file type
    const fileCategory = Object.keys(ALLOWED_TYPES).find((cat) =>
      ALLOWED_TYPES[cat].includes(mimeType)
    );

    if (!fileCategory) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    // Decode base64 data
    const buffer = Buffer.from(data, 'base64');

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'File size exceeds limit' });
    }

    // Generate unique filename
    const fileId = uuidv4();
    const ext = path.extname(filename);
    const storedFilename = `${fileId}${ext}`;
    const filePath = path.join(UPLOAD_DIR, storedFilename);

    // Save file
    fs.writeFileSync(filePath, buffer);

    // Create database record
    const fileUpload = await prisma.fileUpload.create({
      data: {
        id: fileId,
        orgId: req.user.orgId,
        uploadedById: req.user.sub,
        filename: filename,
        storedFilename: storedFilename,
        mimeType: mimeType,
        size: buffer.length,
        path: filePath,
        entityType: entityType || null,
        entityId: entityId || null,
      },
    });

    logger.info(`File uploaded: ${filename} by user ${req.user.sub}`);

    res.status(201).json({
      id: fileUpload.id,
      filename: fileUpload.filename,
      mimeType: fileUpload.mimeType,
      size: fileUpload.size,
      url: `/api/v1/upload/${fileUpload.id}`,
    });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get file metadata
router.get('/:id', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const file = await prisma.fileUpload.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId,
      },
      include: {
        uploadedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      entityType: file.entityType,
      entityId: file.entityId,
      uploadedBy: file.uploadedBy,
      createdAt: file.createdAt,
      url: `/api/v1/upload/${file.id}/download`,
    });
  } catch (error) {
    logger.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

// Download file
router.get('/:id/download', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const file = await prisma.fileUpload.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId,
      },
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Length', file.size);

    const fileStream = fs.createReadStream(file.path);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('Download file error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// List files
router.get('/', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { entityType, entityId, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { orgId: req.user.orgId };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const [files, total] = await Promise.all([
      prisma.fileUpload.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.fileUpload.count({ where }),
    ]);

    res.json({
      files: files.map((f) => ({
        id: f.id,
        filename: f.filename,
        mimeType: f.mimeType,
        size: f.size,
        entityType: f.entityType,
        entityId: f.entityId,
        uploadedBy: f.uploadedBy,
        createdAt: f.createdAt,
        url: `/api/v1/upload/${f.id}/download`,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Delete file
router.delete('/:id', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const file = await prisma.fileUpload.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId,
      },
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check permission (owner or admin)
    if (file.uploadedById !== req.user.sub && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to delete this file' });
    }

    // Delete from disk
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Delete from database
    await prisma.fileUpload.delete({ where: { id: file.id } });

    logger.info(`File deleted: ${file.filename} by user ${req.user.sub}`);

    res.json({ message: 'File deleted' });
  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Attach file to entity
router.put('/:id/attach', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { entityType, entityId } = req.body;

    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'entityType and entityId are required' });
    }

    const file = await prisma.fileUpload.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId,
      },
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    await prisma.fileUpload.update({
      where: { id: file.id },
      data: { entityType, entityId },
    });

    res.json({ message: 'File attached to entity' });
  } catch (error) {
    logger.error('Attach file error:', error);
    res.status(500).json({ error: 'Failed to attach file' });
  }
});

// Get files for entity
router.get('/entity/:entityType/:entityId', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { entityType, entityId } = req.params;

    const files = await prisma.fileUpload.findMany({
      where: {
        orgId: req.user.orgId,
        entityType,
        entityId,
      },
      include: {
        uploadedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      files: files.map((f) => ({
        id: f.id,
        filename: f.filename,
        mimeType: f.mimeType,
        size: f.size,
        uploadedBy: f.uploadedBy,
        createdAt: f.createdAt,
        url: `/api/v1/upload/${f.id}/download`,
      })),
    });
  } catch (error) {
    logger.error('Get entity files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

export default router;
