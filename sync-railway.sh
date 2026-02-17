#!/bin/bash
cd /home/shadowweaver/projects/shadowspark-chatbot

# Extract values from .env (removing quotes)
DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d'=' -f2- | tr -d '"')
DIRECT_URL=$(grep '^DIRECT_URL=' .env | cut -d'=' -f2- | tr -d '"')
TWILIO_ACCOUNT_SID=$(grep '^TWILIO_ACCOUNT_SID=' .env | cut -d'=' -f2- | tr -d '"')
TWILIO_AUTH_TOKEN=$(grep '^TWILIO_AUTH_TOKEN=' .env | cut -d'=' -f2- | tr -d '"')
TWILIO_WHATSAPP_NUMBER=$(grep '^TWILIO_WHATSAPP_NUMBER=' .env | cut -d'=' -f2- | tr -d '"')
OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env | cut -d'=' -f2- | tr -d '"')

# Set in Railway
railway variables set "DATABASE_URL=$DATABASE_URL"
railway variables set "DIRECT_URL=$DIRECT_URL"
railway variables set "TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID"
railway variables set "TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN"
railway variables set "TWILIO_WHATSAPP_NUMBER=$TWILIO_WHATSAPP_NUMBER"
railway variables set "OPENAI_API_KEY=$OPENAI_API_KEY"
railway variables set "NODE_ENV=production"

echo "✅ All variables updated in Railway"
