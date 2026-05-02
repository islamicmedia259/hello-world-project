import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type EmailCfg = {
  enabled?: boolean;
  provider?: "gmail" | "smtp";
  email?: string;
  app_password?: string;
  smtp_host?: string;
  smtp_port?: string;
  encryption?: "tls" | "ssl";
  username?: string;
  password?: string;
  sender_name?: string;
};

function Section({ title, children }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 max-w-3xl">
      <h2 className="font-semibold text-lg border-b pb-2">{title}</h2>
      {children}
    </div>
  );
}

export default function AdminEmailGateway() {
  const [id, setId] = useState<string | null>(null);
  const [allKeys, setAllKeys] = useState<any>({});
  const [form, setForm] = useState<EmailCfg>({
    enabled: false,
    provider: "gmail",
    email: "",
    app_password: "",
    smtp_host: "smtp.gmail.com",
    smtp_port: "587",
    encryption: "tls",
    username: "",
    password: "",
    sender_name: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("id, api_keys").limit(1).maybeSingle();
      if (data) {
        setId(data.id);
        const keys = (data.api_keys as any) || {};
        setAllKeys(keys);
        if (keys.email) setForm({ ...form, ...keys.email });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!id) return toast.error("Settings row missing");
    if (form.enabled) {
      if (form.provider === "gmail" && (!form.email || !form.app_password)) {
        return toast.error("Gmail email এবং App Password দিন");
      }
      if (form.provider === "smtp" && (!form.smtp_host || !form.username || !form.password)) {
        return toast.error("SMTP তথ্য পূরণ করুন");
      }
    }
    setSaving(true);
    const next = { ...allKeys, email: form };
    const { error } = await supabase.from("site_settings").update({ api_keys: next, updated_at: new Date().toISOString() }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setAllKeys(next);
    toast.success("Email Settings সেইভ হয়েছে");
  };

  const sendTest = async () => {
    if (!testEmail || !/^\S+@\S+\.\S+$/.test(testEmail)) return toast.error("সঠিক ইমেইল দিন");
    if (!form.enabled) return toast.error("আগে Email Service চালু করুন এবং সেইভ করুন");
    setTesting(true);
    toast.loading("Test email পাঠানো হচ্ছে...", { id: "etest" });
    try {
      const { data, error } = await supabase.functions.invoke("send-email", { body: { test: true, to: testEmail } });
      if (error) throw new Error(error.message);
      if ((data as any)?.ok) toast.success("Test email পাঠানো হয়েছে ✓", { id: "etest" });
      else toast.error("ব্যর্থ: " + ((data as any)?.error || "Unknown"), { id: "etest" });
    } catch (e: any) {
      toast.error("ব্যর্থ: " + e.message, { id: "etest" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  const update = (k: keyof EmailCfg, v: any) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-6 pb-24">
      <h1 className="text-2xl font-bold">Email Gateway</h1>

      <Section title="Email Provider Settings">
        <div className="flex items-center gap-2">
          <Switch checked={!!form.enabled} onCheckedChange={(v) => update("enabled", v)} />
          <Label>Enabled</Label>
        </div>

        <div>
          <Label>Provider</Label>
          <Select value={form.provider} onValueChange={(v: any) => update("provider", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gmail">Gmail (Recommended)</SelectItem>
              <SelectItem value="smtp">Custom SMTP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {form.provider === "gmail" ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Sender Email</Label>
              <Input type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} placeholder="example@gmail.com" />
            </div>
            <div>
              <Label>App Password</Label>
              <Input type="password" value={form.app_password || ""} onChange={(e) => update("app_password", e.target.value)} placeholder="xxxx xxxx xxxx xxxx" />
            </div>
            <div className="sm:col-span-2 text-xs text-muted-foreground">
              Google Account → Security → 2-Step Verification → App Passwords থেকে 16-অক্ষরের পাসওয়ার্ড নিন।
            </div>
            <div className="sm:col-span-2">
              <Label>Sender Name (optional)</Label>
              <Input value={form.sender_name || ""} onChange={(e) => update("sender_name", e.target.value)} placeholder="Your Shop Name" />
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>SMTP Host</Label>
              <Input value={form.smtp_host || ""} onChange={(e) => update("smtp_host", e.target.value)} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <Label>SMTP Port</Label>
              <Input value={form.smtp_port || ""} onChange={(e) => update("smtp_port", e.target.value)} placeholder="587" />
            </div>
            <div>
              <Label>Encryption</Label>
              <Select value={form.encryption || "tls"} onValueChange={(v: any) => update("encryption", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">TLS</SelectItem>
                  <SelectItem value="ssl">SSL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sender Name</Label>
              <Input value={form.sender_name || ""} onChange={(e) => update("sender_name", e.target.value)} placeholder="Your Shop Name" />
            </div>
            <div>
              <Label>Username (Email)</Label>
              <Input type="email" value={form.username || ""} onChange={(e) => update("username", e.target.value)} placeholder="user@example.com" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password || ""} onChange={(e) => update("password", e.target.value)} />
            </div>
          </div>
        )}

        <Button onClick={save} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
          {saving ? "Saving..." : "Email Settings Save"}
        </Button>
      </Section>

      <Section title="Send Test Email">
        <div className="flex gap-2">
          <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" type="email" />
          <Button onClick={sendTest} disabled={testing} variant="outline">
            {testing ? "Sending..." : "Test Email Send"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          আপনার সেইভ করা credentials দিয়ে একটি test email পাঠানো হবে।
        </p>
      </Section>
    </div>
  );
}
