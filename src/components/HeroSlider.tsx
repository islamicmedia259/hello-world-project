import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Slide = { id: string; title: string; subtitle: string | null; image_url: string; link_url: string | null };
type Direction = "left" | "right" | "fade";

export default function HeroSlider() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState(0);
  const [direction, setDirection] = useState<Direction>("left");
  const [speed, setSpeed] = useState(5);
  const [animating, setAnimating] = useState(false);
  const [navDir, setNavDir] = useState<"next" | "prev">("next");

  useEffect(() => {
    (async () => {
      const { data: cat } = await supabase
        .from("banner_categories")
        .select("id,slide_direction,slide_speed_seconds")
        .eq("slug", "top-slider")
        .maybeSingle();
      if (!cat?.id) return;
      setDirection(((cat as any).slide_direction as Direction) || "left");
      setSpeed((cat as any).slide_speed_seconds || 5);
      const { data } = await supabase
        .from("banners")
        .select("id,title,subtitle,image_url,link_url")
        .eq("category_id", cat.id)
        .eq("is_active", true)
        .order("sort_order");
      setSlides((data as Slide[]) || []);
    })();
  }, []);

  const go = (next: number, dir: "next" | "prev" = "next") => {
    if (slides.length < 2) return;
    setPrev(i);
    setNavDir(dir);
    setI(next);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 600);
  };

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => go((i + 1) % slides.length, "next"), Math.max(1, speed) * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, i, speed]);

  if (slides.length === 0) return null;

  const renderImg = (s: Slide) => {
    const img = <img src={s.image_url} alt={s.title} className="w-full h-full object-cover" />;
    return s.link_url ? <Link to={s.link_url} className="block w-full h-full">{img}</Link> : img;
  };

  // Animation classes
  const getClass = (isCurrent: boolean) => {
    if (!animating) return isCurrent ? "opacity-100 translate-x-0" : "opacity-0 pointer-events-none";
    if (direction === "fade") {
      return isCurrent ? "opacity-100 transition-opacity duration-500" : "opacity-0 transition-opacity duration-500";
    }
    // slide
    const slideLeft = direction === "left"; // left = new enters from right going left
    const enterFrom = slideLeft ? "translate-x-full" : "-translate-x-full";
    const exitTo = slideLeft ? "-translate-x-full" : "translate-x-full";
    if (isCurrent) {
      return `opacity-100 translate-x-0 transition-transform duration-500 ${animating ? "" : ""}`;
    }
    return `opacity-100 ${exitTo} transition-transform duration-500`;
  };

  return (
    <section className="container-page mt-4">
      <div className="relative rounded-2xl overflow-hidden shadow-card bg-muted">
        <div className="relative w-full" style={{ aspectRatio: "1060/395" }}>
          {slides.map((s, idx) => {
            const isCurrent = idx === i;
            const isPrev = idx === prev && animating && idx !== i;
            if (!isCurrent && !isPrev) {
              return (
                <div key={s.id} className="absolute inset-0 opacity-0 pointer-events-none">{renderImg(s)}</div>
              );
            }
            let cls = "absolute inset-0 transition-all duration-500 ease-in-out";
            if (direction === "fade") {
              cls += isCurrent ? " opacity-100" : " opacity-0";
            } else {
              const slideLeft = direction === "left";
              if (isCurrent) {
                cls += " opacity-100 translate-x-0";
              } else {
                // exiting prev
                cls += slideLeft ? " opacity-100 -translate-x-full" : " opacity-100 translate-x-full";
              }
            }
            return <div key={s.id} className={cls}>{renderImg(s)}</div>;
          })}
        </div>

        {slides.length > 1 && (
          <>
            <button
              onClick={() => go((i - 1 + slides.length) % slides.length, "prev")}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur p-2 rounded-full hover:bg-background shadow-card"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => go((i + 1) % slides.length, "next")}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur p-2 rounded-full hover:bg-background shadow-card"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => go(idx, idx > i ? "next" : "prev")}
                  className={`h-2 rounded-full transition-smooth ${idx === i ? "w-8 bg-primary" : "w-2 bg-foreground/30"}`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
