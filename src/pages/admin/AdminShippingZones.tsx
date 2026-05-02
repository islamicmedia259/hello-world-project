import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, MapPin, Search, Plus } from "lucide-react";

type Zone = { id: string; name: string; description: string | null; is_active: boolean; sort_order: number };
type District = { id: string; name: string };
type Mapping = { id: string; zone_id: string; district_id: string };

export default function AdminShippingZones() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);

  // Zone CRUD dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [form, setForm] = useState({ name: "", description: "", is_active: true, sort_order: 0 });

  // District selection
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [zRes, dRes, mRes] = await Promise.all([
      supabase.from("shipping_zones" as any).select("*").order("sort_order").order("name"),
      supabase.from("districts" as any).select("id,name").eq("is_active", true).order("name"),
      supabase.from("shipping_zone_districts" as any).select("*"),
    ]);
    setZones(((zRes.data as any) || []) as Zone[]);
    setDistricts(((dRes.data as any) || []) as District[]);
    setMappings(((mRes.data as any) || []) as Mapping[]);
    if (!selectedZone && zRes.data && (zRes.data as any).length > 0) {
      setSelectedZone((zRes.data as any)[0].id);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", is_active: true, sort_order: zones.length + 1 });
    setOpen(true);
  };

  const openEdit = (z: Zone) => {
    setEditing(z);
    setForm({ name: z.name, description: z.description || "", is_active: z.is_active, sort_order: z.sort_order });
    setOpen(true);
  };

  const saveZone = async () => {
    if (!form.name.trim()) return toast.error("Zone নাম দিন");
    const payload = { name: form.name.trim(), description: form.description.trim() || null, is_active: form.is_active, sort_order: form.sort_order };
    const { error } = editing
      ? await supabase.from("shipping_zones" as any).update(payload).eq("id", editing.id)
      : await supabase.from("shipping_zones" as any).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const removeZone = async (z: Zone) => {
    if (!confirm(`"${z.name}" zone ও এর সব district mapping মুছে যাবে। নিশ্চিত?`)) return;
    const { error } = await supabase.from("shipping_zones" as any).delete().eq("id", z.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    if (selectedZone === z.id) setSelectedZone("");
    load();
  };

  const districtsInZone = useMemo(
    () => new Set(mappings.filter((m) => m.zone_id === selectedZone).map((m) => m.district_id)),
    [mappings, selectedZone]
  );

  // Find which other zone (if any) a district already belongs to
  const districtZoneMap = useMemo(() => {
    const map = new Map<string, string>(); // district_id -> zone_id
    for (const m of mappings) map.set(m.district_id, m.zone_id);
    return map;
  }, [mappings]);

  const toggleDistrict = async (districtId: string) => {
    if (!selectedZone) return;
    const inZone = districtsInZone.has(districtId);
    if (inZone) {
      const { error } = await supabase
        .from("shipping_zone_districts" as any)
        .delete()
        .eq("zone_id", selectedZone)
        .eq("district_id", districtId);
      if (error) return toast.error(error.message);
    } else {
      // Remove from any other zone first (a district belongs to one zone)
      const existingZone = districtZoneMap.get(districtId);
      if (existingZone && existingZone !== selectedZone) {
        await supabase
          .from("shipping_zone_districts" as any)
          .delete()
          .eq("district_id", districtId);
      }
      const { error } = await supabase
        .from("shipping_zone_districts" as any)
        .insert({ zone_id: selectedZone, district_id: districtId } as any);
      if (error) return toast.error(error.message);
    }
    load();
  };

  const filteredDistricts = districts.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
  const selectedZoneObj = zones.find((z) => z.id === selectedZone);

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Shipping Zones</h1>
            <p className="text-sm text-muted-foreground">Zone বানিয়ে districts assign করুন — এরপর Shipping Charge পেজে চার্জ সেট করুন।</p>
          </div>
        </div>
        <Button onClick={openCreate} className="rounded-full bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-1" /> Create Zone
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Zones list */}
        <section className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h2 className="font-semibold">Zones ({zones.length})</h2>
          </div>
          <div className="p-4">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
            ) : zones.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">কোন zone নেই — উপরে "Create Zone" ক্লিক করে শুরু করুন।</p>
            ) : (
              <ul className="divide-y border rounded-md max-h-[560px] overflow-auto">
                {zones.map((z) => {
                  const cnt = mappings.filter((m) => m.zone_id === z.id).length;
                  const active = selectedZone === z.id;
                  return (
                    <li key={z.id} className={`flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 ${active ? "bg-violet-50" : ""}`}>
                      <button onClick={() => setSelectedZone(z.id)} className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${z.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />
                          <span className={`font-medium ${active ? "text-violet-700" : ""}`}>{z.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{cnt} districts</span>
                        </div>
                        {z.description && <p className="text-xs text-muted-foreground mt-0.5 ml-4">{z.description}</p>}
                      </button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(z)} className="h-8 w-8 p-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeZone(z)} className="h-8 w-8 p-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Districts assignment */}
        <section className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h2 className="font-semibold">
              Districts {selectedZoneObj ? `— ${selectedZoneObj.name}` : ""} ({districtsInZone.size}/{districts.length})
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {!selectedZone ? (
              <p className="text-sm text-muted-foreground py-8 text-center">বাঁ পাশ থেকে একটি zone সিলেক্ট করুন</p>
            ) : (
              <>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="District খুঁজুন..."
                    className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  ✅ টিক দিলে district এই zone-এ যুক্ত হবে। অন্য zone-এ থাকলে সেখান থেকে সরে আসবে।
                </p>
                <ul className="max-h-[480px] overflow-auto divide-y border rounded-md">
                  {filteredDistricts.map((d) => {
                    const inThis = districtsInZone.has(d.id);
                    const otherZone = districtZoneMap.get(d.id);
                    const inOther = !inThis && otherZone;
                    const otherZoneName = inOther ? zones.find((z) => z.id === otherZone)?.name : null;
                    return (
                      <li key={d.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={inThis}
                          onChange={() => toggleDistrict(d.id)}
                          className="h-4 w-4 cursor-pointer accent-violet-600"
                        />
                        <span className="flex-1 text-sm">{d.name}</span>
                        {inOther && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {otherZoneName}
                          </span>
                        )}
                      </li>
                    );
                  })}
                  {filteredDistricts.length === 0 && (
                    <li className="px-3 py-6 text-center text-sm text-muted-foreground">কোন district পাওয়া যায়নি</li>
                  )}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Create/Edit Zone Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Create"} Shipping Zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Zone Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="যেমন: Inside Dhaka, Chittagong Division"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="ছোট বর্ণনা..."
              />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={saveZone} className="bg-violet-600 hover:bg-violet-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
