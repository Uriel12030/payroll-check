# Meta Ads Campaign Launcher

Standalone CLI tool that creates a full Meta (Facebook/Instagram) ad campaign for Payroll-Check via the Marketing API.

## Setup

```bash
cd scripts/meta-ads
cp .env.example .env
# Fill in your Meta credentials in .env
npm install
npm run build
```

## Usage

```bash
# Preview payloads without creating anything
npm run dry-run

# Launch campaign (created as PAUSED)
npm start
```

## What it creates

1. **Instant Lead Form** — Hebrew form with name, email, phone, and a custom "concern" dropdown
2. **Campaign** — `OUTCOME_LEADS` objective, CBO at 50 ILS/day, created as PAUSED
3. **2 Ad Sets** — Broad (20-55, Hebrew locale) + Interest-based (auto-resolved interests)
4. **3 Creatives** — Short/Medium/Long Hebrew copy variants
5. **6 Ads** — Each creative paired with each ad set

## Required Token Permissions

- `ads_management`
- `pages_read_engagement`
- `leads_retrieval`

Generate at: https://developers.facebook.com/tools/explorer/

## Files

| File | Purpose |
|------|---------|
| `src/index.ts` | CLI entry point with --dry-run |
| `src/api.ts` | Meta API wrapper (fetch + retry + error handling) |
| `src/config.ts` | Campaign/adset/audience configuration |
| `src/creatives.ts` | Hebrew ad copy variants |
| `src/lead-form.ts` | Instant Form creation |
| `src/interests.ts` | Interest ID search |
| `src/validators.ts` | Zod schemas for env + API responses |
| `src/utils.ts` | Logging, URL building |
