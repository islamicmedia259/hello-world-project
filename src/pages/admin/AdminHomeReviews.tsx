import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Star, Upload } from "lucide-react";

type Review = { name: string; rating: number; text: string; image?: string };

async function uploadImage(file: File): Promise<string | null> {
  const path = `home-reviews/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
  if (error) { toast.error(error.message); return null; }
  const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
  return data.publicUrl;
}

export default function AdminHomeReviews() {
  const [id, setId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState("What Our Students Say");
  const [subtitle, setSubtitle] = useState("Real experiences from our learners");
  const [speed, setSpeed] = useState(3500);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      if (data) {
        setId(data.id);
        setEnabled((data as any).home_reviews_enabled || false);
        setTitle((data as any).home_reviews_title || "What Our Students Say");
        setSubtitle((data as any).home_reviews_subtitle || "Real experiences from our learners");
        setSpeed((data as any).home_reviews_speed_ms || 3500);
        setReviews((data as any).home_reviews || []);
      }
      setLoading(false);
    })();
  }, []);

  const updateReview = (i: number, patch: Partial<Review>) => {
    setReviews((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addReview = () => setReviews((rs) => [...rs, { name: "", rating: 5, text: "", image: "" }]);
  const removeReview = (i: number) => setReviews((rs) => rs.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!id) return toast.error("Settings row not found");
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        home_reviews_enabled: enabled,
        home_reviews_title: title,
        home_reviews_subtitle: subtitle,
        home_reviews_speed_ms: Math.max(1000, Number(speed) || 3500),
        home_reviews: reviews as any,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("সেভ হয়েছে");
  };

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Home Page Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">হোম পেজে ফুটারের ঠিক উপরে দেখানো হবে — অটো-স্লাইড করবে</p>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-5 mb-6">
        <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-lg px-4 py-3">
          <div>
            <Label className="text-base font-semibold">Show Reviews on Home Page</Label>
            <p className="text-xs text-muted-foreground mt-0.5">অফ করলে হোম পেজে রিভিউ সেকশন দেখাবে না</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div>
          <Label className="block mb-1.5">Section Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What Our Students Say" />
        </div>

        <div>
          <Label className="block mb-1.5">Subtitle</Label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Real experiences from our learners" />
        </div>

        <div>
          <Label className="block mb-1.5">Slide Speed (milliseconds)</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1000}
              step={500}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="max-w-[200px]"
            />
            <span className="text-sm text-muted-foreground">= {(speed / 1000).toFixed(1)} সেকেন্ড পরপর</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">কম মান = দ্রুত স্লাইড, বেশি = ধীরে। সাজেস্টেড: 2000–5000ms</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Reviews ({reviews.length})</h2>
          <Button onClick={addReview} size="sm" className="bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4 mr-1" /> Add Review
          </Button>
        </div>

        {reviews.length === 0 && (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
            কোনো রিভিউ যোগ করা হয়নি। উপরের <b>Add Review</b> বাটনে ক্লিক করুন।
          </div>
        )}

        <div className="space-y-4">
          {reviews.map((r, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3 bg-slate-50">
              <div className="flex items-start justify-between">
                <span className="font-semibold text-sm text-muted-foreground">Review #{i + 1}</span>
                <button onClick={() => removeReview(i)} className="text-rose-600 hover:bg-rose-50 p-1 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={r.name} onChange={(e) => updateReview(i, { name: e.target.value })} placeholder="Student name" />
                </div>
                <div>
                  <Label className="text-xs">Rating</Label>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => updateReview(i, { rating: n })}
                        className="p-0.5"
                      >
                        <Star className={`h-6 w-6 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Review Text *</Label>
                <Textarea
                  rows={2}
                  value={r.text}
                  onChange={(e) => updateReview(i, { text: e.target.value })}
                  placeholder='"Great experience!"'
                />
              </div>

              <div>
                <Label className="text-xs">Profile Image (optional)</Label>
                <div className="flex items-center gap-3 mt-1">
                  {r.image && <img src={r.image} alt="" className="h-12 w-12 rounded-full object-cover border" />}
                  <Input
                    value={r.image || ""}
                    onChange={(e) => updateReview(i, { image: e.target.value })}
                    placeholder="Image URL or upload below"
                    className="flex-1"
                  />
                  <label className="inline-flex items-center gap-1 px-3 py-2 border rounded-md cursor-pointer hover:bg-white text-xs whitespace-nowrap">
                    <Upload className="h-3 w-3" /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const url = await uploadImage(f);
                        if (url) updateReview(i, { image: url });
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>

        {reviews.length > 0 && (
          <div className="mt-5 pt-5 border-t flex justify-end">
            <Button onClick={save} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
              {saving ? "Saving…" : "Save All Changes"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
