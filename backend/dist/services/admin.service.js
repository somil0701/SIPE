"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminService = exports.AdminService = void 0;
const database_1 = require("../config/database");
class AdminService {
    async getDashboardStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalUsers, newSignupsToday, dau, mau, problemsSolvedToday, mockInterviewsToday, resumesToday, activeLearningPaths, totalRevenueAggregate] = await Promise.all([
            database_1.prisma.user.count({ where: { deletedAt: null } }),
            database_1.prisma.user.count({ where: { createdAt: { gte: today }, deletedAt: null } }),
            // DAU: users who logged in today
            database_1.prisma.user.count({ where: { lastLoginAt: { gte: today }, deletedAt: null } }),
            // MAU: users who logged in last 30 days
            database_1.prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo }, deletedAt: null } }),
            // Problems solved today
            database_1.prisma.attempt.count({ where: { status: 'ACCEPTED', submittedAt: { gte: today } } }),
            // Mock interviews today
            database_1.prisma.interviewSession.count({ where: { createdAt: { gte: today } } }),
            // Resume uploads today
            database_1.prisma.resume.count({ where: { uploadedAt: { gte: today } } }),
            // Active learning paths
            database_1.prisma.learningPath.count({ where: { status: 'ACTIVE' } }),
            // Total Revenue
            database_1.prisma.payment.aggregate({
                _sum: { amount: true },
                where: { status: 'COMPLETED' }
            })
        ]);
        return {
            totalUsers,
            newSignupsToday,
            dau,
            mau,
            problemsSolvedToday,
            mockInterviewsToday,
            resumesToday,
            activeLearningPaths,
            totalRevenue: totalRevenueAggregate._sum.amount || 0,
        };
    }
    async getGrowthChartData() {
        const days = 7;
        const data = [];
        const now = new Date();
        // Start from 6 days ago up to today
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const nextD = new Date(d);
            nextD.setDate(d.getDate() + 1);
            const newUsers = await database_1.prisma.user.count({
                where: { createdAt: { gte: d, lt: nextD }, deletedAt: null }
            });
            data.push({
                date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                newUsers
            });
        }
        return data;
    }
    async getUsers(options) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (options.search) {
            where.OR = [
                { email: { contains: options.search, mode: 'insensitive' } },
                { fullName: { contains: options.search, mode: 'insensitive' } }
            ];
        }
        if (options.role) {
            where.role = options.role;
        }
        if (options.isPremium !== undefined) {
            where.isPremium = options.isPremium;
        }
        const [users, total] = await Promise.all([
            database_1.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    role: true,
                    isPremium: true,
                    createdAt: true,
                    lastLoginAt: true,
                    loginCount: true,
                    deletedAt: true,
                }
            }),
            database_1.prisma.user.count({ where })
        ]);
        return {
            users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async updateUser(id, data) {
        const updateData = {};
        if (data.role !== undefined)
            updateData.role = data.role;
        if (data.isPremium !== undefined)
            updateData.isPremium = data.isPremium;
        if (data.isBanned !== undefined) {
            updateData.deletedAt = data.isBanned ? new Date() : null;
        }
        const user = await database_1.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                isPremium: true,
                createdAt: true,
                lastLoginAt: true,
                deletedAt: true,
            }
        });
        return user;
    }
    // --- Questions Management ---
    async getQuestions(options) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (options.search) {
            where.OR = [
                { title: { contains: options.search, mode: 'insensitive' } },
                { slug: { contains: options.search, mode: 'insensitive' } }
            ];
        }
        if (options.difficulty) {
            where.difficulty = options.difficulty;
        }
        const [questions, total] = await Promise.all([
            database_1.prisma.question.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { skill: { select: { name: true } } }
            }),
            database_1.prisma.question.count({ where })
        ]);
        return {
            questions,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async createQuestion(data) {
        // Generate a simple testCases JSON array if not provided
        if (!data.testCases) {
            data.testCases = [{ input: "", expectedOutput: "" }];
        }
        return database_1.prisma.question.create({
            data
        });
    }
    async updateQuestion(id, data) {
        return database_1.prisma.question.update({
            where: { id },
            data
        });
    }
    async deleteQuestion(id) {
        // We could soft delete, but schema doesn't have deletedAt for Question.
        // Instead we can mark isActive = false
        return database_1.prisma.question.update({
            where: { id },
            data: { isActive: false }
        });
    }
    // Helper to fetch skills for the create question dropdown
    async getSkills() {
        return database_1.prisma.skill.findMany({
            select: { id: true, name: true, category: true },
            orderBy: { name: 'asc' }
        });
    }
    // --- Mock Interviews Management ---
    async getMockInterviews(options) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (options.status) {
            where.status = options.status;
        }
        const [interviews, total] = await Promise.all([
            database_1.prisma.interviewSession.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { fullName: true, email: true } },
                    interviewQuestions: { select: { id: true } }
                }
            }),
            database_1.prisma.interviewSession.count({ where })
        ]);
        return {
            interviews,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    // --- Resumes Management ---
    async getResumes(options) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (options.status) {
            where.status = options.status;
        }
        const [resumes, total] = await Promise.all([
            database_1.prisma.resume.findMany({
                where,
                skip,
                take: limit,
                orderBy: { uploadedAt: 'desc' },
                include: {
                    user: { select: { fullName: true, email: true } }
                }
            }),
            database_1.prisma.resume.count({ where })
        ]);
        return {
            resumes,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}
exports.AdminService = AdminService;
exports.adminService = new AdminService();
//# sourceMappingURL=admin.service.js.map