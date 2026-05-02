import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Save, X, MapPin, Search } from "lucide-react";

type District = { id: string; name: string; sort_order: number; is_active: boolean };
type Thana = { id: string; district_id: string; name: string; sort_order: number; is_active: boolean };

export default function AdminLocations() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [thanas, setThanas] = useState<Thana[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // forms
  const [newDistrict, setNewDistrict] = useState("");
  const [newThana, setNewThana] = useState("");
  const [editing, setEditing] = useState<{ table: "d" | "t"; id: string; name: string } | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: d }, { data: t }] = await Promise.all([
      supabase.from("districts" as any).select("*").order("sort_order").order("name"),
      supabase.from("thanas" as any).select("*").order("sort_order").order("name"),
    ]);
    setDistricts((d as any) || []);
    setThanas((t as any) || []);
    if (!selected && d && d.length) setSelected((d[0] as any).id);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const addDistrict = async () => {
    const name = newDistrict.trim();
    if (!name) return;
    const { error } = await supabase.from("districts" as any).insert({ name, sort_order: districts.length } as any);
    if (error) return toast.error(error.message);
    toast.success("জেলা যোগ হয়েছে");
    setNewDistrict("");
    loadAll();
  };

  const addThana = async () => {
    if (!selected) return toast.error("আগে একটি জেলা সিলেক্ট করুন");
    const name = newThana.trim();
    if (!name) return;
    const cnt = thanas.filter((x) => x.district_id === selected).length;
    const { error } = await supabase.from("thanas" as any).insert({ district_id: selected, name, sort_order: cnt } as any);
    if (error) return toast.error(error.message);
    toast.success("থানা যোগ হয়েছে");
    setNewThana("");
    loadAll();
  };

  const saveEdit = async () => {
    if (!editing) return;
    const table = editing.table === "d" ? "districts" : "thanas";
    const { error } = await supabase.from(table as any).update({ name: editing.name.trim() } as any).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("আপডেট হয়েছে");
    setEditing(null);
    loadAll();
  };

  const toggleActive = async (table: "d" | "t", row: District | Thana) => {
    const t = table === "d" ? "districts" : "thanas";
    const { error } = await supabase.from(t as any).update({ is_active: !row.is_active } as any).eq("id", row.id);
    if (error) return toast.error(error.message);
    loadAll();
  };

  const remove = async (table: "d" | "t", id: string) => {
    if (!confirm(table === "d" ? "এই জেলা ও সংশ্লিষ্ট সকল থানা মুছে যাবে। নিশ্চিত?" : "এই থানা মুছে যাবে। নিশ্চিত?")) return;
    const t = table === "d" ? "districts" : "thanas";
    const { error } = await supabase.from(t as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("মুছে ফেলা হয়েছে");
    if (table === "d" && selected === id) setSelected("");
    loadAll();
  };

  const filteredDistricts = districts.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
  const districtThanas = thanas.filter((t) => t.district_id === selected);
  const selectedDistrict = districts.find((d) => d.id === selected);

  return (
    <div className="max-w-7xl">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Locations</h1>
          <p className="text-sm text-muted-foreground">জেলা ও থানা/উপজেলা ম্যানেজ করুন</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Districts */}
        <section className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold">Districts ({districts.length})</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <input value={newDistrict} onChange={(e) => setNewDistrict(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDistrict()}
                placeholder="নতুন জেলার নাম" className="flex-1 px-3 py-2 border rounded-md text-sm" />
              <button onClick={addDistrict} className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search district..." className="w-full pl-9 pr-3 py-2 border rounded-md text-sm" />
            </div>

            {loading ? <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p> : (
              <ul className="max-h-[500px] overflow-auto divide-y border rounded-md">
                {filteredDistricts.map((d) => (
                  <li key={d.id} className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-50 ${selected === d.id ? "bg-primary/5" : ""}`}>
                    <button onClick={() => setSelected(d.id)} className="flex-1 text-left text-sm flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${d.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />
                      {editing?.table === "d" && editing.id === d.id ? (
                        <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className="border rounded px-2 py-0.5 text-sm flex-1" autoFocus />
                      ) : (
                        <span className={selected === d.id ? "font-semibold text-primary" : ""}>{d.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">{thanas.filter((t) => t.district_id === d.id).length} থানা</span>
                    </button>
                    {editing?.table === "d" && editing.id === d.id ? (
                      <>
                        <button onClick={saveEdit} className="p-1.5 hover:bg-emerald-100 text-emerald-600 rounded"><Save className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded"><X className="h-3.5 w-3.5" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => toggleActive("d", d)} title={d.is_active ? "Deactivate" : "Activate"}
                          className="text-xs px-2 py-0.5 rounded border">{d.is_active ? "ON" : "OFF"}</button>
                        <button onClick={() => setEditing({ table: "d", id: d.id, name: d.name })} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => remove("d", d.id)} className="p-1.5 hover:bg-red-100 text-red-600 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Thanas */}
        <section className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h2 className="font-semibold">
              Thanas {selectedDistrict ? `— ${selectedDistrict.name}` : ""} ({districtThanas.length})
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {selected ? (
              <>
                <div className="flex gap-2">
                  <input value={newThana} onChange={(e) => setNewThana(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addThana()}
                    placeholder="নতুন থানা/উপজেলার নাম" className="flex-1 px-3 py-2 border rounded-md text-sm" />
                  <button onClick={addThana} className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
                <ul className="max-h-[500px] overflow-auto divide-y border rounded-md">
                  {districtThanas.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                      <span className={`h-2 w-2 rounded-full ${t.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />
                      {editing?.table === "t" && editing.id === t.id ? (
                        <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          className="border rounded px-2 py-0.5 text-sm flex-1" autoFocus />
                      ) : (
                        <span className="text-sm flex-1">{t.name}</span>
                      )}
                      {editing?.table === "t" && editing.id === t.id ? (
                        <>
                          <button onClick={saveEdit} className="p-1.5 hover:bg-emerald-100 text-emerald-600 rounded"><Save className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded"><X className="h-3.5 w-3.5" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => toggleActive("t", t)} className="text-xs px-2 py-0.5 rounded border">{t.is_active ? "ON" : "OFF"}</button>
                          <button onClick={() => setEditing({ table: "t", id: t.id, name: t.name })} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded"><Edit2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => remove("t", t.id)} className="p-1.5 hover:bg-red-100 text-red-600 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                    </li>
                  ))}
                  {districtThanas.length === 0 && (
                    <li className="px-3 py-6 text-center text-sm text-muted-foreground">কোন থানা নেই। উপরে যোগ করুন।</li>
                  )}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">বাঁ পাশ থেকে একটি জেলা সিলেক্ট করুন</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
