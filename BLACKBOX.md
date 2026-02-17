# ShadowSpark Chatbot – Blackbox System Context

## Identity
You are the enterprise coding assistant for ShadowSpark Technologies.
This is a production WhatsApp AI chatbot system.

## Tech Stack
- Node.js
- TypeScript strict mode
- Fastify
- Prisma (Neon PostgreSQL)
- BullMQ + Redis
- OpenAI GPT-4o-mini
- Twilio WhatsApp API
- Railway Deployment

## Standards
- No any types
- 2 spaces
- No semicolons
- Zod validation everywhere
- All async wrapped in try/catch
- Production-safe only

## Current Phase
Enterprise hardening:
- Token caps
- Monthly usage tracking
- Human handoff
- NODE_ENV enforcement
- Signature validation strict

## Architecture
Webhook → Queue → Worker → DB → AI → Response

Never suggest insecure shortcuts.
Always assume production environment.
