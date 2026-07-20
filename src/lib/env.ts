import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_HOST: z.string().default("127.0.0.1"),
  DATABASE_PORT: z.coerce.number().int().positive().default(3306),
  DATABASE_USER: z.string().default("root"),
  DATABASE_PASSWORD: z.string().default(""),
  DATABASE_NAME: z.string().default("zar_store"),
  AUTH_SECRET: z.string().min(32).default("development-only-secret-change-me-now"),
  APP_URL: z.url().default("http://localhost:3000"),
  GOLD_PRICE_PROVIDER: z.enum(["mock", "tgju", "http"]).default("tgju"),
  GOLD_PRICE_ENDPOINT: z.string().default(""),
  GOLD_PRICE_API_KEY: z.string().default(""),
  PAYMENT_PROVIDER: z.enum(["mock"]).default("mock"),
});

export const env = schema.parse(process.env);
