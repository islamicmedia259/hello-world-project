import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PageView() {
  const { slug } = useParams();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug!)
        .eq("is_active", true)
        .maybeSingle();
      setPage(data);
      setLoading(false);
      if (data?.title) document.title = data.title;
      if (data?.meta_description) {
        let m = document.querySelector('meta[name="description"]');
        if (!m) {
          m = document.createElement("meta");
          m.setAttribute("name", "description");
          document.head.appendChild(m);
        }
        m.setAttribute("content", data.meta_description);
      }
    })();
  }, [slug]);

  if (loading) return <div className="container-page py-16 text-center text-muted-foreground">Loading…</div>;
  if (!page) return <div className="container-page py-16 text-center"><h1 className="text-2xl font-bold mb-2">Page not found</h1><p className="text-muted-foreground">The page "{slug}" does not exist.</p></div>;

  return (
    <main className="container-page py-10">
      <h1 className="text-3xl md:text-4xl font-display font-bold mb-6">{page.title}</h1>
      <article
        className="page-content prose prose-slate max-w-none prose-img:rounded-lg prose-img:mx-auto prose-headings:font-display"
        dangerouslySetInnerHTML={{ __html: page.content || "" }}
      />
    </main>
  );
}
