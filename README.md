# Inventory Scanner

Next.js + Airtable barcode inventory scanner.

## Included workflows

- Scan barcode with phone camera
- Scanner stays on until Stop Scanner is pressed
- No auto-submit; every scan must be reviewed and submitted
- Add or remove custom quantity
- Known barcodes update Inventory and create a Scan Log record
- Unknown barcodes create an Unknown Scans record, including Action and Quantity
- `/unknown-scans` page resolves unknown scans by creating a new Inventory item and marking the unknown scan resolved

## Airtable tables

### Inventory

Required fields:

- `Barcode` — single line text
- `Item Name` — single line text
- `Current Quantity` — number
- `Minimum Quantity` — number
- `Location` — single line text or single select
- `Active` — checkbox

### Scan Log

Required fields:

- `Barcode` — single line text
- `Item Name` — single line text
- `Action` — single select or single line text
- `Quantity Change` — number
- `Previous Quantity` — number
- `New Quantity` — number
- `Scanned By` — single line text
- `Notes` — long text

### Unknown Scans

Required fields:

- `Barcode` — single line text
- `Action` — single select or single line text. Options: Add, Remove
- `Quantity` — number
- `Scanned By` — single line text
- `Notes` — long text
- `Resolved` — checkbox
- `Scan Date` — created time, optional but recommended

## Vercel environment variables

```env
AIRTABLE_API_KEY=your_personal_access_token
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_INVENTORY_TABLE=Inventory
AIRTABLE_SCAN_LOG_TABLE=Scan Log
AIRTABLE_UNKNOWN_SCANS_TABLE=Unknown Scans
```

Your Airtable token needs:

- `data.records:read`
- `data.records:write`
- access to the selected base

## Resolve unknown scans

1. Go to `/unknown-scans`.
2. Enter the item name.
3. Confirm the starting quantity. It defaults to the quantity that was submitted during the unknown scan.
4. Add optional minimum quantity and location.
5. Click **Add to Inventory and Mark Resolved**.

The app creates an Inventory record and checks `Resolved` in the Unknown Scans table.
