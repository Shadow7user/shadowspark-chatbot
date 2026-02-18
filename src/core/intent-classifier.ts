import type { IntentType } from "@prisma/client";
import { logger } from "./logger.js";

export interface IntentClassification {
  intent: IntentType;
  confidence: number;
  reasoning?: string;
}

// Keywords and patterns for each intent type
const INTENT_PATTERNS = {
  ESCALATION: [
    /\b(urgent|emergency|immediately|asap|critical|help me now)\b/i,
    /\b(talk to (a|an|the) (manager|supervisor|boss))\b/i,
    /\b(not (satisfied|happy)|unsatisfied|unhappy)\b/i,
  ],
  COMPLAINT: [
    /\b(complaint|complain|issue|problem|broken|not working|doesn't work)\b/i,
    /\b(terrible|awful|horrible|worst|bad (service|experience))\b/i,
    /\b(disappointed|frustrat(ed|ing)|annoyed|angry)\b/i,
  ],
  SUPPORT: [
    /\b(help|support|assist|trouble|can't|cannot|unable to)\b/i,
    /\b(how (do|can) i|how to)\b/i,
    /\b(not sure|confused|don't understand)\b/i,
    /\b(fix|solve|resolve)\b/i,
  ],
  SALES: [
    /\b(buy|purchase|order|price|cost|pay|payment)\b/i,
    /\b(discount|promo|offer|deal)\b/i,
    /\b(available|in stock|shipping)\b/i,
    /\b(product|service|package)\b/i,
  ],
  FAQ: [
    /\b(what is|what are|tell me about|explain)\b/i,
    /\b(hours|open|closed|location|address)\b/i,
    /\b(when|where|who|why)\b/i,
  ],
  FEEDBACK: [
    /\b(feedback|suggestion|recommend|improve)\b/i,
    /\b(like|love|great|excellent|amazing|good)\b/i,
    /\b(thank|thanks|appreciate)\b/i,
  ],
};

/**
 * Classifies the intent of a user message using pattern matching and heuristics.
 * Returns the intent type with a confidence score (0-1).
 */
export function classifyIntent(text: string): IntentClassification {
  const normalizedText = text.toLowerCase().trim();

  // Check for escalation patterns first (highest priority)
  for (const pattern of INTENT_PATTERNS.ESCALATION) {
    if (pattern.test(normalizedText)) {
      logger.debug({ text, intent: "ESCALATION" }, "Intent classified as ESCALATION");
      return { intent: "ESCALATION", confidence: 0.9 };
    }
  }

  // Check for complaint patterns (high priority)
  for (const pattern of INTENT_PATTERNS.COMPLAINT) {
    if (pattern.test(normalizedText)) {
      logger.debug({ text, intent: "COMPLAINT" }, "Intent classified as COMPLAINT");
      return { intent: "COMPLAINT", confidence: 0.85 };
    }
  }

  // Track scores for each intent
  const scores: Record<IntentType, number> = {
    ESCALATION: 0,
    COMPLAINT: 0,
    SUPPORT: 0,
    SALES: 0,
    FAQ: 0,
    FEEDBACK: 0,
    GENERAL: 0,
  };

  // Score each intent based on pattern matches
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (intent === "ESCALATION" || intent === "COMPLAINT") continue; // Already checked
    for (const pattern of patterns) {
      if (pattern.test(normalizedText)) {
        scores[intent as IntentType] += 1;
      }
    }
  }

  // Find the highest scoring intent
  let maxScore = 0;
  let topIntent: IntentType = "GENERAL";

  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      topIntent = intent as IntentType;
    }
  }

  // Calculate confidence based on score
  let confidence = 0.5; // Base confidence
  if (maxScore > 0) {
    confidence = Math.min(0.75 + maxScore * 0.1, 0.95);
  }

  // Default to GENERAL intent with lower confidence if no patterns match
  if (maxScore === 0) {
    confidence = 0.5;
    topIntent = "GENERAL";
  }

  logger.debug(
    { text, intent: topIntent, confidence, maxScore },
    "Intent classification complete"
  );

  return { intent: topIntent, confidence };
}

/**
 * Determines if an intent should trigger immediate escalation
 */
export function shouldEscalate(intent: IntentType, confidence: number): boolean {
  return (
    (intent === "ESCALATION" && confidence > 0.8) ||
    (intent === "COMPLAINT" && confidence > 0.8)
  );
}

/**
 * Determines if a conversation requires human attention based on intent patterns
 */
export function requiresHumanAttention(
  intent: IntentType,
  messageCount: number
): boolean {
  // Escalation and complaints always need human attention
  if (intent === "ESCALATION" || intent === "COMPLAINT") {
    return true;
  }

  // Support issues that persist after multiple messages
  if (intent === "SUPPORT" && messageCount > 3) {
    return true;
  }

  return false;
}
