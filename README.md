# Han Digital Sales

Mobile-first sales and stock manager for digital products such as Gemini Pro,
VPN, and CapCut Pro.

## Features

- Product stock, buy/sell prices, and expiry tracking
- Automatic revenue and profit summaries
- KPay, Wave, bank, cash, and USDT payment records
- Admin and staff roles with shared Supabase data
- Responsive Next.js interface designed for phones

## Run locally

```bash
npm install
npm run dev
```

The Supabase project URL and publishable client key are configured in
`lib/supabase/config.ts`. Database permissions and role checks are enforced by
Supabase Row Level Security.

## Deploy

Import this repository into Vercel. Vercel detects Next.js automatically; no
additional environment variables are required for the current configuration.
