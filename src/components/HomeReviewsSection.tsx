import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AutoCarousel from "@/components/AutoCarousel";
import { Star, Users } from "lucide-react";

type Review = { name: string; rating: number; text: string; image?: string };

export default function HomeReviewsSection() {
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [speed, setSpeed] = useState(3500);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("home_reviews_enabled, home_reviews_title, home_reviews_subtitle, home_reviews_speed_ms, home_reviews" as any)
        .limit(1)
        .maybeSingle();
      if (!data) return;
      const d = data as any;
      setEnabled(!!d.home_reviews_enabled);
      setTitle(d.home_reviews_title || "What Our Students Say");
      setSubtitle(d.home_reviews_subtitle || "");
      setSpeed(d.home_reviews_speed_ms || 3500);
      setReviews(Array.isArray(d.home_reviews) ? d.home_reviews : []);
    })();
  }, []);

  if (!enabled || reviews.length === 0) return null;

  return (
    <section className="mt-10 sm:mt-12 bg-background py-7 sm:py-10 px-3 sm:px-4">
      <div className="container-page">
        <div className="text-center mb-5 sm:mb-7">
          <h2 className="font-display font-black text-xl sm:text-2xl md:text-3xl mb-1">{title}</h2>
          {subtitle && <p className="text-muted-foreground text-xs sm:text-sm">{subtitle}</p>}
        </div>

        <AutoCarousel
          itemsPerView={{ base: 1, sm: 2, md: 3 }}
          intervalMs={speed}
          gap={12}
          showArrows={true}
          showDots={true}
        >
          {reviews.map((r, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-3 sm:p-4 h-full shadow-sm">
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${j < (r.rating || 5) ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                  />
                ))}
              </div>
              <p className="text-sm sm:text-base text-foreground mb-3 line-clamp-3">"{r.text}"</p>
              <div className="border-t border-border pt-2.5 flex items-center gap-2">
                {r.image ? (
                  <img src={r.image} alt={r.name} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <span className="font-semibold text-xs sm:text-sm text-foreground">{r.name || "Reviewer"}</span>
              </div>
            </div>
          ))}
        </AutoCarousel>
      </div>
    </section>
  );
}
