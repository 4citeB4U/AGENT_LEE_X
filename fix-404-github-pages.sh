#!/bin/bash
# 🚨 QUICK FIX for Agent Lee X 404 Issue
# Run this script when you have computer access to GitHub

echo "🚀 Agent Lee X - 404 Fix Script"
echo "================================="
echo ""
echo "This script will help you fix the 404 issue by guiding you through the required steps."
echo ""

echo "📋 STEP-BY-STEP INSTRUCTIONS:"
echo ""

echo "1. 🔧 CRITICAL: Fix GitHub Pages Configuration"
echo "   → Go to: https://github.com/4citeB4U/AGENT_LEE_X/settings/pages"
echo "   → Change 'Source' from 'Deploy from a branch' to 'GitHub Actions'"
echo "   → This is the MOST IMPORTANT step!"
echo ""

echo "2. 🔐 Add Repository Secrets"
echo "   → Go to: https://github.com/4citeB4U/AGENT_LEE_X/settings/secrets/actions"
echo "   → Add these 4 secrets (click 'New repository secret' for each):"
echo ""
echo "   API_KEY = AIzaSyBKGBc2TLTiWy0i6DvwgD1LPkFLU3_71iw"
echo "   GEMINI_API_KEY = AIzaSyBKGBc2TLTiWy0i6DvwgD1LPkFLU3_71iw"
echo "   CF_API_TOKEN = YLvbArdHi_gF-ED_G8CmwcyWuUCxgOOZYIL25fAF"
echo "   CF_ACCOUNT_ID = 9c5c83e2e9b6a85cd55f41b133929653"
echo ""

echo "3. 🚀 Trigger Deployment"
echo "   → Go to: https://github.com/4citeB4U/AGENT_LEE_X/actions"
echo "   → Click 'Agent Lee Multi-Deploy'"
echo "   → Click 'Run workflow'"
echo "   → Select Target: 'pages' and Environment: 'production'"
echo "   → Click 'Run workflow'"
echo ""

echo "4. ✅ Verify Fix"
echo "   → Wait for workflow to complete (2-3 minutes)"
echo "   → Visit: https://4citeB4U.github.io/AGENT_LEE_X/"
echo "   → Should load properly without 404 errors"
echo ""

echo "🔍 PROBLEM EXPLANATION:"
echo "Your site is serving source TypeScript files (index.tsx) instead of"
echo "built JavaScript bundles. The fix changes GitHub Pages to use the"
echo "built assets from the workflow instead of raw source files."
echo ""

echo "💡 QUICK CHECK:"
echo "After the fix, inspect element should show:"
echo "  <script src=\"/AGENT_LEE_X/assets/index-[hash].js\"></script>"
echo "Instead of:"
echo "  <script src=\"./index.tsx\"></script>"
echo ""

read -p "Press Enter when you have completed all steps above..."

echo ""
echo "🎉 All done! Your Agent Lee X should now be working at:"
echo "   https://4citeB4U.github.io/AGENT_LEE_X/"