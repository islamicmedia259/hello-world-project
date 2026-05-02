import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";

type Msg = {
  id: string;
  customer_id: string;
  sender: "customer" | "admin";
  body: string;
  is_read: boolean;
  created_at: string;
};

export default function AccountMessages() {
  const { user } = useCustomerAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("customer_messages")
      .select("*")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: true });
    setMsgs((data as Msg[]) || []);
    setLoading(false);
  };

  const markRead = async () => {
    if (!user) return;
    const unreadIds = msgs.filter((m) => m.sender === "admin" && !m.is_read).map((m) => m.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("customer_messages")
      .update({ is_read: true })
      .in("id", unreadIds);
  };

  useEffect(() => {
    document.title = "মেসেজ | Account";
    load();
    if (!user) return;
    const ch = supabase
      .channel(`cust-msg-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "customer_messages", filter: `customer_id=eq.${user.id}` },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "customer_messages", filter: `customer_id=eq.${user.id}` },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((prev) => prev.map((x) => x.id === m.id ? m : x));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "customer_messages" },
        (payload) => {
          const id = (payload.old as any).id;
          setMsgs((prev) => prev.filter((x) => x.id !== id));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs]);

  const send = async () => {
    const body = text.trim();
    if (!body || !user || sending) return;
    if (body.length > 2000) { toast.error("সর্বোচ্চ ২০০০ অক্ষর"); return; }
    setSending(true);
    const { error } = await supabase.from("customer_messages").insert({
      customer_id: user.id,
      sender: "customer",
      body,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setText("");
  };

  return (
    <div className="bg-card border rounded-xl shadow-sm flex flex-col h-[calc(100vh-200px)] min-h-[480px]">
      <div className="px-5 py-4 border-b flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display font-bold text-lg">সাপোর্ট মেসেজ</h1>
          <p className="text-xs text-muted-foreground">আমাদের টিমের সাথে সরাসরি কথা বলুন</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/30">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : msgs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">এখনো কোনো মেসেজ নেই</p>
            <p className="text-xs">নিচে লিখে আমাদের পাঠিয়ে দিন</p>
          </div>
        ) : (
          msgs.map((m) => {
            const mine = m.sender === "customer";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2 shadow-sm ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleString("bn-BD", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t p-3 flex items-end gap-2 bg-card">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={1}
          maxLength={2000}
          placeholder="মেসেজ লিখুন..."
          className="flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:opacity-90 transition"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
