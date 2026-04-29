import { PrismaClient } from '@prisma/client';
/**
 * Prisma Client Configuration
 *
 * Features:
 * - Singleton pattern for connection reuse
 * - Query logging in development
 * - Error handling
 * - Connection pooling
 */
declare global {
    var prisma: PrismaClient | undefined;
}
declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export { prisma };
//# sourceMappingURL=database.d.ts.map