import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  name: string;
  price: number;
  discount_price: number | null;
  image_url: string | null;
  category_id: string | null;
}

export default function ProductCard({ p }: { p: Product }) {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const effective = p.discount_price ?? p.price;
  const hasDiscount = p.discount_price && p.discount_price < p.price;
  const pct = hasDiscount ? Math.round(((p.price - p.discount_price!) / p.price) * 100) : 0;

  // If product has color/size/model options, send user to detail page to pick
  const handleAction = async (mode: "cart" | "checkout") => {
    const [{ count: cColors }, { count: cSizes }, { count: cModels }] = await Promise.all([
      supabase.from("product_colors").select("*", { count: "exact", head: true }).eq("product_id", p.id),
      supabase.from("product_sizes").select("*", { count: "exact", head: true }).eq("product_id", p.id),
      supabase.from("product_models").select("*", { count: "exact", head: true }).eq("product_id", p.id),
    ]);
    const hasOptions = (cColors || 0) + (cSizes || 0) + (cModels || 0) > 0;
    if (hasOptions) {
      toast.info("অনুগ্রহ করে Color / Size / Model সিলেক্ট করুন");
      navigate(`/product/${p.id}`);
      return;
    }
    if (mode === "checkout") {
      addItem({ id: p.id, name: p.name, price: effective, image_url: p.image_url }, 1, { openSidebar: false });
      navigate("/checkout");
    } else {
      addItem({ id: p.id, name: p.name, price: effective, image_url: p.image_url }, 1, { openSidebar: false });
      toast.success("কার্টে যোগ হয়েছে ✓", { description: p.name });
    }
  };

  return (
    <div className="group bg-card border rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-smooth flex flex-col animate-fade-in">
      <Link to={`/product/${p.id}`} className="relative block aspect-square overflow-hidden bg-secondary/40">
        {hasDiscount && (
          <span className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">
            {pct}% OFF
          </span>
        )}
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-smooth" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
        )}
      </Link>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <Link to={`/product/${p.id}`} className="font-medium text-center text-sm sm:text-base hover:text-primary transition-smooth line-clamp-2">
          {p.name}
        </Link>
        <div className="flex items-center justify-center gap-2">
          {hasDiscount && <span className="text-muted-foreground line-through text-sm">৳{p.price}</span>}
          <span className="text-primary font-bold">৳{effective}</span>
        </div>
        <div className="mt-auto flex items-stretch gap-2">
          <button
            onClick={() => handleAction("checkout")}
            className="flex-1 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-md hover:bg-primary-hover transition-smooth"
          >
            অর্ডার করুন
          </button>
          <button
            onClick={() => handleAction("cart")}
            aria-label="Add to cart"
            title="Add to cart"
            className="shrink-0 px-3 border border-primary text-primary rounded-md hover:bg-primary hover:text-primary-foreground transition-smooth flex items-center justify-center"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
