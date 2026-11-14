"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { editorExtensions } from "../_lib/editor-extensions";
import { MAX_TITLE_LENGTH, type Note } from "../_lib/note-types";
import { useNoteDraft } from "../_lib/use-note-draft";
import { EditorToolbar } from "./editor-toolbar";

const extensions = [
  ...editorExtensions,
  Placeholder.configure({ placeholder: "Every idea starts somewhere. Start writing…" }),
];

export function NoteEditor({ note }: { note?: Note }) {
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);
  const model = useNoteDraft(note);
  const creating = !note && model.status === "saving";
  const editor = useEditor({
    extensions,
    content: model.draft.contentJson,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: "editor-content",
        role: "textbox",
        "aria-label": "Note content",
        "aria-multiline": "true",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => model.change({ ...model.draft, contentJson: editor.getJSON() }),
  });

  // Synchronize the external editor instance while the first create request is pending.
  useEffect(() => {
    editor?.setEditable(!creating && !finishing);
  }, [editor, creating, finishing]);

  function changeTitle(event: ChangeEvent<HTMLInputElement>) {
    model.change({ ...model.draft, title: event.target.value });
  }
  async function handleSave() {
    const result = await model.save();
    if (!note && result && "note" in result) router.replace(`/notes/${result.note.id}`);
  }
  async function handleSubmit() {
    setFinishing(true);
    const result = await model.save();
    if (!result || "note" in result) {
      router.push("/notes");
      router.refresh();
    } else {
      setFinishing(false);
    }
  }
  function handleClear() {
    if (!editor || !window.confirm("Clear this note’s text? You can undo this from the toolbar."))
      return;
    editor.chain().focus().clearContent().run();
  }
  const statusText =
    model.status === "saving"
      ? "Saving…"
      : model.status === "error"
        ? "Save failed"
        : model.dirty
          ? "Unsaved changes"
          : "Saved";
  return (
    <div className="note-workspace">
      <Link className="back-link" href="/notes">
        ← All notes
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{note ? "ROOM TO REFLECT" : "A FRESH START"}</p>
          <h1>{note ? "Your note" : "New note"}</h1>
          <p>A little space to think out loud.</p>
        </div>
      </div>
      <div className="save-bar">
        <span
          className={`save-status ${model.status === "error" ? "save-error" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span className={`status-dot ${model.dirty ? "unsaved" : ""}`} aria-hidden="true" />
          {statusText}
        </span>
        <button
          className="button small secondary"
          type="button"
          onClick={handleSave}
          disabled={!editor || !model.dirty || model.status === "saving" || finishing}
        >
          {model.status === "error" ? "Retry save" : "Save"}
        </button>
      </div>
      {model.error && (
        <p className="save-error-message" role="alert">
          {model.error}
        </p>
      )}
      <section className="card editor" aria-label="Note editor">
        <label className="sr-only" htmlFor="note-title">
          Note title
        </label>
        <input
          id="note-title"
          className="title-input"
          placeholder="Untitled note"
          value={model.draft.title}
          onChange={changeTitle}
          maxLength={MAX_TITLE_LENGTH}
          disabled={creating || finishing}
        />
        {editor ? (
          <EditorToolbar editor={editor} disabled={creating || finishing} />
        ) : (
          <div className="toolbar" role="status">
            Loading editor…
          </div>
        )}
        <EditorContent editor={editor} />
        <div className="editor-footer">
          <span>
            {note
              ? "Changes save automatically · You can also save anytime"
              : "Save or submit to create your note"}
          </span>
          <span>
            {model.savedAt
              ? `Last saved ${new Date(model.savedAt).toISOString().slice(11, 16)} UTC`
              : "Your next idea starts here"}
          </span>
        </div>
      </section>
      <div className="editor-bottom-actions">
        <button
          className="text-button"
          type="button"
          onClick={handleClear}
          disabled={!editor || creating || finishing}
        >
          Clear
        </button>
        <button
          className="button"
          type="button"
          onClick={handleSubmit}
          disabled={!editor || model.status === "saving" || finishing}
        >
          Submit
        </button>
      </div>
      <p className="editor-hint">Submit saves your note and returns to your notebook.</p>
    </div>
  );
}
