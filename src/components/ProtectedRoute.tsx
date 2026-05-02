import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";

export default function ProtectedRoute({ menuKey, children, adminOnly }: { menuKey?: string; children: React.ReactNode; adminOnly?: boolean }) {
  const { can, loading, isAdmin } = usePermissions();
  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;
  if (adminOnly && !isAdmin) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold text-rose-600 mb-2">Access Denied</h2>
        <p className="text-slate-600">শুধুমাত্র Admin এই পেইজ দেখতে পারবেন।</p>
      </div>
    );
  }
  if (menuKey && !can(menuKey)) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold text-rose-600 mb-2">Access Denied</h2>
        <p className="text-slate-600">এই সেকশনে আপনার পারমিশন নেই।</p>
      </div>
    );
  }
  return <>{children}</>;
}
