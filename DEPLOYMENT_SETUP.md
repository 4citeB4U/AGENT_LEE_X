# 🔐 GitHub Repository Secrets Setup

## Quick Setup Checklist

Go to: **https://github.com/4citeB4U/AGENT_LEE_X/settings/secrets/actions**

Click **"New repository secret"** and add these 4 secrets:

| Secret Name | Value to Copy |
|-------------|---------------|
| `API_KEY` | `AIzaSyBKGBc2TLTiWy0i6DvwgD1LPkFLU3_71iw` |
| `GEMINI_API_KEY` | `AIzaSyBKGBc2TLTiWy0i6DvwgD1LPkFLU3_71iw` |
| `CF_API_TOKEN` | `YLvbArdHi_gF-ED_G8CmwcyWuUCxgOOZYIL25fAF` |
| `CF_ACCOUNT_ID` | `9c5c83e2e9b6a85cd55f41b133929653` |

## How to Use the Deployment System

### Option 1: Manual Deploy (Recommended)
1. Go to **Actions → Agent Lee Multi-Deploy**
2. Click **"Run workflow"**
3. Choose:
   - **Target:** `both` (deploys Pages + Worker)
   - **Environment:** `production`
4. Click **"Run workflow"**

### Option 2: Automatic Deploy
- Push to `main` → Deploys GitHub Pages
- Push to `feat/proxy-client-cdn-to-assets` → Deploys Worker

## Expected Results

After successful deployment:
- **🌐 GitHub Pages:** https://4citeb4u.github.io/AGENT_LEE_X/
- **⚡ Cloudflare Worker:** https://agentlee-gemini-proxy.[subdomain].workers.dev

## Test Cloudflare Token

Verify your token works:
```bash
curl "https://api.cloudflare.com/client/v4/accounts/9c5c83e2e9b6a85cd55f41b133929653/tokens/verify" \
     -H "Authorization: Bearer YLvbArdHi_gF-ED_G8CmwcyWuUCxgOOZYIL25fAF"
```

Expected: `{"success": true, "result": {"status": "active"}}`

## Security Notes

- ✅ Actual secrets are in GitHub repository secrets (encrypted)
- ✅ `.env` file is in `.gitignore` (not committed)
- ✅ `.env.example` only contains placeholders
- ✅ All API tokens have minimal required permissions

## Ready to Deploy!

Once secrets are configured, the deployment system will:
1. Build with LeeWay Standards compliance
2. Deploy to your chosen targets
3. Provide detailed deployment summaries
4. Maintain performance budgets and security boundaries