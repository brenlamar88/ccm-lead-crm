# CCM Lead CRM — Anchored Health

A full lead generation + CRM pipeline tool for Anchored Health care management outreach.

## What it does
- **Generate page** — enter a market, get scored primary care leads with personalized outreach emails
- **Pipeline board** — Kanban view: New → Contacted → Demo Scheduled → Closed Won / Lost
- **Supabase** — every lead saved, status and notes persist across sessions

---

## Deploy in 5 steps

### Step 1 — Push to GitHub
1. Create a new repo at github.com under your `brenlamar88` account — name it `ccm-lead-crm`
2. Upload all these files to the repo (or push via git)

### Step 2 — Set up Supabase
1. Go to supabase.com → New project
2. Open the SQL editor and run the contents of `supabase-schema.sql`
3. Copy your **Project URL** and **anon/public key** from Settings → API

### Step 3 — Get your Anthropic API key
1. Go to console.anthropic.com → API Keys
2. Create a new key — copy it

### Step 4 — Deploy to Vercel
1. Go to vercel.com → New Project → Import from GitHub → select `ccm-lead-crm`
2. Under **Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your Anthropic key
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
3. Click Deploy

### Step 5 — Done
Your app will be live at `ccm-lead-crm.vercel.app` (or a custom domain).

---

## Usage
1. Go to the **Generate** tab — enter city, state, practice type, lead count, value prop
2. Click **Find & Qualify Leads** — Claude generates scored leads server-side
3. Click **Save all to CRM** — leads saved to Supabase
4. Go to **Pipeline** — drag leads through stages, add notes, copy outreach emails

---

## Tech stack
- Next.js 14 (pages router)
- Supabase (Postgres + REST)
- Anthropic Claude API (server-side via API route)
- Vercel (hosting)
