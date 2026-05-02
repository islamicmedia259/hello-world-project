import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

async function uploadSiteAsset(file: File, prefix: string): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
  return data.publicUrl;
}

function ImageUploadField({ label, value, onChange, prefix, hint }: { label: string; value?: string; onChange: (url: string) => void; prefix: string; hint?: string; }) {
  const [busy, setBusy] = useState(false);
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadSiteAsset(file, prefix);
      onChange(url);
      toast.success("Uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };
  return (
    <div>
      <Label className="block mb-1.5">{label}</Label>
      <div className="flex items-start gap-3">
        <div className="h-20 w-20 rounded-md border bg-secondary/30 flex items-center justify-center overflow-hidden shrink-0">
          {value ? <img src={value} alt={label} className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">No image</span>}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-secondary text-sm">
              <Upload className="h-4 w-4" />
              {busy ? "Uploading..." : "Upload Image"}
              <input type="file" accept="image/*" onChange={handle} className="hidden" disabled={busy} />
            </label>
            {value && (
              <button type="button" onClick={() => onChange("")} className="inline-flex items-center gap-1 px-3 py-2 border rounded-md text-sm hover:bg-destructive hover:text-destructive-foreground">
                <X className="h-4 w-4" /> Remove
              </button>
            )}
          </div>
          <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="or paste URL" className="text-xs" />
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

function useSettings() {
  const [data, setData] = useState<any>({});
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data: row } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      if (row) { setData(row); setId(row.id); }
      setLoading(false);
    })();
  }, []);
  const save = async (patch: any) => {
    if (!id) return;
    const { error } = await supabase.from("site_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setData((d: any) => ({ ...d, ...patch })); }
  };
  return { data, setData, save, loading };
}

