import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, X, ShoppingBag, MessageSquare, CreditCard, Megaphone, Mail } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

interface Props {
  audience: "user" | "admin";
  userId?: string | null;
  enabled: boolean;
  align?: "left" | "right";
  iconClassName?: string;
}

const ICONS: Record<string, any> = {
  order_status: ShoppingBag,
  new_order: ShoppingBag,
  support_reply: MessageSquare,
  new_message: MessageSquare,
  new_contact: Mail,
  payment_review: CreditCard,
  new_pending_payment: CreditCard,
  promo: Megaphone,
};

export default function NotificationBell({ audience, userId, enabled, align = "right", iconClassName }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { items, unreadCount, markRead, markAllRead, remove } = useNotifications({
    audience,
    enabled,
    userId,
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!enabled) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative p-2 rounded-full hover:bg-secondary transition-colors"
      >
        <Bell className={iconClassName || "h-5 w-5"} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-full mt-2 w-[340px] max-w-[92vw] bg-popover text-popover-foreground border rounded-xl shadow-2xl z-[70] overflow-hidden ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-secondary/40">
            <div className="font-display font-bold text-sm">Notifications</div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                কোনো নটিফিকেশন নেই
              </div>
            ) : (
              items.map((n) => <Item key={n.id} n={n} onClick={() => { markRead(n.id); setOpen(false); }} onRemove={() => remove(n.id)} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Item({ n, onClick, onRemove }: { n: Notification; onClick: () => void; onRemove: () => void }) {
  const Icon = ICONS[n.type] || Bell;
  const ago = (() => {
    try { return formatDistanceToNow(new Date(n.created_at), { addSuffix: true }); }
    catch { return ""; }
  })();
  const Wrapper: any = n.link ? Link : "div";
  const wrapperProps = n.link ? { to: n.link, onClick } : { onClick };

  return (
    <div className={`group flex gap-3 px-3 py-3 border-b hover:bg-secondary/40 transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}>
      <Wrapper {...wrapperProps} className="flex gap-3 flex-1 min-w-0 cursor-pointer">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${!n.is_read ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <p className={`text-sm leading-snug ${!n.is_read ? "font-semibold" : "font-medium"} truncate`}>{n.title}</p>
            {!n.is_read && <span className="mt-1.5 h-2 w-2 bg-primary rounded-full shrink-0" />}
          </div>
          {n.message && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>}
          <p className="text-[10px] text-muted-foreground mt-1">{ago}</p>
        </div>
      </Wrapper>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 self-start"
        aria-label="Remove"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
