import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power, Upload } from "lucide-react";

type Popup = {
  id: string;
  name: string;
  style: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  promo_code: string | null;
  bg_color: string | null;
  text_color: string | null;
  delay_seconds: number;
  frequency_hours: number;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
  sort_order: number;
};

const STYLES = [
  { value: "image_link", label: "Image only + link" },
  { value: "image_cta", label: "Image + Title + CTA" },
  { value: "newsletter", label: "Newsletter (email collect)" },
  { value: "promo", label: "Promo / Discount code" },
];

const empty: any = {
  name: "", style: "image_cta", title: "", subtitle: "", description: "",
  image_url: "", link_url: "", cta_label: "", cta_url: "", promo_code: "",
  bg_color: "#ffffff", text_color: "#0f172a",
  delay_seconds: 3, frequency_hours: 24, start_at: "", end_at: "",
  is_active: true, sort_order: 0,
};

export default function AdminPopups() {
  const [rows, setRows] = useState<Popup[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Popup | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("popups").select("*").order("sort_order");
    if (error) toast.error(error.message); else setRows((data || []) as Popup[]);
  };
  useEffect(() => { document.title = "Popups | Admin"; load(); }, []);

  const upload = async (file: File) => {
    setUploading(true);
    const path = `popups/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f: any) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
  };

  const openNew = () => { setEditing(null); setForm({ ...empty, sort_order: rows.length }); setOpen(true); };
  const openEdit = (p: Popup) => {
    setEditing(p);
    setForm({
      ...p,
      title: p.title || "", subtitle: p.subtitle || "", description: p.description || "",
      image_url: p.image_url || "", link_url: p.link_url || "",
      cta_label: p.cta_label || "", cta_url: p.cta_url || "", promo_code: p.promo_code || "",
      bg_color: p.bg_color || "#ffffff", text_color: p.text_color || "#0f172a",
      start_at: p.start_at ? p.start_at.slice(0, 16) : "", end_at: p.end_at ? p.end_at.slice(0, 16) : "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    const payload: any = {
      name: form.name, style: form.style,
      title: form.title || null, subtitle: form.subtitle || null, description: form.description || null,
      image_url: form.image_url || null, link_url: form.link_url || null,
      cta_label: form.cta_label || null, cta_url: form.cta_url || null,
      promo_code: form.promo_code || null,
      bg_color: form.bg_color, text_color: form.text_color,
      delay_seconds: parseInt(form.delay_seconds) || 0,
      frequency_hours: parseInt(form.frequency_hours) || 0,
      start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      is_active: form.is_active, sort_order: parseInt(form.sort_order) || 0,
    };
    const q = editing ? supabase.from("popups").update(payload).eq("id", editing.id) : supabase.from("popups").insert(payload);
    const { error } = await q;
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Updated" : "Created");
    setOpen(false); load();
  };

  const toggle = async (p: Popup) => {
    const { error } = await supabase.from("popups").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (p: Popup) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("popups").delete().eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Popups</h1>
          <p className="text-sm text-slate-500">Entry popups — image, CTA, newsletter or promo code style.</p>
        </div>
        <Button onClick={openNew} className="bg-violet-600 hover:bg-violet-700"><Plus className="h-4 w-4 mr-1" /> Create Popup</Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">SL</th>
                <th className="text-left px-4 py-3">Preview</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Style</th>
                <th className="text-left px-4 py-3">Delay</th>
                <th className="text-left px-4 py-3">Frequency</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No popups yet.</td></tr>
              ) : rows.map((p, i) => (
                <tr key={p.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3">
                    {p.image_url ? <img src={p.image_url} className="h-10 w-16 object-cover rounded" alt="" /> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{STYLES.find(s => s.value === p.style)?.label || p.style}</Badge></td>
                  <td className="px-4 py-3">{p.delay_seconds}s</td>
                  <td className="px-4 py-3">{p.frequency_hours === 0 ? "Every visit" : `${p.frequency_hours}h`}</td>
                  <td className="px-4 py-3">
                    {p.is_active
                      ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
                      : <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-200">Inactive</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggle(p)}><Power className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Popup" : "Create Popup"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <Label>Style *</Label>
                <Select value={form.style} onValueChange={(v) => setForm({ ...form, style: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Image</Label>
              <div className="flex items-center gap-3 mt-1">
                <label className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-slate-50 text-sm">
                  <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Choose file"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
                {form.image_url && <img src={form.image_url} className="h-12 rounded border" alt="" />}
              </div>
              <Input className="mt-2" placeholder="or paste image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            </div>

            {form.style === "image_link" && (
              <div><Label>Click Link URL</Label><Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/shop or https://..." /></div>
            )}

            {form.style !== "image_link" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
                </div>
                <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              </>
            )}

            {form.style === "image_cta" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>CTA Button Label</Label><Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Shop Now" /></div>
                <div><Label>CTA Link</Label><Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="/shop" /></div>
              </div>
            )}

            {form.style === "newsletter" && (
              <div><Label>Submit Button Label</Label><Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Subscribe" /></div>
            )}

            {form.style === "promo" && (
              <div><Label>Promo Code</Label><Input value={form.promo_code} onChange={(e) => setForm({ ...form, promo_code: e.target.value })} placeholder="SAVE25" /></div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Background Color</Label><Input type="color" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} /></div>
              <div><Label>Text Color</Label><Input type="color" value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Show after (seconds)</Label>
                <Input type="number" min={0} value={form.delay_seconds} onChange={(e) => setForm({ ...form, delay_seconds: e.target.value })} />
              </div>
              <div>
                <Label>Frequency (hours, 0 = every visit)</Label>
                <Input type="number" min={0} value={form.frequency_hours} onChange={(e) => setForm({ ...form, frequency_hours: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start At (optional)</Label><Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} /></div>
              <div><Label>End At (optional)</Label><Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
              <div className="flex items-center gap-3 mt-6"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={save}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
