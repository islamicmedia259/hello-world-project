import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, LogIn, ChromeIcon, ArrowLeft } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email("সঠিক ইমেইল দিন").max(255),
  password: z.string().min(6, "পাসওয়ার্ড অন্তত ৬ অক্ষরের"),
});

type Mode = "login" | "forgot-email" | "forgot-otp" | "forgot-reset";

export default function AccountLogin() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/account";
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // forgot-password state
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("সফলভাবে লগইন হয়েছে");
    nav(redirect);
  };

  const google = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + redirect,
    },
  });

  if (error) toast.error("Google লগইন ব্যর্থ");
};

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("ইমেইল দিন");
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("user-password-reset", {
      body: { action: "request", email },
    });
    setLoading(false);
    if (error || !data?.ok) return toast.error(data?.error || "OTP পাঠাতে সমস্যা হয়েছে");
    toast.success("OTP পাঠানো হয়েছে — ইমেইল চেক করুন");
    setMode("forgot-otp");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return toast.error("৬ ডিজিটের OTP দিন");
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("user-password-reset", {
      body: { action: "verify", email, code: otp },
    });
    setLoading(false);
    if (error || !data?.ok) return toast.error(data?.error || "OTP যাচাই ব্যর্থ");
    setResetToken(data.reset_token);
    toast.success("OTP সঠিক — নতুন পাসওয়ার্ড দিন");
    setMode("forgot-reset");
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("পাসওয়ার্ড অন্তত ৬ অক্ষরের");
    if (newPassword !== confirmPassword) return toast.error("পাসওয়ার্ড মিলছে না");
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("user-password-reset", {
      body: { action: "reset", email, reset_token: resetToken, new_password: newPassword },
    });
    setLoading(false);
    if (error || !data?.ok) return toast.error(data?.error || "পাসওয়ার্ড আপডেট ব্যর্থ");
    toast.success("পাসওয়ার্ড আপডেট হয়েছে — এখন লগইন করুন");
    setOtp(""); setResetToken(""); setNewPassword(""); setConfirmPassword(""); setPassword("");
    setMode("login");
  };

  const isForgot = mode !== "login";

  return (
    <div className="container-page py-10 max-w-md">
      <div className="bg-card border rounded-xl p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <LogIn className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">
            {mode === "login" && "আপনার একাউন্টে লগইন করুন"}
            {mode === "forgot-email" && "পাসওয়ার্ড রিসেট"}
            {mode === "forgot-otp" && "OTP যাচাই করুন"}
            {mode === "forgot-reset" && "নতুন পাসওয়ার্ড সেট করুন"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" && "অর্ডার ট্র্যাক ও ইনভয়েস দেখুন"}
            {mode === "forgot-email" && "ইমেইল দিন — OTP পাঠানো হবে"}
            {mode === "forgot-otp" && "ইমেইলে আসা ৬ ডিজিটের OTP দিন"}
            {mode === "forgot-reset" && "একটি নতুন পাসওয়ার্ড দিন"}
          </p>
        </div>

        {mode === "login" && (
          <>
            <Button type="button" variant="outline" className="w-full mb-4" onClick={google}>
              <ChromeIcon className="h-4 w-4 mr-2" /> Continue with Google
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">অথবা</span></div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">ইমেইল</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">পাসওয়ার্ড</Label>
                  <button type="button" onClick={() => setMode("forgot-email")} className="text-xs text-primary hover:underline">
                    ভুলে গেছেন?
                  </button>
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "লগইন"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-5">
              একাউন্ট নেই?{" "}
              <Link to={`/signup?redirect=${encodeURIComponent(redirect)}`} className="text-primary font-semibold hover:underline">সাইন আপ করুন</Link>
            </p>
          </>
        )}

        {mode === "forgot-email" && (
          <form onSubmit={requestOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="femail">ইমেইল</Label>
              <Input id="femail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "OTP পাঠান"}
            </Button>
          </form>
        )}

        {mode === "forgot-otp" && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="otp">৬ ডিজিটের OTP</Label>
              <Input id="otp" inputMode="numeric" maxLength={6} value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.5em] font-mono" required />
              <p className="text-xs text-muted-foreground">{email} এ পাঠানো OTP দিন (১০ মিনিট বৈধ)</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "যাচাই করুন"}
            </Button>
            <button type="button" onClick={requestOtp as any} disabled={loading} className="w-full text-sm text-primary hover:underline">
              OTP পাইনি — আবার পাঠান
            </button>
          </form>
        )}

        {mode === "forgot-reset" && (
          <form onSubmit={resetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="np">নতুন পাসওয়ার্ড</Label>
              <Input id="np" type="password" minLength={6} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp">কনফার্ম পাসওয়ার্ড</Label>
              <Input id="cp" type="password" minLength={6} value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "পাসওয়ার্ড আপডেট"}
            </Button>
          </form>
        )}

        {isForgot && (
          <button onClick={() => setMode("login")}
            className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> লগইন এ ফিরে যান
          </button>
        )}
      </div>
    </div>
  );
}
