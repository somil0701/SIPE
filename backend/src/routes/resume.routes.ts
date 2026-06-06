import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { resumeService } from '../services/resume.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { validate } from '../middleware/validate';

import fs from 'fs';
import path from 'path';

const router = Router();

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'));
    },
  }),
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const hasAllowedExtension = /\.(pdf|docx)$/i.test(file.originalname);
    if (allowedTypes.includes(file.mimetype) || hasAllowedExtension) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Upload a PDF or DOCX resume.'));
    }
  },
});

const jobMatchSchema = z.object({
  jobDescription: z.string().min(80, 'Job description must be at least 80 characters'),
});

/**
 * @route   POST /api/v1/resumes/upload
 * @desc    Upload and parse resume
 * @access  Private
 */
router.post(
  '/upload',
  authenticate,
  upload.single('resume'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw ApiError.badRequest('No file uploaded');
    }

    // In production, upload to S3/MinIO first
    // For now, use a local path
    const fileUrl = `/uploads/${req.file.filename}`;
    const buffer = await fs.promises.readFile(req.file.path);

    const resume = await resumeService.uploadResume(
      req.user!.id,
      {
        buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      fileUrl
    );

    res.status(201).json({
      success: true,
      data: resume,
      message: 'Resume uploaded successfully. Parsing in progress.',
    });
  })
);

/**
 * @route   GET /api/v1/resumes
 * @desc    Get user's resumes
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const resumes = await resumeService.getUserResumes(req.user!.id);

    res.json({
      success: true,
      data: resumes,
    });
  })
);

/**
 * @route   GET /api/v1/resumes/current
 * @desc    Get user's current (active) resume
 * @access  Private
 * NOTE: must be declared BEFORE /:id to avoid Express matching "current" as an id param
 */
router.get(
  '/current',
  authenticate,
  asyncHandler(async (req, res) => {
    const resume = await resumeService.getUserResume(req.user!.id);

    if (!resume) {
      res.json({
        success: true,
        data: null,
      });
      return;
    }

    res.json({
      success: true,
      data: resume,
    });
  })
);

/**
 * @route   GET /api/v1/resumes/skills-gap/analysis
 * @desc    Get skills gap analysis
 * @access  Private
 * NOTE: must be declared BEFORE /:id
 */
router.get(
  '/skills-gap/analysis',
  authenticate,
  asyncHandler(async (req, res) => {
    const analysis = await resumeService.getSkillsGap(req.user!.id);

    res.json({
      success: true,
      data: analysis,
    });
  })
);

/**
 * @route   GET /api/v1/resumes/personalized-questions/list
 * @desc    Get personalized interview questions based on resume
 * @access  Private
 * NOTE: must be declared BEFORE /:id
 */
router.get(
  '/personalized-questions/list',
  authenticate,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const questions = await resumeService.generatePersonalizedQuestions(
      req.user!.id,
      limit
    );

    res.json({
      success: true,
      data: questions,
    });
  })
);

/**
 * @route   POST /api/v1/resumes/current/job-match
 * @desc    Match active resume against a job description
 * @access  Private
 * NOTE: must be declared BEFORE /:id
 */
router.post(
  '/current/job-match',
  authenticate,
  validate({ body: jobMatchSchema }),
  asyncHandler(async (req, res) => {
    const analysis = await resumeService.matchJobDescription(
      req.user!.id,
      req.body.jobDescription
    );

    res.json({
      success: true,
      data: analysis,
    });
  })
);

/**
 * @route   GET /api/v1/resumes/:id
 * @desc    Get resume by ID
 * @access  Private
 * NOTE: this MUST come LAST among GET routes to avoid shadowing specific paths above
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const resume = await resumeService.getResumeById(req.params.id, req.user!.id);

    res.json({
      success: true,
      data: resume,
    });
  })
);

/**
 * @route   DELETE /api/v1/resumes/:id
 * @desc    Delete resume
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await resumeService.deleteResume(req.params.id, req.user!.id);

    res.json({
      success: true,
      message: 'Resume deleted successfully',
    });
  })
);

export { router as resumeRouter };
