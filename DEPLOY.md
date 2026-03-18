# Deploy ARIA in 60 seconds

## Option A — Vercel CLI (easiest)

1. Install Node.js if you don't have it: https://nodejs.org
2. Open Terminal / Command Prompt in this folder
3. Run:
   ```
   npx vercel deploy --prod
   ```
4. Follow prompts (sign in with GitHub, confirm project name)
5. Then add your API key:
   ```
   npx vercel env add OPENROUTER_API_KEY production
   ```
   Paste: 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
6. Redeploy: `npx vercel deploy --prod`

## Option B — GitHub + Vercel dashboard (no terminal needed)

1. Go to github.com → New repository → name it `aria` → Public → Create
2. Upload all these files (drag & drop): index.html, sw.js, manifest.json, icon.svg, api/chat.js, vercel.json, package.json
3. Go to vercel.com → New Project → Import your `aria` repo
4. In "Environment Variables" add:
   - Name: OPENROUTER_API_KEY
   - Value: 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
5. Click Deploy → done!

Your app will be live at: https://aria-assistant.vercel.app
