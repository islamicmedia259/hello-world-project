import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getAdminAccess } from "@/lib/adminAccess";
import { Shield, Loader2, ArrowLeft } from "lucide-react";

type Mode = "login" | "signup" | "forgot-email" | "forgot-otp" | "forgot-reset";

export default function AdminLogin() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);

  // forgot-password state
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const nav = useNavigate();
  const { session, isAdmin, loading } = useAuth();

  const checkPanelAccess = async () => await getAdminAccess();

  useEffect(() => {
    document.title = "Admin Login | Navigator Series Book";
    if (loading) return;
    if (session && isAdmin) {
      nav("/admin/dashboard", { replace: true });
      return;
    }
    // If logged in but not admin AND no admin exists yet -> auto-promote
    if (session && !isAdmin && adminExists === false) {
      (async () => {
        const status = await getAdminAccess("promote_first_admin").catch(() => null);
        if (status?.isAdmin) {
          toast.success("আপনাকে first admin হিসেবে assign করা হয়েছে!");
          window.location.href = "/admin/dashboard";
        }
      })();
    }
  }, [session, isAdmin, loading, adminExists, nav]);

  useEffect(() => {
    (async () => {
      const status = await getAdminAccess("admin_exists").catch(() => null);
      setAdminExists(status?.adminExists === true);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে");
      return;
    }
    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("লগইন ব্যর্থ — তথ্য সঠিক কিনা যাচাই করুন");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const access = await checkPanelAccess();
          if (access.hasPanelAccess) {
            const label = access.isAdmin ? "admin" : access.isModerator ? "moderator" : "staff";
            toast.success(`Welcome ${label}`);
            nav("/admin/dashboard");
          } else {
            toast.error("এই একাউন্টে admin panel access নেই");
            await supabase.auth.signOut();
          }
        }
      }
    } else if (mode === "signup") {
      if (adminExists) {
        toast.error("Admin একাউন্ট ইতিমধ্যে আছে।");
        setBusy(false);
        return;
      }
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      if (error) {
        toast.error(error.message);
      } else {
        // Try to get a session immediately (works if email auto-confirm enabled)
        let session = signUpData.session;
        if (!session) {
          const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
          session = signInData.session;
        }
        if (session) {
          // Promote to admin via service function (works even if database grants are misconfigured)
          await getAdminAccess("promote_first_admin");
          toast.success("Admin একাউন্ট তৈরি হয়েছে!");
          // Force a hard reload so useAuth picks up the new role
          setTimeout(() => { window.location.href = "/admin/dashboard"; }, 600);
        } else {
          toast.success("Admin একাউন্ট তৈরি হয়েছে। ইমেইল verify করে লগইন করুন।");
          setMode("login");
        }
      }
    }
    setBusy(false);
  };

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-password-reset", {
      body: { action: "request", email },
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast.error(data?.error || "OTP পাঠাতে সমস্যা হয়েছে");
      return;
    }
    toast.success("OTP পাঠানো হয়েছে — ইমেইল চেক করুন");
    setMode("forgot-otp");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast.error("৬ ডিজিটের OTP দিন");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-password-reset", {
      body: { action: "verify", email, code: otp },
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast.error(data?.error || "OTP যাচাই ব্যর্থ");
      return;
    }
    setResetToken(data.reset_token);
    toast.success("OTP সঠিক — নতুন পাসওয়ার্ড দিন");
    setMode("forgot-reset");
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("পাসওয়ার্ড মিলছে না");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-password-reset", {
      body: { action: "reset", email, reset_token: resetToken, new_password: newPassword },
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast.error(data?.error || "পাসওয়ার্ড আপডেট ব্যর্থ");
      return;
    }
    toast.success("পাসওয়ার্ড আপডেট হয়েছে — এখন লগইন করুন");
    setOtp(""); setResetToken(""); setNewPassword(""); setConfirmPassword(""); setPassword("");
    setMode("login");
  };

  const isForgot = mode === "forgot-email" || mode === "forgot-otp" || mode === "forgot-reset";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-card p-8">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Shield className="h-6 w-6" />
          </div>
        </div>
        <h1 className="font-display font-bold text-2xl mb-1 text-center">Admin Panel</h1>
        <p className="text-center text-muted-foreground text-sm mb-6">
          {mode === "login" && "Sign in to manage your store"}
          {mode === "signup" && "Create the first admin account"}
          {mode === "forgot-email" && "ইমেইল দিন — OTP পাঠানো হবে"}
          {mode === "forgot-otp" && "ইমেইলে আসা ৬ ডিজিটের OTP দিন"}
          {mode === "forgot-reset" && "নতুন পাসওয়ার্ড সেট করুন"}
        </p>

        {(mode === "login" || mode === "signup") && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input type="password" required minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none" />
              <p className="text-xs text-muted-foreground mt-1">কমপক্ষে ৮ অক্ষর</p>
            </div>
            <button disabled={busy}
              className="w-full bg-primary text-primary-foreground py-3 rounded-md font-semibold hover:bg-primary-hover transition-smooth disabled:opacity-50 flex items-center justify-center gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Please wait..." : mode === "login" ? "Sign In" : "Create Admin"}
            </button>
            {mode === "login" && (
              <button type="button" onClick={() => setMode("forgot-email")}
                className="w-full text-sm text-primary hover:underline">
                Forgot password?
              </button>
            )}
          </form>
        )}

        {mode === "forgot-email" && (
          <form onSubmit={requestOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Admin Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <button disabled={busy}
              className="w-full bg-primary text-primary-foreground py-3 rounded-md font-semibold hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {mode === "forgot-otp" && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">6-Digit OTP</label>
              <input type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} required
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full px-3 py-2.5 border rounded-md text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-primary focus:outline-none" />
              <p className="text-xs text-muted-foreground mt-1">{email} এ পাঠানো OTP দিন (১০ মিনিট বৈধ)</p>
            </div>
            <button disabled={busy}
              className="w-full bg-primary text-primary-foreground py-3 rounded-md font-semibold hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Verifying..." : "Verify OTP"}
            </button>
            <button type="button" onClick={requestOtp as any} disabled={busy}
              className="w-full text-sm text-primary hover:underline">
              OTP পাইনি — আবার পাঠান
            </button>
          </form>
        )}

        {mode === "forgot-reset" && (
          <form onSubmit={resetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">New Password</label>
              <input type="password" required minLength={8} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
              <input type="password" required minLength={8} value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <button disabled={busy}
              className="w-full bg-primary text-primary-foreground py-3 rounded-md font-semibold hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        {isForgot && (
          <button onClick={() => setMode("login")}
            className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </button>
        )}

        {!isForgot && adminExists === false && (
          <div className="mt-4 text-center text-sm">
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary hover:underline">
              {mode === "login" ? "Create first admin account" : "Back to sign in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
