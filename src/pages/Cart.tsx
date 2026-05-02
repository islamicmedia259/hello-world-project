import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { Trash2, Minus, Plus } from "lucide-react";

export default function Cart() {
  const { items, updateQty, removeItem, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display font-bold text-2xl mb-3">Your cart is empty</h1>
        <Link to="/shop" className="inline-block mt-4 bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold hover:bg-primary-hover">Browse books</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="font-display font-bold text-2xl mb-6">Shopping Cart</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-4 p-3 bg-card border rounded-lg shadow-card">
              <img src={i.image_url || ""} alt={i.name} className="w-16 h-16 object-cover rounded bg-secondary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{i.name}</p>
                <p className="text-primary font-bold">৳{i.price}</p>
              </div>
              <div className="flex items-center border rounded-md">
                <button onClick={() => updateQty(i.id, i.quantity - 1)} className="p-1.5 hover:bg-secondary"><Minus className="h-3.5 w-3.5" /></button>
                <span className="w-10 text-center text-sm font-semibold">{i.quantity}</span>
                <button onClick={() => updateQty(i.id, i.quantity + 1)} className="p-1.5 hover:bg-secondary"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <button onClick={() => removeItem(i.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <aside className="bg-card border rounded-lg p-5 shadow-card h-fit">
          <h3 className="font-display font-bold text-lg mb-4">Order Summary</h3>
          <div className="flex justify-between mb-2 text-sm"><span>Subtotal</span><span>৳{total}</span></div>
          <div className="flex justify-between mb-4 text-sm text-muted-foreground"><span>Delivery</span><span>Free</span></div>
          <div className="border-t pt-3 flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">৳{total}</span></div>
          <Link to="/checkout" className="mt-5 block text-center bg-primary text-primary-foreground py-3 rounded-md font-semibold hover:bg-primary-hover transition-smooth">
            Proceed to Checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
