import type { IntentType } from "@prisma/client";
import { logger } from "./logger.js";

export interface PriorityScore {
  priority: number;
  reason: string;
}

/**
 * Priority levels (lower number = higher priority):
 * 1 = Critical (escalations, complaints from VIP users)
 * 2 = High (complaints, urgent support)
 * 3 = Medium (general support, sales inquiries)
 * 4 = Normal (FAQ, general inquiries)
 * 5 = Low (feedback, informational)
 */

const INTENT_PRIORITY_MAP: Record<IntentType, number> = {
  ESCALATION: 1,
  COMPLAINT: 2,
  SUPPORT: 3,
  SALES: 3,
  FAQ: 4,
  GENERAL: 4,
  FEEDBACK: 5,
};

/**
 * Computes message priority based on intent, user VIP status, and confidence
 */
export function computeMessagePriority(
  intent: IntentType,
  confidence: number,
  isVipUser: boolean = false,
  messageCount: number = 1
): PriorityScore {
  // Start with base priority from intent
  let priority = INTENT_PRIORITY_MAP[intent];
  let reason = `Base priority for ${intent}`;

  // VIP users get +1 priority boost (lower number = higher priority)
  if (isVipUser && priority > 1) {
    priority -= 1;
    reason += ", VIP user boost";
  }

  // High confidence escalations and complaints get additional boost
  if ((intent === "ESCALATION" || intent === "COMPLAINT") && confidence > 0.85) {
    priority = Math.max(1, priority - 1);
    reason += ", high confidence boost";
  }

  // Multiple messages without resolution indicates frustration - boost priority
  if (messageCount > 3 && priority > 2) {
    priority = Math.max(2, priority - 1);
    reason += ", conversation persistence boost";
  }

  // Ensure priority stays within valid range (1-5)
  priority = Math.max(1, Math.min(5, priority));

  logger.debug(
    { intent, confidence, isVipUser, messageCount, priority, reason },
    "Computed message priority"
  );

  return { priority, reason };
}

/**
 * Determines if a message should be fast-tracked
 */
export function shouldFastTrack(intent: IntentType, isVipUser: boolean): boolean {
  return intent === "ESCALATION" || (intent === "COMPLAINT" && isVipUser);
}

/**
 * Gets the escalation queue type based on intent
 */
export function getEscalationQueueType(
  intent: IntentType
): "SUPPORT" | "SALES" | "COMPLAINT" | "TECHNICAL" | "GENERAL" {
  switch (intent) {
    case "SUPPORT":
      return "SUPPORT";
    case "SALES":
      return "SALES";
    case "COMPLAINT":
    case "ESCALATION":
      return "COMPLAINT";
    case "FAQ":
      return "TECHNICAL";
    default:
      return "GENERAL";
  }
}

/**
 * Calculates queue position estimate based on priority
 */
export function estimateQueuePosition(priority: number, currentQueueSize: number): number {
  // Rough estimate: higher priority messages jump ahead
  const priorityFactor = (6 - priority) / 5; // 1.0 for priority 1, 0.2 for priority 5
  return Math.ceil(currentQueueSize * (1 - priorityFactor));
}
