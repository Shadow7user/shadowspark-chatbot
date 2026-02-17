import { prisma } from "../db/client";
import { logger } from "./logger";

/**
 * Result of token cap check
 */
interface TokenCapResult {
  exceeded: boolean;
  currentUsage: number;
  cap: number | null;
  remaining: number | null;
}

/**
 * Gets the current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Checks if the client has exceeded their monthly token cap
 * Resets the counter if it's a new month
 *
 * @param clientId - The client identifier
 * @returns TokenCapResult with exceeded status and usage details
 */
export async function checkTokenCap(clientId: string): Promise<TokenCapResult> {
  try {
    const clientConfig = await prisma.clientConfig.findUnique({
      where: { clientId },
      select: {
        monthlyTokenUsage: true,
        monthlyTokenCap: true,
        lastResetMonth: true,
      },
    });

    if (!clientConfig) {
      logger.warn(`Client config not found for clientId: ${clientId}`);
      return {
        exceeded: false,
        currentUsage: 0,
        cap: null,
        remaining: null,
      };
    }

    const currentMonth = getCurrentMonth();
    let currentUsage = clientConfig.monthlyTokenUsage;

    // Reset counter if it's a new month
    if (clientConfig.lastResetMonth !== currentMonth) {
      logger.info(
        `Resetting token usage for client ${clientId} (new month: ${currentMonth})`,
      );

      await prisma.clientConfig.update({
        where: { clientId },
        data: {
          monthlyTokenUsage: 0,
          lastResetMonth: currentMonth,
        },
      });

      currentUsage = 0;
    }

    // If no cap is set, usage is never exceeded
    if (!clientConfig.monthlyTokenCap) {
      return {
        exceeded: false,
        currentUsage,
        cap: null,
        remaining: null,
      };
    }

    const exceeded = currentUsage >= clientConfig.monthlyTokenCap;
    const remaining = clientConfig.monthlyTokenCap - currentUsage;

    if (exceeded) {
      logger.warn(
        `Client ${clientId} has exceeded monthly token cap: ${currentUsage}/${clientConfig.monthlyTokenCap}`,
      );
    }

    return {
      exceeded,
      currentUsage,
      cap: clientConfig.monthlyTokenCap,
      remaining: remaining > 0 ? remaining : 0,
    };
  } catch (error) {
    logger.error(
      { error, clientId },
      `Error checking token cap for client ${clientId}`,
    );
    // On error, allow the request to proceed (fail open)
    return {
      exceeded: false,
      currentUsage: 0,
      cap: null,
      remaining: null,
    };
  }
}

/**
 * Increments the token usage for a client
 * Automatically handles month reset if needed
 *
 * @param clientId - The client identifier
 * @param tokens - Number of tokens to add to usage
 * @returns TokenCapResult with updated usage and exceeded status
 */
export async function incrementTokenUsage(
  clientId: string,
  tokens: number,
): Promise<TokenCapResult> {
  try {
    if (tokens < 0) {
      logger.warn(
        `Attempted to increment negative tokens (${tokens}) for client ${clientId}`,
      );
      tokens = 0;
    }

    const clientConfig = await prisma.clientConfig.findUnique({
      where: { clientId },
      select: {
        monthlyTokenUsage: true,
        monthlyTokenCap: true,
        lastResetMonth: true,
      },
    });

    if (!clientConfig) {
      logger.warn(
        `Client config not found for clientId: ${clientId}, cannot increment tokens`,
      );
      return {
        exceeded: false,
        currentUsage: 0,
        cap: null,
        remaining: null,
      };
    }

    const currentMonth = getCurrentMonth();
    let currentUsage = clientConfig.monthlyTokenUsage;

    // Reset counter if it's a new month
    if (clientConfig.lastResetMonth !== currentMonth) {
      logger.info(
        `Resetting token usage for client ${clientId} during increment (new month: ${currentMonth})`,
      );
      currentUsage = 0;
    }

    // Calculate new usage
    const newUsage = currentUsage + tokens;

    // Update the database
    await prisma.clientConfig.update({
      where: { clientId },
      data: {
        monthlyTokenUsage: newUsage,
        lastResetMonth: currentMonth,
      },
    });

    logger.info(
      `Incremented token usage for client ${clientId}: +${tokens} tokens (total: ${newUsage})`,
    );

    // Check if cap is exceeded
    const cap = clientConfig.monthlyTokenCap;
    const exceeded = cap ? newUsage >= cap : false;
    const remaining = cap ? Math.max(0, cap - newUsage) : null;

    if (exceeded && cap) {
      logger.warn(
        `Client ${clientId} has now exceeded monthly token cap: ${newUsage}/${cap}`,
      );
    }

    return {
      exceeded,
      currentUsage: newUsage,
      cap,
      remaining,
    };
  } catch (error) {
    logger.error(
      { error, clientId },
      `Error incrementing token usage for client ${clientId}`,
    );
    // On error, return current state without incrementing
    return {
      exceeded: false,
      currentUsage: 0,
      cap: null,
      remaining: null,
    };
  }
}

/**
 * Gets the current token usage statistics for a client
 *
 * @param clientId - The client identifier
 * @returns TokenCapResult with current usage details
 */
export async function getTokenUsage(clientId: string): Promise<TokenCapResult> {
  try {
    const clientConfig = await prisma.clientConfig.findUnique({
      where: { clientId },
      select: {
        monthlyTokenUsage: true,
        monthlyTokenCap: true,
        lastResetMonth: true,
      },
    });

    if (!clientConfig) {
      logger.warn(`Client config not found for clientId: ${clientId}`);
      return {
        exceeded: false,
        currentUsage: 0,
        cap: null,
        remaining: null,
      };
    }

    const currentMonth = getCurrentMonth();
    let currentUsage = clientConfig.monthlyTokenUsage;

    // If it's a new month but hasn't been reset yet, report 0 usage
    if (clientConfig.lastResetMonth !== currentMonth) {
      currentUsage = 0;
    }

    const cap = clientConfig.monthlyTokenCap;
    const exceeded = cap ? currentUsage >= cap : false;
    const remaining = cap ? Math.max(0, cap - currentUsage) : null;

    return {
      exceeded,
      currentUsage,
      cap,
      remaining,
    };
  } catch (error) {
    logger.error(
      { error, clientId },
      `Error getting token usage for client ${clientId}`,
    );
    return {
      exceeded: false,
      currentUsage: 0,
      cap: null,
      remaining: null,
    };
  }
}
