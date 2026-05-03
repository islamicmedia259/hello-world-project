import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, ThumbsDown, ThumbsUp, KeyRound } from "lucide-react";

type Role = "admin" | "moderator" | "staff" | "customer";
type Row = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  is_active: boolean;
  role: Role;
};

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [pwUser, setPwUser] = useState<Row | null>(null);
  const [deleteUser, setDeleteUser] = useState<Row | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", display_name: "", role: "staff" as Role });
  const [newPw, setNewPw] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email, is_active").order("created_at", { ascending: true });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const map = new Map<string, Role>();
    (roles ?? []).forEach((r: any) => {
      const cur = map.get(r.user_id);
      const order = { admin: 4, moderator: 3, staff: 2, customer: 1, user: 0 } as const;
      if (!cur || order[r.role as Role] > order[cur]) map.set(r.user_id, r.role);
    });
    setRows((profiles ?? []).map((p: any) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      email: p.email,
      is_active: p.is_active,
      role: map.get(p.user_id) ?? "customer",
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.display_name ?? "").toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q) ||
      r.role.includes(q)
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ email: "", password: "", display_name: "", role: "moderator" });
    setOpen(true);
  };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({ email: r.email ?? "", password: "", display_name: r.display_name ?? "", role: r.role });
    setOpen(true);
  };

  const save = async () => {
    if (editing) {
      const { error: pe } = await supabase.from("profiles").update({
        display_name: form.display_name,
      }).eq("user_id", editing.user_id);
      if (pe) return toast.error(pe.message);
      // role: delete old then insert new
      await supabase.from("user_roles").delete().eq("user_id", editing.user_id);
      await supabase.from("user_roles").insert({ user_id: editing.user_id, role: form.role });
      toast.success("User updated");
    } else {
      if (!form.email || !form.password) return toast.error("Email and password required");
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: form.email,
          password: form.password,
          display_name: form.display_name,
          role: form.role,
        },
      });
      if (error || (data as any)?.error) {
        return toast.error((data as any)?.error || error?.message || "Failed to create user");
      }
      toast.success("User created");
    }
    setOpen(false);
    load();
  };

  const toggleActive = async (r: Row) => {
    const { error } = await supabase.from("profiles").update({ is_active: !r.is_active }).eq("user_id", r.user_id);
    if (error) return toast.error(error.message);
    toast.success(!r.is_active ? "Activated" : "Deactivated");
    load();
  };

  const remove = (r: Row) => {
    setDeleteUser(r);
    setAdminPassword("");
  };

  const confirmDelete = async () => {
    if (!deleteUser || !adminPassword) return toast.error("Password required");
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { password: adminPassword, target_user_id: deleteUser.user_id },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "Delete failed");
        setDeleting(false);
        return;
      }
      toast.success("User deleted");
      setDeleteUser(null);
      setAdminPassword("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const changePassword = async () => {
    if (!pwUser || !newPw) return;
    // Note: only the user themselves can change via auth.updateUser; admin needs service role.
    // We trigger a password reset email instead.
    const { error } = await supabase.auth.resetPasswordForEmail(pwUser.email ?? "", { redirectTo: window.location.origin + "/admin" });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
    setPwUser(null);
    setNewPw("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users Manage</h1>
        <Button onClick={openCreate} className="rounded-full bg-violet-600 hover:bg-violet-700">Create</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Search:</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="p-3">SL</th>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No users</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.user_id} className="border-t">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{r.display_name || "—"}</td>
                  <td className="p-3">{r.email}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-slate-100 capitalize">{r.role}</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleActive(r)} title={r.is_active ? "Deactivate" : "Activate"}>
                        {r.is_active ? <ThumbsDown className="h-3.5 w-3.5" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => openEdit(r)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPwUser(r)} title="Reset password">
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(r)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-sm text-slate-500 mt-3">Showing {filtered.length} of {rows.length} entries</div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit User" : "Create User"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input value={form.email} disabled={!!editing} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            {!editing && (
              <div>
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Display Name</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwUser} onOpenChange={(v) => !v && setPwUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">A password reset email will be sent to <strong>{pwUser?.email}</strong>.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwUser(null)}>Cancel</Button>
            <Button onClick={changePassword}>Send Reset Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteUser} onOpenChange={(v) => !v && !deleting && (setDeleteUser(null), setAdminPassword(""))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-rose-600">⚠️ Delete User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              You are about to permanently delete <strong>{deleteUser?.email}</strong>. This action cannot be undone.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
              🔒 Please confirm your <strong>admin password</strong> to continue.
            </div>
            <div>
              <Label>Your Admin Password</Label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter your password"
                onKeyDown={(e) => e.key === "Enter" && confirmDelete()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteUser(null); setAdminPassword(""); }} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting || !adminPassword}
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
