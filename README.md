# Inventory NDC Scanner

Next.js + Airtable inventory scanner for medication inventory.

## Features

- Camera barcode scanning
- Physical USB/Bluetooth scanner mode
- Physical scanner fills barcode without pressing Enter
- Extracts 11-digit NDC from raw barcode scans
- Handles common extra trailing check digit
- Preserves Raw Scan Value for audit trail
- Tracks Inventory by NDC
- Supports Products table linked to Inventory
- Logs all known scans in Scan Log
- Logs unknown NDCs in Unknown Scans
- Resolves Unknown Scans into Inventory
- Low-stock warnings and Reorder page

## Vercel Environment Variables

```env
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
AIRTABLE_PRODUCTS_TABLE=Products
AIRTABLE_INVENTORY_TABLE=Inventory
AIRTABLE_SCAN_LOG_TABLE=Scan Log
AIRTABLE_UNKNOWN_SCANS_TABLE=Unknown Scans
AIRTABLE_LOW_STOCK_ALERTS_TABLE=Low Stock Alerts
DEFAULT_SCANNED_BY=Inventory User
```

`AIRTABLE_LOW_STOCK_ALERTS_TABLE` is optional.

## Airtable Tables

### Products
- Product Name — Single line text, primary
- Generic Name — Single line text
- Brand Name — Single line text
- Strength — Single line text
- Dosage Form — Single select or text
- Product Minimum Quantity — Number
- Active — Checkbox

### Inventory
- NDC — Single line text, primary, 11 digits only
- Product — Linked record to Products
- Current Quantity — Number
- Product Minimum Quantity — Lookup from Product
- Needs Reorder — Formula
- Barcode Lookup Count — Number
- Location — Single select
- Active — Checkbox
- Last Updated — Last modified time

Recommended Needs Reorder formula:
```text
IF({Current Quantity} <= VALUE(ARRAYJOIN({Product Minimum Quantity})), "YES", "")
```

### Scan Log
- Scan ID — Autonumber, primary
- Inventory Item — Linked record to Inventory
- Product — Linked record to Products
- Raw Scan Value — Long text
- NDC — Single line text
- Action — Single select: Add, Remove
- Quantity Change — Number
- Previous Quantity — Number
- New Quantity — Number
- Scanned By — Single line text
- Notes — Long text
- Scanned At — Created time

### Unknown Scans
- Unknown Scan ID — Autonumber, primary
- Raw Scan Value — Long text
- NDC — Single line text
- Action — Single select: Add, Remove
- Quantity — Number
- Scanned By — Single line text
- Notes — Long text
- Resolved — Checkbox
- Resolved By — Single line text
- Resolution Notes — Long text
- Resolved Product — Linked record to Products
- Resolved Inventory Item — Linked record to Inventory
- Scan Date — Created time

### Low Stock Alerts optional
- Alert ID — Autonumber, primary
- Inventory Item — Linked record to Inventory
- Product — Linked record to Products
- NDC — Single line text
- Current Quantity — Number
- Minimum Quantity — Number
- Resolved — Checkbox
- Alert Date — Created time
