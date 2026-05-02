import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

type Popup = {
  id: string;
  name: string;
  style: "image_link" | "image_cta" | "newsletter" | "promo";
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  promo_code: string | null;
  bg_color: string | null;
  text_color: string | null;
  delay_seconds: number;
  frequency_hours: number;
  start_at: string | null;
  end_at: string | null;
};

const SEEN_KEY = "popup_seen_v1";

function getSeen(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); } catch { return {}; }
}
function markSeen(id: string) {
  const s = getSeen(); s[id] = Date.now();
  localStorage.setItem(SEEN_KEY, JSON.stringify(s));
}

export default function EntryPopup() {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("popups")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .limit(20);
      if (cancelled || !data) return;

      const seen = getSeen();
      const eligible = (data as Popup[]).find((p) => {
        if (p.start_at && p.start_at > now) return false;
        if (p.end_at && p.end_at < now) return false;
        const lastSeen = seen[p.id];
        if (lastSeen && p.frequency_hours > 0) {
          const hoursSince = (Date.now() - lastSeen) / 36e5;
          if (hoursSince < p.frequency_hours) return false;
        }
        return true;
      });
      if (!eligible) return;
      setPopup(eligible);
      const t = setTimeout(() => setOpen(true), Math.max(0, (eligible.delay_seconds || 0) * 1000));
      return () => clearTimeout(t);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleClose = () => {
    if (popup) markSeen(popup.id);
    setOpen(false);
  };

  const subscribe = async () => {
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Valid email দিন");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: email.trim().toLowerCase(), source: "popup" });
    setSubmitting(false);
    if (error && !error.message.includes("duplicate")) {
      toast.error(error.message);
      return;
    }
    toast.success("ধন্যবাদ! আপনি subscribe হয়েছেন");
    handleClose();
  };

  const copyPromo = async () => {
    if (!popup?.promo_code) return;
    await navigator.clipboard.writeText(popup.promo_code);
    setCopied(true);
    toast.success("Promo code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!popup) return null;

  const bg = popup.bg_color || "#ffffff";
  const fg = popup.text_color || "#0f172a";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0" style={{ background: bg, color: fg }}>
        {popup.image_url && (
          popup.style === "image_link" && popup.link_url ? (
            <a href={popup.link_url} onClick={handleClose} className="block">
              <img src={popup.image_url} alt={popup.name} className="w-full h-auto" />
            </a>
          ) : (
            <img src={popup.image_url} alt={popup.name} className="w-full h-auto" />
          )
        )}

        {popup.style !== "image_link" && (
          <div className="p-6 space-y-3 text-center">
            {popup.title && <h2 className="text-2xl font-bold" style={{ color: fg }}>{popup.title}</h2>}
            {popup.subtitle && <p className="text-base opacity-80">{popup.subtitle}</p>}
            {popup.description && <p className="text-sm opacity-70 whitespace-pre-line">{popup.description}</p>}

            {popup.style === "image_cta" && popup.cta_label && (
              <a
                href={popup.cta_url || "#"}
                onClick={handleClose}
                className="inline-block mt-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-full hover:scale-105 transition-smooth"
              >
                {popup.cta_label}
              </a>
            )}

            {popup.style === "newsletter" && (
              <div className="flex gap-2 mt-3">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/90 text-slate-900"
                />
                <Button onClick={subscribe} disabled={submitting}>
                  {submitting ? "..." : (popup.cta_label || "Subscribe")}
                </Button>
              </div>
            )}

            {popup.style === "promo" && popup.promo_code && (
              <button
                onClick={copyPromo}
                className="mt-3 w-full border-2 border-dashed border-current rounded-lg py-3 px-4 font-mono text-lg font-bold flex items-center justify-center gap-2 hover:bg-black/5"
              >
                {popup.promo_code}
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
