/**
 * Personality Layer v2 — ShadowSpark AI
 *
 * Defines adaptive personality modes for the AI assistant.
 * Each mode carries a prefix/suffix (framing instructions), a style descriptor,
 * and per-mode overrides for temperature and max_tokens.
 *
 * Usage:
 *   const mode = getModeForMessage(userMessage);
 *   const personality = PERSONALITY_MODES[mode];
 */

export const PERSONALITY_MODES = {
  default: {
    prefix: "As the founder of ShadowSpark Technologies, ",
    suffix: " Let me help you move forward.",
    style: "calm, confident, strategic, business-oriented, polite",
    temperature: 0.65,
    max_tokens: 280,
  },
  confused: {
    prefix: "I understand this can seem complex at first — ",
    suffix: " Take your time, I'm here to clarify step by step.",
    style: "patient, explanatory, reassuring",
    temperature: 0.75,
    max_tokens: 300,
  },
  enterprise: {
    prefix: "Understood. From a strategic enterprise perspective, ",
    suffix: " This aligns well with scalable, production-grade deployment.",
    style: "formal, precise, executive-level",
    temperature: 0.5,
    max_tokens: 280,
  },
  sme: {
    prefix: "For a growing business like yours, ",
    suffix: " This setup is cost-effective and quick to implement.",
    style: "practical, value-driven, direct",
    temperature: 0.6,
    max_tokens: 280,
  },
  sales: {
    prefix:
      "This is exactly the kind of challenge ShadowSpark solves for companies like yours. ",
    suffix: " Would you like a quick live demo or pricing overview?",
    style: "persuasive, opportunity-focused, subtle close",
    temperature: 0.7,
    max_tokens: 280,
  },
  devops: {
    prefix: "From a DevOps and infrastructure standpoint, ",
    suffix: " Let's ensure this is production-ready, observable, and resilient.",
    style: "technical, systematic, infrastructure-focused, reliability-oriented",
    temperature: 0.45,
    max_tokens: 320,
  },
  security: {
    prefix: "From a security and hardening perspective, ",
    suffix: " Always validate inputs, enforce least privilege, and monitor for anomalies.",
    style: "precise, risk-aware, defense-in-depth oriented",
    temperature: 0.4,
    max_tokens: 300,
  },
  growth: {
    prefix: "Looking at this through a SaaS growth and monetization lens, ",
    suffix: " Position this as a scalable revenue stream targeting both Nigerian and global markets.",
    style: "strategic, opportunity-driven, market-aware, monetization-focused",
    temperature: 0.7,
    max_tokens: 300,
  },
} as const;

export type ModeKey = keyof typeof PERSONALITY_MODES;

/**
 * Detect the appropriate personality mode from the user's message.
 * Keyword matching is intentionally broad to catch natural phrasing.
 * Falls back to "default" (founder authority) when no pattern matches.
 */
export function getModeForMessage(userMessage: string): ModeKey {
  const lower = userMessage.toLowerCase();

  if (
    lower.includes("confused") ||
    lower.includes("not understand") ||
    lower.includes("don't understand") ||
    lower.includes("how does") ||
    lower.includes("explain")
  ) {
    return "confused";
  }

  if (
    lower.includes("enterprise") ||
    lower.includes("company") ||
    lower.includes("scale") ||
    lower.includes("production")
  ) {
    return "enterprise";
  }

  if (
    lower.includes("small") ||
    lower.includes("startup") ||
    lower.includes("affordable")
  ) {
    return "sme";
  }

  if (
    lower.includes("price") ||
    lower.includes("cost") ||
    lower.includes("demo") ||
    lower.includes("show me") ||
    lower.includes("how much")
  ) {
    return "sales";
  }

  if (
    lower.includes("security") ||
    lower.includes("vulnerability") ||
    lower.includes("rate limit") ||
    lower.includes("auth token") ||
    lower.includes("brute force")
  ) {
    return "security";
  }

  if (
    lower.includes("deploy") ||
    lower.includes("webhook") ||
    lower.includes("pipeline") ||
    lower.includes("ci/cd") ||
    lower.includes("railway") ||
    lower.includes("environment variable")
  ) {
    return "devops";
  }

  if (
    lower.includes("monetize") ||
    lower.includes("monetization") ||
    lower.includes("revenue model") ||
    lower.includes("saas pricing") ||
    lower.includes("grow my")
  ) {
    return "growth";
  }

  return "default";
}
