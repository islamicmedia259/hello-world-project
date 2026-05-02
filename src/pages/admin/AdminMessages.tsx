import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Trash2, Send, Loader2, MessageSquare, Search, ArrowLeft } from "lucide-react";

type Msg = {
  id: string;
  customer_id: string;
  sender: "customer" | "admin";
  body: string;
  is_read: boolean;
  created_at: string;
};
type Profile = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export default function AdminMessages() {
  const [tab, setTab] = useState<"chat" | "contact">("chat");

  // ---- Chat state ----
  const [allMsgs, setAllMsgs] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // ---- Contact form messages (legacy) ----
  const [contactMsgs, setContactMsgs] = useState<any[]>([]);
  const [openContact, setOpenContact] = useState<string | null>(null);

  const loadChat = async () => {
    const { data } = await supabase
      .from("customer_messages")
      .select("*")
      .order("created_at", { ascending: true });
    const list = (data as Msg[]) || [];
    setAllMsgs(list);
    const ids = Array.from(new Set(list.map((m) => m.customer_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, email, phone, avatar_url")
        .in("user_id", ids);
      const map: Record<string, Profile> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    }
  };

  const loadContact = async () => {
    const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    setContactMsgs(data || []);
  };

  useEffect(() => {
    document.title = "Messages | Admin";
    loadChat();
    loadContact();
    const ch = supabase
      .channel("admin-cust-msg")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "customer_messages" }, (payload) => {
        const m = payload.new as Msg;
        setAllMsgs((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        // fetch profile if new customer
        const cid = m.customer_id;
        setProfiles((prev) => {
          if (prev[cid]) return prev;
          supabase.from("profiles").select("user_id, display_name, email, phone, avatar_url").eq("user_id", cid).maybeSingle()
            .then(({ data }) => { if (data) setProfiles((p) => ({ ...p, [cid]: data as Profile })); });
          return prev;
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "customer_messages" }, (payload) => {
        const m = payload.new as Msg;
        setAllMsgs((prev) => prev.map((x) => x.id === m.id ? m : x));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "customer_messages" }, (payload) => {
        const id = (payload.old as any).id;
        setAllMsgs((prev) => prev.filter((x) => x.id !== id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Build threads grouped by customer
  const threads = useMemo(() => {
    const groups: Record<string, Msg[]> = {};
    allMsgs.forEach((m) => { (groups[m.customer_id] = groups[m.customer_id] || []).push(m); });
    const arr = Object.entries(groups).map(([cid, list]) => {
      const last = list[list.length - 1];
      const unread = list.filter((m) => m.sender === "customer" && !m.is_read).length;
      return { customer_id: cid, last, unread, count: list.length };
    });
    arr.sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at));
    const q = search.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter((t) => {
      const p = profiles[t.customer_id];
      return (p?.display_name || "").toLowerCase().includes(q)
        || (p?.email || "").toLowerCase().includes(q)
        || (p?.phone || "").toLowerCase().includes(q);
    });
  }, [allMsgs, profiles, search]);

  const activeMsgs = useMemo(
    () => allMsgs.filter((m) => m.customer_id === activeId),
    [allMsgs, activeId]
  );
  const activeProfile = activeId ? profiles[activeId] : null;
  const totalUnread = threads.reduce((a, t) => a + t.unread, 0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [activeMsgs.length, activeId]);

  // mark customer messages as read when opening
  useEffect(() => {
    if (!activeId) return;
    const unreadIds = activeMsgs.filter((m) => m.sender === "customer" && !m.is_read).map((m) => m.id);
    if (unreadIds.length) {
      // realtime channel will refresh state — no need to call loadChat()
      supabase.from("customer_messages").update({ is_read: true }).in("id", unreadIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, activeMsgs.length]);

  const sendReply = async () => {
    const body = reply.trim();
    if (!body || !activeId || sending) return;
    if (body.length > 2000) { toast.error("সর্বোচ্চ ২০০০ অক্ষর"); return; }
    setSending(true);
    const { error } = await supabase.from("customer_messages").insert({
      customer_id: activeId,
      sender: "admin",
      body,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setReply("");
  };

  const deleteThread = async () => {
    if (!activeId) return;
    if (!confirm("এই কথোপকথনের সব মেসেজ ডিলিট হবে?")) return;
    const { error } = await supabase.from("customer_messages").delete().eq("customer_id", activeId);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে");
    setActiveId(null);
  };

  const deleteOne = async (id: string) => {
    const { error } = await supabase.from("customer_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  // ---- Contact form handlers ----
  const toggleContact = async (id: string, isRead: boolean) => {
    setOpenContact(openContact === id ? null : id);
    if (!isRead) {
      await supabase.from("contact_messages").update({ is_read: true }).eq("id", id);
      loadContact();
    }
  };
  const delContact = async (id: string) => {
    if (!confirm("ডিলিট করবেন?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); loadContact(); }
  };

  const initials = (name?: string | null, email?: string | null) =>
    (name || email || "U").split(/[\s@]/).filter(Boolean).map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display font-bold text-2xl">Messages</h1>
        <div className="flex bg-secondary rounded-lg p-1">
          <button
            onClick={() => setTab("chat")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${tab === "chat" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            <MessageSquare className="h-4 w-4" /> Customer Chat
            {totalUnread > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">{totalUnread}</span>}
          </button>
          <button
            onClick={() => setTab("contact")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${tab === "contact" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            <Mail className="h-4 w-4" /> Contact Form
          </button>
        </div>
      </div>

      {tab === "chat" ? (
        <div className="bg-card rounded-xl shadow-card overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr] h-[calc(100vh-200px)] min-h-[520px]">
          {/* Thread list */}
          <aside className={`border-r flex flex-col ${activeId ? "hidden md:flex" : "flex"}`}>
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="খুঁজুন..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {threads.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">কোনো মেসেজ নেই</div>
              ) : threads.map((t) => {
                const p = profiles[t.customer_id];
                const isActive = activeId === t.customer_id;
                return (
                  <button
                    key={t.customer_id}
                    onClick={() => setActiveId(t.customer_id)}
                    className={`w-full text-left px-3 py-3 border-b hover:bg-secondary/60 transition flex items-center gap-3 ${isActive ? "bg-primary-soft/40" : ""}`}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                      {initials(p?.display_name, p?.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{p?.display_name || p?.email || "Customer"}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(t.last.created_at).toLocaleDateString("bn-BD", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground truncate">
                          {t.last.sender === "admin" ? "আপনি: " : ""}{t.last.body}
                        </p>
                        {t.unread > 0 && (
                          <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center shrink-0">
                            {t.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Chat panel */}
          <section className={`flex flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
            {!activeId ? (
              <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>একটি কথোপকথন বেছে নিন</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b flex items-center gap-3">
                  <button onClick={() => setActiveId(null)} className="md:hidden p-1 -ml-1">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {initials(activeProfile?.display_name, activeProfile?.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{activeProfile?.display_name || "Customer"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activeProfile?.email}{activeProfile?.phone && ` • ${activeProfile.phone}`}
                    </p>
                  </div>
                  <button
                    onClick={deleteThread}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                    title="পুরো কথোপকথন ডিলিট করুন"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/30">
                  {activeMsgs.map((m) => {
                    const isAdmin = m.sender === "admin";
                    return (
                      <div key={m.id} className={`group flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <div className="flex items-end gap-1 max-w-[78%]">
                          {isAdmin && (
                            <button
                              onClick={() => deleteOne(m.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition"
                              title="ডিলিট"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2 shadow-sm ${
                              isAdmin
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-card border rounded-bl-sm"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                            <p className={`text-[10px] mt-1 ${isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {new Date(m.created_at).toLocaleString("bn-BD", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                            </p>
                          </div>
                          {!isAdmin && (
                            <button
                              onClick={() => deleteOne(m.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition"
                              title="ডিলিট"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t p-3 flex items-end gap-2 bg-card">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    rows={1}
                    maxLength={2000}
                    placeholder="রিপ্লাই লিখুন..."
                    className="flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32"
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:opacity-90 transition"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      ) : (
        // Contact form messages (legacy)
        <div className="bg-card rounded-xl shadow-card divide-y">
          {contactMsgs.map((m) => (
            <div key={m.id} className={`p-4 ${!m.is_read ? "bg-primary-soft/30" : ""}`}>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-1" />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleContact(m.id, m.is_read)}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold">{m.name} {!m.is_read && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">NEW</span>}</p>
                    <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{m.email} {m.phone && `• ${m.phone}`}</p>
                  {m.subject && <p className="text-sm font-medium mt-1">{m.subject}</p>}
                  {openContact === m.id && <p className="text-sm mt-2 whitespace-pre-wrap">{m.message}</p>}
                </div>
                <button onClick={() => delContact(m.id)} className="text-destructive hover:bg-destructive/10 p-2 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {contactMsgs.length === 0 && <p className="p-8 text-center text-muted-foreground">No messages yet</p>}
        </div>
      )}
    </div>
  );
}
