import { useEffect, useRef, useState } from "react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Camera, User as UserIcon, Trash2 } from "lucide-react";

export default function AccountProfile() {
  const { profile, session, refreshProfile } = useCustomerAuth();
  const [form, setForm] = useState({ display_name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) setForm({ display_name: profile.display_name || "", phone: profile.phone || "", email: profile.email || session?.user?.email || "" });
  }, [profile, session]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: form.display_name.trim(),
      phone: form.phone.trim(),
    }).eq("user_id", session.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("প্রোফাইল আপডেট হয়েছে");
    await refreshProfile();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;
    if (file.size > 1 * 1024 * 1024) {
      toast.error("ছবির সাইজ 1MB এর কম হতে হবে");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("শুধু ছবি আপলোড করুন");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("profiles").update({
        avatar_url: pub.publicUrl,
      }).eq("user_id", session.user.id);
      if (dbErr) throw dbErr;
      toast.success("প্রোফাইল ছবি আপডেট হয়েছে");
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "আপলোড ব্যর্থ");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    if (!session?.user) return;
    setUploading(true);
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", session.user.id);
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("প্রোফাইল ছবি সরানো হয়েছে");
    await refreshProfile();
  };

  const initials = (form.display_name || form.email || "U")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="bg-card border rounded-xl p-5 sm:p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-5">প্রোফাইল</h1>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6 pb-5 border-b">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold overflow-hidden ring-2 ring-border">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary-hover disabled:opacity-60"
            aria-label="Change avatar"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold mb-1">প্রোফাইল ছবি</div>
          <p className="text-xs text-muted-foreground mb-2">JPG/PNG, সর্বোচ্চ 1MB</p>
          <div className="flex gap-2 flex-wrap">
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <UserIcon className="h-3.5 w-3.5 mr-1" /> ছবি বদলান
            </Button>
            {profile?.avatar_url && (
              <Button type="button" size="sm" variant="ghost" onClick={removeAvatar} disabled={uploading} className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> সরান
              </Button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label>পূর্ণ নাম</Label>
          <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>ইমেইল</Label>
          <Input value={form.email} disabled />
          <p className="text-xs text-muted-foreground">ইমেইল পরিবর্তন করা যাবে না</p>
        </div>
        <div className="space-y-1.5">
          <Label>ফোন নাম্বর</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="017XXXXXXXX" />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "সেইভ করুন"}
        </Button>
      </form>
    </div>
  );
}
