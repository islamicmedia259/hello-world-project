import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AutoCarouselProps {
  children: React.ReactNode[];
  itemsPerView?: { base: number; sm?: number; md?: number };
  intervalMs?: number;
  gap?: number;
  showArrows?: boolean;
  showDots?: boolean;
}

export default function AutoCarousel({
  children,
  itemsPerView = { base: 1, sm: 2, md: 3 },
  intervalMs = 3500,
  gap = 12,
  showArrows = true,
  showDots = true,
}: AutoCarouselProps) {
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(itemsPerView.base);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = children.length;

  // Responsive items-per-view
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w >= 768 && itemsPerView.md) setPerView(itemsPerView.md);
      else if (w >= 640 && itemsPerView.sm) setPerView(itemsPerView.sm);
      else setPerView(itemsPerView.base);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [itemsPerView.base, itemsPerView.sm, itemsPerView.md]);

  const maxIndex = Math.max(0, total - perView);

  // Auto-slide
  useEffect(() => {
    if (paused || total <= perView) return;
    const t = setInterval(() => {
      setIndex((i) => (i >= maxIndex ? 0 : i + 1));
    }, intervalMs);
    return () => clearInterval(t);
  }, [paused, maxIndex, intervalMs, total, perView]);

  // Clamp index when perView changes
  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex);
  }, [maxIndex, index]);

  const itemWidthPct = 100 / perView;
  const translatePct = index * itemWidthPct;

  const prev = () => setIndex((i) => (i <= 0 ? maxIndex : i - 1));
  const next = () => setIndex((i) => (i >= maxIndex ? 0 : i + 1));

  if (total === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setTimeout(() => setPaused(false), 2000)}
    >
      <div ref={containerRef} className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(-${translatePct}%)`,
            gap: `${gap}px`,
          }}
        >
          {children.map((child, i) => (
            <div
              key={i}
              className="shrink-0"
              style={{ width: `calc(${itemWidthPct}% - ${(gap * (perView - 1)) / perView}px)` }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {showArrows && total > perView && (
        <>
          <button
            onClick={prev}
            aria-label="Previous"
            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border rounded-full p-1.5 sm:p-2 shadow-md z-10"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={next}
            aria-label="Next"
            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border rounded-full p-1.5 sm:p-2 shadow-md z-10"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </>
      )}

      {showDots && total > perView && (
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
