import { useEffect, useState } from "react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AccountAddress() {
  const { profile, session, refreshProfile } = useCustomerAuth();
  const [form, setForm] = useState({ district: "", thana: "", address: "" });
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [thanas, setThanas] = useState<{ id: string; district_id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("districts").select("id,name").eq("is_active", true).order("name").then(({ data }) => setDistricts((data as any) || []));
    supabase.from("thanas").select("id,district_id,name").eq("is_active", true).order("name").then(({ data }) => setThanas((data as any) || []));
  }, []);

  useEffect(() => {
    if (profile) setForm({ district: profile.district || "", thana: profile.thana || "", address: profile.address || "" });
  }, [profile]);

  const filteredThanas = (() => {
    const d = districts.find((x) => x.name === form.district);
    if (!d) return [];
    return thanas.filter((t) => t.district_id === d.id);
  })();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      district: form.district || null,
      thana: form.thana || null,
      address: form.address.trim() || null,
    }).eq("user_id", session.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("ঠিকানা সেইভ হয়েছে — চেকআউটে অটো-ফিল হবে");
    await refreshProfile();
  };

  return (
    <div className="bg-card border rounded-xl p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-1">ঠিকানা</h1>
      <p className="text-sm text-muted-foreground mb-5">এখানে সেইভ করা ঠিকানা চেকআউটে অটোমেটিক ফিল হবে</p>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label>জেলা</Label>
          <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value, thana: "" })}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">-- জেলা সিলেক্ট করুন --</option>
            {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>থানা</Label>
          <select value={form.thana} onChange={(e) => setForm({ ...form, thana: e.target.value })} disabled={!form.district}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50">
            <option value="">-- থানা সিলেক্ট করুন --</option>
            {filteredThanas.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>বিস্তারিত ঠিকানা</Label>
          <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="বাড়ি/রোড/এলাকা" rows={3} />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "সেইভ করুন"}
        </Button>
      </form>
    </div>
  );
}
