import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

interface Cat { id: string; name: string; slug: string; image_url?: string | null; }

export default function TopCategoriesMobileCarousel({ categories }: { categories: Cat[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [page, setPage] = useState(0);

  // Pages of 3 (visible window)
  const pageCount = Math.max(1, Math.ceil(categories.length / 3));

  // Auto-advance every 3.5s
  useEffect(() => {
    if (paused || categories.length <= 3) return;
    const id = setInterval(() => {
      setPage((p) => (p + 1) % pageCount);
    }, 3500);
    return () => clearInterval(id);
  }, [paused, categories.length, pageCount]);

  // Scroll to active page
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const itemWidth = el.scrollWidth / categories.length;
    el.scrollTo({ left: itemWidth * page * 3, behavior: "smooth" });
  }, [page, categories.length]);

  // Update page indicator on manual scroll
  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const itemWidth = el.scrollWidth / categories.length;
    const newPage = Math.round(el.scrollLeft / (itemWidth * 3));
    if (newPage !== page) setPage(newPage);
  };

  if (categories.length === 0) return null;

  return (
    <div className="sm:hidden -mx-4">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setTimeout(() => setPaused(false), 4000)}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-2"
        style={{ scrollBehavior: "smooth" }}
      >
        {categories.map((c) => (
          <Link
            key={c.id}
            to={`/shop?cat=${c.slug}`}
            className="group shrink-0 snap-start basis-[calc((100%-1.5rem)/3)] aspect-square border-2 border-primary/30 rounded-xl flex flex-col items-center justify-center bg-card hover:border-primary hover:shadow-card-hover active:scale-95 transition-smooth p-3 overflow-hidden"
          >
            {c.image_url ? (
              <img
                src={c.image_url}
                alt={c.name}
                className="h-10 w-10 object-contain mb-1.5 group-hover:scale-110 transition-smooth"
              />
            ) : (
              <div className="h-10 w-10 mb-1.5 rounded-md bg-secondary flex items-center justify-center font-display font-black text-base text-foreground">
                {c.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-[11px] font-semibold mt-0.5 truncate max-w-full text-center leading-tight text-muted-foreground">
              {c.name}
            </span>
          </Link>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => { setPage(i); setPaused(true); setTimeout(() => setPaused(false), 4000); }}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === page ? "w-6 bg-primary" : "w-1.5 bg-primary/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
