# Enhanced Features Documentation

This document describes the five new intelligent layers added to the ShadowSpark Chatbot.

## 1. Intent Classifier Layer

### Overview
The intent classifier automatically categorizes incoming user messages into predefined intent types to enable smarter routing and analytics.

### Intent Types
- **ESCALATION**: Urgent requests, demands to speak with a manager
- **COMPLAINT**: Issues, problems, frustrations
- **SUPPORT**: Help requests, troubleshooting
- **SALES**: Purchase inquiries, pricing questions
- **FAQ**: General information questions
- **FEEDBACK**: Suggestions, compliments, thank you messages
- **GENERAL**: Catch-all for uncategorized messages

### Implementation
- **File**: `src/core/intent-classifier.ts`
- **Method**: `classifyIntent(text: string): IntentClassification`
- **Features**:
  - Pattern-based classification using regex
  - Confidence scoring (0-1)
  - Priority-based classification (ESCALATION > COMPLAINT > others)
  - Automatic escalation triggers for high-priority intents

### Database Schema
```prisma
model Message {
  intent      IntentType?
  confidence  Float?
  priority    Int @default(5)
}

enum IntentType {
  SUPPORT
  SALES
  COMPLAINT
  FAQ
  ESCALATION
  GENERAL
  FEEDBACK
}
```

### Usage Example
```typescript
import { classifyIntent, shouldEscalate } from './core/intent-classifier';

const classification = classifyIntent("This is urgent! I need to speak with a manager!");
// Returns: { intent: "ESCALATION", confidence: 0.9 }

if (shouldEscalate(classification.intent, classification.confidence)) {
  // Trigger immediate escalation
}
```

---

## 2. Priority Routing (Stable Intelligent Routing Engine)

### Overview
Dynamic priority calculation for message processing based on intent, user VIP status, and conversation history.

### Priority Levels
- **1 = Critical**: Escalations, complaints from VIP users
- **2 = High**: Complaints, urgent support
- **3 = Medium**: General support, sales inquiries
- **4 = Normal**: FAQ, general inquiries
- **5 = Low**: Feedback, informational

### Implementation
- **File**: `src/core/priority-router.ts`
- **Method**: `computeMessagePriority(intent, confidence, isVipUser, messageCount)`
- **Features**:
  - Intent-based priority scoring
  - VIP user boost (+1 priority)
  - High confidence boost for critical intents
  - Conversation persistence boost (multi-turn conversations)
  - Fast-track detection for critical messages

### Database Schema
```prisma
model ChatUser {
  isVip Boolean @default(false)
}

model Message {
  priority Int @default(5)
}
```

### Queue Integration
Messages are enqueued with computed priority for optimal processing order:
```typescript
await messageQueue.add("process-message", msg, {
  priority: computedPriority  // Lower number = higher priority
});
```

### Usage Example
```typescript
import { computeMessagePriority } from './core/priority-router';

const priorityScore = computeMessagePriority(
  "COMPLAINT",  // intent
  0.85,         // confidence
  true,         // isVipUser
  4             // messageCount
);
// Returns: { priority: 1, reason: "Base priority for COMPLAINT, VIP user boost, high confidence boost, conversation persistence boost" }
```

---

## 3. Cost Guard Before AI Call

### Overview
Pre-emptive cost control system that prevents AI calls when daily or monthly cost limits are approaching or exceeded.

### Cost Tracking
- **Daily cost limits**: Prevent overspending within a 24-hour period
- **Monthly cost limits**: Enforce monthly budget caps
- **Per-request estimation**: Calculate cost before making AI calls
- **Automatic reset**: Daily and monthly counters reset automatically

### Implementation
- **File**: `src/core/cost-guard.ts`
- **Key Methods**:
  - `checkCostGuard(clientId, estimatedCost)`: Pre-flight cost check
  - `incrementCostUsage(clientId, actualCost)`: Post-call cost tracking
  - `estimateCost(contextTokens, expectedOutputTokens)`: Cost estimation

