import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { config } from "../config/env.js";
import { getModeForMessage, PERSONALITY_MODES } from "../lib/personality.js";
import type { ConversationContext, ProcessingResult } from "../types/index.js";
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

      // ── Personality mode detection ──────────────────────────────────────────
      // Inspect the last user message to pick the adaptive personality mode.
      const lastUserMessage =
        [...ctx.messages].reverse().find((m) => m.role === "USER")?.content ?? "";

      const mode = getModeForMessage(lastUserMessage);
      const personality = PERSONALITY_MODES[mode];

      logger.info(
        { conversationId: ctx.conversationId, mode },
        "Personality mode selected"
      );

      // ── Enhanced system prompt ──────────────────────────────────────────────
      // Base identity (from DB clientConfig or DEFAULT_SYSTEM_PROMPT) is kept
      // intact; the personality block appends adaptive framing instructions.
      const enhancedSystemPrompt =
        `${ctx.systemPrompt}\n\n` +
        `[Adaptive Mode: ${mode}]\n` +
        `${personality.prefix}\n` +
        `Style: ${personality.style}\n` +
        `${personality.suffix}`;

      // System prompt (client-specific + personality layer)
      messages.push({ role: "system", content: enhancedSystemPrompt });

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
        maxTokens: personality.max_tokens,
        temperature: personality.temperature,
      });

      const latency = Date.now() - startTime;
      logger.info(
        {
          conversationId: ctx.conversationId,
          mode,
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
