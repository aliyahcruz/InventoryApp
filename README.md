# Inventory Scanner

Next.js + Airtable inventory scanner.

## Features

- Camera barcode scanning
- Physical USB/Bluetooth scanner mode
- Physical scanner automatically fills the Barcode field when Enter is received from the scanner
- Manual review before submitting add/remove transactions
- Inventory decrement/increment with Scan Log audit trail
- Unknown barcodes logged to Unknown Scans
- Unknown Scans resolution page creates Inventory records and marks scans resolved
- Required Resolved By field for unknown scan resolution

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

## Environment Variables

```env
AIRTABLE_API_KEY=your_airtable_personal_access_token
AIRTABLE_BASE_ID=your_airtable_base_id
AIRTABLE_INVENTORY_TABLE=Inventory
AIRTABLE_SCAN_LOG_TABLE=Scan Log
AIRTABLE_UNKNOWN_SCANS_TABLE=Unknown Scans
```

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
