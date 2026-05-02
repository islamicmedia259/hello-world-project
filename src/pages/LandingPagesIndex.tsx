import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function LandingPagesIndex() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Landing Pages";
    (supabase as any)
      .from("landing_pages")
      .select("id, slug, title, hero_image_url, hero_headline")
      .eq("is_active", true)
      .not("slug", "is", null)
      .neq("slug", "")
      .order("created_at", { ascending: false })
      .then(({ data }: any) => { setList(data || []); setLoading(false); });
  }, []);

  return (
    <div className="container-page py-10 min-h-[60vh]">
      <h1 className="font-display font-bold text-3xl mb-6">Landing Pages</h1>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-2">কোনো active landing page নেই।</p>
          <p className="text-sm text-muted-foreground">Admin → Landing Pages থেকে slug সহ একটি পেজ তৈরি করুন।</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {list.map((lp) => (
            <Link key={lp.id} to={`/lp/${lp.slug}`} className="bg-card rounded-xl shadow-card overflow-hidden hover:shadow-lg transition">
              {lp.hero_image_url && <img src={lp.hero_image_url} alt={lp.title} className="w-full aspect-video object-cover" />}
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1">{lp.title}</h3>
                {lp.hero_headline && <p className="text-sm text-muted-foreground line-clamp-2">{lp.hero_headline}</p>}
                <p className="text-xs text-muted-foreground mt-2">/lp/{lp.slug}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
