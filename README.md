# Inventory Scanner Airtable App

Next.js + Airtable inventory scanner with:

- Camera barcode scanning
- Physical USB/Bluetooth scanner mode with no Enter required
- Add/remove quantity workflow
- Unknown Scans logging and resolution
- Required Resolved By for resolved unknown scans
- Inventory page
- Reorder page
- Low-stock warnings and optional Low Stock Alerts table

## Vercel deploy note

This package intentionally does not include `package-lock.json` because the previous lockfile contained internal registry URLs that caused Vercel `ETIMEDOUT` install failures.

Use **Clear Build Cache and Redeploy** after uploading this version.

## Environment variables

```env
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
AIRTABLE_INVENTORY_TABLE=Inventory
AIRTABLE_SCAN_LOG_TABLE=Scan Log
AIRTABLE_UNKNOWN_SCANS_TABLE=Unknown Scans
AIRTABLE_LOW_STOCK_ALERTS_TABLE=Low Stock Alerts
```

`AIRTABLE_LOW_STOCK_ALERTS_TABLE` is optional. If omitted, the app still shows low-stock warnings but will not write low-stock alert records.
