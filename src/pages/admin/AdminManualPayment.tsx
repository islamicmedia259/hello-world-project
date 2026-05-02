import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus, Save } from "lucide-react";

type PM = {
  id: string;
  name: string;
  number: string;
  account_type: string;
  instructions: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
};

const ICON: Record<string, string> = {
  bkash: "bg-pink-500",
  nagad: "bg-orange-500",
  rocket: "bg-purple-500",
};

export default function AdminManualPayment() {
  const [rows, setRows] = useState<PM[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("sort_order");
    if (error) toast.error(error.message);
    setRows((data as PM[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Manual Payment | Admin";
    load();
  }, []);

  const update = (id: string, patch: Partial<PM>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const save = async (row: PM) => {
    const { error } = await supabase
      .from("payment_methods")
      .update({
        number: row.number,
        account_type: row.account_type,
        instructions: row.instructions,
        is_active: row.is_active,
        is_default: row.is_default,
        sort_order: row.sort_order,
      })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      // ensure single default
      if (row.is_default) {
        await supabase
          .from("payment_methods")
          .update({ is_default: false })
          .neq("id", row.id);
      }
      toast.success("Saved");
      load();
    }
  };

  const addNew = async () => {
    const name = prompt("Method name (e.g. bkash, nagad, rocket, upay):")?.trim().toLowerCase();
    if (!name) return;
    const { error } = await supabase.from("payment_methods").insert({
      name,
      number: "01XXXXXXXXX",
      account_type: "personal",
      instructions: "",
      sort_order: rows.length + 1,
    });
    if (error) toast.error(error.message);
    else { toast.success("Added"); load(); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this payment method?")) return;
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-card p-5 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Manual Payment</h1>
          <p className="text-sm text-slate-500 mt-1">bKash / Nagad / Rocket নাম্বার সেট করুন</p>
        </div>
        <button onClick={addNew} className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-5 py-2.5 font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Method
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-10 text-center text-slate-500">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => (
            <div key={row.id} className="bg-white rounded-xl shadow-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full text-white font-bold flex items-center justify-center uppercase ${ICON[row.name] || "bg-slate-500"}`}>
                    {row.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold capitalize">{row.name}</div>
                    <div className="text-xs text-slate-500">{row.account_type}</div>
                  </div>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer"
                    checked={row.is_active}
                    onChange={(e) => update(row.id, { is_active: e.target.checked })} />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Number</label>
                <input value={row.number} onChange={(e) => update(row.id, { number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm" placeholder="01XXXXXXXXX" />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Account Type</label>
                <select value={row.account_type} onChange={(e) => update(row.id, { account_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm">
                  <option value="personal">Personal</option>
                  <option value="merchant">Merchant</option>
                  <option value="agent">Agent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Instructions</label>
                <textarea value={row.instructions || ""} rows={2}
                  onChange={(e) => update(row.id, { instructions: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Send Money করে Transaction ID দিন।" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={row.is_default}
                    onChange={(e) => update(row.id, { is_default: e.target.checked })} />
                  Default
                </label>
                <input type="number" value={row.sort_order}
                  onChange={(e) => update(row.id, { sort_order: Number(e.target.value) })}
                  className="w-20 px-2 py-1 border rounded text-sm" placeholder="Sort" />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button onClick={() => save(row)} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-md font-semibold flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" /> Save
                </button>
                <button onClick={() => del(row.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 rounded-md">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
