"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain text or existing HTML from API → TipTap document HTML */
export function toEditorHtmlFromPlainOrHtml(s: string): string {
  if (!s || !s.trim()) return "<p></p>";
  const t = s.trim();
  if (t.startsWith("<")) return s;
  return `<p>${escapeHtml(s).replace(/\n/g, "<br>")}</p>`;
}

function MiniToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 8,
        alignItems: "center",
      }}
    >
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        style={{
          padding: "4px 10px",
          borderRadius: 4,
          border: "1px solid #d1d5db",
          background: editor.isActive("bold") ? "#e5e7eb" : "#fff",
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        style={{
          padding: "4px 10px",
          borderRadius: 4,
          border: "1px solid #d1d5db",
          background: editor.isActive("italic") ? "#e5e7eb" : "#fff",
          fontStyle: "italic",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        I
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        style={{
          padding: "4px 10px",
          borderRadius: 4,
          border: "1px solid #d1d5db",
          background: editor.isActive("bulletList") ? "#e5e7eb" : "#fff",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        style={{
          padding: "4px 10px",
          borderRadius: 4,
          border: "1px solid #d1d5db",
          background: editor.isActive("orderedList") ? "#e5e7eb" : "#fff",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        1. List
      </button>
    </div>
  );
}

export interface ReportTiptapFieldProps {
  initialValue: string;
  onChange: (html: string) => void;
  minHeight?: number;
}

export function ReportTiptapField({
  initialValue,
  onChange,
  minHeight = 120,
}: ReportTiptapFieldProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
      }),
      BulletList,
      OrderedList,
    ],
    content: toEditorHtmlFromPlainOrHtml(initialValue),
    editorProps: {
      attributes: {
        class: "report-tiptap-editor",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  return (
    <div>
      <style>{`
        .report-tiptap-editor.ProseMirror {
          outline: none;
          min-height: ${minHeight}px;
          padding: 12px 14px;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          background: #fff;
          font-size: 13px;
          line-height: 1.55;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .report-tiptap-editor.ProseMirror:focus {
          border-color: #111;
          box-shadow: 0 0 0 1px #111;
        }
        .report-tiptap-editor p { margin: 0 0 0.5em; }
        .report-tiptap-editor p:last-child { margin-bottom: 0; }
        .report-tiptap-editor ul, .report-tiptap-editor ol {
          margin: 0.25em 0 0.5em;
          padding-left: 1.35em;
        }
        .report-tiptap-editor h3 { font-size: 1.05em; margin: 0.5em 0; }
        .report-tiptap-editor h4 { font-size: 1em; margin: 0.5em 0; }
      `}</style>
      <MiniToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
