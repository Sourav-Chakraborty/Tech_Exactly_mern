import { useState, type FormEvent, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { toSafeHtml } from "../../utils/html";

interface Props {
  label: string;
  // Initial HTML (or legacy plain text). The editor is uncontrolled after mount.
  initialValue?: string;
  onChange(html: string): void;
  error?: string;
  placeholder?: string;
}

// WYSIWYG editor producing HTML. Only formatting the API allows is offered
// (headings, bold/italic/underline/strike, lists, quote, code, links, rule).
export function RichTextEditor({ label, initialValue = "", onChange, error, placeholder = "Write your post…" }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialValue ? toSafeHtml(initialValue) : "",
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        "aria-invalid": String(Boolean(error)),
        class: "prose prose-slate max-w-none min-h-72 px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  return (
    <div className="space-y-1">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <div
        className={`overflow-hidden rounded-md border bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 ${
          error ? "border-red-400" : "border-slate-300"
        }`}
      >
        {editor && <Toolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  // Re-render the toolbar only when these values change (selection / formatting).
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      linkHref: (e.getAttributes("link").href as string | undefined) ?? "",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const chain = () => editor.chain().focus();

  return (
    <div className="border-b border-slate-200 bg-slate-50">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <ToolButton label="Bold" active={s.bold} onClick={() => chain().toggleBold().run()}>
          <b>B</b>
        </ToolButton>
        <ToolButton label="Italic" active={s.italic} onClick={() => chain().toggleItalic().run()}>
          <i>I</i>
        </ToolButton>
        <ToolButton label="Underline" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
          <u>U</u>
        </ToolButton>
        <ToolButton label="Strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()}>
          <s>S</s>
        </ToolButton>
        <Divider />
        <ToolButton label="Heading" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
          H2
        </ToolButton>
        <ToolButton label="Subheading" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
          H3
        </ToolButton>
        <Divider />
        <ToolButton label="Bullet list" active={s.bulletList} onClick={() => chain().toggleBulletList().run()}>
          • List
        </ToolButton>
        <ToolButton label="Numbered list" active={s.orderedList} onClick={() => chain().toggleOrderedList().run()}>
          1. List
        </ToolButton>
        <ToolButton label="Quote" active={s.blockquote} onClick={() => chain().toggleBlockquote().run()}>
          ❝
        </ToolButton>
        <ToolButton label="Code block" active={s.codeBlock} onClick={() => chain().toggleCodeBlock().run()}>
          {"</>"}
        </ToolButton>
        <ToolButton label="Divider" onClick={() => chain().setHorizontalRule().run()}>
          ―
        </ToolButton>
        <ToolButton label="Link" active={s.link || linkOpen} onClick={() => setLinkOpen((o) => !o)}>
          🔗
        </ToolButton>
        <Divider />
        <ToolButton label="Undo" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
          ↶
        </ToolButton>
        <ToolButton label="Redo" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
          ↷
        </ToolButton>
      </div>

      {linkOpen && (
        <LinkForm
          initialHref={s.linkHref}
          onApply={(href) => {
            chain().extendMarkRange("link").setLink({ href }).run();
            setLinkOpen(false);
          }}
          onRemove={() => {
            chain().extendMarkRange("link").unsetLink().run();
            setLinkOpen(false);
          }}
          onCancel={() => setLinkOpen(false)}
        />
      )}
    </div>
  );
}

// Inline URL input (instead of the browser's prompt()).
function LinkForm({
  initialHref,
  onApply,
  onRemove,
  onCancel,
}: {
  initialHref: string;
  onApply(href: string): void;
  onRemove(): void;
  onCancel(): void;
}) {
  const [href, setHref] = useState(initialHref);

  // Not a <form>: this sits inside the post form, and forms can't be nested.
  const apply = (e: FormEvent) => {
    e.preventDefault();
    const url = href.trim();
    if (!url) return onRemove();
    onApply(/^(https?:|mailto:)/i.test(url) ? url : `https://${url}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-3 py-2">
      <input
        autoFocus
        type="url"
        aria-label="Link URL"
        placeholder="https://example.com"
        value={href}
        onChange={(e) => setHref(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") apply(e);
          if (e.key === "Escape") onCancel();
        }}
        className="min-w-60 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button type="button" onClick={apply} className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700">
        Apply
      </button>
      {initialHref && (
        <button type="button" onClick={onRemove} className="rounded-md px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50">
          Remove link
        </button>
      )}
      <button type="button" onClick={onCancel} className="rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100">
        Cancel
      </button>
    </div>
  );
}

function ToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick(): void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep focus (and the text selection) in the editor when a toolbar button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`min-w-8 rounded px-2 py-1 text-sm transition disabled:opacity-40 ${
        active ? "bg-indigo-100 text-indigo-700" : "text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span aria-hidden className="mx-1 h-5 w-px bg-slate-300" />;