### Database Schema
```prisma
model ClientConfig {
  monthlyCostUsage  Float   @default(0)
  monthlyCostCap    Float?
  dailyCostUsage    Float   @default(0)
  dailyCostCap      Float?
  lastCostResetDate String?
}
```

### Cost Calculation
- **Base rate**: $0.0000015 per token (GPT-3.5-turbo pricing)
- **Estimation**: ~4 characters per token
- **Formula**: `(inputTokens + outputTokens) * costPerToken`

### Usage Example
```typescript
import { checkCostGuard, estimateCost, incrementCostUsage } from './core/cost-guard';

// Before AI call
const contextTokens = estimateContextTokens(messages);
const estimate = estimateCost(contextTokens);
const guardResult = await checkCostGuard(clientId, estimate.estimatedCost);

if (!guardResult.allowed) {
  // Send cost limit message instead of calling AI
  return;
}

// After AI call
await incrementCostUsage(clientId, actualCost);
```

### Fallback Messages
- **Daily limit**: "Our automated assistant has reached its daily usage limit. Please try again tomorrow or contact us directly for immediate assistance."
- **Monthly limit**: "Our automated assistant has reached its monthly usage limit. Please contact us directly for assistance."

---

## 4. Admin Escalation Queue

### Overview
Dedicated queue management system for conversations requiring human intervention, with priority-based assignment and tracking.

### Queue Types
- **SUPPORT**: Technical support issues
- **SALES**: Sales inquiries requiring human touch
- **COMPLAINT**: Customer complaints
- **TECHNICAL**: Technical problems
- **GENERAL**: General escalations

### Escalation Status
- **PENDING**: Awaiting assignment
- **ASSIGNED**: Assigned to an admin
- **IN_PROGRESS**: Being actively handled
- **RESOLVED**: Completed
- **CANCELLED**: No longer needed

### Implementation
- **File**: `src/core/admin-queue.ts`
- **Key Methods**:
  - `createEscalation()`: Create new escalation entry
  - `getPendingEscalations()`: Get queue ordered by priority
  - `assignEscalation()`: Assign to admin
  - `resolveEscalation()`: Mark as resolved

### Database Schema
```prisma
model EscalationQueue {
  id             String              @id @default(cuid())
  conversationId String
  priority       Int                 @default(5)
  queueType      EscalationQueueType @default(SUPPORT)
  reason         String?
  assignedTo     String?
  status         EscalationStatus    @default(PENDING)
  createdAt      DateTime            @default(now())
  resolvedAt     DateTime?
  updatedAt      DateTime            @updatedAt
}
```

### API Endpoints

#### Get Pending Escalations
```
GET /admin/escalations?queueType=COMPLAINT&limit=50
Headers: x-admin-secret: <your-admin-secret>

Response:
{
  "escalations": [...],
  "count": 10
}
```

#### Get Escalation Statistics
```
GET /admin/escalations/stats?queueType=COMPLAINT
Headers: x-admin-secret: <your-admin-secret>

Response:
{
  "stats": {
    "pending": 5,
    "assigned": 3,
    "inProgress": 2,
    "resolved": 45,
    "avgPriority": 2.5
  }
}
```

#### Assign Escalation
```
POST /admin/escalations/:id/assign
Headers: x-admin-secret: <your-admin-secret>
Body: { "assignedTo": "admin@example.com" }

Response:
{
  "escalation": { ... }
}
```

#### Mark In Progress
```
POST /admin/escalations/:id/progress
Headers: x-admin-secret: <your-admin-secret>
```

#### Resolve Escalation
```
POST /admin/escalations/:id/resolve
Headers: x-admin-secret: <your-admin-secret>
```

### Automatic Escalation
Conversations are automatically escalated when:
- User types keywords: "agent", "human", "support"
- Intent is ESCALATION with confidence > 0.8
- Intent is COMPLAINT with confidence > 0.8
- Multiple support messages without resolution

---

## 5. Analytics Event Logging

### Overview
Comprehensive conversation analytics tracking for insights into chatbot performance, user intents, and resource usage.

