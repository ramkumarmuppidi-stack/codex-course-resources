"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { isSafeLink } from "../_lib/editor-extensions";

type ToolProps = {
  label: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  run: () => void;
};
function Tool({ label, children, active, disabled, run }: ToolProps) {
  function handleMouseDown(event: React.MouseEvent) {
    event.preventDefault();
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={handleMouseDown}
      onClick={run}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      h1: editor.isActive("heading", { level: 1 }),
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      bullet: editor.isActive("bulletList"),
      ordered: editor.isActive("orderedList"),
      quote: editor.isActive("blockquote"),
      code: editor.isActive("codeBlock"),
      link: editor.isActive("link"),
      undo: editor.can().undo(),
      redo: editor.can().redo(),
    }),
  });
  function openLink() {
    setLinkUrl(editor.getAttributes("link").href ?? "");
    setLinkError("");
    setLinkOpen(true);
  }
  function closeLink() {
    setLinkOpen(false);
    editor.commands.focus();
  }
  function removeLink() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  }
  function applyLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = linkUrl.trim();
    if (!isSafeLink(href)) {
      setLinkError("Enter a full http:// or https:// address.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
  }
  return (
    <>
      <div className="toolbar" role="group" aria-label="Text formatting">
        <Tool
          label="Heading 1"
          active={state.h1}
          disabled={disabled}
          run={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </Tool>
        <Tool
          label="Heading 2"
          active={state.h2}
          disabled={disabled}
          run={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </Tool>
        <Tool
          label="Heading 3"
          active={state.h3}
          disabled={disabled}
          run={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </Tool>
        <span className="toolbar-divider" aria-hidden="true" />
        <Tool
          label="Bold"
          active={state.bold}
          disabled={disabled}
          run={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </Tool>
        <Tool
          label="Italic"
          active={state.italic}
          disabled={disabled}
          run={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </Tool>
        <Tool
          label="Underline"
          active={state.underline}
          disabled={disabled}
          run={() => editor.chain().focus().toggleUnderline().run()}
        >
          <u>U</u>
        </Tool>
        <Tool
          label="Strikethrough"
          active={state.strike}
          disabled={disabled}
          run={() => editor.chain().focus().toggleStrike().run()}
        >
          <s>S</s>
        </Tool>
        <span className="toolbar-divider" aria-hidden="true" />
        <Tool
          label="Bullet list"
          active={state.bullet}
          disabled={disabled}
          run={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </Tool>
        <Tool
          label="Numbered list"
          active={state.ordered}
          disabled={disabled}
          run={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </Tool>
        <Tool
          label="Blockquote"
          active={state.quote}
          disabled={disabled}
          run={() => editor.chain().focus().toggleBlockquote().run()}
        >
          “ Quote
        </Tool>
        <Tool
          label="Code block"
          active={state.code}
          disabled={disabled}
          run={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          &lt;/&gt;
        </Tool>
        <Tool label="Add or edit link" active={state.link} disabled={disabled} run={openLink}>
          Link
        </Tool>
        <span className="toolbar-divider" aria-hidden="true" />
        <Tool
          label="Undo"
          disabled={disabled || !state.undo}
          run={() => editor.chain().focus().undo().run()}
        >
          ↶
        </Tool>
        <Tool
          label="Redo"
          disabled={disabled || !state.redo}
          run={() => editor.chain().focus().redo().run()}
        >
          ↷
        </Tool>
      </div>
      {linkOpen && (
        <form className="link-form" aria-label="Edit link" onSubmit={applyLink}>
          <label htmlFor="link-url">Link address</label>
          <input
            id="link-url"
            type="url"
            autoFocus
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            required
            aria-describedby={linkError ? "link-error" : undefined}
          />
          <div className="link-actions">
            <button className="button small" type="submit" disabled={disabled}>
              Apply link
            </button>
            <button
              className="text-button"
              type="button"
              onClick={removeLink}
              disabled={disabled || !state.link}
            >
              Remove link
            </button>
            <button className="text-button" type="button" onClick={closeLink}>
              Cancel
            </button>
          </div>
          {linkError && (
            <p id="link-error" className="form-error" role="alert">
              {linkError}
            </p>
          )}
        </form>
      )}
    </>
  );
}
