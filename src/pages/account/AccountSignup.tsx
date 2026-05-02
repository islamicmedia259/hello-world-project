import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, UserPlus, ChromeIcon } from "lucide-react";

const schema = z.object({
  display_name: z.string().trim().min(2, "নাম লিখুন").max(100),
  email: z.string().trim().email("সঠিক ইমেইল দিন").max(255),
  phone: z.string().trim().min(10, "সঠিক ফোন নাম্বর দিন").max(20),
  password: z.string().min(6, "পাসওয়ার্ড অন্তত ৬ অক্ষরের"),
});

export default function AccountSignup() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/account";
  const [form, setForm] = useState({ display_name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin + redirect,
        data: { display_name: form.display_name },
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // Update profile with phone
    if (data.user) {
      // Wait briefly for trigger to insert profile row
      await new Promise((r) => setTimeout(r, 600));
      await supabase.from("profiles").update({
        phone: form.phone,
        display_name: form.display_name,
      }).eq("user_id", data.user.id);
    }
    setLoading(false);
    toast.success("একাউন্ট তৈরি হয়েছে!");
    nav(redirect);
  };

  const google = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + redirect,
    },
  });

  if (error) toast.error("Google সাইন আপ ব্যর্থ");
};

  return (
    <div className="container-page py-10 max-w-md">
      <div className="bg-card border rounded-xl p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <UserPlus className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">নতুন একাউন্ট তৈরি করুন</h1>
          <p className="text-sm text-muted-foreground mt-1">আপনার অর্ডার সেইভ ও ট্র্যাক করুন</p>
        </div>

        <Button type="button" variant="outline" className="w-full mb-4" onClick={google}>
          <ChromeIcon className="h-4 w-4 mr-2" /> Continue with Google
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">অথবা</span></div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>পূর্ণ নাম</Label>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="আপনার নাম" required />
          </div>
          <div className="space-y-1.5">
            <Label>ফোন নাম্বর</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="017XXXXXXXX" required />
          </div>
          <div className="space-y-1.5">
            <Label>ইমেইল</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
          </div>
          <div className="space-y-1.5">
            <Label>পাসওয়ার্ড</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="কমপক্ষে ৬ অক্ষর" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "একাউন্ট তৈরি করুন"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-5">
          ইতিমধ্যে একাউন্ট আছে?{" "}
          <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-primary font-semibold hover:underline">লগইন করুন</Link>
        </p>
      </div>
    </div>
  );
}
