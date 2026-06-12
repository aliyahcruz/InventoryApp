# Inventory NDC Scanner

Next.js + Airtable inventory scanner for medication inventory.

## Features

- Camera barcode scanning
- Physical USB/Bluetooth scanner mode
- Physical scanner fills barcode without pressing Enter
- Clickable physical scanner input field
- Editable Detected NDC field before submitting
- Extracts suggested 11-digit NDC from raw barcode scans
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


## v4 Airtable parameter fix

This version removes Airtable API query parameters that can cause:

```text
INVALID_REQUEST_UNKNOWN: Invalid request: parameter validation failed
```

Inventory, Products, and Unknown Scans are loaded with simple pageSize requests, then sorted/filtered inside the app.


## v5 Airtable no-query-params fix

This version removes all Airtable list query parameters including:

- pageSize
- maxRecords
- filterByFormula
- sort

Airtable list requests now use only the table URL. The app filters and sorts records after retrieval.
This is intended to resolve:

```text
INVALID_REQUEST_UNKNOWN: Invalid request: parameter validation failed
```


## v6 Duplicate NDC and Product Name Fix

This version fixes two issues:

1. Unknown Scan resolution no longer creates duplicate Inventory records for the same NDC.
   - It first checks Inventory for an existing NDC.
   - If found, it links the Unknown Scan to the existing Inventory record.
   - If not found, it creates one new Inventory record.

2. Inventory and Reorder pages now display the Product Name instead of Airtable linked record IDs.
   - The app loads Products separately.
   - It maps linked Product record IDs to their Product Name.


## v7 Unknown Scans resolved-link field fix

This version removes required writes to these optional Unknown Scans fields:

- Resolved Product
- Resolved Inventory Item

The app now only requires:

- Resolved
- Resolved By
- Resolution Notes

If you want resolved links in Airtable later, you may add them manually:
- Resolved Product — Linked record to Products
- Resolved Inventory Item — Linked record to Inventory

But they are no longer required for the app to work.


## v8 Unknown Quantity + Scan Log Field Fix

This version fixes:

1. Unknown Scan resolution now applies the unknown scan quantity to Inventory.
   - Add 5 unknown item → new Inventory Current Quantity = 5.
   - If the NDC already exists, Add/Remove quantity is applied to the existing Current Quantity.

2. Scan Log no longer requires the linked field "Inventory Item".
   - This prevents Airtable errors if your Scan Log table does not have that field.
   - Required Scan Log fields are:
     - Raw Scan Value
     - NDC
     - Action
     - Quantity Change
     - Previous Quantity
     - New Quantity
     - Scanned By
     - Notes
     - Scanned At optional Created Time


## v9 Inventory Value Tab

This version adds an Inventory Value tab.

Add these fields to the Products table:

| Field Name | Airtable Field Type |
|---|---|
| Price Each GPO | Currency |
| Price Each 340B | Currency |
| Difference GPO/340B | Formula or Currency |
| Midtown 340B | Currency |

Recommended formula for Difference GPO/340B:

```text
{Price Each GPO} - {Price Each 340B}
```

The Inventory Value page calculates:

- Current Quantity × Price Each GPO
- Current Quantity × Price Each 340B
- Current Quantity × Difference GPO/340B
- Current Quantity × Midtown 340B

Blank cost fields show as — and are excluded from totals.
