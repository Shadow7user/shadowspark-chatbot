# Configuration Files

This directory contains configuration files for the ShadowSpark chatbot application.

## Files

### `env.ts`
Environment variable schema and validation using Zod. This file:
- Defines required environment variables
- Validates configuration at startup
- Provides type-safe access to configuration values

### `shadowspark-knowledge.js`
Comprehensive knowledge base and system prompt for ShadowSpark Technologies chatbot.

This file exports:
- `SHADOWSPARK_KNOWLEDGE`: Detailed information about ShadowSpark Technologies, including:
  - Company information and mission
  - Complete service catalog with pricing
  - FAQ section
  - Conversation guidelines
  
- `SYSTEM_PROMPT`: AI assistant persona and instructions that includes the full knowledge base

## Usage

### Using the Knowledge Base in Client Configuration

To use the ShadowSpark knowledge base with a client configuration:

```javascript
// Import the knowledge base
const { SYSTEM_PROMPT } = require('./config/shadowspark-knowledge.js');

// When creating or updating a client config
await prisma.clientConfig.create({
  data: {
    clientId: 'shadowspark-main',
    businessName: 'ShadowSpark Technologies',
    systemPrompt: SYSTEM_PROMPT,
    welcomeMessage: 'Hello! Welcome to ShadowSpark Technologies. How can I help you today?',
    fallbackMessage: 'Let me connect you with our team for personalized assistance.',
    active: true,
    channels: {
      whatsapp: {
        enabled: true,
        number: 'whatsapp:+234XXXXXXXXXX'
      }
    }
  }
});
```

### TypeScript Import

Since this is a CommonJS module (`.js` file), import it in TypeScript like this:

```typescript
import shadowsparkKnowledge = require('./config/shadowspark-knowledge.js');
const { SYSTEM_PROMPT, SHADOWSPARK_KNOWLEDGE } = shadowsparkKnowledge;
```

Or using dynamic import:

```typescript
const { SYSTEM_PROMPT, SHADOWSPARK_KNOWLEDGE } = await import('./config/shadowspark-knowledge.js');
```

### Customizing the Knowledge Base

To customize the knowledge base for different clients:

1. Create a new file based on `shadowspark-knowledge.js`
2. Modify the content to match the client's business
3. Follow the same structure for consistency
4. Export `SYSTEM_PROMPT` and optionally `KNOWLEDGE_BASE` constants

### Knowledge Base Content Structure

The knowledge base includes:

1. **About Section**: Company background, mission, and vision
2. **Services**: Detailed descriptions of all offerings with pricing
3. **Pricing Summary**: Quick reference table
4. **FAQ**: Common customer questions and answers
5. **Consultation Info**: How to book consultations and contact information
6. **Conversation Guidelines**: Instructions for the AI on how to interact with customers

### Notes

- The knowledge base is designed for Nigerian businesses and includes:
  - Nigerian Naira (₦) pricing
  - Port Harcourt location references
  - Support for English and Pidgin English
  - Cultural awareness of Nigerian business context
  
- The system prompt includes the full knowledge base, so you only need to use `SYSTEM_PROMPT` in most cases

- Monthly costs and service details are embedded in the knowledge base, so keep it updated when pricing changes

## Build Process

The build script (`npm run build`) copies JavaScript files from `src/config/` to `dist/config/` to ensure they're available in the production build.
