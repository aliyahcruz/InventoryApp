# Inventory Scanner

Next.js + Airtable barcode inventory scanner.

This version supports Option 2: if a barcode is scanned and it is not in the Inventory table, the app logs it in the Unknown Scans table instead of failing.

## Airtable tables

### Inventory
Required fields:
- Barcode — single line text
- Item Name — single line text
- Current Quantity — number

Optional fields:
- Minimum Quantity — number
- Location — single line text or single select
- Active — checkbox

### Scan Log
Required fields:
- Barcode — single line text
- Item Name — single line text
- Action — single select: Add, Remove
- Quantity Change — number
- Previous Quantity — number
- New Quantity — number
- Scanned By — single line text
- Notes — long text

Optional:
- Scanned At — Created time

Important: If Scanned At is a Created time field, do not send it from the app. This package does not send Scanned At.

### Unknown Scans
Required fields:
- Barcode — single line text
- Scanned By — single line text
- Notes — long text
- Resolved — checkbox

Optional:
- Scan Date — Created time

Important: If Scan Date is a Created time field, do not send it from the app. This package does not send Scan Date.

## Environment variables

Copy `.env.example` to `.env.local` locally, and add the same variables in Vercel.

```env
AIRTABLE_API_KEY=pat_your_personal_access_token
AIRTABLE_BASE_ID=app_your_base_id
AIRTABLE_INVENTORY_TABLE=Inventory
AIRTABLE_SCAN_LOG_TABLE=Scan Log
AIRTABLE_UNKNOWN_SCANS_TABLE=Unknown Scans
```

Your Airtable Personal Access Token needs these scopes:
- data.records:read
- data.records:write
- schema.bases:read

It also needs access to the Airtable base you are using.

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Push to GitHub, then import the repo into Vercel and add environment variables.

## Vercel settings

- Framework preset: Next.js
- Build command: `npm run build`
- Install command: `npm install`
- Output directory: leave blank / default
- Node.js version: 20.x or 22.x
