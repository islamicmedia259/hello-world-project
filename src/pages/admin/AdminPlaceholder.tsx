import { ReactNode } from "react";
import { Construction } from "lucide-react";

export default function AdminPlaceholder({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="space-y-4">
      <h1 className="font-display font-bold text-2xl">{title}</h1>
      <div className="bg-card rounded-xl shadow-card p-10 text-center">
        <div className="h-16 w-16 rounded-full bg-primary-soft text-primary mx-auto flex items-center justify-center mb-4">
          <Construction className="h-8 w-8" />
        </div>
        <p className="font-display font-semibold text-lg mb-2">Coming Soon</p>
        <p className="text-muted-foreground max-w-md mx-auto text-sm">
          {description || "This section is being prepared. Tell us which fields and features you need here and we'll build it next."}
        </p>
        {children}
      </div>
    </div>
  );
}
