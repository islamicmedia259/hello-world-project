import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Shield, Search, Loader2, CheckCircle2, XCircle, AlertTriangle,
  Truck, Package, TrendingUp, TrendingDown, Eye, ShieldAlert, ShieldCheck,
} from "lucide-react";

type ProviderResult = {
  provider: string;
  enabled: boolean;
  ok?: boolean;
  total?: number;
  success?: number;
  cancelled?: number;
  successRate?: number;
  error?: string;
  raw?: any;
};

type FraudResult = {
  phone: string;
  providers: ProviderResult[];
  summary: { total: number; success: number; cancelled: number; successRate: number };
  localOrders: { invoice_no: string; status: string; total: number; created_at: string }[];
};

const PROVIDER_META: Record<string, { name: string; color: string; bg: string; logo: string }> = {
  steadfast: { name: "Steadfast", color: "text-orange-700", bg: "bg-orange-50 border-orange-200", logo: "🚚" },
  pathao: { name: "Pathao", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", logo: "🛵" },
  redx: { name: "RedX", color: "text-rose-700", bg: "bg-rose-50 border-rose-200", logo: "📦" },
  carrybee: { name: "CarryBee", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", logo: "🐝" },
};

function getRiskLevel(rate: number, total: number) {
  if (total === 0) return { label: "No Data", color: "bg-slate-100 text-slate-600 border-slate-300", icon: AlertTriangle };
  if (rate >= 80) return { label: "Trusted", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: ShieldCheck };
  if (rate >= 50) return { label: "Moderate", color: "bg-amber-100 text-amber-700 border-amber-300", icon: Shield };
  return { label: "High Risk", color: "bg-rose-100 text-rose-700 border-rose-300", icon: ShieldAlert };
}

export default function AdminFraudCheck() {
  const [params] = useSearchParams();
  const [phone, setPhone] = useState(params.get("phone") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FraudResult | null>(null);
  const [detail, setDetail] = useState<ProviderResult | null>(null);

  const check = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const ph = phone.trim();
    if (!ph || ph.replace(/\D/g, "").length < 10) {
      toast.error("সঠিক ফোন নাম্বর দিন");
      return;
    }
    setLoading(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("fraud-check", { body: { phone: ph } });
    setLoading(false);
    if (error) { toast.error("চেক করা যায়নি", { description: error.message }); return; }
    if (data?.error) { toast.error(data.error); return; }
    setResult(data as FraudResult);
  };

  const risk = result ? getRiskLevel(result.summary.successRate, result.summary.total) : null;
  const RiskIcon = risk?.icon || Shield;

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Fraud Check System</h1>
            <p className="text-xs text-muted-foreground">কাস্টমারের ফোন নাম্বর দিয়ে সব কুরিয়ারে ডেলিভারি হিস্টোরি যাচাই করুন</p>
          </div>
        </div>
        <form onSubmit={check} className="mt-4 flex flex-col sm:flex-row gap-2">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="017XXXXXXXX"
            className="flex-1"
          />
          <Button type="submit" disabled={loading} className="sm:w-40">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            {loading ? "চেক হচ্ছে..." : "Check Fraud"}
          </Button>
        </form>
      </div>

      {loading && (
        <div className="bg-card border rounded-xl p-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3">সব কুরিয়ারে ডাটা চেক করা হচ্ছে...</p>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Phone Number</div>
                <div className="text-2xl font-bold mt-1">{result.phone}</div>
              </div>
              {risk && (
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 ${risk.color} font-bold text-sm`}>
                  <RiskIcon className="h-5 w-5" />
                  {risk.label}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <Stat label="Total Orders" value={result.summary.total} icon={Package} />
              <Stat label="Delivered" value={result.summary.success} icon={CheckCircle2} color="text-emerald-400" />
              <Stat label="Cancelled" value={result.summary.cancelled} icon={XCircle} color="text-rose-400" />
              <Stat label="Success Rate" value={`${result.summary.successRate}%`} icon={TrendingUp} color="text-cyan-400" />
            </div>
          </div>

          {/* Providers Grid */}
          <div>
            <h2 className="font-bold mb-3 flex items-center gap-2"><Truck className="h-4 w-4" /> Courier Reports</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {result.providers.map((p) => {
                const meta = PROVIDER_META[p.provider] || { name: p.provider, color: "", bg: "bg-slate-50", logo: "📦" };
                const r = p.ok ? getRiskLevel(p.successRate || 0, p.total || 0) : null;
                return (
                  <button
                    key={p.provider}
                    onClick={() => setDetail(p)}
                    className={`text-left border rounded-xl p-4 hover:shadow-md transition ${meta.bg}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{meta.logo}</span>
                        <span className={`font-bold ${meta.color}`}>{meta.name}</span>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {!p.enabled ? (
                      <div className="mt-3 text-xs text-muted-foreground">Disabled in settings</div>
                    ) : p.error ? (
                      <div className="mt-3 text-xs text-rose-600 line-clamp-2">⚠ {p.error}</div>
                    ) : (
                      <>
                        <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                          <div>
                            <div className="text-lg font-bold">{p.total}</div>
                            <div className="text-[10px] text-muted-foreground">Total</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-emerald-600">{p.success}</div>
                            <div className="text-[10px] text-muted-foreground">Done</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-rose-600">{p.cancelled}</div>
                            <div className="text-[10px] text-muted-foreground">Cancel</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Success</span>
                          <span className={`text-sm font-bold ${(p.successRate || 0) >= 70 ? "text-emerald-600" : (p.successRate || 0) >= 40 ? "text-amber-600" : "text-rose-600"}`}>
                            {p.successRate}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${(p.successRate || 0) >= 70 ? "bg-emerald-500" : (p.successRate || 0) >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
                            style={{ width: `${p.successRate || 0}%` }}
                          />
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Local order history */}
          {result.localOrders.length > 0 && (
            <div className="bg-card border rounded-xl p-5">
              <h2 className="font-bold mb-3 flex items-center gap-2"><Package className="h-4 w-4" /> এই সাইটে অর্ডার হিস্টোরি ({result.localOrders.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr className="text-left">
                      <th className="p-2">Invoice</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Status</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.localOrders.map((o) => (
                      <tr key={o.invoice_no} className="border-t">
                        <td className="p-2 font-medium">#{o.invoice_no}</td>
                        <td className="p-2 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                        <td className="p-2 capitalize">{o.status}</td>
                        <td className="p-2 text-right font-semibold">৳{Number(o.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{PROVIDER_META[detail.provider]?.logo}</span>
                  {PROVIDER_META[detail.provider]?.name || detail.provider} — Full Report
                </DialogTitle>
              </DialogHeader>
              {detail.error ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg text-sm">{detail.error}</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Box label="Total" value={detail.total ?? 0} />
                    <Box label="Delivered" value={detail.success ?? 0} className="text-emerald-600" />
                    <Box label="Cancelled" value={detail.cancelled ?? 0} className="text-rose-600" />
                  </div>
                  <div className="bg-secondary/30 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">Raw API Response</div>
                    <pre className="text-xs overflow-x-auto max-h-72 bg-slate-900 text-slate-100 p-3 rounded">
                      {JSON.stringify(detail.raw, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color = "text-white" }: any) {
  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function Box({ label, value, className = "" }: any) {
  return (
    <div className="bg-secondary/40 rounded-lg p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${className}`}>{value}</div>
    </div>
  );
}
