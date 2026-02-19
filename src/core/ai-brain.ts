import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { ConversationContext, ProcessingResult } from "../types/index.js";
import { config } from "../config/env.js";
import { logger } from "./logger.js";

/**
 * Error types for AI service failures
 */
enum AIErrorType {
  AUTHENTICATION = "authentication",
  RATE_LIMIT = "rate_limit",
  SERVER_ERROR = "server_error",
  TIMEOUT = "timeout",
  NETWORK = "network",
  INVALID_REQUEST = "invalid_request",
  UNKNOWN = "unknown",
}

/**
 * Classify error type based on error object
 */
function classifyError(error: unknown): AIErrorType {
  const errorStr = String(error).toLowerCase();
  const errorObj = error as any;

  // Check for authentication errors
  if (
    errorStr.includes("unauthorized") ||
    errorStr.includes("invalid api key") ||
    errorStr.includes("authentication") ||
    errorStr.includes("401")
  ) {
    return AIErrorType.AUTHENTICATION;
  }

  // Check for rate limit errors
  if (
    errorStr.includes("rate limit") ||
    errorStr.includes("429") ||
    errorStr.includes("quota") ||
    errorObj?.status === 429
  ) {
    return AIErrorType.RATE_LIMIT;
  }

  // Check for server errors (500, 502, 503, 504)
  if (
    errorStr.includes("500") ||
    errorStr.includes("502") ||
    errorStr.includes("503") ||
    errorStr.includes("504") ||
    errorStr.includes("internal server error") ||
    errorStr.includes("bad gateway") ||
    errorStr.includes("service unavailable") ||
    errorStr.includes("gateway timeout") ||
    (errorObj?.status >= 500 && errorObj?.status < 600)
  ) {
    return AIErrorType.SERVER_ERROR;
  }

  // Check for timeout errors
  if (
    errorStr.includes("timeout") ||
    errorStr.includes("etimedout") ||
    errorStr.includes("econnaborted")
  ) {
    return AIErrorType.TIMEOUT;
  }

  // Check for network errors
  if (
    errorStr.includes("network") ||
    errorStr.includes("enotfound") ||
    errorStr.includes("econnrefused") ||
    errorStr.includes("econnreset")
  ) {
    return AIErrorType.NETWORK;
  }

  // Check for invalid request errors
  if (
    errorStr.includes("400") ||
    errorStr.includes("invalid") ||
    errorObj?.status === 400
  ) {
    return AIErrorType.INVALID_REQUEST;
  }

  return AIErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message based on error type
 */
function getUserErrorMessage(errorType: AIErrorType, retryCount: number): string {
  switch (errorType) {
    case AIErrorType.AUTHENTICATION:
      return "I'm experiencing an authentication issue. Please contact support for assistance.";
    
    case AIErrorType.RATE_LIMIT:
      return "I'm receiving too many requests right now. Please try again in a few moments, or type 'agent' to speak with a human.";
    
    case AIErrorType.SERVER_ERROR:
      if (retryCount >= 3) {
        return "I'm experiencing technical difficulties with my AI service. Our team has been notified. Please type 'agent' to speak with a human for immediate assistance.";
      }
      return "I'm experiencing a temporary issue. Please try again in a moment, or type 'agent' to speak with a human.";
    
    case AIErrorType.TIMEOUT:
      return "The request took too long to process. Please try sending a shorter message, or type 'agent' to speak with a human.";
    
    case AIErrorType.NETWORK:
      return "I'm having trouble connecting to my AI service. Please try again in a moment, or type 'agent' to speak with a human.";
    
    case AIErrorType.INVALID_REQUEST:
      return "There was an issue processing your message. Please try rephrasing it, or type 'agent' to speak with a human.";
    
    default:
      return "I'm sorry, I'm experiencing an unexpected issue. Please try again in a moment, or type 'agent' to speak with a human.";
  }
}

/**
 * Check if an error is retryable
 */
function isRetryableError(errorType: AIErrorType): boolean {
  return [
    AIErrorType.SERVER_ERROR,
    AIErrorType.TIMEOUT,
    AIErrorType.NETWORK,
    AIErrorType.RATE_LIMIT,
  ].includes(errorType);
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number, errorType: AIErrorType): number {
  // Base delay in milliseconds
  const baseDelay = errorType === AIErrorType.RATE_LIMIT ? 2000 : 1000;
  
  // Exponential backoff: delay = baseDelay * (2 ^ attempt) + jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  
  // Add jitter (random 0-20% of delay) to avoid thundering herd
  const jitter = Math.random() * 0.2 * exponentialDelay;
  
  return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class AIBrain {
  private model = openai(config.OPENAI_MODEL);
  private maxRetries = 5; // Maximum number of retry attempts after initial failure

  /**
   * Generate AI response from conversation context with retry logic
   */
  async generateResponse(ctx: ConversationContext): Promise<ProcessingResult> {
    const startTime = Date.now();
    let lastError: unknown = null;
    let lastErrorType: AIErrorType = AIErrorType.UNKNOWN;
    let attemptsMade = 0;
    const totalAttempts = this.maxRetries + 1; // Initial attempt + retries

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      attemptsMade = attempt + 1;
      try {
        // Build messages array
        const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

        // System prompt (client-specific)
        messages.push({ role: "system", content: ctx.systemPrompt });

        // Add conversation summary if exists (older messages)
        if (ctx.summary) {
          messages.push({
            role: "system",
            content: `Previous conversation summary: ${ctx.summary}`,
          });
        }

        // Add recent messages
        for (const msg of ctx.messages) {
          messages.push({
            role: msg.role === "USER" ? "user" : "assistant",
            content: msg.content,
          });
        }

        const result = await generateText({
          model: this.model,
          messages,
          maxTokens: config.OPENAI_MAX_TOKENS,
          temperature: config.OPENAI_TEMPERATURE,
        });

        const latency = Date.now() - startTime;
        logger.info(
          {
            conversationId: ctx.conversationId,
            tokensUsed: result.usage?.totalTokens,
            latencyMs: latency,
            attempts: attemptsMade,
          },
          "AI response generated successfully"
        );

        return {
          response: result.text,
          conversationId: ctx.conversationId,
          tokensUsed: result.usage?.totalTokens,
        };
      } catch (error) {
        lastError = error;
        lastErrorType = classifyError(error);

        // Log the error with context
        logger.error(
          {
            error,
            errorType: lastErrorType,
            conversationId: ctx.conversationId,
            attempt: attemptsMade,
            totalAttempts,
          },
          `AI generation failed (attempt ${attemptsMade}/${totalAttempts})`
        );

        // Don't retry for non-retryable errors
        if (!isRetryableError(lastErrorType)) {
          logger.warn(
            {
              errorType: lastErrorType,
              conversationId: ctx.conversationId,
            },
            "Non-retryable error encountered, failing immediately"
          );
          break;
        }

        // Don't wait after the last attempt
        if (attempt < this.maxRetries) {
          const delay = getRetryDelay(attempt, lastErrorType);
          logger.info(
            {
              conversationId: ctx.conversationId,
              delayMs: delay,
              nextAttempt: attempt + 2,
            },
            `Retrying after ${Math.round(delay)}ms`
          );
          await sleep(delay);
        }
      }
    }

    // All retries exhausted or non-retryable error
    const totalLatency = Date.now() - startTime;
    
    logger.error(
      {
        error: lastError,
        errorType: lastErrorType,
        conversationId: ctx.conversationId,
        totalAttempts: attemptsMade,
        totalLatencyMs: totalLatency,
      },
      "AI generation failed after all attempts"
    );

    // Log actionable recommendations for persistent errors
    if (lastErrorType === AIErrorType.SERVER_ERROR) {
      logger.warn(
        {
          conversationId: ctx.conversationId,
          recommendation: "OpenAI service may be experiencing an outage. Check status at https://status.openai.com/",
        },
        "Persistent server errors detected"
      );
    } else if (lastErrorType === AIErrorType.AUTHENTICATION) {
      logger.error(
        {
          conversationId: ctx.conversationId,
          recommendation: "Verify OPENAI_API_KEY environment variable is set correctly and has not been revoked",
        },
        "Authentication error - API key may be invalid"
      );
    } else if (lastErrorType === AIErrorType.RATE_LIMIT) {
      logger.warn(
        {
          conversationId: ctx.conversationId,
          recommendation: "Consider upgrading OpenAI API tier or implementing request queuing",
        },
        "Rate limit errors - consider capacity planning"
      );
    }

    // Return user-friendly error message
    return {
      response: getUserErrorMessage(lastErrorType, this.maxRetries),
      conversationId: ctx.conversationId,
    };
  }
}