function Field({ label, value, onChange, type = "text", textarea, placeholder }: any) {
  return (
    <div>
      <Label className="block mb-1.5">{label}</Label>
      {textarea ? (
        <Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder} />
      ) : (
        <Input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

export function GeneralSetting() {
  const { data, setData, save, loading } = useSettings();
  if (loading) return <div>Loading...</div>;
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">General Setting</h1>
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <Field label="Site Name" value={data.site_name} onChange={(v: string) => setData({ ...data, site_name: v })} />
        <ImageUploadField label="Logo" value={data.logo_url} onChange={(v) => setData({ ...data, logo_url: v })} prefix="logo" hint="Used in header & footer" />
        <ImageUploadField label="Favicon" value={data.favicon_url} onChange={(v) => setData({ ...data, favicon_url: v })} prefix="favicon" hint="Square .png or .ico recommended" />
        <Field label="Meta Description" value={data.meta_description} onChange={(v: string) => setData({ ...data, meta_description: v })} textarea />
        <Field label="Footer Text" value={data.footer_text} onChange={(v: string) => setData({ ...data, footer_text: v })} textarea />
        <Button onClick={() => save({
          site_name: data.site_name,
          logo_url: data.logo_url,
          white_logo_url: data.logo_url,
          dark_logo_url: data.logo_url,
          favicon_url: data.favicon_url,
          meta_description: data.meta_description, footer_text: data.footer_text,
        })}>Save</Button>
      </div>
    </div>
  );
}

const ICON_OPTIONS = [
  { key: "facebook", label: "Facebook", color: "#1877F2" },
  { key: "messenger", label: "Messenger", color: "#0084FF" },
  { key: "youtube", label: "YouTube", color: "#FF0000" },
  { key: "instagram", label: "Instagram", color: "#E4405F" },
  { key: "twitter", label: "Twitter / X", color: "#000000" },
  { key: "linkedin", label: "LinkedIn", color: "#0A66C2" },
  { key: "tiktok", label: "TikTok", color: "#010101" },
  { key: "whatsapp", label: "WhatsApp", color: "#25D366" },
  { key: "telegram", label: "Telegram", color: "#229ED9" },
  { key: "github", label: "GitHub", color: "#181717" },
  { key: "globe", label: "Website", color: "#374151" },
  { key: "mail", label: "Email", color: "#EA4335" },
  { key: "phone", label: "Phone", color: "#22C55E" },
];

export function SocialMedia() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("social_links").select("*").order("sort_order").order("created_at");
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startCreate = () => setEditing({ name: "", icon_key: "facebook", url: "", color: "#1877F2", sort_order: (rows[rows.length - 1]?.sort_order || 0) + 1, is_active: true });
  const startEdit = (r: any) => setEditing({ ...r });

  const saveLink = async () => {
    if (!editing.name || !editing.url) { toast.error("Name and Link are required"); return; }
    const payload = {
      name: editing.name, icon_key: editing.icon_key, url: editing.url,
      color: editing.color, sort_order: Number(editing.sort_order) || 0, is_active: !!editing.is_active,
    };
    const { error } = editing.id
      ? await supabase.from("social_links").update(payload).eq("id", editing.id)
      : await supabase.from("social_links").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const toggleActive = async (r: any) => {
    await supabase.from("social_links").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };

  const remove = async (r: any) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    await supabase.from("social_links").delete().eq("id", r.id);
    load();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Social Media</h1>
        <Button onClick={startCreate}>+ Add Social Link</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="p-3 w-12">#</th>
              <th className="p-3">Name</th>
              <th className="p-3">Icon</th>
              <th className="p-3">Link</th>
              <th className="p-3 w-20">Status</th>
              <th className="p-3 w-40">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No social links yet.</td></tr>}
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{i + 1}</td>
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full inline-block" style={{ background: r.color }} />
                    <span className="text-muted-foreground">{r.icon_key}</span>
                  </span>
                </td>
                <td className="p-3 truncate max-w-xs"><a href={r.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{r.url}</a></td>
                <td className="p-3">
                  <button onClick={() => toggleActive(r)} className={`px-2 py-0.5 rounded text-xs ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                    {r.is_active ? "Active" : "Off"}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(r)} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">Edit</button>
                    <button onClick={() => remove(r)} className="px-3 py-1 rounded bg-destructive text-destructive-foreground text-xs">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{editing.id ? "Edit" : "Create"} Social Link</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Name *" value={editing.name} onChange={(v: string) => setEditing({ ...editing, name: v })} />
              <div>
                <Label className="block mb-1.5">Icon *</Label>
                <select
                  value={editing.icon_key}
                  onChange={(e) => {
                    const opt = ICON_OPTIONS.find(o => o.key === e.target.value);
                    setEditing({ ...editing, icon_key: e.target.value, color: opt?.color || editing.color });
                  }}
                  className="w-full h-10 px-3 border rounded-md bg-background"
                >
                  {ICON_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Field label="Link *" value={editing.url} onChange={(v: string) => setEditing({ ...editing, url: v })} />
              </div>
              <Field label="Serial No" value={editing.sort_order} onChange={(v: string) => setEditing({ ...editing, sort_order: v })} type="number" />
              <div>
                <Label className="block mb-1.5">Color</Label>
                <input type="color" value={editing.color || "#000000"} onChange={(e) => setEditing({ ...editing, color: e.target.value })} className="h-10 w-full rounded border" />
              </div>
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                <span>Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveLink}>Submit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ContactInfo() {
  const { data, setData, save, loading } = useSettings();
  if (loading) return <div>Loading...</div>;
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Contact</h1>
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <Field label="Contact Email" value={data.contact_email} onChange={(v: string) => setData({ ...data, contact_email: v })} type="email" />
        <Field label="Contact Phone" value={data.contact_phone} onChange={(v: string) => setData({ ...data, contact_phone: v })} />
        <Field label="WhatsApp Number (e.g. 8801580787647)" value={data.whatsapp_number} onChange={(v: string) => setData({ ...data, whatsapp_number: v })} />
        <Field label="Messenger URL (e.g. https://m.me/yourpage)" value={(data as any).messenger_url} onChange={(v: string) => setData({ ...data, messenger_url: v } as any)} />
        <Field label="Address" value={data.address} onChange={(v: string) => setData({ ...data, address: v })} textarea />
        <div className="pt-4 border-t">
          <h2 className="font-semibold mb-3">📱 Mobile App Links (Footer এ দেখাবে)</h2>
          <Field label="Google Play Store URL" value={(data as any).play_store_url} onChange={(v: string) => setData({ ...data, play_store_url: v } as any)} placeholder="https://play.google.com/store/apps/details?id=..." />
          <Field label="Apple App Store URL" value={(data as any).app_store_url} onChange={(v: string) => setData({ ...data, app_store_url: v } as any)} placeholder="https://apps.apple.com/app/..." />
          <p className="text-xs text-muted-foreground mt-1">URL দিলে Footer-এ Google Play / App Store icon দেখাবে। খালি রাখলে দেখাবে না।</p>
        </div>
        <Button onClick={() => save({
          contact_email: data.contact_email, contact_phone: data.contact_phone,
          whatsapp_number: data.whatsapp_number, messenger_url: (data as any).messenger_url, address: data.address,
          play_store_url: (data as any).play_store_url, app_store_url: (data as any).app_store_url,
        } as any)}>Save</Button>
      </div>
    </div>
  );
}
