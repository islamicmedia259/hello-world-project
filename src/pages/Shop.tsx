import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { Product } from "@/components/ProductCard";
import bookMath from "@/assets/book-math.jpg";
import bookIct from "@/assets/book-ict.jpg";
import bookCalc from "@/assets/book-calc.jpg";

interface Category { id: string; name: string; slug: string; }
const fallbacks = [bookMath, bookIct, bookCalc];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const cat = params.get("cat") || "";
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `Shop ${cat ? `— ${cat.toUpperCase()}` : "All Books"} | Navigator Series Book`;
    supabase.from("categories").select("*").order("name").then(({ data }) => setCategories(data || []));
  }, [cat]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      let query = supabase.from("products").select("id,name,price,discount_price,image_url,category_id,categories!inner(slug)").eq("is_active", true);
      if (cat) query = query.eq("categories.slug", cat);
      if (q) query = query.ilike("name", `%${q}%`);
      const { data } = await query.order("created_at", { ascending: false });
      setProducts((data as any) || []);
      setLoading(false);
    })();
  }, [q, cat]);

  const list = products.map((p, i) => ({ ...p, image_url: p.image_url || fallbacks[i % fallbacks.length] }));

  return (
    <div className="container-page py-8">
      <div className="flex flex-col md:flex-row gap-6">
        <aside className="md:w-60 shrink-0">
          <h3 className="font-display font-bold mb-3">Categories</h3>
          <div className="flex md:flex-col gap-2 overflow-x-auto">
            <button
              onClick={() => setParams(q ? { q } : {})}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-smooth whitespace-nowrap ${!cat ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:border-primary"}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setParams({ ...(q ? { q } : {}), cat: c.slug })}
                className={`px-4 py-2 rounded-md text-sm font-medium border transition-smooth whitespace-nowrap ${cat === c.slug ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:border-primary"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display font-bold text-2xl">
              {q ? `Search: "${q}"` : cat ? cat.toUpperCase() : "All Books"}
            </h1>
            <span className="text-sm text-muted-foreground">{list.length} items</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] bg-secondary animate-pulse rounded-xl" />)}
            </div>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No products found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {list.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
