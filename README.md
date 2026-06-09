# Inventory Scanner + Airtable

This is a GitHub/Vercel-ready Next.js app for barcode inventory scanning.

Included requested edits:

1. **Unknown Scans workflow**  
   If a barcode is not found in Airtable Inventory, the app creates a record in the `Unknown Scans` table instead of failing. Inventory is not updated for unknown barcodes.

2. **Continuous scanner mode**  
   Once the scanner is started, the camera stays on until the user presses **Stop Scanner**. Duplicate scan protection prevents the same barcode from being submitted repeatedly while it remains in view.

## Airtable tables

### Inventory
Required fields:
- `Barcode` — single line text
- `Item Name` — single line text
- `Current Quantity` — number
- `Minimum Quantity` — number, optional
- `Location` — single line text or single select, optional
- `Active` — checkbox, optional

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

Do not use `Created Time` for any field the app sends values to.

### Unknown Scans
Required fields:
- `Barcode` — single line text
- `Scanned By` — single line text
- `Notes` — long text
- `Resolved` — checkbox
- `Scan Date` — optional Created time field

## Vercel environment variables

```env
AIRTABLE_API_KEY=pat_your_token_here
AIRTABLE_BASE_ID=app_your_base_id_here
AIRTABLE_INVENTORY_TABLE=Inventory
AIRTABLE_SCAN_LOG_TABLE=Scan Log
AIRTABLE_UNKNOWN_SCANS_TABLE=Unknown Scans
```

Optional for `/inventory` page:

```env
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

## Deploy

1. Upload all files to a GitHub repository.
2. Import the repository into Vercel.
3. Add the environment variables above.
4. Deploy.

Build command:

```bash
npm run build
```

Output directory: leave blank.
