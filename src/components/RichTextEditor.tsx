import { useMemo, useRef } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
// @ts-ignore - no types provided
import QuillResizeImage from "quill-resize-image";

// Register resize module once (handles both <img> and <iframe>)
if (typeof window !== "undefined") {
  try {
    Quill.register("modules/resize", QuillResizeImage);
  } catch {
    /* already registered */
  }
}

// Convert any YouTube URL (watch, youtu.be, shorts, embed) to an embed URL
function toEmbedUrl(raw: string): string | null {
  if (!raw) return null;
  const url = raw.trim();
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    // youtu.be/<id>
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      // /watch?v=ID
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      // /shorts/ID  or  /embed/ID
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
      if (parts[0] === "embed" && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
    }
    // Vimeo
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    // Already an embed URL — keep as is
    return url;
  } catch {
    return null;
  }
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter Your Text Here",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const quillRef = useRef<ReactQuill | null>(null);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          [{ font: [] }, { size: ["small", false, "large", "huge"] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ script: "sub" }, { script: "super" }],
          [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
          [{ align: [] }],
          ["blockquote", "code-block"],
          ["link", "image", "video"],
          ["clean"],
        ],
        handlers: {
          video: function (this: any) {
            const raw = window.prompt("YouTube / Vimeo / Embed URL দিন:");
            if (!raw) return;
            const embed = toEmbedUrl(raw);
            if (!embed) {
              alert("ভিডিও URL ঠিক নেই");
              return;
            }
            const editor = this.quill;
            const range = editor.getSelection(true);
            editor.insertEmbed(range.index, "video", embed, "user");
            editor.setSelection(range.index + 1, 0);
          },
        },
      },
      resize: {
        locale: {
          altTip: "Hold Alt to zoom",
          floatLeft: "Left",
          floatRight: "Right",
          center: "Center",
          restore: "Restore",
        },
      },
    }),
    []
  );

  const formats = [
    "header", "font", "size",
    "bold", "italic", "underline", "strike",
    "color", "background",
    "script",
    "list", "bullet", "indent",
    "align",
    "blockquote", "code-block",
    "link", "image", "video",
    "width", "height", "style",
  ];

  return (
    <div className="rich-editor bg-white rounded-md">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ""}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
