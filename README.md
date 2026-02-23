# Finance Web Dashboard

Animated finance dashboard powered by Google Sheets.

## Local run

```bash
npm install
npm run dev
```

## Required env vars

Create `.env.local` from `.env.example` and set:

- `GOOGLE_SHEET_ID`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `DASHBOARD_USER`
- `DASHBOARD_PASS`

## Security

This app is protected with HTTP Basic Auth via `middleware.ts`.
Any request to `/` or `/api/*` requires credentials.

## Deploy (Vercel)

1. Push repo to GitHub
2. Import project in Vercel
3. Set env vars in Vercel project settings:
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_JSON` (paste full JSON key as one-line string)
   - `DASHBOARD_USER`
   - `DASHBOARD_PASS`
4. Deploy

For best security, keep credentials server-side only and rotate passwords periodically.
