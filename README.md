# NDC Inventory Scanner

Next.js + Airtable inventory scanner for medication NDC tracking.

## Vercel Environment Variables

```env
AIRTABLE_API_KEY=your_airtable_pat
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_PRODUCTS_TABLE=Products
AIRTABLE_INVENTORY_TABLE=Inventory
AIRTABLE_SCAN_LOG_TABLE=Scan Log
AIRTABLE_UNKNOWN_SCANS_TABLE=Unknown Scans
AIRTABLE_LOW_STOCK_ALERTS_TABLE=Low Stock Alerts
```

## Airtable Tables

### Products
Primary field: `Product Name` — Single line text

Fields:
- `Product Name` — Single line text, primary
- `Generic Name` — Single line text
- `Brand Name` — Single line text
- `Strength` — Single line text
- `Dosage Form` — Single select or single line text
- `Product Minimum Quantity` — Number
- `Active` — Checkbox

### Inventory
Primary field: `NDC` — Single line text

Fields:
- `NDC` — Single line text, primary, store 11 digits with no dashes
- `Product` — Linked record to Products
- `Current Quantity` — Number
- `Product Minimum Quantity` — Lookup from Product → Product Minimum Quantity
- `Needs Reorder` — Formula: `IF({Current Quantity}<=VALUE({Product Minimum Quantity}),"YES","")`
- `Barcode Lookup Count` — Number
- `Location` — Single select or single line text
- `Active` — Checkbox
- `Last Updated` — Last modified time

### Scan Log
Primary field: `Scan ID` — Autonumber

Fields:
- `Scan ID` — Autonumber, primary
- `Inventory Item` — Linked record to Inventory
- `Raw Scan Value` — Long text
- `NDC` — Single line text
- `Action` — Single select: Add, Remove
- `Quantity Change` — Number
- `Previous Quantity` — Number
- `New Quantity` — Number
- `Scanned By` — Single line text
- `Notes` — Long text
- `Scanned At` — Created time

Optional: add `Product` as a Lookup from Inventory Item → Product.

### Unknown Scans
Primary field: `Unknown Scan ID` — Autonumber

Fields:
- `Unknown Scan ID` — Autonumber, primary
- `Raw Scan Value` — Long text
- `NDC` — Single line text
- `Action` — Single select: Add, Remove
- `Quantity` — Number
- `Scanned By` — Single line text
- `Notes` — Long text
- `Resolved` — Checkbox
- `Resolved By` — Single line text
- `Resolved Product` — Linked record to Products
- `Resolved Inventory Item` — Linked record to Inventory
- `Resolution Notes` — Long text
- `Scan Date` — Created time

### Low Stock Alerts optional
Primary field: `Alert ID` — Autonumber

Fields:
- `Alert ID` — Autonumber, primary
- `Inventory Item` — Linked record to Inventory
- `NDC` — Single line text
- `Current Quantity` — Number
- `Minimum Quantity` — Number
- `Resolved` — Checkbox
- `Alert Date` — Created time

## Workflow

1. Scan using a camera or physical scanner.
2. App stores the full raw scan value but extracts an 11-digit NDC.
3. App searches Inventory by `NDC`.
4. If found, Inventory is incremented/decremented and Scan Log is created.
5. If not found, Unknown Scans record is created.
6. Resolve unknown scans from `/unknown-scans` after assigning the NDC to a Product.

## Notes

- Store NDC as 11 digits without dashes in Airtable.
- The raw scan value may include GTIN, lot, expiration, serial, or other GS1 values.
- The app extracts NDC using GS1 AI `01` where possible and falls back to the first 11-digit sequence.
