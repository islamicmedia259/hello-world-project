import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Pixel = {
  id: string;
  name: string;
  platform: string;
  script_code: string;
  placement: string;
  page_target: string;
  custom_url: string | null;
  device_target: string;
};

const isMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

const matchesPage = (p: Pixel, pathname: string) => {
  switch (p.page_target) {
    case "all": return true;
    case "home": return pathname === "/";
    case "product": return pathname.startsWith("/product");
    case "checkout": return pathname.startsWith("/checkout") || pathname.startsWith("/cart") || pathname.startsWith("/order-confirmation");
    case "custom": return p.custom_url ? pathname.startsWith(p.custom_url) : false;
    default: return false;
  }
};

const matchesDevice = (p: Pixel) => {
  if (p.device_target === "all") return true;
  return p.device_target === "mobile" ? isMobile() : !isMobile();
};

const extractScripts = (code: string): { inlineJs: string; htmlFragments: string } => {
  let inlineJs = "";
  let htmlFragments = "";

  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let stripped = code;
  while ((match = scriptRegex.exec(code)) !== null) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
    if (srcMatch) {
      htmlFragments += `<script async src="${srcMatch[1]}"></script>`;
    } else {
      inlineJs += body + "\n";
    }
    stripped = stripped.replace(match[0], "");
  }

  const noscriptRegex = /<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi;
  const noscripts = stripped.match(noscriptRegex);
  if (noscripts) htmlFragments += noscripts.join("");

  if (!scriptRegex.test(code) && !inlineJs && !htmlFragments) {
    inlineJs = code;
  }

  return { inlineJs: inlineJs.trim(), htmlFragments };
};

const injectPixel = (p: Pixel): HTMLElement[] => {
  const created: HTMLElement[] = [];
  const { inlineJs, htmlFragments } = extractScripts(p.script_code);

  const target = p.placement === "head" ? document.head : document.body;
  const prepend = p.placement === "body_start";

  if (inlineJs) {
    const s = document.createElement("script");
    s.setAttribute("data-pixel-id", p.id);
    s.setAttribute("data-pixel-name", p.name);
    try { s.text = inlineJs; } catch { s.appendChild(document.createTextNode(inlineJs)); }
    if (prepend && target.firstChild) target.insertBefore(s, target.firstChild);
    else target.appendChild(s);
    created.push(s);
  }

  if (htmlFragments) {
    const wrap = document.createElement("div");
    wrap.style.display = "none";
    wrap.setAttribute("data-pixel-id", p.id);
    wrap.innerHTML = htmlFragments;
    Array.from(wrap.querySelectorAll("script")).forEach((old) => {
      const fresh = document.createElement("script");
      Array.from(old.attributes).forEach(a => fresh.setAttribute(a.name, a.value));
      if (old.textContent) fresh.text = old.textContent;
      old.replaceWith(fresh);
    });
    if (prepend && target.firstChild) target.insertBefore(wrap, target.firstChild);
    else target.appendChild(wrap);
    created.push(wrap);
  }

  if ((window as any).__PIXEL_DEBUG__) {
    console.log(`[Pixel] Fired: ${p.name} (${p.platform}) on ${window.location.pathname}`);
  }
  return created;
};

export default function PixelInjector() {
  const { pathname } = useLocation();
  const pixelsRef = useRef<Pixel[]>([]);
  const injectedRef = useRef<Map<string, HTMLElement[]>>(new Map());
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("pixels")
        .select("id,name,platform,script_code,placement,page_target,custom_url,device_target")
        .eq("is_active", true);
      if (error || cancelled) return;
      pixelsRef.current = (data || []) as Pixel[];
      loadedRef.current = true;
      applyForRoute(pathname);
    })();
    return () => { cancelled = true; };
  }, []);

  const applyForRoute = (path: string) => {
    const wanted = pixelsRef.current.filter(p => matchesPage(p, path) && matchesDevice(p));
    const wantedIds = new Set(wanted.map(p => p.id));

    injectedRef.current.forEach((nodes, id) => {
      if (!wantedIds.has(id)) {
        nodes.forEach(n => n.remove());
        injectedRef.current.delete(id);
      }
    });

    wanted.forEach(p => {
      if (injectedRef.current.has(p.id)) return;
      try {
        const nodes = injectPixel(p);
        injectedRef.current.set(p.id, nodes);
      } catch (e) {
        console.error("[Pixel] Failed to inject", p.name, e);
      }
    });
  };

  useEffect(() => {
    if (loadedRef.current) applyForRoute(pathname);
    // Fire SPA PageView for all loaded pixels (Facebook/GA/TikTok auto-track first load only)
    try {
      const w = window as any;
      w.fbq?.("track", "PageView");
      w.gtag?.("event", "page_view", { page_path: pathname });
      w.ttq?.page?.();
      (w.dataLayer = w.dataLayer || []).push({ event: "page_view", page_path: pathname });
    } catch {}
  }, [pathname]);

  return null;
}
