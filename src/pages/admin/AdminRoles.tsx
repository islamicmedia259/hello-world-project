import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type Role = "admin" | "staff" | "user";
type Permission = { id: string; key: string; label: string; description: string | null };

const ROLES: Role[] = ["admin", "staff", "user"];

export default function AdminRoles() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>({}); // role -> set of permission_id
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, rp] = await Promise.all([
      supabase.from("permissions").select("*").order("key"),
      supabase.from("role_permissions").select("role, permission_id"),
    ]);
    setPermissions((p.data ?? []) as Permission[]);
    const m: Record<string, Set<string>> = { admin: new Set(), staff: new Set(), user: new Set() };
    (rp.data ?? []).forEach((r: any) => {
      if (m[r.role]) m[r.role].add(r.permission_id);
    });
    setMatrix(m);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = (role: Role, pid: string) => {
    setMatrix((prev) => {
      const next = { ...prev, [role]: new Set(prev[role]) };
      if (next[role].has(pid)) next[role].delete(pid);
      else next[role].add(pid);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    // Strategy: delete all and reinsert
    const { error: delErr } = await supabase.from("role_permissions").delete().in("role", ROLES);
    if (delErr) { toast.error(delErr.message); setSaving(false); return; }
    const rows: any[] = [];
    ROLES.forEach((role) => {
      matrix[role]?.forEach((pid) => rows.push({ role, permission_id: pid }));
    });
    if (rows.length) {
      const { error } = await supabase.from("role_permissions").insert(rows);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success("Roles updated");
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Roles</h1>
        <button onClick={save} disabled={saving} className="px-5 py-2 rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 overflow-x-auto">
        {loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">Permission</th>
                {ROLES.map((r) => <th key={r} className="p-3 text-center capitalize">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.key}</div>
                  </td>
                  {ROLES.map((r) => (
                    <td key={r} className="p-3 text-center">
                      <Checkbox
                        checked={matrix[r]?.has(p.id) ?? false}
                        onCheckedChange={() => toggle(r, p.id)}
                        disabled={r === "admin"}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-muted-foreground mt-3">Admin role always has all permissions.</p>
      </div>
    </div>
  );
}