### Tracked Metrics
- **Message counts**: Total, user, and AI messages
- **Intent distribution**: What users are asking about
- **Sentiment**: Overall conversation tone
- **Response time**: Average response latency
- **Cost tracking**: Total tokens and costs per conversation
- **Handoff reasons**: Why conversations were escalated

### Implementation
- **File**: `src/core/analytics-logger.ts`
- **Key Methods**:
  - `recordAnalytics()`: Record conversation event
  - `recordAIResponse()`: Track AI response metrics
  - `recordHandoff()`: Log escalation reason
  - `getClientAnalytics()`: Get aggregated stats

### Database Schema
```prisma
model ConversationAnalytics {
  id                String      @id @default(cuid())
  conversationId    String      @unique
  clientId          String
  messageCount      Int         @default(0)
  userMessageCount  Int         @default(0)
  aiMessageCount    Int         @default(0)
  intent            IntentType?
  sentiment         String?
  handoffReason     String?
  avgResponseTimeMs Int?
  totalCostUsed     Float       @default(0)
  totalTokensUsed   Int         @default(0)
  firstMessageAt    DateTime?
  lastMessageAt     DateTime?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}
```

### API Endpoints

#### Get Client Analytics
```
GET /analytics/client/:clientId?startDate=2024-01-01&endDate=2024-12-31
Headers: x-admin-secret: <your-admin-secret>

Response:
{
  "clientId": "shadowspark-demo",
  "analytics": {
    "totalConversations": 150,
    "totalMessages": 1200,
    "totalTokensUsed": 45000,
    "totalCostUsed": 0.0675,
    "avgResponseTimeMs": 850,
    "intentBreakdown": {
      "SUPPORT": 60,
      "SALES": 40,
      "FAQ": 30,
      "COMPLAINT": 10,
      "ESCALATION": 5,
      "GENERAL": 5
    },
    "handoffCount": 12
  }
}
```

#### Get Top Intents
```
GET /analytics/intents/:clientId?limit=5&startDate=2024-01-01
Headers: x-admin-secret: <your-admin-secret>

Response:
{
  "clientId": "shadowspark-demo",
  "topIntents": [
    { "intent": "SUPPORT", "count": 60, "percentage": 40 },
    { "intent": "SALES", "count": 40, "percentage": 27 },
    { "intent": "FAQ", "count": 30, "percentage": 20 },
    { "intent": "COMPLAINT", "count": 10, "percentage": 7 },
    { "intent": "ESCALATION", "count": 5, "percentage": 3 }
  ]
}
```

#### Get Analytics Dashboard
```
GET /analytics/dashboard?startDate=2024-01-01&endDate=2024-12-31
Headers: x-admin-secret: <your-admin-secret>

Response:
{
  "totalConversations": 500,
  "totalMessages": 4000,
  "avgResponseTimeMs": 825,
  "conversationsByIntent": [...]
}
```

### Automatic Tracking
Analytics are automatically recorded for:
- Every user message (intent, confidence, response time)
- Every AI response (tokens, cost)
- Every handoff event (reason)

---

## Integration Flow

Here's how all five features work together in the message processing pipeline:

```
1. Message Received
   ↓
2. User Resolution & Deduplication
   ↓
3. INTENT CLASSIFICATION ← New Feature #1
   - Classify message intent
   - Calculate confidence score
   ↓
4. PRIORITY CALCULATION ← New Feature #2
   - Compute priority based on intent, VIP status, history
   - Update message priority in DB
   ↓
5. ANALYTICS LOGGING ← New Feature #5
   - Record initial analytics event
   ↓
6. Check if Already in Handoff
   ↓
7. Escalation Detection
   - Keyword match OR
   - INTENT-BASED ESCALATION ← New Feature #1
   ↓
8. Create ADMIN ESCALATION QUEUE Entry ← New Feature #4
   (if escalated)
   ↓
9. COST GUARD CHECK ← New Feature #3
   - Estimate cost
   - Check daily/monthly limits
   - Block if exceeded
   ↓
10. Token Limit Check
   ↓
11. AI Response Generation
   ↓
12. Usage Tracking
   - Increment token usage
   - INCREMENT COST USAGE ← New Feature #3
   - RECORD AI RESPONSE ANALYTICS ← New Feature #5
   ↓
13. Send Response
   ↓
14. Log Success with Enhanced Metrics
```

