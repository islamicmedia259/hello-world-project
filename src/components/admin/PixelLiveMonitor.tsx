import { useEffect, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Trash2, Pause, Play, Copy, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { isPixelMonitorEnabled, setPixelMonitorEnabled } from "@/lib/tracking";
import { toast } from "sonner";

type Evt = { id: string; name: string; data: any; ts: number; path: string; expanded?: boolean };

const EVENT_COLORS: Record<string, string> = {
  PageView: "bg-slate-100 text-slate-700",
  ViewContent: "bg-blue-100 text-blue-700",
  AddToCart: "bg-amber-100 text-amber-700",
  InitiateCheckout: "bg-purple-100 text-purple-700",
  AddPaymentInfo: "bg-pink-100 text-pink-700",
  Purchase: "bg-emerald-100 text-emerald-700",
  Search: "bg-cyan-100 text-cyan-700",
  Lead: "bg-indigo-100 text-indigo-700",
  Contact: "bg-orange-100 text-orange-700",
};

const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString("en-GB", { hour12: false });

export default function PixelLiveMonitor() {
  const [enabled, setEnabled] = useState<boolean>(isPixelMonitorEnabled());
  const [paused, setPaused] = useState(false);
  const [events, setEvents] = useState<Evt[]>([]);
  const [filter, setFilter] = useState<string>("");
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const push = (detail: any) => {
      if (pausedRef.current || !detail) return;
      setEvents((prev) => [
        { id: `${detail.ts}-${Math.random().toString(36).slice(2, 7)}`, ...detail },
        ...prev,
      ].slice(0, 200));
    };
    const handler = (e: Event) => push((e as CustomEvent).detail);
    window.addEventListener("pixel:event", handler as any);

    // Cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("pixel-monitor-channel");
      bc.onmessage = (m) => push(m.data);
    } catch {}

    // Cross-tab fallback via storage event
    const storageHandler = (e: StorageEvent) => {
      if (e.key === "pixel_monitor_last" && e.newValue) {
        try { push(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", storageHandler);

    return () => {
      window.removeEventListener("pixel:event", handler as any);
      window.removeEventListener("storage", storageHandler);
      bc?.close();
    };
  }, []);

  const toggle = (on: boolean) => {
    setEnabled(on);
    setPixelMonitorEnabled(on);
    if (on) toast.success("Live Monitor চালু — সাইটের অন্য ট্যাবে ব্রাউজ করুন");
    else toast.message("Live Monitor বন্ধ");
  };

  const clear = () => setEvents([]);

  const toggleExpand = (id: string) =>
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, expanded: !e.expanded } : e)));

  const copy = (data: any) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success("JSON কপি হয়েছে");
    } catch { toast.error("কপি ব্যর্থ"); }
  };

  const eventNames = Array.from(new Set(events.map((e) => e.name)));
  const visible = filter ? events.filter((e) => e.name === filter) : events;

  // Detect which pixels are present on window
  const detected = {
    "Facebook (fbq)": typeof (window as any).fbq === "function",
    "Google (gtag)": typeof (window as any).gtag === "function",
    "GTM (dataLayer)": Array.isArray((window as any).dataLayer),
    "TikTok (ttq)": typeof (window as any).ttq === "object",
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${enabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
            <Activity className={`h-5 w-5 ${enabled && !paused ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Live Pixel Monitor</h2>
            <p className="text-xs text-slate-500">কাস্টমার সাইটে যা ইভেন্ট ফায়ার হচ্ছে রিয়েল-টাইমে দেখুন</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${enabled ? "text-emerald-600" : "text-slate-400"}`}>
              {enabled ? "ON" : "OFF"}
            </span>
            <Switch checked={enabled} onCheckedChange={toggle} />
          </div>
        </div>
      </div>

      {/* Detected SDK badges */}
      <div className="px-4 py-2 border-b bg-slate-50 flex flex-wrap gap-2">
        {Object.entries(detected).map(([k, v]) => (
          <Badge key={k} variant="outline" className={v ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-400"}>
            <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${v ? "bg-emerald-500" : "bg-slate-300"}`} /> {k}
          </Badge>
        ))}
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:underline"
        >
          সাইট নতুন ট্যাবে খুলুন <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {!enabled ? (
        <div className="p-10 text-center text-sm text-slate-500">
          Monitor বন্ধ আছে। উপরের সুইচ অন করে নতুন ট্যাবে সাইটে ক্লিক/ব্রাউজ শুরু করুন — এখানে লাইভ ইভেন্ট দেখা যাবে।
        </div>
      ) : (
        <>
          <div className="p-3 border-b flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)}>
              {paused ? <><Play className="h-3.5 w-3.5 mr-1" /> Resume</> : <><Pause className="h-3.5 w-3.5 mr-1" /> Pause</>}
            </Button>
            <Button size="sm" variant="outline" onClick={clear}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
            <div className="flex items-center gap-1 ml-2 flex-wrap">
              <button
                onClick={() => setFilter("")}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${!filter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >All ({events.length})</button>
              {eventNames.map((n) => (
                <button
                  key={n}
                  onClick={() => setFilter(filter === n ? "" : n)}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${filter === n ? "bg-slate-900 text-white" : EVENT_COLORS[n] || "bg-slate-100 text-slate-600"} hover:opacity-80`}
                >{n} ({events.filter(e => e.name === n).length})</button>
              ))}
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto divide-y">
            {visible.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                {paused ? "⏸ পজ করা আছে" : "ইভেন্টের অপেক্ষায়... সাইটে কিছু ক্লিক/ব্রাউজ করুন"}
              </div>
            ) : visible.map((e) => (
              <div key={e.id} className="p-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 w-20 shrink-0">{fmtTime(e.ts)}</span>
                  <Badge className={`${EVENT_COLORS[e.name] || "bg-slate-100 text-slate-700"} hover:${EVENT_COLORS[e.name] || ""}`}>
                    {e.name}
                  </Badge>
                  <span className="text-xs text-slate-500 truncate flex-1 font-mono">{e.path}</span>
                  {typeof e.data?.value === "number" && (
                    <span className="text-xs font-bold text-emerald-700">৳{e.data.value}</span>
                  )}
                  <button onClick={() => copy(e.data)} className="text-slate-400 hover:text-slate-700" title="Copy JSON">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => toggleExpand(e.id)} className="text-slate-400 hover:text-slate-700">
                    {e.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
                {e.expanded && (
                  <pre className="mt-2 ml-[92px] text-[11px] bg-slate-900 text-emerald-300 p-3 rounded-md overflow-x-auto font-mono">
{JSON.stringify(e.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
