import { prisma } from "../db/client.js";
import type { EscalationQueueType, EscalationStatus } from "@prisma/client";
import { logger } from "./logger.js";

export interface EscalationQueueEntry {
  id: string;
  conversationId: string;
  priority: number;
  queueType: EscalationQueueType;
  reason?: string | null;
  assignedTo?: string | null;
  status: EscalationStatus;
  createdAt: Date;
  resolvedAt?: Date | null;
}

/**
 * Creates a new escalation queue entry
 */
export async function createEscalation(
  conversationId: string,
  queueType: EscalationQueueType,
  priority: number,
  reason?: string
): Promise<EscalationQueueEntry> {
  try {
    const escalation = await prisma.escalationQueue.create({
      data: {
        conversationId,
        queueType,
        priority,
        reason,
        status: "PENDING",
      },
    });

    logger.info(
      {
        escalationId: escalation.id,
        conversationId,
        queueType,
        priority,
      },
      "Escalation created"
    );

    return escalation;
  } catch (error) {
    logger.error({ error, conversationId }, "Failed to create escalation");
    throw error;
  }
}

/**
 * Gets pending escalations for a specific queue type, ordered by priority
 */
export async function getPendingEscalations(
  queueType?: EscalationQueueType,
  limit: number = 50
): Promise<EscalationQueueEntry[]> {
  try {
    const escalations = await prisma.escalationQueue.findMany({
      where: {
        status: "PENDING",
        ...(queueType && { queueType }),
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: limit,
    });

    return escalations;
  } catch (error) {
    logger.error({ error, queueType }, "Failed to get pending escalations");
    return [];
  }
}

/**
 * Assigns an escalation to an admin
 */
export async function assignEscalation(
  escalationId: string,
  assignedTo: string
): Promise<EscalationQueueEntry | null> {
  try {
    const escalation = await prisma.escalationQueue.update({
      where: { id: escalationId },
      data: {
        assignedTo,
        status: "ASSIGNED",
      },
    });

    logger.info(
      {
        escalationId,
        assignedTo,
      },
      "Escalation assigned"
    );

    return escalation;
  } catch (error) {
    logger.error({ error, escalationId }, "Failed to assign escalation");
    return null;
  }
}

/**
 * Marks an escalation as in progress
 */
export async function markInProgress(escalationId: string): Promise<boolean> {
  try {
    await prisma.escalationQueue.update({
      where: { id: escalationId },
      data: { status: "IN_PROGRESS" },
    });

    logger.info({ escalationId }, "Escalation marked in progress");
    return true;
  } catch (error) {
    logger.error({ error, escalationId }, "Failed to mark escalation in progress");
    return false;
  }
}

/**
 * Resolves an escalation
 */
export async function resolveEscalation(escalationId: string): Promise<boolean> {
  try {
    await prisma.escalationQueue.update({
      where: { id: escalationId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });

    logger.info({ escalationId }, "Escalation resolved");
    return true;
  } catch (error) {
    logger.error({ error, escalationId }, "Failed to resolve escalation");
    return false;
  }
}

/**
 * Gets escalations assigned to a specific admin
 */
export async function getAssignedEscalations(
  assignedTo: string,
  includeResolved: boolean = false
): Promise<EscalationQueueEntry[]> {
  try {
    const escalations = await prisma.escalationQueue.findMany({
      where: {
        assignedTo,
        ...(includeResolved
          ? {}
          : {
              status: {
                in: ["ASSIGNED", "IN_PROGRESS"],
              },
            }),
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    return escalations;
  } catch (error) {
    logger.error({ error, assignedTo }, "Failed to get assigned escalations");
    return [];
  }
}

/**
 * Gets escalation statistics by queue type
 */
export async function getEscalationStats(
  queueType?: EscalationQueueType
): Promise<{
  pending: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  avgPriority: number;
}> {
  try {
    const where = queueType ? { queueType } : {};

    const [pending, assigned, inProgress, resolved, avgResult] = await Promise.all([
      prisma.escalationQueue.count({ where: { ...where, status: "PENDING" } }),
      prisma.escalationQueue.count({ where: { ...where, status: "ASSIGNED" } }),
      prisma.escalationQueue.count({ where: { ...where, status: "IN_PROGRESS" } }),
      prisma.escalationQueue.count({ where: { ...where, status: "RESOLVED" } }),
      prisma.escalationQueue.aggregate({
        where: { ...where, status: { not: "RESOLVED" } },
        _avg: { priority: true },
      }),
    ]);

    return {
      pending,
      assigned,
      inProgress,
      resolved,
      avgPriority: avgResult._avg.priority ?? 3,
    };
  } catch (error) {
    logger.error({ error, queueType }, "Failed to get escalation stats");
    return {
      pending: 0,
      assigned: 0,
      inProgress: 0,
      resolved: 0,
      avgPriority: 3,
    };
  }
}

/**
 * Checks if a conversation already has a pending escalation
 */
export async function hasActiveEscalation(conversationId: string): Promise<boolean> {
  try {
    const count = await prisma.escalationQueue.count({
      where: {
        conversationId,
        status: {
          in: ["PENDING", "ASSIGNED", "IN_PROGRESS"],
        },
      },
    });

    return count > 0;
  } catch (error) {
    logger.error({ error, conversationId }, "Failed to check for active escalation");
    return false;
  }
}
