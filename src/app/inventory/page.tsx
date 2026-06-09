async function getInventory() {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/inventory`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.records || [];
}

export default async function InventoryPage() {
  const records = await getInventory();

  return (
    <main className="container">
      <h1>Inventory</h1>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Barcode</th>
              <th>Qty</th>
              <th>Min</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record: any) => (
              <tr key={record.id}>
                <td>{record.fields["Item Name"] || ""}</td>
                <td>{record.fields.Barcode || ""}</td>
                <td>{record.fields["Current Quantity"] ?? ""}</td>
                <td>{record.fields["Minimum Quantity"] ?? ""}</td>
                <td>{record.fields.Location || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
