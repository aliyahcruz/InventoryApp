# Inventory Scanner

Next.js + Airtable barcode inventory scanner.

## Airtable tables

### Inventory
Required fields:
- Barcode — single line text
- Item Name — single line text
- Current Quantity — number
- Minimum Quantity — number, optional
- Location — single line text or single select, optional
- Active — checkbox, optional

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
- Scanned At — created time

## Environment variables
Copy `.env.example` to `.env.local` locally, and add the same variables in Vercel.

```env
AIRTABLE_API_KEY=pat_your_personal_access_token
AIRTABLE_BASE_ID=app_your_base_id
AIRTABLE_INVENTORY_TABLE=Inventory
AIRTABLE_SCAN_LOG_TABLE=Scan Log
```

## Run locally

```bash
npm install
npm run dev
```

## Deploy
Push to GitHub, then import the repo into Vercel and add environment variables.
