#!/bin/bash

# Health Endpoint Tester
# Tests the /health endpoint and validates response

if [ -z "$1" ]; then
    echo "Usage: $0 <railway-url>"
    echo "Example: $0 https://your-app.railway.app"
    exit 1
fi

URL="$1"
HEALTH_URL="${URL}/health"

echo "Testing health endpoint: ${HEALTH_URL}"
echo ""

# Make the request
RESPONSE=$(curl -s -w "\n%{http_code}" "${HEALTH_URL}" 2>/dev/null || echo "ERROR")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "Status Code: ${HTTP_CODE}"
echo "Response Body: ${BODY}"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | grep -q '"status":"ok"'; then
        echo "✅ Health check passed - server is operational"
        exit 0
    else
        echo "⚠️  Server responded but status unclear"
        exit 1
    fi
else
    echo "❌ Health check failed"
    exit 1
fi
