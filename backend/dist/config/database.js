"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
const prismaClientSingleton = () => {
    return new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'error' },
                { emit: 'stdout', level: 'warn' },
            ]
            : [
                { emit: 'stdout', level: 'error' },
            ],
    });
};
const prisma = globalThis.prisma ?? prismaClientSingleton();
exports.prisma = prisma;
// Log queries in development
if (process.env.NODE_ENV === 'development') {
    // @ts-expect-error - Prisma query event typing
    prisma.$on('query', (e) => {
        logger_1.logger.debug('Prisma Query', {
            query: e.query,
            params: e.params,
            duration: `${e.duration}ms`,
        });
    });
}
// Connection error handling
prisma.$connect()
    .then(() => {
    logger_1.logger.info('Database connected successfully');
})
    .catch((error) => {
    logger_1.logger.error('Database connection failed', { error });
    process.exit(1);
});
// Disconnect handling
process.on('beforeExit', async () => {
    await prisma.$disconnect();
    logger_1.logger.info('Database disconnected');
});
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}
//# sourceMappingURL=database.js.map