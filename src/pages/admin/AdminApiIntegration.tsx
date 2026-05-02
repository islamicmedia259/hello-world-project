import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type ApiKeys = Record<string, any>;

function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeys>({});
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("id, api_keys").limit(1).maybeSingle();
      if (data) { setId(data.id); setKeys((data.api_keys as ApiKeys) || {}); }
      setLoading(false);
    })();
  }, []);

  const saveSection = async (section: string, value: any) => {
    if (!id) return;
    const next = { ...keys, [section]: value };
    const { error } = await supabase.from("site_settings").update({ api_keys: next, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    setKeys(next);
    toast.success("Saved");
  };

  return { keys, saveSection, loading };
}

function Section({ title, children }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 max-w-3xl">
      <h2 className="font-semibold text-lg border-b pb-2">{title}</h2>
      {children}
    </div>
  );
}

// ───────────────── Payment Gateway ─────────────────
export function PaymentGatewayPage() {
  const { keys, saveSection, loading } = useApiKeys();
  const p = keys.payment || { active: "manual", bkash: {}, nagad: {}, rocket: {}, sslcommerz: {} };
  const [form, setForm] = useState(p);
  useEffect(() => { setForm(keys.payment || { active: "manual", bkash: {}, nagad: {}, rocket: {}, sslcommerz: {} }); }, [keys]);

  if (loading) return <div>Loading...</div>;

  const update = (path: string, val: any) => {
    const [prov, key] = path.split(".");
    if (key) setForm({ ...form, [prov]: { ...(form[prov] || {}), [key]: val } });
    else setForm({ ...form, [prov]: val });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payment Gateway</h1>

      <Section title="General">
        <div>
          <Label>Default Active Method</Label>
          <Select value={form.active || "manual"} onValueChange={(v) => update("active", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Cash on Delivery (Manual)</SelectItem>
              <SelectItem value="bkash">bKash</SelectItem>
              <SelectItem value="nagad">Nagad</SelectItem>
              <SelectItem value="rocket">Rocket</SelectItem>
              <SelectItem value="sslcommerz">SSLCommerz</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section title="bKash">
        <div className="flex items-center gap-2"><Switch checked={!!form.bkash?.enabled} onCheckedChange={(v) => update("bkash.enabled", v)} /><Label>Enabled</Label></div>
        <div><Label>Merchant Number</Label><Input value={form.bkash?.number || ""} onChange={(e) => update("bkash.number", e.target.value)} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>App Key</Label><Input value={form.bkash?.app_key || ""} onChange={(e) => update("bkash.app_key", e.target.value)} /></div>
          <div><Label>App Secret</Label><Input value={form.bkash?.app_secret || ""} onChange={(e) => update("bkash.app_secret", e.target.value)} /></div>
          <div><Label>Username</Label><Input value={form.bkash?.username || ""} onChange={(e) => update("bkash.username", e.target.value)} /></div>
          <div><Label>Password</Label><Input type="password" value={form.bkash?.password || ""} onChange={(e) => update("bkash.password", e.target.value)} /></div>
        </div>
        <div>
          <Label>Mode</Label>
          <Select value={form.bkash?.mode || "sandbox"} onValueChange={(v) => update("bkash.mode", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox</SelectItem>
              <SelectItem value="live">Live</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section title="Nagad">
        <div className="flex items-center gap-2"><Switch checked={!!form.nagad?.enabled} onCheckedChange={(v) => update("nagad.enabled", v)} /><Label>Enabled</Label></div>
        <div><Label>Merchant Number</Label><Input value={form.nagad?.number || ""} onChange={(e) => update("nagad.number", e.target.value)} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Merchant ID</Label><Input value={form.nagad?.merchant_id || ""} onChange={(e) => update("nagad.merchant_id", e.target.value)} /></div>
          <div><Label>Public Key</Label><Input value={form.nagad?.public_key || ""} onChange={(e) => update("nagad.public_key", e.target.value)} /></div>
        </div>
      </Section>

      <Section title="Rocket">
        <div className="flex items-center gap-2"><Switch checked={!!form.rocket?.enabled} onCheckedChange={(v) => update("rocket.enabled", v)} /><Label>Enabled</Label></div>
        <div><Label>Merchant Number</Label><Input value={form.rocket?.number || ""} onChange={(e) => update("rocket.number", e.target.value)} /></div>
      </Section>

      <Section title="SSLCommerz">
        <div className="flex items-center gap-2"><Switch checked={!!form.sslcommerz?.enabled} onCheckedChange={(v) => update("sslcommerz.enabled", v)} /><Label>Enabled</Label></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Store ID</Label><Input value={form.sslcommerz?.store_id || ""} onChange={(e) => update("sslcommerz.store_id", e.target.value)} /></div>
          <div><Label>Store Password</Label><Input type="password" value={form.sslcommerz?.store_password || ""} onChange={(e) => update("sslcommerz.store_password", e.target.value)} /></div>
        </div>
      </Section>

      <Button onClick={() => saveSection("payment", form)} className="bg-violet-600 hover:bg-violet-700">Save Payment Settings</Button>
    </div>
  );
}

// ───────────────── SMS Gateway ─────────────────
export function SmsGatewayPage() {
  const { keys, saveSection, loading } = useApiKeys();
  const initial = keys.sms || { provider: "bulksmsbd", api_key: "", sender_id: "", username: "", password: "", enabled: false };
  const [form, setForm] = useState(initial);
  useEffect(() => { setForm(keys.sms || initial); }, [keys]);
  const [testNumber, setTestNumber] = useState("");

  if (loading) return <div>Loading...</div>;

  const sendTest = async () => {
    if (!testNumber) return toast.error("Enter a test number");
    toast.info("Test SMS will be wired up to an edge function once you save credentials.");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">SMS Gateway</h1>
      <Section title="SMS Provider Settings">
        <div className="flex items-center gap-2"><Switch checked={!!form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} /><Label>Enabled</Label></div>
        <div>
          <Label>Provider</Label>
          <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bulksmsbd">BulkSMSBD</SelectItem>
              <SelectItem value="alpha_sms">Alpha SMS</SelectItem>
              <SelectItem value="ssl_sms">SSL Wireless</SelectItem>
              <SelectItem value="mim_sms">MIM SMS</SelectItem>
              <SelectItem value="twilio">Twilio</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>API Key / Token</Label><Input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} /></div>
          <div><Label>Sender ID</Label><Input value={form.sender_id} onChange={(e) => setForm({ ...form, sender_id: e.target.value })} /></div>
          <div><Label>Username (optional)</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div><Label>Password (optional)</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        </div>
        <div>
          <Label>Custom Endpoint URL (only for "Custom")</Label>
          <Input value={form.endpoint || ""} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} placeholder="https://api.example.com/send" />
        </div>
        <Button onClick={() => saveSection("sms", form)} className="bg-violet-600 hover:bg-violet-700">Save SMS Settings</Button>
      </Section>

      <Section title="Send Test SMS">
        <div className="flex gap-2">
          <Input value={testNumber} onChange={(e) => setTestNumber(e.target.value)} placeholder="01XXXXXXXXX" />
          <Button onClick={sendTest} variant="outline">Send Test</Button>
        </div>
        <p className="text-xs text-muted-foreground">Test SMS sending will be available once an SMS edge function is implemented.</p>
      </Section>
    </div>
  );
}

// ───────────────── Courier API ─────────────────
export function CourierApiPage() {
  const { keys, saveSection, loading } = useApiKeys();
  const initial = {
    pathao: { enabled: false, mode: "live", client_id: "", client_secret: "", username: "", password: "", store_id: "", city_id: "", zone_id: "", area_id: "" },
    steadfast: { enabled: false, api_key: "", secret_key: "" },
    redx: { enabled: false, api_token: "" },
    carrybee: { enabled: false, api_key: "", secret_key: "" },
  };
  const merge = (k: any) => ({
    ...initial,
    ...(k || {}),
    pathao: { ...initial.pathao, ...(k?.pathao || {}) },
    steadfast: { ...initial.steadfast, ...(k?.steadfast || {}) },
    redx: { ...initial.redx, ...(k?.redx || {}) },
    carrybee: { ...initial.carrybee, ...(k?.carrybee || {}) },
  });
  const [form, setForm] = useState<any>(merge(keys.courier));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync from DB when keys load/refresh (only if not editing)
  useEffect(() => {
    if (!dirty) setForm(merge(keys.courier));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);

  // Realtime subscription — reflect remote updates only when user isn't editing locally
  useEffect(() => {
    const ch = supabase
      .channel("courier-settings-rt")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "site_settings" }, (payload: any) => {
        const next = (payload.new?.api_keys as any)?.courier;
        if (next && !dirty) setForm(merge(next));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  const handleSave = async () => {
    setSaving(true);
    await saveSection("courier", form);
    setSavedAt(Date.now());
    setDirty(false);
    setSaving(false);
  };

  if (loading) return <div>Loading...</div>;

  const update = (prov: string, key: string, val: any) => {
    setDirty(true);
    setForm({ ...form, [prov]: { ...(form[prov] || {}), [key]: val } });
  };

  const testProvider = async (provider: "pathao" | "steadfast" | "redx" | "carrybee") => {
    setTesting(provider);
    toast.loading(`Testing ${provider}...`, { id: `test-${provider}` });
    try {
      // Auto-save first so the edge function reads latest values from DB
      if (dirty) {
        await saveSection("courier", form);
        setSavedAt(Date.now());
        setDirty(false);
      }
      const { data, error } = await supabase.functions.invoke(`${provider}-send`, { body: { test: true } });
      if (error) throw new Error(error.message);
      if (data?.ok) toast.success(`${provider} connected ✓`, { id: `test-${provider}`, description: data?.message || "Authentication successful" });
      else toast.error(`${provider} test failed`, { id: `test-${provider}`, description: data?.error || "Check credentials" });
    } catch (e: any) {
      toast.error(`${provider} test failed`, { id: `test-${provider}`, description: e.message });
    } finally {
      setTesting(null);
    }
  };

  const lastSaved = savedAt ? new Date(savedAt).toLocaleTimeString() : null;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Courier API</h1>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs text-amber-600">● Unsaved changes</span>}
          {!dirty && lastSaved && <span className="text-xs text-emerald-600">✓ Saved at {lastSaved}</span>}
          <Button onClick={handleSave} disabled={!dirty || saving} className="bg-violet-600 hover:bg-violet-700">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground -mt-3">credentials দিয়ে <b>Save Changes</b> চাপুন। সব admin সেশনে রিয়েল-টাইম সিঙ্ক হবে।</p>


      <Section title="Pathao">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={!!form.pathao?.enabled} onCheckedChange={(v) => update("pathao", "enabled", v)} />
            <Label>Enabled</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => testProvider("pathao")} disabled={!form.pathao?.enabled || testing === "pathao"}>
            {testing === "pathao" ? "Testing..." : "Test Connection"}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-xs">Mode:</Label>
          <Select value={form.pathao?.mode || "live"} onValueChange={(v) => update("pathao", "mode", v)}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="live">Live (Production)</SelectItem>
              <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
            </SelectContent>
          </Select>
          <code className="text-xs text-muted-foreground">
            {form.pathao?.mode === "sandbox" ? "courier-api-sandbox.pathao.com" : "api-hermes.pathao.com"}
          </code>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Client ID</Label><Input value={form.pathao?.client_id || ""} onChange={(e) => update("pathao", "client_id", e.target.value)} /></div>
          <div><Label>Client Secret</Label><Input type="password" value={form.pathao?.client_secret || ""} onChange={(e) => update("pathao", "client_secret", e.target.value)} /></div>
          <div><Label>Username (Email)</Label><Input value={form.pathao?.username || ""} onChange={(e) => update("pathao", "username", e.target.value)} /></div>
          <div><Label>Password</Label><Input type="password" value={form.pathao?.password || ""} onChange={(e) => update("pathao", "password", e.target.value)} /></div>
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <div><Label>Default Store ID</Label><Input value={form.pathao?.store_id || ""} onChange={(e) => update("pathao", "store_id", e.target.value)} /></div>
          <div><Label>Default City ID</Label><Input value={form.pathao?.city_id || ""} onChange={(e) => update("pathao", "city_id", e.target.value)} /></div>
          <div><Label>Default Zone ID</Label><Input value={form.pathao?.zone_id || ""} onChange={(e) => update("pathao", "zone_id", e.target.value)} /></div>
          <div><Label>Default Area ID</Label><Input value={form.pathao?.area_id || ""} onChange={(e) => update("pathao", "area_id", e.target.value)} /></div>
        </div>
      </Section>

      <Section title="Steadfast">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={!!form.steadfast?.enabled} onCheckedChange={(v) => update("steadfast", "enabled", v)} />
            <Label>Enabled</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => testProvider("steadfast")} disabled={!form.steadfast?.enabled || testing === "steadfast"}>
            {testing === "steadfast" ? "Testing..." : "Test Connection"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Endpoint: <code>https://portal.packzy.com/api/v1</code></p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>API Key</Label><Input value={form.steadfast?.api_key || ""} onChange={(e) => update("steadfast", "api_key", e.target.value)} /></div>
          <div><Label>Secret Key</Label><Input type="password" value={form.steadfast?.secret_key || ""} onChange={(e) => update("steadfast", "secret_key", e.target.value)} /></div>
        </div>
      </Section>

      <Section title="RedX">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={!!form.redx?.enabled} onCheckedChange={(v) => update("redx", "enabled", v)} />
            <Label>Enabled</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => testProvider("redx")} disabled={!form.redx?.enabled || testing === "redx"}>
            {testing === "redx" ? "Testing..." : "Test Connection"}
          </Button>
        </div>
        <div><Label>API Access Token</Label><Input type="password" value={form.redx?.api_token || ""} onChange={(e) => update("redx", "api_token", e.target.value)} placeholder="Bearer token from RedX merchant panel" /></div>
        <p className="text-xs text-muted-foreground">Endpoint: <code>https://openapi.redx.com.bd/v1.0.0-beta</code> · RedX merchant panel → Settings → API Access থেকে token নিন।</p>
      </Section>

      <Section title="CarryBee">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={!!form.carrybee?.enabled} onCheckedChange={(v) => update("carrybee", "enabled", v)} />
            <Label>Enabled</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => testProvider("carrybee")} disabled={!form.carrybee?.enabled || testing === "carrybee"}>
            {testing === "carrybee" ? "Testing..." : "Test Connection"}
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>API Key</Label><Input value={form.carrybee?.api_key || ""} onChange={(e) => update("carrybee", "api_key", e.target.value)} /></div>
          <div><Label>Secret Key</Label><Input type="password" value={form.carrybee?.secret_key || ""} onChange={(e) => update("carrybee", "secret_key", e.target.value)} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Endpoint: <code>https://app.carrybee.com.bd/api</code> · CarryBee merchant dashboard থেকে credentials নিন।</p>
      </Section>
    </div>
  );
}
