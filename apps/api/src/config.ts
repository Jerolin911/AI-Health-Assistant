import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceEnv = path.resolve(currentDir, "../../../.env");
const apiEnv = path.resolve(currentDir, "../.env");

dotenv.config({ path: workspaceEnv });
dotenv.config({ path: apiEnv });

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  API_PORT: z.coerce.number().optional(),
  PORT: z.coerce.number().optional(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(24, "JWT_SECRET must be at least 24 characters"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  TRIAGE_SERVICE_URL: z.string().url().default("http://localhost:8001"),
  GOOGLE_PLACES_API_KEY: z.string().optional()
});

const parsedConfig = envSchema.parse(process.env);

export const config = {
  ...parsedConfig,
  API_PORT: parsedConfig.API_PORT ?? parsedConfig.PORT ?? 4000
};
