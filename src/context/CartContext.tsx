import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { trackAddToCart } from "@/lib/tracking";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  shipping_options?: string[]; // available shipping_charge ids for this line item
}

interface CartCtx {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty?: number, opts?: { openSidebar?: boolean }) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "nsb_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const addItem: CartCtx["addItem"] = (item, qty = 1, opts = { openSidebar: true }) => {
    setItems((prev) => {
      const ex = prev.find((p) => p.id === item.id);
      if (ex) return prev.map((p) => (p.id === item.id ? { ...p, quantity: p.quantity + qty } : p));
      return [...prev, { ...item, quantity: qty }];
    });
    if (opts?.openSidebar !== false) setIsOpen(true);
    trackAddToCart({ id: item.id, name: item.name, price: item.price, quantity: qty });
  };
  const removeItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const updateQty = (id: string, qty: number) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, qty) } : i)));
  const clear = () => setItems([]);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Ctx.Provider
      value={{
        items, addItem, removeItem, updateQty, clear, total, count,
        isOpen, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
};
