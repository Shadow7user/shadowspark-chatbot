# Redis Configuration for ShadowSpark Chatbot

**Date:** February 21, 2026  
**Status:** ✅ Configured

---

## Redis Connection Details

Based on the credentials provided earlier, here is your Redis configuration:

### Redis URL (Full Connection String)

```
redis://default:FLegCcc1HB19oEiwKLmTcL5FiGn6HCjf@redis-19270.c325.us-east-1-4.ec2.cloud.redislabs.com:19270
```

### Breakdown:

- **Protocol:** `redis://`
- **Username:** `default`
- **Password:** `FLegCcc1HB19oEiwKLmTcL5FiGn6HCjf`
- **Host:** `redis-19270.c325.us-east-1-4.ec2.cloud.redislabs.com`
- **Port:** `19270`

---

## How to Use

### For .env File

Add this to your `.env` file:

```env
REDIS_URL=redis://default:FLegCcc1HB19oEiwKLmTcL5FiGn6HCjf@redis-19270.c325.us-east-1-4.ec2.cloud.redislabs.com:19270
```

### For Railway Deployment

In Railway dashboard, add this environment variable:

**Variable Name:** `REDIS_URL`  
**Value:** `redis://default:FLegCcc1HB19oEiwKLmTcL5FiGn6HCjf@redis-19270.c325.us-east-1-4.ec2.cloud.redislabs.com:19270`

---

## Test Connection

You can test the Redis connection using the test script:

```bash
# After setting up .env
npx tsx src/test-connection.ts
```

Or test directly with redis-cli:

```bash
redis-cli -h redis-19270.c325.us-east-1-4.ec2.cloud.redislabs.com -p 19270 -a FLegCcc1HB19oEiwKLmTcL5FiGn6HCjf ping
```

Expected response: `PONG`

---

## Redis Provider

- **Provider:** Redis Labs / Redis Cloud
- **Region:** us-east-1-4 (AWS EC2)
- **Database ID:** redis-19270

---

## What Redis Is Used For

In your chatbot architecture, Redis is used for:

1. **BullMQ Job Queue** - Message processing queue
2. **Worker Coordination** - Manages async job processing
3. **Rate Limiting** - Queue rate limits (20 jobs/second)

**Note:** Redis is optional. If not configured, the system falls back to synchronous message processing.

---

## Security Notes

- ✅ Connection uses password authentication
- ✅ TLS/SSL encryption recommended for production
- ✅ Password is complex and secure
- ⚠️ Never commit this password to version control
- ⚠️ Use environment variables only

---

## Redis Console Access

You can manage your Redis instance at:
- **Console:** https://console.redislabs.com (if using Redis Cloud)
- **API Key:** A2wlgtzba1upr5m7kceoqptj2vpjkutwwtgej6ovdtp6qxh75mg

---

## Quick Reference

**Copy this for Railway:**
```
redis://default:FLegCcc1HB19oEiwKLmTcL5FiGn6HCjf@redis-19270.c325.us-east-1-4.ec2.cloud.redislabs.com:19270
```

**Status:** ✅ Ready to use

---

**Next Steps:**
1. Add to `.env` file (for local development)
2. Add to Railway environment variables (for production)
3. Test connection with `npx tsx src/test-connection.ts`
