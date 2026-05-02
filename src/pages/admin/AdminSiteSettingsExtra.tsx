import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "@/components/RichTextEditor";

type Page = { id: string; title: string; slug: string; content: string | null; meta_description: string | null; is_active: boolean; column_group: string; sort_order: number };

const COLUMN_GROUPS = [
  { value: "information", label: "Information" },
  { value: "support", label: "Support" },
  { value: "consumer_policy", label: "Consumer Policy" },
];

export function CreatePagePage() {
  const [rows, setRows] = useState<Page[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", content: "", meta_description: "", is_active: true, column_group: "information", sort_order: 0 });

  const load = async () => {
    const { data } = await supabase.from("pages").select("*").order("column_group").order("sort_order");
    setRows((data ?? []) as Page[]);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ title: "", slug: "", content: "", meta_description: "", is_active: true, column_group: "information", sort_order: rows.length + 1 }); setOpen(true); };
  const openEdit = (p: Page) => { setEditing(p); setForm({ title: p.title, slug: p.slug, content: p.content ?? "", meta_description: p.meta_description ?? "", is_active: p.is_active, column_group: p.column_group || "information", sort_order: p.sort_order || 0 }); setOpen(true); };

  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const save = async () => {
    if (!form.title) return toast.error("Title required");
    const slug = form.slug || slugify(form.title);
    const payload = { ...form, slug };
    if (editing) {
      const { error } = await supabase.from("pages").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("pages").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved"); setOpen(false); load();
  };

  const remove = async (p: Page) => {
    if (!confirm(`Delete ${p.title}?`)) return;
    const { error } = await supabase.from("pages").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Page Manage</h1>
        <Button onClick={openCreate} className="rounded-full bg-violet-600 hover:bg-violet-700">+ Create Page</Button>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-6 text-sm text-violet-900">
        <p className="font-semibold mb-1">📌 কিভাবে কাজ করে:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li><b>Create Page</b> বাটন এ ক্লিক করুন → Title, Content, এবং <b>Footer Column</b> (Information / Shop By / Support / Consumer Policy) সিলেক্ট করুন।</li>
          <li>Save করার পর পেজটি অটো-ম্যাটিকালি ফুটারের ঐ column এ link হিসেবে দেখাবে।</li>
          <li>লিংকে ক্লিক করলে পেজটি <code className="bg-white px-1 rounded">/p/your-slug</code> URL এ খুলবে।</li>
          <li><b>Sort Order</b> দিয়ে column-এর ভিতরে link এর order পরিবর্তন করতে পারবেন।</li>
        </ol>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th className="p-3">SL</th><th className="p-3">Title</th><th className="p-3">Slug</th><th className="p-3">Footer Column</th><th className="p-3">Sort</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{p.title}</td>
                <td className="p-3 font-mono text-xs">/p/{p.slug}</td>
                <td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-violet-100 text-violet-700">{COLUMN_GROUPS.find(c => c.value === p.column_group)?.label || "—"}</span></td>
                <td className="p-3">{p.sort_order}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No pages</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Page</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. About Us" /></div>
            <div><Label>Slug (optional)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto from title — e.g. about-us" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Footer Column *</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.column_group} onChange={(e) => setForm({ ...form, column_group: e.target.value })}>
                  {COLUMN_GROUPS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <p className="text-xs text-muted-foreground mt-1">এই পেজটি ফুটারের কোন column এ দেখাবে</p>
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground mt-1">কম মান = উপরে দেখাবে</p>
              </div>
            </div>
            <div><Label>Meta Description (SEO)</Label><Textarea rows={2} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} /></div>
            <div>
              <Label>Content</Label>
              <div className="mt-1.5 border rounded-md overflow-hidden">
                <RichTextEditor value={form.content} onChange={(val) => setForm({ ...form, content: val })} placeholder="এখানে আপনার পেজের কন্টেন্ট লিখুন..." />
              </div>
              <p className="text-xs text-muted-foreground mt-1">টেক্সট ফরম্যাট, হেডিং, লিস্ট, লিংক, ইমেজ — সব কিছু এডিটর থেকে যোগ করতে পারবেন।</p>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active (ফুটারে দেখাবে)</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-violet-600 hover:bg-violet-700">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type Charge = { id: string; name: string; charge: number; is_active: boolean; sort_order: number; zone: string; zone_id: string | null };
type ShippingZone = { id: string; name: string; is_active: boolean };

// Legacy fallback (for old rows that don't yet have zone_id)
const LEGACY_ZONE_OPTIONS = [
  { value: "any", label: "Any (সব district)" },
  { value: "inside_dhaka", label: "Inside Dhaka (legacy)" },
  { value: "outside_dhaka", label: "Outside Dhaka (legacy)" },
];

export function ShippingChargePage() {
  const [rows, setRows] = useState<Charge[]>([]);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Charge | null>(null);
  const [form, setForm] = useState<{ name: string; charge: number; is_active: boolean; sort_order: number; zone: string; zone_id: string | null }>({ name: "", charge: 0, is_active: true, sort_order: 0, zone: "any", zone_id: null });

  const load = async () => {
    const [{ data: cd }, { data: zd }] = await Promise.all([
      supabase.from("shipping_charges").select("*").order("sort_order"),
      supabase.from("shipping_zones" as any).select("id,name,is_active").eq("is_active", true).order("sort_order"),
    ]);
    setRows((cd ?? []) as Charge[]);
    setZones(((zd as any) ?? []) as ShippingZone[]);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: "", charge: 0, is_active: true, sort_order: rows.length + 1, zone: "any", zone_id: null }); setOpen(true); };
  const openEdit = (c: Charge) => { setEditing(c); setForm({ name: c.name, charge: Number(c.charge), is_active: c.is_active, sort_order: c.sort_order, zone: c.zone || "any", zone_id: c.zone_id || null }); setOpen(true); };

  const save = async () => {
    if (!form.name) return toast.error("Name required");
    const payload: any = { name: form.name, charge: form.charge, is_active: form.is_active, sort_order: form.sort_order, zone: form.zone, zone_id: form.zone_id };
    if (editing) {
      const { error } = await supabase.from("shipping_charges").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("shipping_charges").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved"); setOpen(false); load();
  };

  const zoneLabel = (c: Charge) => {
    if (c.zone_id) return zones.find((z) => z.id === c.zone_id)?.name || "(deleted zone)";
    return LEGACY_ZONE_OPTIONS.find((o) => o.value === (c.zone || "any"))?.label || c.zone || "Any";
  };

  const remove = async (c: Charge) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    const { error } = await supabase.from("shipping_charges").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Shipping Charge</h1>
        <Button onClick={openCreate} className="rounded-full bg-violet-600 hover:bg-violet-700">Create</Button>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left"><th className="p-3">SL</th><th className="p-3">Name</th><th className="p-3">Zone</th><th className="p-3 text-right">Charge (৳)</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{c.name}</td>
                <td className="p-3"><span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">{zoneLabel(c)}</span></td>
                <td className="p-3 text-right">৳{Number(c.charge).toLocaleString()}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{c.is_active ? "Active" : "Inactive"}</span>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No zones</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Shipping Zone</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Shipping Zone</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.zone_id || ""}
                onChange={(e) => setForm({ ...form, zone_id: e.target.value || null, zone: e.target.value ? "custom" : "any" })}
              >
                <option value="">— None / Any (সব district) —</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                কাস্টমার যে district সিলেক্ট করবে, সেটি যদি এই zone-এর under থাকে — তাহলে এই charge auto-select হবে। Zone বানাতে যান <span className="font-semibold">Site Setting → Shipping Zones</span>।
              </p>
            </div>
            <div><Label>Charge (৳)</Label><Input type="number" value={form.charge} onChange={(e) => setForm({ ...form, charge: Number(e.target.value) })} /></div>
            <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type Status = { id: string; key: string; label: string; color: string; sort_order: number; is_active: boolean };

export function OrderStatusPage() {
  const [rows, setRows] = useState<Status[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Status | null>(null);
  const [form, setForm] = useState({ key: "", label: "", color: "#94a3b8", sort_order: 0, is_active: true });

  const load = async () => {
    const { data } = await supabase.from("order_statuses").select("*").order("sort_order");
    setRows((data ?? []) as Status[]);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ key: "", label: "", color: "#94a3b8", sort_order: rows.length + 1, is_active: true }); setOpen(true); };
  const openEdit = (s: Status) => { setEditing(s); setForm({ key: s.key, label: s.label, color: s.color, sort_order: s.sort_order, is_active: s.is_active }); setOpen(true); };

  const save = async () => {
    if (!form.key || !form.label) return toast.error("Key and label required");
    if (editing) {
      const { error } = await supabase.from("order_statuses").update(form).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("order_statuses").insert(form);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved"); setOpen(false); load();
  };

  const remove = async (s: Status) => {
    if (!confirm(`Delete ${s.label}?`)) return;
    const { error } = await supabase.from("order_statuses").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Order Status</h1>
        <Button onClick={openCreate} className="rounded-full bg-violet-600 hover:bg-violet-700">Create</Button>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left"><th className="p-3">SL</th><th className="p-3">Key</th><th className="p-3">Label</th><th className="p-3">Color</th><th className="p-3">Sort</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{i + 1}</td>
                <td className="p-3 font-mono text-xs">{s.key}</td>
                <td className="p-3">{s.label}</td>
                <td className="p-3"><span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full border" style={{ background: s.color }} /><span className="text-xs font-mono">{s.color}</span></span></td>
                <td className="p-3">{s.sort_order}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{s.is_active ? "Active" : "Inactive"}</span>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Status</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Key (machine name)</Label><Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="e.g. returned" disabled={!!editing} /></div>
            <div><Label>Label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
            <div><Label>Color</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-24" /></div>
            <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
