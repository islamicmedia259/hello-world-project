import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import HeroSlider from "@/components/HeroSlider";
import ProductCard, { Product } from "@/components/ProductCard";
import TopCategoriesMobileCarousel from "@/components/TopCategoriesMobileCarousel";
import HomeReviewsSection from "@/components/HomeReviewsSection";
import bookMath from "@/assets/book-math.jpg";
import bookIct from "@/assets/book-ict.jpg";
import bookCalc from "@/assets/book-calc.jpg";

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  is_top?: boolean;
  show_on_home?: boolean;
  sort_order?: number;
}

const fallbackImages = [bookMath, bookIct, bookCalc];

function withFallback(list: Product[]) {
  return list.map((p, i) => ({ ...p, image_url: p.image_url || fallbackImages[i % fallbackImages.length] }));
}

function ProductSection({
  title,
  products,
  initial,
  viewMoreHref,
  emoji,
}: {
  title: string;
  products: Product[];
  initial: number;
  viewMoreHref: string;
  emoji?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  if (products.length === 0) return null;
  const visible = showAll ? products : products.slice(0, initial);
  const hasMore = products.length > initial;

  return (
    <section className="container-page mt-12">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-bold text-2xl">
          {emoji ? `${emoji} ` : ""}{title}
        </h2>
        {hasMore && !showAll && (
          <Link to={viewMoreHref} className="text-sm text-primary font-semibold hover:underline">
            View More →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {visible.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {hasMore && (
        <div className="text-center mt-6">
          {showAll ? (
            <button
              onClick={() => setShowAll(false)}
              className="inline-block bg-secondary text-foreground font-semibold px-8 py-3 rounded-md hover:bg-secondary/80 transition-smooth"
            >
              Show Less
            </button>
          ) : (
            <Link
              to={viewMoreHref}
              className="inline-block bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-md hover:bg-primary-hover transition-smooth"
            >
              View More
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [topCategories, setTopCategories] = useState<Category[]>([]);
  const [homeCategories, setHomeCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [topSelling, setTopSelling] = useState<Product[]>([]);
  const [hotDeals, setHotDeals] = useState<Product[]>([]);

  useEffect(() => {
    document.title = "Navigator Series Book — HSC, Science & Commerce Books";
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); return m;
    })();
    meta.setAttribute("content", "Shop HSC, Science & Commerce textbooks at Navigator Series Book. Free delivery, 25% off, fast shipping across Bangladesh.");

    (async () => {
      const [{ data: cats }, { data: prods }, { data: tops }, { data: hots }] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order").order("name"),
        supabase.from("products").select("id,name,price,discount_price,image_url,category_id").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("products").select("id,name,price,discount_price,image_url,category_id").eq("is_active", true).eq("is_top_feature", true).order("created_at", { ascending: false }),
        supabase.from("products").select("id,name,price,discount_price,image_url,category_id").eq("is_active", true).eq("is_hot_deal", true).order("created_at", { ascending: false }),
      ]);
      const allCats = (cats as Category[]) || [];
      setTopCategories(allCats.filter((c) => c.is_top));
      setHomeCategories(allCats.filter((c) => c.show_on_home));
      setAllProducts((prods as Product[]) || []);
      setTopSelling((tops as Product[]) || []);
      setHotDeals((hots as Product[]) || []);
    })();
  }, []);

  const productsByCat = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of allProducts) {
      if (!p.category_id) continue;
      if (!map.has(p.category_id)) map.set(p.category_id, []);
      map.get(p.category_id)!.push(p);
    }
    return map;
  }, [allProducts]);

  return (
    <>
      <HeroSlider />

      {topCategories.length > 0 && (
        <section className="container-page mt-12">
          <h2 className="font-display font-bold text-2xl mb-5">Top Categories</h2>

          {/* Mobile: horizontal scroll + auto-slide (3 visible) */}
          <TopCategoriesMobileCarousel categories={topCategories} />

          {/* Tablet/Desktop: grid */}
          <div className="hidden sm:grid grid-cols-3 md:grid-cols-6 gap-4">
            {topCategories.map((c) => (
              <Link
                key={c.id}
                to={`/shop?cat=${c.slug}`}
                className="group aspect-square border-2 border-primary/30 rounded-xl flex flex-col items-center justify-center bg-card hover:border-primary hover:shadow-card-hover transition-smooth p-3 overflow-hidden"
              >
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="h-16 w-16 object-contain mb-2 group-hover:scale-110 transition-smooth" />
                ) : (
                  <span className="font-display font-black text-2xl sm:text-3xl text-foreground group-hover:text-primary transition-smooth truncate max-w-full">
                    {c.name.slice(0, 6)}
                  </span>
                )}
                <span className="text-xs sm:text-sm text-muted-foreground mt-1 truncate max-w-full">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ProductSection
        title="Top Selling"
        products={withFallback(topSelling)}
        initial={4}
        viewMoreHref="/shop?filter=top-selling"
        emoji="⭐"
      />

      <ProductSection
        title="Hot Deal"
        products={withFallback(hotDeals)}
        initial={8}
        viewMoreHref="/shop?filter=hot-deal"
        emoji="🔥"
      />

      {homeCategories.map((c) => (
        <ProductSection
          key={c.id}
          title={c.name}
          products={withFallback(productsByCat.get(c.id) || [])}
          initial={8}
          viewMoreHref={`/shop?cat=${c.slug}`}
        />
      ))}

      <HomeReviewsSection />

      <div className="mb-12" />
    </>
  );
}
