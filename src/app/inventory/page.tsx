"use client";
import { useEffect, useMemo, useState } from "react";
export default function InventoryPage(){
 const [records,setRecords]=useState<any[]>([]); const [q,setQ]=useState(""); const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
 async function load(){setLoading(true);setErr("");try{const r=await fetch('/api/inventory',{cache:'no-store'});const d=await r.json(); if(!r.ok) throw new Error(d.error||'Failed'); setRecords(d.records||[])}catch(e:any){setErr(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 const filtered=useMemo(()=>records.filter(r=>JSON.stringify(r.fields).toLowerCase().includes(q.toLowerCase())),[records,q]);
 return <main><h1>Inventory</h1><div className="card"><div className="row"><input style={{flex:1}} placeholder="Search NDC, product, location" value={q} onChange={e=>setQ(e.target.value)}/><button className="button" onClick={load}>{loading?'Loading...':'Refresh'}</button></div>{err&&<p className="dangerBox card">{err}</p>}</div><div className="card"><table><thead><tr><th>NDC</th><th>Product</th><th>Qty</th><th>Min</th><th>Reorder</th><th>Location</th></tr></thead><tbody>{filtered.map(r=>{const f=r.fields; const min=Array.isArray(f['Product Minimum Quantity'])?f['Product Minimum Quantity'][0]:f['Product Minimum Quantity']; const low=Number(f['Current Quantity']||0)<=Number(min||0); return <tr key={r.id}><td>{f.NDC}</td><td>{Array.isArray(f.Product)?f.Product.join(', '):f.Product}</td><td>{f['Current Quantity']}</td><td>{min}</td><td>{low?<span className="pill low">Needs reorder</span>:<span className="pill ok">OK</span>}</td><td>{f.Location}</td></tr>})}</tbody></table></div></main>
}
