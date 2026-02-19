import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { ConversationContext, ProcessingResult } from "../types/index.js";
import { config } from "../config/env.js";
import { logger } from "./logger.js";
import { withRetry } from "./retry.js";

export class AIBrain {
  private model = openai(config.OPENAI_MODEL);

  /**
   * Generate AI response from conversation context.
   *
   * Retries up to 5 times with exponential backoff on transient errors
   * (network failures, HTTP 429/500/502/503/504). Non-retryable errors
   * (auth, bad request) fail immediately. After all retries are exhausted,
   * a user-friendly fallback message is returned so the conversation can
   * continue gracefully.
   *
   * To extend the retry behavior (e.g. add new retryable status codes),
   * pass a custom `isRetryable` option to `withRetry` — see src/core/retry.ts.
   */
  async generateResponse(ctx: ConversationContext): Promise<ProcessingResult> {
    const startTime = Date.now();

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

      // Wrap the AI SDK call with retry logic.
      // conversationId is used as the requestId so every log entry is traceable.
      const result = await withRetry(
        () =>
          generateText({
            model: this.model,
            messages,
            maxTokens: config.OPENAI_MAX_TOKENS,
            temperature: config.OPENAI_TEMPERATURE,
          }),
        {
          requestId: ctx.conversationId,
          operationName: "OpenAI generateText",
        }
      );

      const latency = Date.now() - startTime;
      logger.info(
        {
          conversationId: ctx.conversationId,
          tokensUsed: result.usage?.totalTokens,
          latencyMs: latency,
        },
        "AI response generated"
      );

      return {
        response: result.text,
        conversationId: ctx.conversationId,
        tokensUsed: result.usage?.totalTokens,
      };
    } catch (error) {
      // All retries exhausted (already logged by withRetry) — return a
      // user-friendly message so the conversation does not go silent.
      logger.error(
        { error, conversationId: ctx.conversationId },
        "AI generation failed after all retries — returning fallback response"
      );

      return {
        response:
          "I'm sorry, I'm experiencing a temporary issue. Please try again in a moment, or type 'agent' to speak with a human.",
        conversationId: ctx.conversationId,
      };
    }
  }
}
