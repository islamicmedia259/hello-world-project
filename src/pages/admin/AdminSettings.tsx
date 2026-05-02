import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FIELDS: { key: string; label: string; type?: string }[] = [
  { key: "site_name", label: "Site Name" },
  { key: "logo_url", label: "Logo URL" },
  { key: "favicon_url", label: "Favicon URL" },
  { key: "contact_email", label: "Contact Email", type: "email" },
  { key: "contact_phone", label: "Contact Phone" },
  { key: "whatsapp_number", label: "WhatsApp Number" },
  { key: "address", label: "Address" },
  { key: "facebook_url", label: "Facebook URL" },
  { key: "youtube_url", label: "YouTube URL" },
  { key: "instagram_url", label: "Instagram URL" },
  { key: "footer_text", label: "Footer Text" },
  { key: "meta_description", label: "Meta Description" },
];

export default function AdminSettings() {
  const [data, setData] = useState<any>({});
  const [id, setId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Site Settings | Admin";
    (async () => {
      const { data: row } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      if (row) { setData(row); setId(row.id); }
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    let currentId = id;
    // Auto-create the row if it doesn't exist yet (fresh local DB)
    if (!currentId) {
      const { data: created, error: insErr } = await supabase
        .from("site_settings")
        .insert({})
        .select()
        .maybeSingle();
      if (insErr || !created) {
        setBusy(false);
        toast.error(insErr?.message || "Could not create settings row");
        return;
      }
      currentId = created.id;
      setId(created.id);
    }
    const { id: _, ...payload } = data;
    const { error } = await supabase
      .from("site_settings")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", currentId);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Settings saved");
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="font-display font-bold text-2xl">Site Settings</h1>
      <div className="bg-card rounded-xl shadow-card p-6 space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium mb-1.5">{f.label}</label>
            {f.key === "footer_text" || f.key === "meta_description" || f.key === "address" ? (
              <textarea
                value={data[f.key] || ""}
                onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
              />
            ) : (
              <input
                type={f.type || "text"}
                value={data[f.key] || ""}
                onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
              />
            )}
          </div>
        ))}
        <button onClick={save} disabled={busy} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-semibold hover:bg-primary-hover disabled:opacity-50">
          {busy ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
