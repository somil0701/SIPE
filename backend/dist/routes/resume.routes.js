"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const resume_service_1 = require("../services/resume.service");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
exports.resumeRouter = router;
// Configure multer for file upload
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: env_1.env.MAX_FILE_SIZE,
    },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only PDF files are supported by the local parser.'));
        }
    },
});
/**
 * @route   POST /api/v1/resumes/upload
 * @desc    Upload and parse resume
 * @access  Private
 */
router.post('/upload', auth_1.authenticate, upload.single('resume'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw errorHandler_1.ApiError.badRequest('No file uploaded');
    }
    // In production, upload to S3/MinIO first
    // For now, use a local path
    const fileUrl = `/uploads/${req.file.originalname}`;
    const resume = await resume_service_1.resumeService.uploadResume(req.user.id, {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
    }, fileUrl);
    res.status(201).json({
        success: true,
        data: resume,
        message: 'Resume uploaded successfully. Parsing in progress.',
    });
}));
/**
 * @route   GET /api/v1/resumes
 * @desc    Get user's resumes
 * @access  Private
 */
router.get('/', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const resumes = await resume_service_1.resumeService.getUserResumes(req.user.id);
    res.json({
        success: true,
        data: resumes,
    });
}));
/**
 * @route   GET /api/v1/resumes/current
 * @desc    Get user's current (active) resume
 * @access  Private
 * NOTE: must be declared BEFORE /:id to avoid Express matching "current" as an id param
 */
router.get('/current', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const resume = await resume_service_1.resumeService.getUserResume(req.user.id);
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
}));
/**
 * @route   GET /api/v1/resumes/skills-gap/analysis
 * @desc    Get skills gap analysis
 * @access  Private
 * NOTE: must be declared BEFORE /:id
 */
router.get('/skills-gap/analysis', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const analysis = await resume_service_1.resumeService.getSkillsGap(req.user.id);
    res.json({
        success: true,
        data: analysis,
    });
}));
/**
 * @route   GET /api/v1/resumes/personalized-questions/list
 * @desc    Get personalized interview questions based on resume
 * @access  Private
 * NOTE: must be declared BEFORE /:id
 */
router.get('/personalized-questions/list', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    const questions = await resume_service_1.resumeService.generatePersonalizedQuestions(req.user.id, limit);
    res.json({
        success: true,
        data: questions,
    });
}));
/**
 * @route   GET /api/v1/resumes/:id
 * @desc    Get resume by ID
 * @access  Private
 * NOTE: this MUST come LAST among GET routes to avoid shadowing specific paths above
 */
router.get('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const resume = await resume_service_1.resumeService.getResumeById(req.params.id, req.user.id);
    res.json({
        success: true,
        data: resume,
    });
}));
/**
 * @route   DELETE /api/v1/resumes/:id
 * @desc    Delete resume
 * @access  Private
 */
router.delete('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await resume_service_1.resumeService.deleteResume(req.params.id, req.user.id);
    res.json({
        success: true,
        message: 'Resume deleted successfully',
    });
}));
//# sourceMappingURL=resume.routes.js.map