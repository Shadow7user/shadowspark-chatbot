import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { ConversationContext, ProcessingResult } from "../types/index.js";
import { config } from "../config/env.js";
import { logger } from "./logger.js";

export class AIBrain {
  private model = openai(config.OPENAI_MODEL);

  /**
   * Generate AI response from conversation context
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
        },
        "AI response generated"
      );

      return {
        response: result.text,
        conversationId: ctx.conversationId,
        tokensUsed: result.usage?.totalTokens,
      };
    } catch (error) {
      logger.error({ error, conversationId: ctx.conversationId }, "AI generation failed");

      return {
        response:
          "I'm sorry, I'm experiencing a temporary issue. Please try again in a moment, or type 'agent' to speak with a human.",
        conversationId: ctx.conversationId,
      };
    }
  }
}
