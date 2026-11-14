import { getSchema } from "@tiptap/core";
import { editorExtensions, isSafeLink } from "./editor-extensions";
import { MAX_CONTENT_BYTES, MAX_TITLE_LENGTH, type NoteDraft } from "./note-types";

const schema = getSchema(editorExtensions);
export class NoteValidationError extends Error {}

export function validateNoteDraft(input: unknown): NoteDraft {
  if (!input || typeof input !== "object" || !("title" in input) || !("contentJson" in input)) {
    throw new NoteValidationError("Enter a title and note content.");
  }
  if (typeof input.title !== "string" || input.title.length > MAX_TITLE_LENGTH) {
    throw new NoteValidationError(`Keep the title under ${MAX_TITLE_LENGTH + 1} characters.`);
  }
  try {
    const serialized = JSON.stringify(input.contentJson);
    if (!serialized || Buffer.byteLength(serialized, "utf8") > MAX_CONTENT_BYTES) {
      throw new NoteValidationError("This note is too large. Keep it under 256 KB.");
    }
    // Bound recursion before handing untrusted JSON to ProseMirror.
    function checkValue(value: unknown, depth = 0) {
      if (depth > 40) throw new NoteValidationError("This note has too many nested blocks.");
      if (!value || typeof value !== "object") return;
      if ("type" in value && value.type === "link") {
        const attrs = "attrs" in value ? value.attrs : null;
        if (!attrs || typeof attrs !== "object" || !("href" in attrs) || !isSafeLink(attrs.href)) {
          throw new NoteValidationError("Links must start with http:// or https://.");
        }
      }
      if ("type" in value && value.type === "heading") {
        const attrs = "attrs" in value ? value.attrs : null;
        if (
          !attrs ||
          typeof attrs !== "object" ||
          !("level" in attrs) ||
          ![1, 2, 3].includes(Number(attrs.level))
        ) {
          throw new NoteValidationError("Choose a supported heading size.");
        }
      }
      for (const child of Object.values(value)) checkValue(child, depth + 1);
    }
    checkValue(input.contentJson);
    const doc = schema.nodeFromJSON(input.contentJson);
    if (doc.type.name !== "doc") throw new Error("Expected document");
    doc.check();
    const contentJson = doc.toJSON();
    // Discard caller-controlled link targets, rel values, and CSS classes.
    function normalize(node: typeof contentJson) {
      for (const mark of node.marks ?? []) {
        if (mark.type === "link")
          mark.attrs = {
            href: mark.attrs.href,
            target: "_blank",
            rel: "noopener noreferrer",
            class: null,
          };
      }
      for (const child of node.content ?? []) normalize(child);
    }
    normalize(contentJson);
    if (Buffer.byteLength(JSON.stringify(contentJson), "utf8") > MAX_CONTENT_BYTES) {
      throw new NoteValidationError("This note is too large. Keep it under 256 KB.");
    }
    // ProseMirror emits null-prototype attributes. Return transport-safe plain JSON.
    return { title: input.title.trim(), contentJson: JSON.parse(JSON.stringify(contentJson)) };
  } catch (error) {
    if (error instanceof NoteValidationError) throw error;
    throw new NoteValidationError("This note contains unsupported content.");
  }
}

export function isNoteId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}
