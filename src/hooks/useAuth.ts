import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const syncAuthState = async (s: Session | null) => {
      if (!mounted) return;
      setSession(s);

      if (!s?.user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data } = await supabase.rpc("has_role", {
        _user_id: s.user.id,
        _role: "admin",
      });

      if (!mounted) return;
      setIsAdmin(data === true);
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setTimeout(() => { syncAuthState(s); }, 0);
    });
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      await syncAuthState(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, isAdmin, loading };
}
