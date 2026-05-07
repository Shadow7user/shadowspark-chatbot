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
  technical: {
    prefix:
      "Speaking as a senior infrastructure architect: ",
    suffix:
      " I'll flag any risks, and outline the next ranked actions you should take.",
    style: "precise, systems-thinking, failure-first, CTO-level reasoning",
    temperature: 0.45,
    max_tokens: 400,
  },
  audit: {
    prefix:
      "Running a diagnostic review of your request: ",
    suffix:
      " Here are the security hardening steps and monitoring recommendations.",
    style: "thorough, security-focused, compliance-aware, risk-ranked",
    temperature: 0.4,
    max_tokens: 400,
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
    lower.includes("audit") ||
    lower.includes("security") ||
    lower.includes("vulnerability") ||
    lower.includes("hardening") ||
    lower.includes("compliance")
  ) {
    return "audit";
  }

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
    lower.includes("deploy") ||
    lower.includes("devops") ||
    lower.includes("infrastructure") ||
    lower.includes("database") ||
    lower.includes("redis") ||
    lower.includes("docker") ||
    lower.includes("ci/cd") ||
    lower.includes("debug") ||
    lower.includes("error") ||
    lower.includes("fix") ||
    lower.includes("build") ||
    lower.includes("migrate")
  ) {
    return "technical";
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

  return "default";
}
