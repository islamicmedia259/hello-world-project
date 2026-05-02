import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function WhatsAppButton() {
  const [num, setNum] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("site_settings").select("whatsapp_number").maybeSingle().then(({ data }) => {
      const n = (data as any)?.whatsapp_number?.trim();
      if (n) setNum(n.replace(/[^\d]/g, ""));
    });
  }, []);
  if (!num) return null;
  return (
    <a
      href={`https://wa.me/${num}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-30 text-white p-3.5 rounded-full shadow-glow hover:scale-110 transition-smooth"
      aria-label="WhatsApp"
      style={{ background: "hsl(142 70% 40%)" }}
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
