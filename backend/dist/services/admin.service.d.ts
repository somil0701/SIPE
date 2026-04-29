export declare class AdminService {
    getDashboardStats(): Promise<{
        totalUsers: number;
        newSignupsToday: number;
        dau: number;
        mau: number;
        problemsSolvedToday: number;
        mockInterviewsToday: number;
        resumesToday: number;
        activeLearningPaths: number;
        totalRevenue: number;
    }>;
    getGrowthChartData(): Promise<{
        date: string;
        newUsers: number;
    }[]>;
    getUsers(options: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
        isPremium?: boolean;
    }): Promise<{
        users: {
            id: string;
            email: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
            isPremium: boolean;
            lastLoginAt: Date | null;
            loginCount: number;
            createdAt: Date;
            deletedAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    updateUser(id: string, data: {
        role?: string;
        isPremium?: boolean;
        isBanned?: boolean;
    }): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        isPremium: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        deletedAt: Date | null;
    }>;
    getQuestions(options: {
        page?: number;
        limit?: number;
        search?: string;
        difficulty?: string;
    }): Promise<{
        questions: ({
            skill: {
                name: string;
            };
        } & {
            type: import(".prisma/client").$Enums.QuestionType;
            id: string;
            isPremium: boolean;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            description: string;
            isActive: boolean;
            skillId: string;
            totalAttempts: number;
            difficulty: import(".prisma/client").$Enums.Difficulty;
            problemStatement: string;
            title: string;
            starterCode: import("@prisma/client/runtime/library").JsonValue | null;
            solutionCode: import("@prisma/client/runtime/library").JsonValue | null;
            optimalTimeComplexity: string | null;
            optimalSpaceComplexity: string | null;
            hints: string[];
            testCases: import("@prisma/client/runtime/library").JsonValue;
            constraints: string[];
            followUpQuestions: string[];
            companyTags: string[];
            topicTags: string[];
            leetcodeId: string | null;
            hackerrankId: string | null;
            acceptanceRate: number;
            totalSolves: number;
            avgTimeSpent: number;
            baseDifficultyScore: number;
            adaptiveWeight: number;
            explanation: string | null;
            videoSolutionUrl: string | null;
            articleUrl: string | null;
            verifiedBy: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    createQuestion(data: any): Promise<{
        type: import(".prisma/client").$Enums.QuestionType;
        id: string;
        isPremium: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string;
        isActive: boolean;
        skillId: string;
        totalAttempts: number;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        problemStatement: string;
        title: string;
        starterCode: import("@prisma/client/runtime/library").JsonValue | null;
        solutionCode: import("@prisma/client/runtime/library").JsonValue | null;
        optimalTimeComplexity: string | null;
        optimalSpaceComplexity: string | null;
        hints: string[];
        testCases: import("@prisma/client/runtime/library").JsonValue;
        constraints: string[];
        followUpQuestions: string[];
        companyTags: string[];
        topicTags: string[];
        leetcodeId: string | null;
        hackerrankId: string | null;
        acceptanceRate: number;
        totalSolves: number;
        avgTimeSpent: number;
        baseDifficultyScore: number;
        adaptiveWeight: number;
        explanation: string | null;
        videoSolutionUrl: string | null;
        articleUrl: string | null;
        verifiedBy: string | null;
    }>;
    updateQuestion(id: string, data: any): Promise<{
        type: import(".prisma/client").$Enums.QuestionType;
        id: string;
        isPremium: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string;
        isActive: boolean;
        skillId: string;
        totalAttempts: number;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        problemStatement: string;
        title: string;
        starterCode: import("@prisma/client/runtime/library").JsonValue | null;
        solutionCode: import("@prisma/client/runtime/library").JsonValue | null;
        optimalTimeComplexity: string | null;
        optimalSpaceComplexity: string | null;
        hints: string[];
        testCases: import("@prisma/client/runtime/library").JsonValue;
        constraints: string[];
        followUpQuestions: string[];
        companyTags: string[];
        topicTags: string[];
        leetcodeId: string | null;
        hackerrankId: string | null;
        acceptanceRate: number;
        totalSolves: number;
        avgTimeSpent: number;
        baseDifficultyScore: number;
        adaptiveWeight: number;
        explanation: string | null;
        videoSolutionUrl: string | null;
        articleUrl: string | null;
        verifiedBy: string | null;
    }>;
    deleteQuestion(id: string): Promise<{
        type: import(".prisma/client").$Enums.QuestionType;
        id: string;
        isPremium: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string;
        isActive: boolean;
        skillId: string;
        totalAttempts: number;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        problemStatement: string;
        title: string;
        starterCode: import("@prisma/client/runtime/library").JsonValue | null;
        solutionCode: import("@prisma/client/runtime/library").JsonValue | null;
        optimalTimeComplexity: string | null;
        optimalSpaceComplexity: string | null;
        hints: string[];
        testCases: import("@prisma/client/runtime/library").JsonValue;
        constraints: string[];
        followUpQuestions: string[];
        companyTags: string[];
        topicTags: string[];
        leetcodeId: string | null;
        hackerrankId: string | null;
        acceptanceRate: number;
        totalSolves: number;
        avgTimeSpent: number;
        baseDifficultyScore: number;
        adaptiveWeight: number;
        explanation: string | null;
        videoSolutionUrl: string | null;
        articleUrl: string | null;
        verifiedBy: string | null;
    }>;
    getSkills(): Promise<{
        id: string;
        name: string;
        category: import(".prisma/client").$Enums.SkillCategory;
    }[]>;
    getMockInterviews(options: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<{
        interviews: ({
            user: {
                email: string;
                fullName: string;
            };
            interviewQuestions: {
                id: string;
            }[];
        } & {
            status: import(".prisma/client").$Enums.InterviewStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            interviewType: import(".prisma/client").$Enums.InterviewType;
            difficulty: import(".prisma/client").$Enums.Difficulty;
            title: string | null;
            overallScore: number | null;
            strengths: string[];
            targetCompanyId: string | null;
            scheduledAt: Date | null;
            durationMinutes: number;
            startedAt: Date | null;
            endedAt: Date | null;
            technicalScore: number | null;
            communicationScore: number | null;
            problemSolvingScore: number | null;
            aiInterviewerConfig: import("@prisma/client/runtime/library").JsonValue | null;
            transcript: string | null;
            summaryFeedback: string | null;
            areasToImprove: string[];
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getResumes(options: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<{
        resumes: ({
            user: {
                email: string;
                fullName: string;
            };
        } & {
            id: string;
            userId: string;
            isActive: boolean;
            parsedData: import("@prisma/client/runtime/library").JsonValue | null;
            fileName: string;
            fileUrl: string;
            fileType: string;
            fileSize: number;
            parsedText: string | null;
            skillsDetected: import("@prisma/client/runtime/library").JsonValue | null;
            experienceYears: number | null;
            education: import("@prisma/client/runtime/library").JsonValue | null;
            projects: import("@prisma/client/runtime/library").JsonValue | null;
            parsingStatus: string;
            parsingError: string | null;
            uploadedAt: Date;
            parsedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
export declare const adminService: AdminService;
//# sourceMappingURL=admin.service.d.ts.map