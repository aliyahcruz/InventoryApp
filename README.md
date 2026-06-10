# Inventory Scanner

Next.js + Airtable inventory scanner with camera scanning, physical scanner input, unknown scan resolution, and low stock tracking.

## Features

- Camera barcode scanning
- Physical USB/Bluetooth scanner mode
- Physical scanner fills the Barcode field automatically after the scanner finishes typing; no Enter key required
- Manual review before submitting add/remove transactions
- Inventory decrement/increment with Scan Log audit trail
- Unknown barcodes logged to Unknown Scans
- Unknown Scans resolution page creates Inventory records and marks scans resolved
- Required Resolved By field for unknown scan resolution
- Inventory page highlights low stock items
- Dedicated `/reorder` page for items where Current Quantity is below Minimum Quantity
- Low Stock Alerts table logging when a scan makes an item fall below minimum

## Airtable Tables

### Inventory

- Barcode: Single line text
- Item Name: Single line text
- Current Quantity: Number
- Minimum Quantity: Number
- Location: Single select or single line text
- Active: Checkbox

### Scan Log

- Barcode: Single line text
- Item Name: Single line text
- Action: Single select (`Add`, `Remove`)
- Quantity Change: Number
- Previous Quantity: Number
- New Quantity: Number
- Scanned By: Single line text
- Notes: Long text
- Scanned At: Created time

### Unknown Scans

- Barcode: Single line text
- Action: Single select (`Add`, `Remove`)
- Quantity: Number
- Scanned By: Single line text
- Notes: Long text
- Resolved: Checkbox
- Resolved By: Single line text
- Resolution Notes: Long text
- Scan Date: Created time

### Low Stock Alerts

- Barcode: Single line text
- Item Name: Single line text
- Current Quantity: Number
- Minimum Quantity: Number
- Scanned By: Single line text
- Notes: Long text
- Resolved: Checkbox
- Alert Date: Created time

## Environment Variables

```env
AIRTABLE_API_KEY=your_airtable_personal_access_token
AIRTABLE_BASE_ID=your_airtable_base_id
AIRTABLE_INVENTORY_TABLE=Inventory
AIRTABLE_SCAN_LOG_TABLE=Scan Log
AIRTABLE_UNKNOWN_SCANS_TABLE=Unknown Scans
AIRTABLE_LOW_STOCK_ALERTS_TABLE=Low Stock Alerts
```

## Vercel

Use the package as the repository root. Add the environment variables above in Vercel, then redeploy with Clear Build Cache and Redeploy if npm install previously failed.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
