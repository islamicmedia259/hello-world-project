import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type P = { id: string; key: string; label: string; description: string | null };

export default function AdminPermissions() {
  const [rows, setRows] = useState<P[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<P | null>(null);
  const [form, setForm] = useState({ key: "", label: "", description: "" });

  const load = async () => {
    const { data } = await supabase.from("permissions").select("*").order("key");
    setRows((data ?? []) as P[]);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ key: "", label: "", description: "" }); setOpen(true); };
  const openEdit = (p: P) => { setEditing(p); setForm({ key: p.key, label: p.label, description: p.description ?? "" }); setOpen(true); };

  const save = async () => {
    if (!form.key || !form.label) return toast.error("Key and label required");
    if (editing) {
      const { error } = await supabase.from("permissions").update(form).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("permissions").insert(form);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const remove = async (p: P) => {
    if (!confirm(`Delete ${p.key}?`)) return;
    const { error } = await supabase.from("permissions").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Permissions</h1>
        <Button onClick={openCreate} className="rounded-full bg-violet-600 hover:bg-violet-700">Create</Button>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th className="p-3">SL</th>
              <th className="p-3">Key</th>
              <th className="p-3">Label</th>
              <th className="p-3">Description</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{i + 1}</td>
                <td className="p-3 font-mono text-xs">{p.key}</td>
                <td className="p-3">{p.label}</td>
                <td className="p-3 text-muted-foreground">{p.description}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Permission</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Key</Label><Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="e.g. orders.export" /></div>
            <div><Label>Label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
