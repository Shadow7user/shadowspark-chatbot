#!/bin/bash

###############################################################################
# ShadowSpark Chatbot - Railway Deployment Script
# This script guides you through deploying to Railway
###############################################################################

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🚀 ShadowSpark Chatbot - Railway Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found."
    echo ""
    echo "Install it with:"
    echo "  npm install -g @railway/cli"
    echo ""
    echo "Or follow manual deployment steps in PRIORITY_1_CHECKLIST.md"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Check if logged in
echo "🔐 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway"
    echo ""
    echo "Please login:"
    echo "  railway login"
    echo ""
    exit 1
fi

echo "✅ Logged in to Railway"
echo ""

# Check if project is linked
echo "🔗 Checking project link..."
if ! railway status &> /dev/null; then
    echo "⚠️  No Railway project linked"
    echo ""
    echo "Options:"
    echo "  1. Link existing project: railway link"
    echo "  2. Create new project: railway init"
    echo ""
    read -p "Create new project? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        railway init
    else
        echo "Please run 'railway link' to link existing project"
        exit 1
    fi
fi

echo "✅ Project linked"
echo ""

# Check environment variables
echo "🔧 Checking environment variables..."
echo ""
echo "Required variables:"
echo "  - DATABASE_URL (Neon PostgreSQL)"
echo "  - TWILIO_ACCOUNT_SID (starts with AC)"
echo "  - TWILIO_AUTH_TOKEN"
echo "  - TWILIO_WHATSAPP_NUMBER"
echo "  - OPENAI_API_KEY"
echo "  - REDIS_URL"
echo "  - NODE_ENV=production"
echo "  - ADMIN_SECRET"
echo ""

read -p "Have you set all environment variables in Railway dashboard? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please set environment variables first:"
    echo "  1. Go to Railway dashboard"
    echo "  2. Select your project"
    echo "  3. Go to Variables tab"
    echo "  4. Add all required variables"
    echo ""
    echo "See PRIORITY_1_CHECKLIST.md Step 3 for details"
    exit 1
fi

echo ""
echo "✅ Environment variables confirmed"
echo ""

# Deploy
echo "🚀 Starting deployment..."
echo ""

railway up

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   ✅ Deployment initiated!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Check deployment logs: railway logs"
echo "  2. Get your URL: railway domain"
echo "  3. Test health: curl https://YOUR_URL/health"
echo "  4. Run migration: railway run npx prisma migrate deploy"
echo ""
echo "See PRIORITY_1_CHECKLIST.md for complete steps"
echo ""
