# SigmaFlow — Trading Signals Platform

Live trading signals, provider stats, AI analysis & trade journal. PWA — installs on phone and desktop.

---

## STEP 1: Run this SQL in Supabase SQL Editor

```sql
create table providers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  avatar text,
  bio text,
  badge text default 'VERIFIED',
  win_rate integer default 0,
  total_signals integer default 0,
  total_pips integer default 0,
  followers integer default 0,
  streak integer default 0,
  assets text[] default '{}',
  created_at timestamp with time zone default now()
);

create table signals (
  id uuid default gen_random_uuid() primary key,
  asset text not null,
  asset_class text not null,
  type text not null check (type in ('BUY','SELL')),
  entry numeric not null,
  sl numeric not null,
  tp1 numeric not null,
  tp2 numeric,
  confidence integer default 75,
  status text default 'ACTIVE',
  pips integer default 0,
  tags text[] default '{}',
  provider_id uuid references providers(id),
  provider_name text,
  notes text,
  created_at timestamp with time zone default now()
);

create table journal (
  id uuid default gen_random_uuid() primary key,
  asset text not null,
  type text not null check (type in ('BUY','SELL')),
  entry numeric not null,
  exit_price numeric,
  pips integer default 0,
  rr text,
  outcome text check (outcome in ('WIN','LOSS','BREAKEVEN')),
  notes text,
  signal_id uuid references signals(id),
  traded_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

alter publication supabase_realtime add table signals;

alter table signals enable row level security;
alter table providers enable row level security;
alter table journal enable row level security;

create policy "Public read signals" on signals for select using (true);
create policy "Public read providers" on providers for select using (true);
create policy "Public read journal" on journal for select using (true);
create policy "Anon insert signals" on signals for insert with check (true);
create policy "Anon insert providers" on providers for insert with check (true);
create policy "Anon insert journal" on journal for insert with check (true);
create policy "Anon update signals" on signals for update using (true);

insert into providers (name, avatar, bio, badge, win_rate, total_signals, total_pips, followers, streak, assets)
values ('StevenFX', 'SF', 'SMC & FVG specialist. Prop trader. Uganda 🇺🇬', 'ELITE', 84, 142, 4820, 1204, 9, ARRAY['XAUUSD','GBPUSD','EURUSD']);
```

---

## STEP 2: Push to GitHub

```bash
cd sigmaflow
git init
git add .
git commit -m "SigmaFlow v1 — PWA trading signals platform"
git branch -M main
# Create a new repo on github.com called "sigmaflow", then:
git remote add origin https://github.com/YOUR_USERNAME/sigmaflow.git
git push -u origin main
```

---

## STEP 3: Deploy on Vercel

1. Go to vercel.com → New Project → Import from GitHub → select `sigmaflow`
2. Add these Environment Variables in Vercel:
   - `SUPABASE_URL` = `https://nscxzzyksjzdekbnuhgq.supabase.co`
   - `SUPABASE_SERVICE_KEY` = (your service_role key from Supabase Settings → API)
   - `WEBHOOK_SECRET` = any secret string you choose (e.g. `sigmaflow-2024`)
3. Click Deploy → wait ~1 min → get your live URL

---

## STEP 4: Install as PWA

**On Android (Chrome):**
- Open your Vercel URL in Chrome
- Tap ⋮ menu → "Add to Home Screen" → Install
- SigmaFlow icon appears on your home screen

**On Desktop (Chrome/Edge):**
- Open your Vercel URL
- Click the install icon (⊕) in the address bar
- Click Install → SigmaFlow opens as a standalone app

---

## MT5 / TradingView Webhook (Automatic Signals)

POST to: `https://your-app.vercel.app/api/webhook`

```json
{
  "secret": "your-webhook-secret",
  "asset": "XAUUSD",
  "asset_class": "Forex",
  "type": "BUY",
  "entry": 2334.50,
  "sl": 2318.00,
  "tp1": 2355.00,
  "tp2": 2375.00,
  "confidence": 85,
  "tags": ["SMC", "FVG", "London"],
  "provider_name": "StevenFX",
  "notes": "4H FVG fill"
}
```

In TradingView: Alerts → Webhook URL → paste the above endpoint.
In MT5: Use an EA to POST to the webhook on signal events.
