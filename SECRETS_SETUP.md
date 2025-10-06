# 🔐 GitHub Secrets Setup Guide

This file explains how to configure the required repository secrets for Agent Lee X deployment workflows.

## Required Secrets

Go to **GitHub → Your Repository → Settings → Secrets and variables → Actions → New repository secret**

### 1. API_KEY
- **Value:** Your Gemini API key
- **Get from:** https://aistudio.google.com/app/apikey
- **Used for:** GitHub Pages build environment variable

### 2. CF_API_TOKEN
- **Value:** `723p07qZWWfxHVfFrt9eNzX4fIMizDAZvqvWTGq0`
- **Used for:** Cloudflare Worker deployment authentication
- **Permissions:** Zone:Zone Settings:Read, Zone:Zone:Read, Account:Cloudflare Workers:Edit

### 3. CF_ACCOUNT_ID
- **Value:** `9c5c83e2e9b6a85cd55f41b133929653`
- **Get from:** Cloudflare Dashboard → Right sidebar
- **Used for:** Cloudflare Worker account targeting

### 4. GEMINI_API_KEY
- **Value:** Your Gemini API key (same as API_KEY)
- **Used for:** Cloudflare Worker runtime environment

## Test Your Cloudflare Token

Run this command to verify your CF_API_TOKEN is working:

```bash
curl "https://api.cloudflare.com/client/v4/accounts/9c5c83e2e9b6a85cd55f41b133929653/tokens/verify" \
     -H "Authorization: Bearer 723p07qZWWfxHVfFrt9eNzX4fIMizDAZvqvWTGq0"
```

Expected response:
```json
{
  "result": {
    "id": "...",
    "status": "active"
  },
  "success": true
}
```

## Deployment Workflow Options

After setting up secrets, you can deploy using:

### Manual Deployment
1. Go to **Actions → Agent Lee Multi-Deploy → Run workflow**
2. Choose options:
   - **Target:** `pages`, `worker`, or `both`
   - **Environment:** `production`, `staging`, or `preview`

### Automatic Deployment
- **Push to `main`** → Deploys GitHub Pages
- **Push to `feat/proxy-client-cdn-to-assets`** → Deploys Cloudflare Worker

## URLs After Deployment

- **GitHub Pages:** https://4citeb4u.github.io/AGENT_LEE_X/
- **Cloudflare Worker:** https://agentlee-gemini-proxy.your-subdomain.workers.dev

## Security Notes

- Never commit actual API tokens to the repository
- Use repository secrets for all sensitive values
- Rotate tokens periodically for security
- The CF_API_TOKEN shown here is for Agent_Lee_X project only

## Troubleshooting

If deployment fails:
1. Verify all 4 secrets are configured correctly
2. Check the token has proper permissions
3. Ensure GitHub Pages is enabled in repository settings
4. Review the Actions logs for specific error messages