---

## Configuration

### Environment Variables

No new environment variables are required. The system uses existing client configuration.

### Client Configuration

Update `ClientConfig` via database for cost limits:

```sql
UPDATE client_configs 
SET 
  monthly_cost_cap = 10.0,      -- $10 monthly limit
  daily_cost_cap = 1.0          -- $1 daily limit
WHERE client_id = 'shadowspark-demo';
```

### VIP Users

Mark users as VIP for priority routing:

```sql
UPDATE chat_users 
SET is_vip = true 
WHERE email = 'vip@example.com';
```

---

## Migration

To apply the new database schema:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Or create a migration (production)
npx prisma migrate dev --name add_enhanced_features
```

---

## Testing

### Test Intent Classification
```bash
curl -X POST http://localhost:3001/webhooks/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=I have an urgent problem!"
  
# Check logs for: "Intent classified as ESCALATION"
```

### Test Priority Routing
Check queue priority in Redis or logs:
```bash
# Messages with ESCALATION intent should have priority 1-2
# Messages with GENERAL intent should have priority 4-5
```

### Test Cost Guard
Set low cost cap and send multiple messages:
```sql
UPDATE client_configs 
SET daily_cost_cap = 0.001 
WHERE client_id = 'shadowspark-demo';
```

### Test Admin Escalation
```bash
# Send escalation trigger
curl -X POST http://localhost:3001/webhooks/whatsapp \
  -d "Body=I need to speak with a manager immediately!"

# Check escalation queue
curl http://localhost:3001/admin/escalations \
  -H "x-admin-secret: your-secret"
```

### Test Analytics
```bash
# Get analytics after sending messages
curl http://localhost:3001/analytics/client/shadowspark-demo \
  -H "x-admin-secret: your-secret"
```

---

## Security Notes

- All admin endpoints require `x-admin-secret` header
- Admin secret must be at least 16 characters (enforced by Zod)
- Cost guards fail open (allow on error) to prevent service disruption
- Analytics recording is non-blocking (logged but doesn't block flow)

---

## Performance Considerations

- Intent classification: < 5ms (regex-based, no AI calls)
- Priority calculation: < 1ms (simple arithmetic)
- Cost estimation: < 1ms (token counting)
- Analytics logging: Non-blocking (fire-and-forget)
- Admin queue operations: Indexed queries for fast retrieval

---

## Future Enhancements

Potential improvements for future iterations:

1. **Machine Learning Intent Classifier**: Replace regex with ML model
2. **Real-time Analytics Dashboard**: WebSocket-based live dashboard
3. **Advanced Sentiment Analysis**: Integrate NLP for sentiment detection
4. **Predictive Escalation**: ML model to predict escalation likelihood
5. **Cost Optimization**: Dynamic model selection based on intent complexity
6. **A/B Testing**: Compare different routing strategies
7. **Custom Intent Training**: Allow clients to define custom intents

---

## Troubleshooting

### Intent Not Being Classified
- Check logs for "Intent classification complete"
- Verify message content matches patterns in `intent-classifier.ts`
- Try adding more specific patterns for your use case

### Cost Guard Not Working
- Verify `daily_cost_cap` or `monthly_cost_cap` is set in ClientConfig
- Check logs for "Cost limit would be exceeded"
- Ensure cost estimation is returning positive values

### Analytics Not Recording
- Check for non-blocking errors in logs
- Verify ConversationAnalytics table exists
- Ensure database connection is stable

### Admin Endpoints Return 404
- Verify `ADMIN_SECRET` is set in environment
- Check that secret is at least 16 characters
- Ensure you're passing the correct header

---

## Support

For issues or questions:
1. Check logs for detailed error messages
2. Review the TypeScript types for API contracts
3. Consult the Prisma schema for data model details
4. Submit issues to the repository
