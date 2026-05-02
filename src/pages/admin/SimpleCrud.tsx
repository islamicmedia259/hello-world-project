import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "color" | "select" | "image" | "boolean";
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface Props {
  table: string;
  title: string;
  fields: FieldDef[];
  columns: { key: string; label: string; render?: (row: any) => ReactNode }[];
  defaults?: Record<string, any>;
  orderBy?: string;
  selectColumns?: string;
}

export default function SimpleCrud({ table, title, fields, columns, defaults = {}, orderBy = "created_at", selectColumns = "*" }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any).from(table).select(selectColumns).order(orderBy, { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { document.title = `${title} | Admin`; load(); }, [table]);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload: any = { ...editing };
    delete payload.created_at;
    if (fields.some((f) => f.key === "slug") && !payload.slug && payload.name) payload.slug = slugify(payload.name);

    if (file) {
      const path = `${table}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
      if (upErr) { toast.error(upErr.message); setBusy(false); return; }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      const imgField = fields.find((f) => f.type === "image");
      if (imgField) payload[imgField.key] = data.publicUrl;
    }

    const { error } = payload.id
      ? await (supabase as any).from(table).update(payload).eq("id", payload.id)
      : await (supabase as any).from(table).insert(payload);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setEditing(null); setFile(null); load(); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await (supabase as any).from(table).delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="font-display font-bold text-xl sm:text-2xl">{title} ({rows.length})</h1>
        <button onClick={() => setEditing({ ...defaults })} className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-4 sm:px-5 py-2 sm:py-2.5 font-semibold inline-flex items-center justify-center gap-2 text-sm self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Add New
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">SL</th>
              {columns.map((c) => <th key={c.key} className="p-3 text-left">{c.label}</th>)}
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t hover:bg-slate-50">
                <td className="p-3">{i + 1}</td>
                {columns.map((c) => <td key={c.key} className="p-3">{c.render ? c.render(r) : r[c.key]}</td>)}
                <td className="p-3 flex gap-1">
                  <button onClick={() => setEditing(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del(r.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={columns.length + 2} className="p-8 text-center text-slate-500">No items</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-lg">{editing.id ? "Edit" : "Add"} {title}</h3>
              <button type="button" onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium mb-1">{f.label}{f.required && " *"}</label>
                {f.type === "select" ? (
                  <select required={f.required} value={editing[f.key] || ""} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
                    <option value="">— select —</option>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "image" ? (
                  <>
                    <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
                    {editing[f.key] && !file && <img src={editing[f.key]} className="mt-2 h-16 rounded" alt="" />}
                  </>
                ) : f.type === "boolean" ? (
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, [f.key]: !editing[f.key] })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editing[f.key] ? "bg-cyan-500" : "bg-slate-300"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editing[f.key] ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                ) : (
                  <input
                    required={f.required}
                    type={f.type || "text"}
                    value={editing[f.key] ?? ""}
                    onChange={(e) => setEditing({ ...editing, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                )}
              </div>
            ))}
            <button disabled={busy} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2.5 rounded-md font-semibold disabled:opacity-50">
              {busy ? "Saving..." : "Save"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
