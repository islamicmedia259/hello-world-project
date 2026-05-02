import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string | null;
  audience: "user" | "admin";
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  meta: any;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface Options {
  audience: "user" | "admin";
  enabled: boolean;        // gate by login / role
  userId?: string | null;  // required when audience === 'user'
  limit?: number;
}

export function useNotifications({ audience, enabled, userId, limit = 30 }: Options) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!enabled) return;
    if (audience === "user" && !userId) return;
    setLoading(true);
    let q = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (audience === "user") q = q.eq("audience", "user").eq("user_id", userId!);
    else q = q.eq("audience", "admin");
    const { data } = await q;
    setItems((data as any) || []);
    setLoading(false);
  }, [enabled, audience, userId, limit]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Realtime
  useEffect(() => {
    if (!enabled) return;
    if (audience === "user" && !userId) return;

    const filter =
      audience === "user"
        ? `audience=eq.user`
        : `audience=eq.admin`;

    const channel = supabase
      .channel(`notifications-${audience}-${userId || "all"}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const n = payload.new as Notification;
            // For user audience, ensure it's actually for this user
            if (audience === "user" && n.user_id !== userId) return;
            setItems((prev) => [n, ...prev].slice(0, limit));
          } else if (payload.eventType === "UPDATE") {
            const n = payload.new as Notification;
            setItems((prev) => prev.map((it) => (it.id === n.id ? n : it)));
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as any).id;
            setItems((prev) => prev.filter((it) => it.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, audience, userId, limit]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
  };

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.is_read).map((n) => n.id);
    if (!ids.length) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", ids);
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  return { items, loading, unreadCount, markRead, markAllRead, remove, refresh: fetchItems };
}
