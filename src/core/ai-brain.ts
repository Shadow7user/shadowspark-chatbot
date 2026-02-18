import type { ConversationContext, ProcessingResult } from "../types/index.js";
import { config } from "../config/env.js";
import { logger } from "./logger.js";
import { SYSTEM_PROMPT } from "../knowledge-base.js";

export class AIBrain {
  /**
   * Generate AI response using OpenRouter (Claude via OpenAI-compatible API)
   * Falls back to OpenAI if OPENROUTER_API_KEY is not set
   */
  async generateResponse(ctx: ConversationContext): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      // Build messages array
      const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

      // Use SYSTEM_PROMPT from knowledge-base.js, or fall back to client's system prompt
      let systemPrompt = SYSTEM_PROMPT || ctx.systemPrompt;
      
      // Add user's name to system prompt if available
      if (ctx.userName) {
        systemPrompt += `\n\nThe customer's name is "${ctx.userName}". Use their name naturally in conversation.`;
      }

      // System prompt
      messages.push({ role: "system", content: systemPrompt });

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

      // Use OpenRouter if API key is configured, otherwise fall back to OpenAI
      if (config.OPENROUTER_API_KEY) {
        return await this.generateWithOpenRouter(messages, ctx, startTime);
      } else {
        logger.warn(
          "OPENROUTER_API_KEY not configured, falling back to OpenAI"
        );
        return await this.generateWithOpenAI(messages, ctx, startTime);
      }
    } catch (error) {
      logger.error({ error, conversationId: ctx.conversationId }, "AI generation failed");

      return {
        response:
          "I'm sorry, I'm experiencing a temporary issue. Please try again in a moment, or type 'agent' to speak with a human.",
        conversationId: ctx.conversationId,
      };
    }
  }

  /**
   * Generate response using OpenRouter API (Claude)
   */
  private async generateWithOpenRouter(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    ctx: ConversationContext,
    startTime: number
  ): Promise<ProcessingResult> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://shadowspark-tech.org",
        "X-Title": "ShadowSpark AI Chatbot",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, error: errorText },
        "OpenRouter API request failed"
      );
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    const tokensUsed = data.usage?.total_tokens;

    const latency = Date.now() - startTime;
    logger.info(
      {
        conversationId: ctx.conversationId,
        tokensUsed,
        latencyMs: latency,
        provider: "openrouter",
      },
      "AI response generated via OpenRouter"
    );

    return {
      response: aiResponse,
      conversationId: ctx.conversationId,
      tokensUsed,
    };
  }

  /**
   * Generate response using OpenAI API (fallback)
   */
  private async generateWithOpenAI(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    ctx: ConversationContext,
    startTime: number
  ): Promise<ProcessingResult> {
    // Import dynamically to avoid loading if not needed
    const { generateText } = await import("ai");
    const { openai } = await import("@ai-sdk/openai");
    
    const model = openai(config.OPENAI_MODEL);
    
    const result = await generateText({
      model,
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
        provider: "openai",
      },
      "AI response generated via OpenAI"
    );

    return {
      response: result.text,
      conversationId: ctx.conversationId,
      tokensUsed: result.usage?.totalTokens,
    };
  }
}
