#!/bin/bash

# ShadowSpark Chatbot - Final Deployment Steps Executor
# This script completes the final 2% of deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ShadowSpark Chatbot Deployment${NC}"
echo -e "${BLUE}  Final Steps Executor${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Get Railway URL
echo -e "${YELLOW}📋 STEP 1: Get Railway Public URL${NC}"
echo ""
echo "To get your Railway URL:"
echo "1. Go to https://railway.app"
echo "2. Open your project"
echo "3. Click on your service"
echo "4. Find the 'Public Domain' or 'Deployments' section"
echo "5. Copy the URL (e.g., your-app.railway.app)"
echo ""
read -p "Enter your Railway public URL (without https://): " RAILWAY_URL

if [ -z "$RAILWAY_URL" ]; then
    echo -e "${RED}❌ Error: Railway URL is required${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Railway URL: ${RAILWAY_URL}${NC}"
echo ""

# Step 2: Test Health Endpoint
echo -e "${YELLOW}🔍 STEP 2: Testing Health Endpoint${NC}"
echo ""

HEALTH_URL="https://${RAILWAY_URL}/health"
echo "Testing: ${HEALTH_URL}"
echo ""

# Make the request
RESPONSE=$(curl -s -w "\n%{http_code}" "${HEALTH_URL}" 2>/dev/null || echo "ERROR")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
    echo -e "${GREEN}   Status Code: ${HTTP_CODE}${NC}"
    echo -e "${GREEN}   Response: ${BODY}${NC}"
    echo ""
    
    # Check if response contains "status":"ok"
    if echo "$BODY" | grep -q '"status":"ok"'; then
        echo -e "${GREEN}✅ Server is operational!${NC}"
    else
        echo -e "${YELLOW}⚠️  Server responded but status unclear${NC}"
    fi
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo -e "${RED}   Status Code: ${HTTP_CODE}${NC}"
    echo -e "${RED}   Response: ${BODY}${NC}"
    echo ""
    echo "Possible issues:"
    echo "- Server is still starting up (wait 1-2 minutes)"
    echo "- Database migration in progress"
    echo "- Check Railway logs for errors"
    echo ""
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

echo ""

# Step 3: Twilio Webhook Configuration
echo -e "${YELLOW}📱 STEP 3: Configure Twilio Webhook${NC}"
echo ""
echo "Your webhook URL is:"
echo -e "${GREEN}https://${RAILWAY_URL}/webhooks/whatsapp${NC}"
echo ""
echo "To configure Twilio:"
echo "1. Go to https://console.twilio.com"
echo "2. Navigate to: Messaging > WhatsApp > Sandbox"
echo "3. Under 'When a message comes in':"
echo "   - Paste: https://${RAILWAY_URL}/webhooks/whatsapp"
echo "   - Method: POST"
echo "4. Click 'Save'"
echo ""
read -p "Press Enter when you've configured the webhook..."

echo ""

# Step 4: Test Instructions
echo -e "${YELLOW}🧪 STEP 4: Test Your Chatbot${NC}"
echo ""
echo "To test end-to-end:"
echo "1. Send a WhatsApp message to your Twilio sandbox number"
echo "2. Send: 'Hello'"
echo "3. You should receive an AI response"
echo ""
echo "If it works:"
echo -e "${GREEN}🎉 CONGRATULATIONS! Your chatbot is 100% operational!${NC}"
echo ""
echo "If it doesn't work, check:"
echo "- Railway logs (click 'View Logs' in Railway dashboard)"
echo "- Twilio webhook logs (Twilio console)"
echo "- Database connection (should see Prisma migration success)"
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deployment Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✅ Railway URL: https://${RAILWAY_URL}${NC}"
echo -e "${GREEN}✅ Health Endpoint: https://${RAILWAY_URL}/health${NC}"
echo -e "${GREEN}✅ Webhook URL: https://${RAILWAY_URL}/webhooks/whatsapp${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor Railway logs for any errors"
echo "2. Test with multiple WhatsApp messages"
echo "3. Check conversation history in database"
echo "4. Monitor token usage"
echo ""
echo -e "${GREEN}🚀 Your AI chatbot is now live!${NC}"
echo ""

exit 0
