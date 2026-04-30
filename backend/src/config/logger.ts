import winston from "winston";
import { env } from "./env";

const format =
  env.NODE_ENV === "development"
    ? winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.colorize(),
        winston.format.simple()
      )
    : winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      );

export const logger = winston.createLogger({
  level: "info",
  defaultMeta: {
    service: "interview-prep-api",
    environment: env.NODE_ENV,
  },
  format,
  transports: [
    new winston.transports.Console()
  ],
  exitOnError: false,
});

export const morganStream = {
  write: (message: string) => logger.info(message.trim()),
};