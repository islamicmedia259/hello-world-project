import { Link } from "react-router-dom";
import { Facebook, Youtube, MessageCircle, Instagram, Twitter, Linkedin, Music2, Send, Github, Globe, Mail, Phone, MapPin, Apple, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import defaultLogo from "@/assets/logo.png";

const ICONS: Record<string, any> = {
  facebook: Facebook, messenger: MessageCircle, youtube: Youtube, instagram: Instagram,
  twitter: Twitter, linkedin: Linkedin, tiktok: Music2, whatsapp: Phone, telegram: Send,
  github: Github, globe: Globe, mail: Mail, phone: Phone,
};

const COLUMNS: { key: string; label: string }[] = [
  { key: "information", label: "Information" },
  { key: "shop_by", label: "Shop By" },
  { key: "support", label: "Support" },
  { key: "consumer_policy", label: "Consumer Policy" },
];

type PageLink = { id: string; title: string; slug: string; column_group: string; sort_order: number };
type Cat = { id: string; name: string; slug: string };

export default function Footer() {
  const [s, setS] = useState<any>({});
  const [socials, setSocials] = useState<any[]>([]);
  const [pages, setPages] = useState<PageLink[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: links }, { data: pgs }, { data: cs }] = await Promise.all([
        supabase.from("site_settings").select("logo_url,site_name,address,contact_phone,contact_email,footer_text,play_store_url,app_store_url").limit(1).maybeSingle(),
        supabase.from("social_links").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("pages").select("id,title,slug,column_group,sort_order").eq("is_active", true).order("sort_order"),
        supabase.from("categories").select("id,name,slug").order("sort_order").order("name"),
      ]);
      if (data) setS(data);
      setSocials(links || []);
      setPages((pgs || []) as PageLink[]);
      setCats((cs || []) as Cat[]);
    })();
  }, []);

  const siteName = s.site_name || "Navigator Series Book";
  const grouped = (key: string) => pages.filter(p => p.column_group === key);
  const description = s.footer_text || "An e-commerce platform dedicated to providing quality products to every home.";

  return (
    <footer className="mt-16 border-t bg-background">
      <div className="container-page py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Brand block */}
          <div className="lg:col-span-4">
            <img src={s.logo_url || defaultLogo} alt={siteName} className="h-14 w-auto object-contain mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-sm whitespace-pre-line">{description}</p>

            <div className="space-y-2.5 text-sm mb-5">
              {s.address && (
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span className="whitespace-pre-line">{s.address}</span>
                </div>
              )}
              {s.contact_phone && (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <a href={`tel:${s.contact_phone}`} className="hover:text-primary">{s.contact_phone}</a>
                </div>
              )}
              {s.contact_email && (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <a href={`mailto:${s.contact_email}`} className="hover:text-primary">{s.contact_email}</a>
                </div>
              )}
            </div>

            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {socials.map((l) => {
                  const Icon = ICONS[l.icon_key] || Globe;
                  const brand = l.color || "hsl(var(--primary))";
                  return (
                    <a key={l.id} href={l.url} target="_blank" rel="noreferrer"
                       title={l.name}
                       style={{ ["--brand" as any]: brand }}
                       className="group h-9 w-9 inline-flex items-center justify-center rounded-full bg-secondary text-muted-foreground transition-smooth hover:text-white"
                       onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = brand; }}
                       onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}>
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}

            {(s.play_store_url || s.app_store_url) && (
              <div>
                <p className="text-sm font-semibold mb-2.5">Download App on Mobile :</p>
                <div className="flex flex-wrap gap-2.5">
                  {s.play_store_url && (
                    <a href={s.play_store_url} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-2 px-3.5 py-2 bg-foreground text-background rounded-md hover:opacity-90 transition-smooth">
                      <Play className="h-6 w-6 fill-current" />
                      <div className="leading-tight text-left">
                        <div className="text-[9px] uppercase opacity-80">Get it on</div>
                        <div className="text-sm font-semibold">Google Play</div>
                      </div>
                    </a>
                  )}
                  {s.app_store_url && (
                    <a href={s.app_store_url} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-2 px-3.5 py-2 bg-card border-2 border-foreground text-foreground rounded-md hover:bg-foreground hover:text-background transition-smooth">
                      <Apple className="h-6 w-6 fill-current" />
                      <div className="leading-tight text-left">
                        <div className="text-[9px] uppercase opacity-80">Download on the</div>
                        <div className="text-sm font-semibold">App Store</div>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Link columns */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
            {COLUMNS.map(col => {
              if (col.key === "shop_by") {
                return (
                  <div key={col.key}>
                    <h3 className="font-display font-bold mb-4 text-foreground text-base">{col.label}</h3>
                    <ul className="space-y-2.5 text-muted-foreground">
                      {cats.length === 0 && <li className="text-xs italic opacity-60">No categories yet</li>}
                      {cats.map(c => (
                        <li key={c.id}>
                          <Link to={`/shop?cat=${encodeURIComponent(c.slug)}`} className="hover:text-primary transition-smooth">
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              const items = grouped(col.key);
              return (
                <div key={col.key}>
                  <h3 className="font-display font-bold mb-4 text-foreground text-base">{col.label}</h3>
                  <ul className="space-y-2.5 text-muted-foreground">
                    {items.length === 0 && <li className="text-xs italic opacity-60">No pages yet</li>}
                    {items.map(p => (
                      <li key={p.id}>
                        <Link to={`/p/${p.slug}`} className="hover:text-primary transition-smooth">
                          {p.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-primary text-primary-foreground text-center py-3 text-sm">
        Copyright © {new Date().getFullYear()} {siteName}. All rights reserved.
      </div>
    </footer>
  );
}
