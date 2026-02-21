import { prisma } from "../db/client.js";
import { logger } from "./logger.js";

/**
 * Cost estimation based on OpenAI pricing (Feb 2026)
 * GPT-4o-mini: ~$0.150 per 1M input tokens, ~$0.600 per 1M output tokens
 * Average: ~$0.0015 per 1K tokens (combined input + output)
 * Note: Verify current pricing at https://openai.com/api/pricing/
 */
const COST_PER_TOKEN = 0.0000015; // Average GPT-4o-mini pricing

export interface CostEstimate {
  estimatedTokens: number;
  estimatedCost: number;
  model: string;
}

export interface CostGuardResult {
  allowed: boolean;
  reason?: string;
  currentMonthlyCost?: number;
  monthlyCostCap?: number;
  currentDailyCost?: number;
  dailyCostCap?: number;
  estimatedCost?: number;
}

/**
 * Estimates the cost of an AI request based on context length
 */
export function estimateCost(
  contextTokens: number,
  expectedOutputTokens: number = 500
): CostEstimate {
  const totalTokens = contextTokens + expectedOutputTokens;
  const estimatedCost = totalTokens * COST_PER_TOKEN;

  return {
    estimatedTokens: totalTokens,
    estimatedCost,
    model: "gpt-4o-mini",
  };
}

/**
 * Estimates context tokens from message history
 * Rough estimate: ~4 characters per token
 */
export function estimateContextTokens(messages: Array<{ content: string }>): number {
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  return Math.ceil(totalChars / 4) + 100; // Add 100 for system prompt overhead
}

/**
 * Gets the current date in YYYY-MM-DD format for daily tracking
 */
function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Gets the current month in YYYY-MM format for monthly tracking
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Checks if an AI request would exceed cost limits
 * Returns whether the request should be allowed and reason if blocked
 */
export async function checkCostGuard(
  clientId: string,
  estimatedCost: number
): Promise<CostGuardResult> {
  try {
    const clientConfig = await prisma.clientConfig.findUnique({
      where: { clientId },
      select: {
        monthlyCostUsage: true,
        monthlyCostCap: true,
        dailyCostUsage: true,
        dailyCostCap: true,
        lastCostResetDate: true,
      },
    });

    if (!clientConfig) {
      logger.warn({ clientId }, "Client config not found for cost guard");
      return { allowed: true }; // Fail open
    }

    const currentDate = getCurrentDate();
    const currentMonth = getCurrentMonth();

    let monthlyCost = clientConfig.monthlyCostUsage;
    let dailyCost = clientConfig.dailyCostUsage;

    // Reset daily cost if it's a new day
    if (clientConfig.lastCostResetDate !== currentDate) {
      dailyCost = 0;
      // Also check if we need to reset monthly
      const lastMonth = clientConfig.lastCostResetDate?.substring(0, 7);
      if (lastMonth !== currentMonth) {
        monthlyCost = 0;
      }
    }

    // Check daily cost cap
    if (clientConfig.dailyCostCap && dailyCost + estimatedCost > clientConfig.dailyCostCap) {
      logger.warn(
        {
          clientId,
          dailyCost,
          dailyCostCap: clientConfig.dailyCostCap,
          estimatedCost,
        },
        "Daily cost cap would be exceeded"
      );
      return {
        allowed: false,
        reason: "Daily cost limit reached",
        currentDailyCost: dailyCost,
        dailyCostCap: clientConfig.dailyCostCap,
        estimatedCost,
      };
    }

    // Check monthly cost cap
    if (
      clientConfig.monthlyCostCap &&
      monthlyCost + estimatedCost > clientConfig.monthlyCostCap
    ) {
      logger.warn(
        {
          clientId,
          monthlyCost,
          monthlyCostCap: clientConfig.monthlyCostCap,
          estimatedCost,
        },
        "Monthly cost cap would be exceeded"
      );
      return {
        allowed: false,
        reason: "Monthly cost limit reached",
        currentMonthlyCost: monthlyCost,
        monthlyCostCap: clientConfig.monthlyCostCap,
        estimatedCost,
      };
    }

    return {
      allowed: true,
      currentMonthlyCost: monthlyCost,
      monthlyCostCap: clientConfig.monthlyCostCap ?? undefined,
      currentDailyCost: dailyCost,
      dailyCostCap: clientConfig.dailyCostCap ?? undefined,
      estimatedCost,
    };
  } catch (error) {
    logger.error({ error, clientId }, "Error checking cost guard");
    return { allowed: true }; // Fail open on error
  }
}

/**
 * Increments the cost usage for a client
 */
export async function incrementCostUsage(
  clientId: string,
  actualCost: number
): Promise<void> {
  try {
    const currentDate = getCurrentDate();
    const currentMonth = getCurrentMonth();

    const clientConfig = await prisma.clientConfig.findUnique({
      where: { clientId },
      select: {
        monthlyCostUsage: true,
        dailyCostUsage: true,
        lastCostResetDate: true,
      },
    });

    if (!clientConfig) {
      logger.warn({ clientId }, "Client config not found, cannot increment cost");
      return;
    }

    let monthlyCost = clientConfig.monthlyCostUsage;
    let dailyCost = clientConfig.dailyCostUsage;

    // Reset if needed
    if (clientConfig.lastCostResetDate !== currentDate) {
      dailyCost = 0;
      const lastMonth = clientConfig.lastCostResetDate?.substring(0, 7);
      if (lastMonth !== currentMonth) {
        monthlyCost = 0;
      }
    }

    await prisma.clientConfig.update({
      where: { clientId },
      data: {
        monthlyCostUsage: monthlyCost + actualCost,
        dailyCostUsage: dailyCost + actualCost,
        lastCostResetDate: currentDate,
      },
    });

    logger.info(
      {
        clientId,
        actualCost,
        newMonthlyCost: monthlyCost + actualCost,
        newDailyCost: dailyCost + actualCost,
      },
      "Cost usage incremented"
    );
  } catch (error) {
    logger.error({ error, clientId }, "Failed to increment cost usage");
  }
}

/**
 * Gets a cost-friendly fallback message
 */
export function getCostLimitMessage(reason: string): string {
  if (reason.includes("Daily")) {
    return "Our automated assistant has reached its daily usage limit. Please try again tomorrow or contact us directly for immediate assistance.";
  }
  return "Our automated assistant has reached its monthly usage limit. Please contact us directly for assistance.";
}
