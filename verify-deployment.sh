#!/bin/bash

# =============================================================================
# Railway Deployment Verification Script for ShadowSpark Chatbot
# =============================================================================
# This script verifies that your Railway deployment is working correctly by
# testing key endpoints of the chatbot application.
#
# Usage:
#   1. Update SERVICE_URL with your Railway service URL
#   2. Make executable: chmod +x verify-deployment.sh
#   3. Run: ./verify-deployment.sh
#
# Requirements:
#   - curl (for HTTP requests)
#   - jq (for JSON parsing)
#
# Install jq:
#   macOS: brew install jq
#   Ubuntu/Debian: sudo apt install jq
#   CentOS/RHEL: sudo yum install jq
# =============================================================================

# Replace with your actual Railway service URL
# Example: SERVICE_URL="https://your-service.railway.app"
SERVICE_URL="${SERVICE_URL:-http://localhost:3001}"

echo "=============================================="
echo "Railway Deployment Verification"
echo "=============================================="
echo "Service URL: $SERVICE_URL"
echo ""

# Track overall test status
FAILED_TESTS=0

# =============================================================================
# Test 1: Health Check
# =============================================================================
echo "Test 1: Health Check"
echo "----------------------------------------------"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$SERVICE_URL/health")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HEALTH_CODE" -eq 200 ]; then
    echo "✅ Health Check Passed (Status: $HEALTH_CODE)"
    if command -v jq &> /dev/null && echo "$HEALTH_BODY" | jq -e '.status' > /dev/null 2>&1; then
        STATUS=$(echo "$HEALTH_BODY" | jq -r '.status')
        PROVIDER=$(echo "$HEALTH_BODY" | jq -r '.provider // "unknown"')
        echo "   Status: $STATUS"
        echo "   Provider: $PROVIDER"
    fi
else
    echo "❌ Health Check Failed (Status: $HEALTH_CODE)"
    echo "   Response: $HEALTH_BODY"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# =============================================================================
# Test 2: Webhook Endpoint Signature Validation
# =============================================================================
echo "Test 2: Webhook Endpoint (Signature Validation)"
echo "----------------------------------------------"
echo "Note: This test checks if the webhook endpoint is accessible."
echo "      It should return 403 (Forbidden) for invalid signatures in production."
echo ""

WEBHOOK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SERVICE_URL/webhooks/whatsapp" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "X-Twilio-Signature: invalid-test-signature" \
    -d "From=whatsapp:+1234567890&Body=Test&MessageSid=test123")
WEBHOOK_CODE=$(echo "$WEBHOOK_RESPONSE" | tail -n1)
WEBHOOK_BODY=$(echo "$WEBHOOK_RESPONSE" | sed '$d')

# In production, should return 403 for invalid signature
# In development, might return 200 with empty TwiML
if [ "$WEBHOOK_CODE" -eq 403 ] || [ "$WEBHOOK_CODE" -eq 200 ]; then
    echo "✅ Webhook Endpoint Accessible (Status: $WEBHOOK_CODE)"
    if [ "$WEBHOOK_CODE" -eq 403 ]; then
        echo "   Signature validation is working (rejected invalid signature)"
    elif [ "$WEBHOOK_CODE" -eq 200 ]; then
        echo "   Endpoint returned success (may be in development mode)"
        echo "   Response: $WEBHOOK_BODY"
    fi
else
    echo "❌ Webhook Test Failed (Status: $WEBHOOK_CODE)"
    echo "   Response: $WEBHOOK_BODY"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# =============================================================================
# Test 3: Server Connectivity
# =============================================================================
echo "Test 3: Server Connectivity & Response Time"
echo "----------------------------------------------"
START_TIME=$(date +%s%N)
CONNECTIVITY_RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" "$SERVICE_URL/health" 2>&1)
END_TIME=$(date +%s%N)
CONNECTIVITY_CODE=$(echo "$CONNECTIVITY_RESPONSE" | tail -n2 | head -n1)
RESPONSE_TIME=$(echo "$CONNECTIVITY_RESPONSE" | tail -n1)

if [ "$CONNECTIVITY_CODE" -eq 200 ]; then
    echo "✅ Server Connectivity Passed"
    echo "   Response Time: ${RESPONSE_TIME}s"
    
    # Warning if response time is too slow
    if command -v bc &> /dev/null; then
        IS_SLOW=$(echo "$RESPONSE_TIME > 2" | bc -l)
        if [ "$IS_SLOW" -eq 1 ]; then
            echo "   ⚠️  Warning: Response time is slow (>2s). Check server resources."
        fi
    fi
else
    echo "❌ Server Connectivity Failed"
    echo "   Could not connect to server or received error"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# =============================================================================
# Summary
# =============================================================================
echo "=============================================="
echo "Verification Summary"
echo "=============================================="

if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 All Tests Passed! Deployment is ready."
    echo ""
    echo "Your ShadowSpark Chatbot is successfully deployed and running."
    echo "Next steps:"
    echo "  1. Configure your Twilio webhook URL in the Twilio console"
    echo "  2. Set webhook URL to: $SERVICE_URL/webhooks/whatsapp"
    echo "  3. Test with a real WhatsApp message"
    exit 0
else
    echo "❌ $FAILED_TESTS Test(s) Failed"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check Railway logs: railway logs"
    echo "  2. Verify all environment variables are set"
    echo "  3. Ensure DATABASE_URL and REDIS_URL are accessible"
    echo "  4. Check that the service is not crash-looping"
    exit 1
fi
