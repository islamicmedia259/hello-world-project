import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power, Upload, Settings2 } from "lucide-react";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  category_id: string | null;
  sort_order: number;
  is_active: boolean;
};

const empty = { title: "", subtitle: "", image_url: "", link_url: "", sort_order: 0, is_active: true };

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [catId, setCatId] = useState<string>("");
  const [direction, setDirection] = useState<string>("left");
  const [speed, setSpeed] = useState<number>(5);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data: cat } = await supabase
      .from("banner_categories")
      .select("id,slide_direction,slide_speed_seconds")
      .eq("slug", "top-slider")
      .maybeSingle();
    if (!cat?.id) return;
    setCatId(cat.id);
    setDirection((cat as any).slide_direction || "left");
    setSpeed((cat as any).slide_speed_seconds || 5);
    const { data: b } = await supabase.from("banners").select("*").eq("category_id", cat.id).order("sort_order");
    setBanners((b || []) as Banner[]);
  };
  useEffect(() => { document.title = "Banner & Ads | Admin"; load(); }, []);

  const upload = async (file: File) => {
    setUploading(true);
    const path = `banners/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f: any) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
  };

  const openNew = () => { setEditing(null); setForm({ ...empty }); setOpen(true); };
  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title, subtitle: b.subtitle || "", image_url: b.image_url,
      link_url: b.link_url || "", sort_order: b.sort_order, is_active: b.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.image_url) { toast.error("Title and image required"); return; }
    const payload: any = {
      title: form.title,
      subtitle: form.subtitle || null,
      image_url: form.image_url,
      link_url: form.link_url || null,
      category_id: catId,
      position: "hero",
      sort_order: form.sort_order,
      is_active: form.is_active,
    };
    const q = editing
      ? supabase.from("banners").update(payload).eq("id", editing.id)
      : supabase.from("banners").insert(payload);
    const { error } = await q;
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Updated" : "Created");
    setOpen(false); load();
  };

  const toggle = async (b: Banner) => {
    const { error } = await supabase.from("banners").update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (b: Banner) => {
    if (!confirm(`Delete "${b.title}"?`)) return;
    const { error } = await supabase.from("banners").delete().eq("id", b.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const saveSettings = async () => {
    if (!catId) return;
    const { error } = await supabase
      .from("banner_categories")
      .update({ slide_direction: direction, slide_speed_seconds: speed } as any)
      .eq("id", catId);
    if (error) toast.error(error.message); else toast.success("Slider settings saved");
  };

  const filtered = banners.filter((b) => !search || b.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Banner & Ads</h1>
          <p className="text-sm text-slate-500">Homepage Top Slider — recommended size 1060×395.</p>
        </div>
        <Button onClick={openNew} className="bg-violet-600 hover:bg-violet-700"><Plus className="h-4 w-4 mr-1" /> Create</Button>
      </div>

      {/* Slider Settings */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="h-4 w-4 text-violet-600" />
          <h2 className="font-semibold text-slate-800">Slider Settings</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <Label>Slide Direction</Label>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left → Right (slide left)</SelectItem>
                <SelectItem value="right">Right → Left (slide right)</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Speed (seconds per slide)</Label>
            <Input type="number" min={1} max={60} value={speed} onChange={(e) => setSpeed(parseInt(e.target.value || "5"))} />
          </div>
          <Button onClick={saveSettings} className="bg-violet-600 hover:bg-violet-700">Save Settings</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b">
          <div className="text-sm text-slate-500">Total: <b className="text-slate-800">{banners.length}</b></div>
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">SL</th>
                <th className="text-left px-4 py-3">Image</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Link</th>
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No banners.</td></tr>
              ) : filtered.map((b, i) => (
                <tr key={b.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3"><img src={b.image_url} alt={b.title} className="h-12 w-20 object-cover rounded" /></td>
                  <td className="px-4 py-3 font-medium">{b.title}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[200px]">{b.link_url || "—"}</td>
                  <td className="px-4 py-3">{b.sort_order}</td>
                  <td className="px-4 py-3">
                    {b.is_active
                      ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
                      : <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-200">Inactive</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggle(b)}><Power className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(b)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Banner" : "Create Banner"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
            <div><Label>Link URL</Label><Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/shop or https://..." /></div>
            <div>
              <Label>Banner Image * <span className="text-xs text-slate-500">(1060×395)</span></Label>
              <div className="flex items-center gap-3 mt-1">
                <label className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-slate-50 text-sm">
                  <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Choose file"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
                {form.image_url && <img src={form.image_url} className="h-12 rounded border" alt="" />}
              </div>
            </div>
            <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value || "0") })} /></div>
            <div className="flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
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
