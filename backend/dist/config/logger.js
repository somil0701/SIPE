"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.morganStream = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const env_1 = require("./env");
const format = env_1.env.NODE_ENV === "development"
    ? winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.colorize(), winston_1.default.format.simple())
    : winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json());
exports.logger = winston_1.default.createLogger({
    level: "info",
    defaultMeta: {
        service: "interview-prep-api",
        environment: env_1.env.NODE_ENV,
    },
    format,
    transports: [
        new winston_1.default.transports.Console()
    ],
    exitOnError: false,
});
exports.morganStream = {
    write: (message) => exports.logger.info(message.trim()),
};
//# sourceMappingURL=logger.js.map