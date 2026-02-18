/**
 * Type definitions for conversation-handler.js
 */

export interface Service {
  name: string;
  price: string;
  description: string;
}

export interface CompanyInfo {
  name: string;
  location: string;
  website: string;
}

export interface LeadData {
  userId: string;
  message: string;
  email: string | null;
  phone: string | null;
  timestamp: string;
}

export interface Logger {
  info(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
}

export function handleIncomingMessage(
  userMessage: string,
  userId: string,
  logger?: Logger | null
): string;

export function isBusinessHours(): boolean;

export function captureLead(userMessage: string, userId: string): LeadData | null;

export const SERVICES: Record<string, Service>;
export const COMPANY_INFO: CompanyInfo;
