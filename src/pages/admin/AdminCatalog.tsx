import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SimpleCrud from "./SimpleCrud";

export function AdminCategoriesPage() {
  return (
    <SimpleCrud
      table="categories"
      title="Categories"
      defaults={{ name: "", slug: "", image_url: "", is_top: false, show_on_home: false, sort_order: 0 }}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "slug", label: "Slug (auto from name)" },
        { key: "image_url", label: "Image", type: "image" },
        { key: "sort_order", label: "Sort Order", type: "number" },
        { key: "is_top", label: "Show in Home → Top Categories", type: "boolean" },
        { key: "show_on_home", label: "Show Products Section on Home", type: "boolean" },
      ]}
      columns={[
        { key: "image_url", label: "Image", render: (r) => r.image_url ? <img src={r.image_url} className="h-10 w-10 rounded object-cover" alt="" /> : "—" },
        { key: "name", label: "Name" },
        { key: "slug", label: "Slug" },
        { key: "is_top", label: "Top Category", render: (r) => r.is_top ? <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">Yes</span> : <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500">No</span> },
        { key: "show_on_home", label: "Home Section", render: (r) => r.show_on_home ? <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">Yes</span> : <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500">No</span> },
        { key: "sort_order", label: "Sort" },
      ]}
    />
  );
}

export function AdminSubcategoriesPage() {
  const [cats, setCats] = useState<any[]>([]);
  useEffect(() => { supabase.from("categories").select("id,name").order("name").then(({ data }) => setCats(data || [])); }, []);
  return (
    <SimpleCrud
      table="subcategories"
      title="Subcategories"
      defaults={{ name: "", slug: "", category_id: "" }}
      fields={[
        { key: "category_id", label: "Category", type: "select", required: true, options: cats.map((c) => ({ value: c.id, label: c.name })) },
        { key: "name", label: "Name", required: true },
        { key: "slug", label: "Slug (auto)" },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "category_id", label: "Category", render: (r) => cats.find((c) => c.id === r.category_id)?.name || "—" },
        { key: "slug", label: "Slug" },
      ]}
    />
  );
}

export function AdminChildcategoriesPage() {
  const [subs, setSubs] = useState<any[]>([]);
  useEffect(() => { supabase.from("subcategories").select("id,name").order("name").then(({ data }) => setSubs(data || [])); }, []);
  return (
    <SimpleCrud
      table="childcategories"
      title="Childcategories"
      defaults={{ name: "", slug: "", subcategory_id: "" }}
      fields={[
        { key: "subcategory_id", label: "Subcategory", type: "select", required: true, options: subs.map((s) => ({ value: s.id, label: s.name })) },
        { key: "name", label: "Name", required: true },
        { key: "slug", label: "Slug (auto)" },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "subcategory_id", label: "Subcategory", render: (r) => subs.find((s) => s.id === r.subcategory_id)?.name || "—" },
        { key: "slug", label: "Slug" },
      ]}
    />
  );
}

export function AdminBrandsPage() {
  return (
    <SimpleCrud
      table="brands"
      title="Brands"
      defaults={{ name: "", slug: "", logo_url: "" }}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "slug", label: "Slug (auto)" },
        { key: "logo_url", label: "Logo", type: "image" },
      ]}
      columns={[
        { key: "logo_url", label: "Logo", render: (r) => r.logo_url ? <img src={r.logo_url} className="h-10 w-10 rounded object-cover" alt="" /> : "—" },
        { key: "name", label: "Name" },
        { key: "slug", label: "Slug" },
      ]}
    />
  );
}

export function AdminColorsPage() {
  return (
    <SimpleCrud
      table="colors"
      title="Colors"
      defaults={{ name: "", hex_code: "#000000" }}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "hex_code", label: "Hex Code", type: "color", required: true },
      ]}
      columns={[
        { key: "hex_code", label: "Color", render: (r) => <div className="flex items-center gap-2"><div className="h-6 w-6 rounded border" style={{ background: r.hex_code }} /><span className="font-mono text-xs">{r.hex_code}</span></div> },
        { key: "name", label: "Name" },
      ]}
    />
  );
}

export function AdminSizesPage() {
  return (
    <SimpleCrud
      table="sizes"
      title="Sizes"
      defaults={{ name: "", sort_order: 0 }}
      fields={[
        { key: "name", label: "Name (e.g. S, M, L, XL)", required: true },
        { key: "sort_order", label: "Sort Order", type: "number" },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "sort_order", label: "Sort" },
      ]}
    />
  );
}

export function AdminModelsPage() {
  return (
    <SimpleCrud
      table="models"
      title="Models"
      defaults={{ name: "", slug: "" }}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "slug", label: "Slug (auto)" },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "slug", label: "Slug" },
      ]}
    />
  );
}
