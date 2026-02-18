import "dotenv/config";
import { z, ZodError } from "zod";

/**
 * Environment variable schema with Zod validation
 * - Production: ADMIN_SECRET required, WEBHOOK_BASE_URL must be valid URL
 * - Development: ADMIN_SECRET optional
 */
const envSchema = z
  .object({
    // Database Configuration
    DATABASE_URL: z
      .string({
        required_error: "DATABASE_URL is required",
        invalid_type_error: "DATABASE_URL must be a string",
      })
      .url("DATABASE_URL must be a valid URL"),

    DIRECT_URL: z.string().url("DIRECT_URL must be a valid URL").optional(),

    // Twilio Configuration
    TWILIO_ACCOUNT_SID: z
      .string({
        required_error: "TWILIO_ACCOUNT_SID is required",
      })
      .startsWith("AC", "TWILIO_ACCOUNT_SID must start with 'AC'")
      .min(34, "TWILIO_ACCOUNT_SID must be at least 34 characters"),

    TWILIO_AUTH_TOKEN: z
      .string({
        required_error: "TWILIO_AUTH_TOKEN is required",
      })
      .min(32, "TWILIO_AUTH_TOKEN must be at least 32 characters"),

    TWILIO_WHATSAPP_NUMBER: z
      .string({
        required_error: "TWILIO_WHATSAPP_NUMBER is required",
      })
      .min(1, "TWILIO_WHATSAPP_NUMBER cannot be empty")
      .regex(
        /^whatsapp:\+\d+$/,
        "TWILIO_WHATSAPP_NUMBER must be in format: whatsapp:+1234567890",
      ),

    // OpenAI Configuration
    OPENAI_API_KEY: z
      .string({
        required_error: "OPENAI_API_KEY is required",
      })
      .startsWith("sk-", "OPENAI_API_KEY must start with 'sk-'")
      .min(20, "OPENAI_API_KEY appears to be invalid"),

    OPENAI_MODEL: z
      .string()
      .default("gpt-4o-mini")
      .describe("OpenAI model to use for chat completions"),

    OPENAI_MAX_TOKENS: z.coerce
      .number({
        invalid_type_error: "OPENAI_MAX_TOKENS must be a number",
      })
      .int("OPENAI_MAX_TOKENS must be an integer")
      .positive("OPENAI_MAX_TOKENS must be positive")
      .default(500),

    OPENAI_TEMPERATURE: z.coerce
      .number({
        invalid_type_error: "OPENAI_TEMPERATURE must be a number",
      })
      .min(0, "OPENAI_TEMPERATURE must be between 0 and 2")
      .max(2, "OPENAI_TEMPERATURE must be between 0 and 2")
      .default(0.7),

    // OpenRouter Configuration
    OPENROUTER_API_KEY: z
      .string()
      .startsWith("sk-or-", "OPENROUTER_API_KEY must start with 'sk-or-'")
      .min(20, "OPENROUTER_API_KEY appears to be invalid")
      .optional(),

    // Redis Configuration
    REDIS_URL: z
      .string({
        required_error: "REDIS_URL is required",
      })
      .min(1, "REDIS_URL cannot be empty"),

    // Server Configuration
    PORT: z.coerce
      .number({
        invalid_type_error: "PORT must be a number",
      })
      .int("PORT must be an integer")
      .positive("PORT must be positive")
      .max(65535, "PORT must be less than 65536")
      .default(3001),

    NODE_ENV: z
      .enum(["development", "production", "test"], {
        errorMap: () => ({
          message: "NODE_ENV must be 'development', 'production', or 'test'",
        }),
      })
      .default("development"),

    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"], {
        errorMap: () => ({
          message:
            "LOG_LEVEL must be one of: fatal, error, warn, info, debug, trace",
        }),
      })
      .default("info"),

    // Webhook Configuration (required in production)
    WEBHOOK_BASE_URL: z
      .string()
      .url("WEBHOOK_BASE_URL must be a valid URL")
      .optional(),

    // Application Configuration
    DEFAULT_CLIENT_ID: z
      .string()
      .min(1, "DEFAULT_CLIENT_ID cannot be empty")
      .default("shadowspark-demo"),

    // Security Configuration (required in production)
    ADMIN_SECRET: z
      .string()
      .min(16, "ADMIN_SECRET must be at least 16 characters")
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Production-specific validations
    if (data.NODE_ENV === "production") {
      // WEBHOOK_BASE_URL is required in production
      if (!data.WEBHOOK_BASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "WEBHOOK_BASE_URL is required when NODE_ENV=production. Must be a valid URL.",
          path: ["WEBHOOK_BASE_URL"],
          fatal: true,
        });
      }

      // ADMIN_SECRET is required in production
      if (!data.ADMIN_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "ADMIN_SECRET is required when NODE_ENV=production. Must be at least 16 characters.",
          path: ["ADMIN_SECRET"],
          fatal: true,
        });
      }
    }

    // Development-specific warnings (optional)
    if (data.NODE_ENV === "development") {
      if (!data.ADMIN_SECRET) {
        console.warn(
          "⚠️  Warning: ADMIN_SECRET is not set in development mode. Some features may be limited.",
        );
      }
      if (!data.WEBHOOK_BASE_URL) {
        console.warn(
          "⚠️  Warning: WEBHOOK_BASE_URL is not set. Webhook functionality will be disabled.",
        );
      }
      if (!data.OPENROUTER_API_KEY) {
        console.warn(
          "⚠️  Warning: OPENROUTER_API_KEY is not set. OpenRouter AI features will not be available.",
        );
      }
    }
  });

/**
 * Formats Zod validation errors into a readable error message
 */
function formatValidationErrors(error: ZodError): string {
  const errors: string[] = [];

  errors.push("❌ Environment variable validation failed:\n");

  const fieldErrors = error.flatten().fieldErrors;
  const formErrors = error.flatten().formErrors;

  // Display field-specific errors
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      errors.push(`  • ${field}:`);
      messages.forEach((msg) => {
        errors.push(`    - ${msg}`);
      });
    }
  }

  // Display form-level errors
  if (formErrors.length > 0) {
    errors.push("\n  General errors:");
    formErrors.forEach((msg) => {
      errors.push(`    - ${msg}`);
    });
  }

  errors.push(
    "\n💡 Tip: Check your .env file and ensure all required variables are set correctly.",
  );

  return errors.join("\n");
}

/**
 * Loads and validates environment configuration
 * Exits the process with code 1 if validation fails
 */
function loadConfig(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorMessage = formatValidationErrors(result.error);
    console.error(errorMessage);
    console.error(
      "\n🚨 Application cannot start with invalid configuration. Exiting...\n",
    );
    process.exit(1);
  }

  // Log successful configuration load
  console.log(
    `✅ Configuration loaded successfully (${result.data.NODE_ENV} mode)`,
  );

  return result.data;
}

/**
 * Validated application configuration
 * Exported as a singleton to ensure validation runs once at startup
 */
export const config = loadConfig();

/**
 * TypeScript type for the application configuration
 * Inferred from the Zod schema for type safety
 */
export type AppConfig = z.infer<typeof envSchema>;

