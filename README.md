# CLS Shop — Equipment & Work Orders

Equipment tracking, maintenance work orders, shop labor time and history for **Cory's Lawn Service**.

- **Frontend:** React + Material UI (Material Design 3 styling, Cory's Lawn Service brand greens, Jost/Rubik fonts), built with Vite. Installable on phones as a home-screen app.
- **Backend:** Supabase: Postgres database, logins, file storage for photos, videos and receipts, and live dashboard updates.
- **Hosting:** Vercel, as a static site (`vercel.json`).

## What it does

| Who | What |
|---|---|
| Field techs | See the equipment assigned to their truck plus starred favorites, search any equipment, report an issue (date, time, description, severity, multiple photos and videos), log hour-meter readings, follow their work orders |
| Shop manager | Live shop board (new → checked in → in progress → paused), check equipment in with the hour meter reading, clock in/pause/complete jobs, add parts and fluids from inventory or as one-offs, upload shop photos and receipts, add manual time, manage equipment, inventory and assignments |
| Reports | Monthly labor report: hours per day, per equipment and per person, plus parts cost, CSV export and print |
| History | Per-equipment work order history, hour-meter chart, average days between issues, total shop labor |

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
```

`.env` holds the Supabase URL and the **publishable** key. Both are meant to be public, because row-level security protects the data.

## Supabase

- Project ref: `gntupswjbblawppczcfi`
- Schema and security rules: `supabase/migrations/*.sql`
- Test data: `supabase/seed.sql`

Run SQL against the project with a Supabase personal access token:

```bash
SUPABASE_ACCESS_TOKEN=sbp_... scripts/sql.sh supabase/migrations/0001_init.sql
```

### Users

Usernames map to hidden emails (`<username>@shop.coryslawnservice.com`), so people only ever type a username. Public sign-up is disabled. Create or reset users with the project's secret key, found in Supabase → Project Settings → API Keys:

```bash
NODE_USE_ENV_PROXY=1 SUPABASE_URL=https://gntupswjbblawppczcfi.supabase.co SUPABASE_SECRET_KEY=... \
  node scripts/create-user.mjs zach "Zach Diaz" manager 'their-password'
```

Roles: `tech` (field), `manager` (shop; can see reports and inventory), `admin` (same as manager).

### Upload limit

On the Supabase free plan each file can be at most **50 MB**, which is roughly 30–60 seconds of phone video. The app warns before uploading anything bigger. To raise the cap, upgrade the plan and change `MAX_UPLOAD_BYTES` in `client/src/lib/supabase.js`.

## Deploy (Vercel)

Import the GitHub repo in Vercel. `vercel.json` sets the build (`npm run build` → `dist`) and the SPA rewrites. No environment variables are needed beyond the committed `.env`.
