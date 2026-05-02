import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import PixelLiveMonitor from "@/components/admin/PixelLiveMonitor";

type Pixel = {
  id: string;
  name: string;
  platform: string;
  pixel_id: string | null;
  script_code: string;
  placement: string;
  page_target: string;
  custom_url: string | null;
  device_target: string;
  is_active: boolean;
  fire_count: number;
  created_at: string;
};

const PLATFORMS = [
  { value: "facebook", label: "Facebook Pixel" },
  { value: "google_analytics", label: "Google Analytics" },
  { value: "gtm", label: "Google Tag Manager" },
  { value: "tiktok", label: "TikTok Pixel" },
  { value: "custom", label: "Custom Script" },
];
const PLACEMENTS = [
  { value: "head", label: "Head" },
  { value: "body_start", label: "Body Start" },
  { value: "body_end", label: "Body End / Footer" },
];
const PAGE_TARGETS = [
  { value: "all", label: "All Pages" },
  { value: "home", label: "Homepage Only" },
  { value: "product", label: "Product Page" },
  { value: "checkout", label: "Checkout Page" },
  { value: "custom", label: "Custom URL" },
];
const DEVICE_TARGETS = [
  { value: "all", label: "All Devices" },
  { value: "mobile", label: "Mobile Only" },
  { value: "desktop", label: "Desktop Only" },
];

const empty = {
  name: "",
  platform: "facebook",
  pixel_id: "",
  script_code: "",
  placement: "head",
  page_target: "all",
  custom_url: "",
  device_target: "all",
  is_active: true,
};

export default function AdminPixelManager() {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pixel | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("pixels").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setPixels((data || []) as Pixel[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: Pixel) => {
    setEditing(p);
    setForm({
      name: p.name, platform: p.platform, pixel_id: p.pixel_id || "",
      script_code: p.script_code, placement: p.placement, page_target: p.page_target,
      custom_url: p.custom_url || "", device_target: p.device_target, is_active: p.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.script_code.trim()) {
      toast.error("Name and Script Code are required");
      return;
    }
    if (form.script_code.length > 50000) {
      toast.error("Script code too large (max 50KB)");
      return;
    }
    const payload = {
      ...form,
      pixel_id: form.pixel_id?.trim() || null,
      custom_url: form.page_target === "custom" ? form.custom_url?.trim() || null : null,
    };
    const q = editing
      ? supabase.from("pixels").update(payload).eq("id", editing.id)
      : supabase.from("pixels").insert(payload);
    const { error } = await q;
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Pixel updated" : "Pixel created");
    setOpen(false);
    load();
  };

  const toggleActive = async (p: Pixel) => {
    const { error } = await supabase.from("pixels").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) toast.error(error.message);
    else { toast.success("Status updated"); load(); }
  };

  const remove = async (p: Pixel) => {
    if (!confirm(`Delete pixel "${p.name}"?`)) return;
    const { error } = await supabase.from("pixels").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  const filtered = pixels.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.pixel_id || "").toLowerCase().includes(search.toLowerCase()) ||
    p.platform.toLowerCase().includes(search.toLowerCase())
  );

  const platformLabel = (v: string) => PLATFORMS.find(p => p.value === v)?.label || v;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pixel & Tag Manager</h1>
          <p className="text-sm text-slate-500">Inject tracking scripts (Facebook, Google, TikTok, Custom) globally or per page.</p>
        </div>
        <Button onClick={openNew} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-1" /> Add New Pixel
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 flex items-center justify-between border-b">
          <div className="text-sm text-slate-500">
            Total: <span className="font-semibold text-slate-800">{pixels.length}</span> · Active: <span className="font-semibold text-emerald-600">{pixels.filter(p => p.is_active).length}</span>
          </div>
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">SL</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Platform</th>
                <th className="text-left px-4 py-3">Pixel ID</th>
                <th className="text-left px-4 py-3">Placement</th>
                <th className="text-left px-4 py-3">Target</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No pixels yet. Click "Add New Pixel" to start.</td></tr>
              ) : filtered.map((p, i) => (
                <tr key={p.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{platformLabel(p.platform)}</Badge></td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.pixel_id || "—"}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{p.placement.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{p.page_target} / {p.device_target}</td>
                  <td className="px-4 py-3">
                    {p.is_active
                      ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
                      : <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-200">Inactive</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleActive(p)} title="Toggle"><Power className="h-3.5 w-3.5" /></Button>
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

      {/* Live Pixel Event Monitor — admin can toggle on/off */}
      <PixelLiveMonitor />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pixel" : "Add New Pixel"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pixel Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main FB Pixel" />
              </div>
              <div>
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Pixel ID (optional)</Label>
              <Input value={form.pixel_id} onChange={(e) => setForm({ ...form, pixel_id: e.target.value })} placeholder="e.g. 1234567890 or GTM-XXXX" />
            </div>
            <div>
              <Label>Full Script Code *</Label>
              <Textarea
                value={form.script_code}
                onChange={(e) => setForm({ ...form, script_code: e.target.value })}
                rows={8}
                className="font-mono text-xs"
                placeholder="<script>...</script> or just JS code"
              />
              <p className="text-xs text-slate-500 mt-1">Paste the complete tracking snippet. Both &lt;script&gt; tags and raw JS supported.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Placement</Label>
                <Select value={form.placement} onValueChange={(v) => setForm({ ...form, placement: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLACEMENTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Page Target</Label>
                <Select value={form.page_target} onValueChange={(v) => setForm({ ...form, page_target: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAGE_TARGETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Device Target</Label>
                <Select value={form.device_target} onValueChange={(v) => setForm({ ...form, device_target: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEVICE_TARGETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {form.page_target === "custom" && (
              <div>
                <Label>Custom URL Pattern</Label>
                <Input value={form.custom_url} onChange={(e) => setForm({ ...form, custom_url: e.target.value })} placeholder="/about or /collections/" />
                <p className="text-xs text-slate-500 mt-1">Pixel fires when current path starts with this value.</p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={save}>{editing ? "Update" : "Create"} Pixel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
