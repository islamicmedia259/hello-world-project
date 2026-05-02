import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, ExternalLink, Eye, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

type LP = {
  id: string;
  slug: string;
  title: string;
  is_active: boolean;
  view_count: number;
  order_count: number;
  created_at: string;
};

export default function AdminLandingPages() {
  const [list, setList] = useState<LP[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("landing_pages")
      .select("id,slug,title,is_active,view_count,order_count,created_at")
      .order("created_at", { ascending: false });
    setList(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await (supabase as any).from("landing_pages").update({ is_active: !current }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("এই landing page টি ডিলিট করবেন?")) return;
    const { error } = await (supabase as any).from("landing_pages").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Landing Pages</h1>
          <p className="text-sm text-muted-foreground">প্রতিটি প্রোডাক্ট/ক্যাম্পেইনের জন্য আলাদা সেলস পেজ তৈরি করুন</p>
        </div>
        <Link to="/admin/landing/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> New Landing Page
        </Link>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground mb-4">কোনো landing page নেই। নতুন একটি তৈরি করুন।</p>
            <Link to="/admin/landing/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold">
              <Plus className="h-4 w-4" /> Create First
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Views</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((lp) => (
                <tr key={lp.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-semibold">{lp.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">/lp/{lp.slug}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{lp.view_count}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><ShoppingBag className="h-3 w-3" />{lp.order_count}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(lp.id, lp.is_active)} className={`px-2 py-1 rounded text-xs font-semibold ${lp.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                      {lp.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <a href={`/lp/${lp.slug}`} target="_blank" rel="noreferrer" className="p-2 hover:bg-muted rounded" title="Preview"><ExternalLink className="h-4 w-4" /></a>
                      <Link to={`/admin/landing/${lp.id}/edit`} className="p-2 hover:bg-muted rounded" title="Edit"><Edit className="h-4 w-4" /></Link>
                      <button onClick={() => remove(lp.id)} className="p-2 hover:bg-rose-50 text-rose-600 rounded" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
