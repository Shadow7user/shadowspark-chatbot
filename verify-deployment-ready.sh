#!/bin/bash

###############################################################################
# ShadowSpark Chatbot - Deployment Readiness Verification
# Checks if all requirements are met for deployment
###############################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🔍 Deployment Readiness Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PASSED=0
FAILED=0

# Check Node.js
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "  ✅ Node.js $NODE_VERSION"
    ((PASSED++))
else
    echo "  ❌ Node.js not found"
    ((FAILED++))
fi

# Check npm
echo "📦 Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "  ✅ npm $NPM_VERSION"
    ((PASSED++))
else
    echo "  ❌ npm not found"
    ((FAILED++))
fi

# Check package.json
echo "📄 Checking package.json..."
if [ -f "package.json" ]; then
    echo "  ✅ package.json exists"
    ((PASSED++))
else
    echo "  ❌ package.json not found"
    ((FAILED++))
fi

# Check Procfile
echo "📄 Checking Procfile..."
if [ -f "Procfile" ]; then
    echo "  ✅ Procfile exists"
    ((PASSED++))
else
    echo "  ❌ Procfile not found"
    ((FAILED++))
fi

# Check railway.toml
echo "📄 Checking railway.toml..."
if [ -f "railway.toml" ]; then
    echo "  ✅ railway.toml exists"
    ((PASSED++))
else
    echo "  ❌ railway.toml not found"
    ((FAILED++))
fi

# Check tsconfig.json
echo "📄 Checking tsconfig.json..."
if [ -f "tsconfig.json" ]; then
    echo "  ✅ tsconfig.json exists"
    ((PASSED++))
else
    echo "  ❌ tsconfig.json not found"
    ((FAILED++))
fi

# Check .env.example
echo "📄 Checking .env.example..."
if [ -f ".env.example" ]; then
    echo "  ✅ .env.example exists"
    ((PASSED++))
else
    echo "  ❌ .env.example not found"
    ((FAILED++))
fi

# Check node_modules
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "  ✅ Dependencies installed"
    ((PASSED++))
else
    echo "  ⚠️  Dependencies not installed (run: npm install)"
    ((FAILED++))
fi

# Check build
echo "🔨 Checking TypeScript build..."
if npm run build &> /dev/null; then
    echo "  ✅ Build successful"
    ((PASSED++))
else
    echo "  ❌ Build failed (run: npm run build)"
    ((FAILED++))
fi

# Check dist directory
echo "📂 Checking dist directory..."
if [ -d "dist" ]; then
    echo "  ✅ dist/ directory exists"
    ((PASSED++))
else
    echo "  ❌ dist/ directory not found"
    ((FAILED++))
fi

# Check Prisma schema
echo "📄 Checking Prisma schema..."
if [ -f "prisma/schema.prisma" ]; then
    echo "  ✅ Prisma schema exists"
    ((PASSED++))
else
    echo "  ❌ Prisma schema not found"
    ((FAILED++))
fi

# Check .gitignore
echo "📄 Checking .gitignore..."
if [ -f ".gitignore" ]; then
    if grep -q ".env" ".gitignore"; then
        echo "  ✅ .gitignore configured (.env excluded)"
        ((PASSED++))
    else
        echo "  ⚠️  .env should be in .gitignore"
        ((FAILED++))
    fi
else
    echo "  ❌ .gitignore not found"
    ((FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Results: $PASSED passed, $FAILED failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✅ All checks passed! Ready for deployment."
    echo ""
    echo "Next steps:"
    echo "  1. Set environment variables in Railway"
    echo "  2. Run: ./deploy-to-railway.sh"
    echo "  OR follow: PRIORITY_1_CHECKLIST.md"
    exit 0
else
    echo "❌ Some checks failed. Please fix issues before deploying."
    exit 1
fi
