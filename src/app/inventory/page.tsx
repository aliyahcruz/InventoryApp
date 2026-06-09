async function getInventory() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const res = await fetch(`${baseUrl}/api/inventory`, { cache: "no-store" });
  if (!res.ok) return { records: [] };
  return res.json();
}

export default async function InventoryPage() {
  const data = await getInventory();
  return (
    <main className="container">
      <h1>Inventory</h1>
      <div className="card">
        {data.records?.map((record: any) => (
          <div key={record.id} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
            <strong>{record.fields["Item Name"] || "Unnamed Item"}</strong>
            <p className="small">Barcode: {record.fields.Barcode}</p>
            <p>Current Quantity: {record.fields["Current Quantity"] ?? 0}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
